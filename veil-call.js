(function () {
  'use strict';

  var iceConfig = {
    iceServers: [{
      urls: "stun:stun.l.google.com:19302"
    }, {
      urls: "stun:stun.cloudflare.com:3478"
    }]
  };
  var callState = {
    state: "idle",
    id: "",
    peer: "",
    peerName: "",
    peerPfp: "",
    video: false,
    pc: null,
    local: null,
    remote: null,
    ice: [],
    offer: "",
    mic: true,
    deaf: false,
    cam: false
  };
  var stageEl = null;
  var ringEl = null;
  var ringTimer = null;
  var callTimer = null;
  var talkRaf = null;
  var talkAudio = null;
  function readChatProfile() {
    try {
      var profile = JSON.parse(localStorage.getItem("veil_chat_profile") || "null");
      if (profile && typeof profile === "object") {
        return profile;
      }
    } catch (err) {}
    return {};
  }
  function myUid() {
    return String(readChatProfile().uid || "");
  }
  function friendByUid(uid) {
    var friends = readChatProfile().friends;
    if (!Array.isArray(friends)) {
      return null;
    }
    for (var i = 0; i < friends.length; i++) {
      if (friends[i] && friends[i].uid === uid) {
        return friends[i];
      }
    }
    return null;
  }
  function safePfp(value) {
    if (typeof value === "string" && value.indexOf("data:image/") === 0 && value.length < 120000) {
      return value;
    }
    return "image/profileplaceholder.png";
  }
  function toast(text, kind) {
    if (!text) {
      return;
    }
    var veilToasts = document.getElementById("veilToasts");
    if (!veilToasts) {
      veilToasts = document.createElement("div");
      veilToasts.id = "veilToasts";
      document.body.appendChild(veilToasts);
    }
    var list = document.createElement("div");
    list.className = "veil-toast " + (kind || "ok");
    list.textContent = text;
    veilToasts.appendChild(list);
    requestAnimationFrame(function () {
      list.classList.add("show");
    });
    setTimeout(function () {
      list.classList.remove("show");
      setTimeout(function () {
        list.remove();
      }, 240);
    }, 2800);
  }
  var ablyClient = null;
  var ablyLoading = false;
  var ABLY_KEY = "PwdaGQ.kBtNLA:ovkftNAocDZmr4pFWEWIsPA4td0MZP8MRrlG6yRaakY";
  function getAbly() {
    return ablyClient;
  }
  function loadAbly() {
    if (window.Ably && window.Ably.Realtime) {
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector("script[src=\"https://cdn.ably.com/lib/ably.min-2.js\"]");
      if (existing) {
        if (window.Ably && window.Ably.Realtime) {
          resolve();
          return;
        }
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", function () {
          reject(new Error("ably"));
        });
        return;
      }
      var script = document.createElement("script");
      script.src = "https://cdn.ably.com/lib/ably.min-2.js";
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        reject(new Error("ably"));
      };
      document.head.appendChild(script);
    });
  }
  function connectAbly() {
    if (ablyClient || ablyLoading) {
      return;
    }
    var profile = readChatProfile();
    if (!profile.uid || !profile.username) {
      return;
    }
    if (!window.Ably || !window.Ably.Realtime) {
      ablyLoading = true;
      loadAbly().then(function () {
        ablyLoading = false;
        connectAbly();
      }).catch(function () {
        ablyLoading = false;
      });
      return;
    }
    ablyLoading = true;
    try {
      var realtime = new window.Ably.Realtime({
        key: ABLY_KEY,
        clientId: profile.uid
      });
      var channel = realtime.channels.get("veil-chat:in:" + profile.uid);
      channel.subscribe("event", function (message) {
        var data = message && message.data;
        if (!data || typeof data.type !== "string") {
          return;
        }
        if (data.type.indexOf("call-") !== 0) {
          return;
        }
        onCallEvent(data);
      });
      ablyClient = realtime;
    } catch (err) {}
    ablyLoading = false;
  }
  function ensureAbly() {
    connectAbly();
    if (ablyClient) {
      return Promise.resolve(ablyClient);
    }
    return new Promise(function (resolve) {
      var tries = 0;
      var poll = setInterval(function () {
        connectAbly();
        tries += 1;
        if (ablyClient || tries > 40) {
          clearInterval(poll);
          resolve(ablyClient);
        }
      }, 250);
    });
  }
  function publishCall(msg) {
    var realtime = getAbly();
    var profile = readChatProfile();
    if (!realtime || !callState.peer || !profile.uid) {
      return Promise.reject(new Error("offline"));
    }
    var payload = {
      type: msg.type,
      from: profile.uid,
      to: callState.peer,
      name: profile.username || "Someone",
      pfp: profile.pfp || "",
      callId: callState.id,
      video: !!callState.video
    };
    if (msg.sdp) {
      payload.sdp = msg.sdp;
    }
    if (msg.candidate) {
      payload.candidate = msg.candidate;
    }
    return realtime.channels.get("veil-chat:in:" + callState.peer).publish("event", payload);
  }
  function peerIsOnline(uid) {
    var realtime = getAbly();
    if (!realtime) {
      return Promise.resolve(false);
    }
    var channel = realtime.channels.get("veil-chat:dir");
    if (!channel || !channel.presence || typeof channel.presence.get !== "function") {
      return Promise.resolve(false);
    }
    return new Promise(function (resolve) {
      var settled = false;
      function readPresence(members) {
        if (settled) {
          return;
        }
        settled = true;
        var online = false;
        (members || []).forEach(function (member) {
          if (member && member.clientId === uid) {
            online = true;
          }
        });
        resolve(online);
      }
      try {
        var pending = channel.presence.get(function (value, extra) {
          readPresence(value ? [] : extra);
        });
        if (pending && typeof pending.then === "function") {
          pending.then(readPresence).catch(function () {
            readPresence([]);
          });
        }
      } catch (err) {
        readPresence([]);
      }
    });
  }
  function stopStream(stream) {
    if (!stream) {
      return;
    }
    try {
      stream.getTracks().forEach(function (value) {
        value.stop();
      });
    } catch (err) {}
  }
  function clearCallTimers() {
    if (callTimer) {
      clearTimeout(callTimer);
    }
    callTimer = null;
    if (talkRaf) {
      cancelAnimationFrame(talkRaf);
    }
    talkRaf = null;
    if (ringTimer) {
      clearInterval(ringTimer);
    }
    ringTimer = null;
  }
  function resetCall() {
    clearCallTimers();
    if (callState.pc) {
      try {
        callState.pc.onicecandidate = null;
        callState.pc.ontrack = null;
        callState.pc.close();
      } catch (err) {}
    }
    stopStream(callState.local);
    callState.state = "idle";
    callState.id = "";
    callState.peer = "";
    callState.peerName = "";
    callState.peerPfp = "";
    callState.video = false;
    callState.pc = null;
    callState.local = null;
    callState.remote = null;
    callState.ice = [];
    callState.offer = "";
    callState.mic = true;
    callState.deaf = false;
    callState.cam = false;
    if (stageEl) {
      stageEl.remove();
      stageEl = null;
    }
    if (ringEl) {
      ringEl.remove();
      ringEl = null;
    }
  }
  function endCall(type, text, kind) {
    var peer = callState.peer;
    var callId = callState.id;
    var state = callState.state;
    if (type && peer && callId && state !== "idle") {
      publishCall({
        type: type
      }).catch(function () {});
    }
    resetCall();
    if (text) {
      toast(text, kind || "wait");
    }
  }
  function svg(inner) {
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">" + inner + "</svg>";
  }
  var ICON_PHONE = svg("<path d=\"M8 4.5h2.2l1.1 3.2-1.6 1a12 12 0 0 0 5.6 5.6l1-1.6 3.2 1.1V16a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 6 6.7 2 2 0 0 1 8 4.5z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/>");
  var ICON_VIDEO = svg("<rect x=\"3.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M14.5 10.5 20 7.8v8.4l-5.5-2.7z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/>");
  var ICON_MIC = svg("<rect x=\"9\" y=\"3.5\" width=\"6\" height=\"10\" rx=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M7 11a5 5 0 0 0 10 0M12 16.5V20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>");
  var ICON_MIC_OFF = svg("<path d=\"M9 10V6.5a3 3 0 0 1 5.2-2M15 11.2V11a3 3 0 0 0-.4-1.5M7 11a5 5 0 0 0 8.2 3.8M12 16.5V20M5 5l14 14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>");
  var ICON_DEAFEN = svg("<path d=\"M4.5 13v2.2A2.3 2.3 0 0 0 6.8 17h1.2v-6H6.5A2 2 0 0 0 4.5 13zm15 0v2.2A2.3 2.3 0 0 1 17.2 17H16v-6h1.5a2 2 0 0 1 2 2z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M6.5 11V9a5.5 5.5 0 0 1 11 0v2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>");
  var ICON_HANGUP = svg("<path d=\"M5 14.5c2.8-2.2 11.2-2.2 14 0l-1.6 2.2a2 2 0 0 1-2.4.7l-1.8-.8a12 12 0 0 0-2.4 0l-1.8.8a2 2 0 0 1-2.4-.7z\" fill=\"currentColor\"/>");
  function callButton(label, icon, onClick) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "call-btn";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    button.onclick = onClick;
    return button;
  }
  function ensureStage() {
    if (stageEl && stageEl.isConnected) {
      return stageEl;
    }
    var stage = document.createElement("div");
    stage.className = "call-stage";
    stage.innerHTML = "<div class=\"call-tile remote\"><video class=\"call-video\" autoplay playsinline></video><img class=\"call-ava\" alt=\"\"><div class=\"call-caption\"></div></div><div class=\"call-tile self\"><video class=\"call-video\" autoplay playsinline muted></video><img class=\"call-ava\" alt=\"\"></div><div class=\"call-status\"></div><div class=\"call-bar\"></div>";
    var callBar = stage.querySelector(".call-bar");
    callBar.appendChild(callButton("Mute", ICON_MIC, function () {
      toggleMic(stage);
    }));
    callBar.appendChild(callButton("Deafen", ICON_DEAFEN, function () {
      toggleDeaf(stage);
    }));
    callBar.appendChild(callButton("Camera", ICON_VIDEO, function () {
      toggleCam(stage);
    }));
    var hangup = callButton("Hang up", ICON_HANGUP, function () {
      if (callState.state === "ringing-out") {
        endCall("call-cancel", "Call canceled", "wait");
      } else {
        endCall("call-hangup", "Call ended", "wait");
      }
    });
    hangup.classList.add("hang");
    callBar.appendChild(hangup);
    stageEl = stage;
    attachStreams();
    return stage;
  }
  function attachStreams() {
    if (!stageEl) {
      return;
    }
    var videos = stageEl.querySelectorAll(".call-video");
    if (videos[0] && callState.remote) {
      videos[0].srcObject = callState.remote;
      videos[0].play().catch(function () {});
    }
    if (videos[1] && callState.local) {
      videos[1].srcObject = callState.local;
      videos[1].play().catch(function () {});
    }
    paintCall();
  }
  function paintCall() {
    if (!stageEl) {
      return;
    }
    var callTileRemote = stageEl.querySelector(".call-tile.remote");
    var callTileSelf = stageEl.querySelector(".call-tile.self");
    var remoteVideo = callTileRemote.querySelector("video");
    var selfVideo = callTileSelf.querySelector("video");
    var remoteAva = callTileRemote.querySelector("img");
    var selfAva = callTileSelf.querySelector("img");
    remoteAva.src = safePfp(callState.peerPfp);
    selfAva.src = safePfp(readChatProfile().pfp);
    var remoteOn = !!callState.remote && !!callState.remote.getVideoTracks().some(function (value) {
      return value.readyState === "live" && value.enabled && !value.muted;
    });
    var localOn = !!callState.cam && !!callState.local && !!callState.local.getVideoTracks().some(function (value) {
      return value.enabled && value.readyState === "live";
    });
    remoteVideo.classList.toggle("on", remoteOn);
    selfVideo.classList.toggle("on", localOn);
    remoteAva.classList.toggle("on", !remoteOn);
    selfAva.classList.toggle("on", !localOn);
    var callCaption = stageEl.querySelector(".call-caption");
    callCaption.textContent = callState.peerName || "Call";
    var callStatus = stageEl.querySelector(".call-status");
    if (callState.state === "ringing-out") {
      callStatus.textContent = "Ringing…";
    } else if (callState.pc && (callState.pc.connectionState === "connected" || callState.pc.connectionState === "completed")) {
      callStatus.textContent = "";
    } else {
      callStatus.textContent = "Connecting…";
    }
    var buttons = stageEl.querySelectorAll(".call-bar .call-btn");
    if (buttons[0]) {
      buttons[0].classList.toggle("off", !callState.mic);
    }
    if (buttons[1]) {
      buttons[1].classList.toggle("off", callState.deaf);
    }
    if (buttons[2]) {
      buttons[2].classList.toggle("off", !callState.cam);
    }
  }
  function placeStage() {
    if (callState.state !== "ringing-out" && callState.state !== "live") {
      if (stageEl) {
        stageEl.remove();
        stageEl = null;
      }
      return;
    }
    var stage = ensureStage();
    var chatMain = document.querySelector("#chatRoot .chat-main");
    var openRoom = document.querySelector("#chatRoot .chat-room.on");
    var openId = openRoom ? openRoom.getAttribute("data-open") : "";
    if (chatMain && openId === "dm:" + callState.peer) {
      stage.classList.remove("is-float");
      if (stage.parentNode !== chatMain) {
        chatMain.insertBefore(stage, chatMain.firstChild);
      }
    } else {
      stage.classList.add("is-float");
      if (stage.parentNode !== document.body) {
        document.body.appendChild(stage);
      }
    }
    paintCall();
  }
  function showIncoming() {
    if (ringEl) {
      ringEl.remove();
    }
    var overlay = document.createElement("div");
    overlay.className = "call-ring";
    var card = document.createElement("div");
    card.className = "call-ring-card";
    var avatar = document.createElement("img");
    avatar.alt = "";
    avatar.src = safePfp(callState.peerPfp);
    var title = document.createElement("h3");
    title.textContent = callState.peerName || "Someone";
    var subtitle = document.createElement("p");
    subtitle.textContent = callState.video ? "Incoming video call" : "Incoming voice call";
    var actions = document.createElement("div");
    actions.className = "call-ring-actions";
    var declineBtn = document.createElement("button");
    declineBtn.type = "button";
    declineBtn.className = "secondary-btn";
    declineBtn.textContent = "Decline";
    declineBtn.onclick = function () {
      endCall("call-decline", "Call declined", "bad");
    };
    var acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "primary-btn";
    acceptBtn.textContent = "Accept";
    acceptBtn.onclick = function () {
      acceptCall();
    };
    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);
    card.appendChild(avatar);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    ringEl = overlay;
    startRingtone();
  }
  function startRingtone() {
    if (ringTimer) {
      clearInterval(ringTimer);
    }
    var audio;
    try {
      audio = new AudioContext();
    } catch (err) {
      return;
    }
    function playRing() {
      if (audio.state === "suspended") {
        audio.resume().catch(function () {});
      }
      var now = audio.currentTime;
      [440, 480].forEach(function (freq, index) {
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audio.destination);
        var at = now + index * 0.22;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.04, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
        osc.start(at);
        osc.stop(at + 0.3);
      });
    }
    playRing();
    ringTimer = setInterval(playRing, 2400);
  }
  function armCallTimeout(ms, text) {
    if (callTimer) {
      clearTimeout(callTimer);
    }
    callTimer = setTimeout(function () {
      if (callState.state === "ringing-out") {
        endCall("call-cancel", text, "wait");
      } else if (callState.state === "live" && callState.pc && callState.pc.connectionState !== "connected" && callState.pc.connectionState !== "completed") {
        endCall("call-hangup", "The call failed. This network blocked the direct connection.", "bad");
      }
    }, ms);
  }
  function getMedia(withVideo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("nomedia"));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      },
      video: withVideo ? {
        facingMode: "user",
        width: {
          ideal: 640
        },
        height: {
          ideal: 360
        }
      } : false
    });
  }
  function ensurePeer() {
    if (callState.pc) {
      return callState.pc;
    }
    var pc = new RTCPeerConnection(iceConfig);
    callState.pc = pc;
    callState.remote = new MediaStream();
    if (callState.local) {
      callState.local.getTracks().forEach(function (value) {
        pc.addTrack(value, callState.local);
      });
    }
    pc.ontrack = function (value) {
      if (!callState.remote) {
        callState.remote = new MediaStream();
      }
      callState.remote.addTrack(value.track);
      value.track.onmute = paintCall;
      value.track.onunmute = paintCall;
      value.track.onended = paintCall;
      attachStreams();
      watchTalking();
    };
    pc.onicecandidate = function (value) {
      if (!value.candidate || callState.state === "idle") {
        return;
      }
      publishCall({
        type: "call-ice",
        candidate: value.candidate.toJSON()
      }).catch(function () {});
    };
    pc.onconnectionstatechange = function () {
      if (!callState.pc) {
        return;
      }
      paintCall();
      if (callState.pc.connectionState === "connected" || callState.pc.connectionState === "completed") {
        if (callTimer) {
          clearTimeout(callTimer);
        }
        callTimer = null;
        paintCall();
      } else if (callState.pc.connectionState === "failed") {
        endCall("call-hangup", "The call failed. This network blocked the direct connection.", "bad");
      } else if (callState.pc.connectionState === "disconnected") {
        armCallTimeout(8000, "The call failed. This network blocked the direct connection.");
      }
    };
    return pc;
  }
  function flushIce() {
    if (!callState.pc || !callState.pc.remoteDescription) {
      return;
    }
    var queued = callState.ice.slice();
    callState.ice = [];
    queued.forEach(function (value) {
      callState.pc.addIceCandidate(value).catch(function () {});
    });
  }
  function acceptOffer(sdp) {
    if (!sdp || sdp.length > 30000) {
      return Promise.resolve();
    }
    if (!callState.pc) {
      callState.offer = sdp;
      return Promise.resolve();
    }
    var pc = callState.pc;
    var ready = Promise.resolve();
    if (pc.signalingState !== "stable") {
      if (!(myUid() < callState.peer)) {
        return Promise.resolve();
      }
      ready = pc.setLocalDescription({
        type: "rollback"
      }).catch(function () {});
    }
    return ready.then(function () {
      return pc.setRemoteDescription({
        type: "offer",
        sdp: sdp
      });
    }).then(function () {
      return pc.createAnswer();
    }).then(function (value) {
      return pc.setLocalDescription(value);
    }).then(function () {
      flushIce();
      return publishCall({
        type: "call-answer",
        sdp: pc.localDescription.sdp
      });
    });
  }
  function startCall(uid, name, pfp, video) {
    if (callState.state !== "idle") {
      toast("You are already in a call", "wait");
      return;
    }
    if (!uid || uid === myUid()) {
      return;
    }
    ensureAbly().then(function (value) {
      if (callState.state !== "idle") {
        return;
      }
      if (!value) {
        toast("The call link is not up yet. Try again in a moment.", "bad");
        return;
      }
      return peerIsOnline(uid);
    }).then(function (online) {
      if (!online) {
        if (online === false) {
          toast("They are not on Veil right now", "bad");
        }
        return;
      }
      return getMedia(!!video).then(function (value) {
        callState.state = "ringing-out";
        callState.id = Math.random().toString(36).slice(2, 10);
        callState.peer = uid;
        callState.peerName = name || "Friend";
        callState.peerPfp = pfp || "";
        callState.video = !!video;
        callState.cam = !!video;
        callState.local = value;
        placeStage();
        armCallTimeout(30000, "No answer");
        return publishCall({
          type: "call-invite"
        });
      });
    }).catch(function (value) {
      resetCall();
      if (value && value.name === "NotAllowedError") {
        toast("Microphone is blocked", "bad");
      } else if (value && value.message === "nomedia") {
        toast("This browser cannot place a call", "bad");
      } else {
        toast("Could not start the call", "bad");
      }
    });
  }
  function acceptCall() {
    if (callState.state !== "ringing-in") {
      return;
    }
    if (ringTimer) {
      clearInterval(ringTimer);
    }
    ringTimer = null;
    if (ringEl) {
      ringEl.remove();
      ringEl = null;
    }
    getMedia(!!callState.video).then(function (value) {
      callState.local = value;
      callState.cam = !!callState.video;
      callState.state = "live";
      ensurePeer();
      placeStage();
      armCallTimeout(20000, "The call failed. This network blocked the direct connection.");
      return publishCall({
        type: "call-accept"
      });
    }).then(function () {
      if (callState.offer) {
        var offerSdp = callState.offer;
        callState.offer = "";
        return acceptOffer(offerSdp);
      }
    }).catch(function (value) {
      publishCall({
        type: "call-decline"
      }).catch(function () {});
      resetCall();
      if (value && value.name === "NotAllowedError") {
        toast("Microphone is blocked", "bad");
      } else {
        toast("Could not join the call", "bad");
      }
    });
  }
  function beginLive() {
    if (callState.state !== "ringing-out" && callState.state !== "live") {
      return;
    }
    callState.state = "live";
    if (ringTimer) {
      clearInterval(ringTimer);
    }
    ensurePeer();
    placeStage();
    armCallTimeout(20000, "The call failed. This network blocked the direct connection.");
    callState.pc.createOffer().then(function (value) {
      return callState.pc.setLocalDescription(value);
    }).then(function () {
      return publishCall({
        type: "call-offer",
        sdp: callState.pc.localDescription.sdp
      });
    }).catch(function () {
      endCall("call-hangup", "Could not start the call", "bad");
    });
  }
  function onCallEvent(event) {
    var me = myUid();
    if (!me || !event || event.to !== me || event.from === me) {
      return;
    }
    if (event.type === "call-invite") {
      if (callState.state !== "idle") {
        var realtime = getAbly();
        if (realtime) {
          realtime.channels.get("veil-chat:in:" + event.from).publish("event", {
            type: "call-busy",
            from: me,
            to: event.from,
            callId: event.callId,
            name: readChatProfile().username || "Someone",
            pfp: readChatProfile().pfp || ""
          }).catch(function () {});
        }
        return;
      }
      callState.state = "ringing-in";
      callState.id = String(event.callId || "");
      callState.peer = String(event.from || "");
      callState.peerName = event.name || "Someone";
      callState.peerPfp = event.pfp || "";
      callState.video = !!event.video;
      showIncoming();
      if (callTimer) {
        clearTimeout(callTimer);
      }
      callTimer = setTimeout(function () {
        if (callState.state === "ringing-in") {
          endCall("call-decline", "Missed call", "wait");
        }
      }, 30000);
      return;
    }
    if (!callState.id || event.callId !== callState.id || event.from !== callState.peer) {
      return;
    }
    if (event.type === "call-accept" && callState.state === "ringing-out") {
      beginLive();
    } else if (event.type === "call-decline") {
      endCall("", "Call declined", "bad");
    } else if (event.type === "call-busy") {
      endCall("", "They are already in a call", "wait");
    } else if (event.type === "call-cancel") {
      endCall("", "Call canceled", "wait");
    } else if (event.type === "call-hangup") {
      endCall("", "Call ended", "wait");
    } else if (event.type === "call-offer") {
      if (callState.state === "ringing-in") {
        callState.offer = event.sdp || "";
      } else {
        acceptOffer(event.sdp || "").catch(function () {});
      }
    } else if (event.type === "call-answer" && callState.pc && event.sdp) {
      if (callState.pc.signalingState === "have-local-offer") {
        callState.pc.setRemoteDescription({
          type: "answer",
          sdp: event.sdp
        }).then(flushIce).catch(function () {});
      }
    } else if (event.type === "call-ice" && event.candidate) {
      if (callState.pc && callState.pc.remoteDescription) {
        callState.pc.addIceCandidate(event.candidate).catch(function () {});
      } else {
        callState.ice.push(event.candidate);
      }
    }
  }
  function toggleMic(stage) {
    callState.mic = !callState.mic;
    if (callState.local) {
      callState.local.getAudioTracks().forEach(function (value) {
        value.enabled = callState.mic && !callState.deaf;
      });
    }
    var micBtn = stage.querySelector(".call-bar .call-btn");
    if (micBtn) {
      micBtn.innerHTML = callState.mic ? ICON_MIC : ICON_MIC_OFF;
    }
    paintCall();
  }
  function toggleDeaf(stage) {
    callState.deaf = !callState.deaf;
    if (callState.local) {
      callState.local.getAudioTracks().forEach(function (value) {
        value.enabled = callState.mic && !callState.deaf;
      });
    }
    var remoteVideo = stage.querySelector(".call-tile.remote video");
    if (remoteVideo) {
      remoteVideo.muted = callState.deaf;
    }
    paintCall();
  }
  function toggleCam(stage) {
    if (!callState.pc || !callState.local) {
      return;
    }
    if (callState.cam) {
      callState.cam = false;
      callState.local.getVideoTracks().forEach(function (value) {
        value.enabled = false;
      });
      paintCall();
      return;
    }
    getMedia(true).then(function (stream) {
      var camTrack = stream.getVideoTracks()[0];
      if (!camTrack) {
        return;
      }
      stream.getAudioTracks().forEach(function (value) {
        value.stop();
      });
      callState.local.addTrack(camTrack);
      callState.cam = true;
      callState.video = true;
      var sender = callState.pc.getSenders().find(function (value) {
        return value.track && value.track.kind === "video";
      });
      var swapped = sender ? sender.replaceTrack(camTrack) : Promise.resolve(callState.pc.addTrack(camTrack, callState.local));
      return swapped.then(function () {
        attachStreams();
        return callState.pc.createOffer();
      }).then(function (value) {
        return callState.pc.setLocalDescription(value);
      }).then(function () {
        return publishCall({
          type: "call-offer",
          sdp: callState.pc.localDescription.sdp
        });
      });
    }).catch(function () {
      toast("Camera is blocked", "bad");
    });
  }
  function watchTalking() {
    if (talkRaf) {
      cancelAnimationFrame(talkRaf);
    }
    if (!callState.remote) {
      return;
    }
    try {
      if (!talkAudio) {
        talkAudio = new AudioContext();
      }
      if (talkAudio.state === "suspended") {
        talkAudio.resume().catch(function () {});
      }
      var source = talkAudio.createMediaStreamSource(callState.remote);
      var analyser = talkAudio.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      var bins = new Uint8Array(analyser.frequencyBinCount);
      function sampleTalk() {
        if (!stageEl || callState.state === "idle") {
          return;
        }
        analyser.getByteFrequencyData(bins);
        var sum = 0;
        for (var bin = 0; bin < bins.length; bin++) {
          sum += bins[bin];
        }
        var callTileRemote = stageEl.querySelector(".call-tile.remote");
        if (callTileRemote) {
          callTileRemote.classList.toggle("talking", sum / bins.length > 16 && !callState.deaf);
        }
        talkRaf = requestAnimationFrame(sampleTalk);
      }
      sampleTalk();
    } catch (err) {}
  }
  function syncCallUi() {
    var head = document.querySelector("#chatRoot .chat-head");
    if (head) {
      var openRoom = document.querySelector("#chatRoot .chat-room.on");
      var openId = openRoom ? openRoom.getAttribute("data-open") || "" : "";
      var callSlot = head.querySelector(".call-slot");
      if (openId.indexOf("dm:") !== 0) {
        if (callSlot) {
          callSlot.remove();
        }
      } else if (!callSlot) {
        var peerUid = openId.slice(3);
        callSlot = document.createElement("div");
        callSlot.className = "call-slot";
        callSlot.appendChild(callButton("Voice call", ICON_PHONE, function () {
          var friend = friendByUid(peerUid);
          var span = openRoom.querySelector("span");
          startCall(peerUid, friend && friend.name || span && span.textContent || "Friend", friend && friend.pfp, false);
        }));
        callSlot.appendChild(callButton("Video call", ICON_VIDEO, function () {
          var friend = friendByUid(peerUid);
          var span = openRoom.querySelector("span");
          startCall(peerUid, friend && friend.name || span && span.textContent || "Friend", friend && friend.pfp, true);
        }));
        head.appendChild(callSlot);
      }
    }
    placeStage();
  }
  function bootCalls() {
    var rootEl = document.body || document.documentElement;
    if (!rootEl) {
      return;
    }
    var queued = false;
    var observer = new MutationObserver(function () {
      if (queued) {
        return;
      }
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        syncCallUi();
      });
    });
    observer.observe(rootEl, {
      childList: true,
      subtree: true
    });
    syncCallUi();
    connectAbly();
    var retry = setInterval(function () {
      if (ablyClient) {
        clearInterval(retry);
        return;
      }
      connectAbly();
    }, 1000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCalls);
  } else {
    bootCalls();
  }
})();