/* Loaded before the app. Adjusts the server address, the tab icon, and the message-dot switch. */
(function () {
  if (window.__veilHook) return;
  window.__veilHook = 1;

  /* Second address for a saved server. The list still shows the original name. */
  var OTHER = {
    va1: "wss://serv-1-va-backup.onrender.com/",
    va2: "wss://serv-2-va-backup.onrender.com/",
    oh3: "wss://serv-3-oh-backup.onrender.com/",
    or4: "wss://serv-4-or-backup.onrender.com/"
  };

  var DOTS_KEY = "veil_msg_dots";
  var picked = "";
  var applied = "";
  var badgeOn = false;
  var quiet = false;
  var pingMemo = {};

  function easternParts(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }).formatToParts(date);
    var out = { year: 1970, month: 1, day: 1 };
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        out[part.type] = Number(part.value);
      }
    }
    return out;
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  /* 31-day months switch on the 16th, 30-day months on the 15th, February on its halfway day. */
  function secondHalf(date) {
    var p = easternParts(date);
    var start = Math.ceil(daysInMonth(p.year, p.month) / 2);
    return p.day >= start;
  }

  function cleanUrl(url) {
    if (typeof normalizeWispUrl === "function") {
      try { return normalizeWispUrl(url) || ""; } catch (e) { return ""; }
    }
    url = String(url || "").trim();
    if (!url) return "";
    url = url.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
    if (!/^wss?:\/\//i.test(url)) url = "wss://" + url;
    if (!/\/$/.test(url)) url += "/";
    return url;
  }

  function selectedServer() {
    try {
      if (typeof allWispServers !== "function" || typeof settings === "undefined" || !settings) return null;
      var all = allWispServers();
      for (var i = 0; i < all.length; i++) {
        if (all[i] && all[i].id === settings.wispId) return all[i];
      }
    } catch (e) {}
    return null;
  }

  function addressPair(server) {
    var normal = cleanUrl(server && server.url);
    var other = cleanUrl(server && (server.alt || server.other || (server.id && OTHER[server.id])));
    if (!other || other === normal) other = "";
    return { normal: normal, other: other };
  }

  function belongs(server, url) {
    var pair = addressPair(server);
    url = cleanUrl(url);
    return !!url && (url === pair.normal || (pair.other && url === pair.other));
  }

  function forgetIfSwitched() {
    var server = selectedServer();
    if (server && picked && !belongs(server, picked)) {
      picked = "";
      applied = "";
    }
    return server;
  }

  function preferred(server) {
    var pair = addressPair(server);
    if (secondHalf(new Date()) && pair.other) return pair.other;
    return pair.normal;
  }

  function fallback(server, active) {
    var pair = addressPair(server);
    if (active && active === pair.normal) return pair.other;
    if (active && active === pair.other) return pair.normal;
    return "";
  }

  function serverForUrl(url) {
    if (typeof allWispServers !== "function") return null;
    var clean = cleanUrl(url);
    if (!clean) return null;
    try {
      var all = allWispServers();
      for (var i = 0; i < all.length; i++) {
        if (belongs(all[i], clean)) return all[i];
      }
    } catch (e) {}
    return null;
  }

  function notePing(url, res, alive) {
    var key = cleanUrl(url);
    if (!key) return;
    var row = pingMemo[key] || {};
    var now = Date.now();
    if (res) {
      row.res = res;
      row.resAt = now;
      row.alive = !(res.offline);
      row.aliveAt = now;
    } else if (alive != null) {
      row.alive = !!alive;
      row.aliveAt = now;
      if (!alive) row.res = null;
    }
    pingMemo[key] = row;
  }

  function socketAlive(url, ms) {
    var clean = cleanUrl(url);
    if (!clean) return Promise.resolve(false);
    var row = pingMemo[clean];
    if (row && row.aliveAt && Date.now() - row.aliveAt < 10000) return Promise.resolve(!!row.alive);
    return new Promise(function (resolve) {
      var finished = false;
      var sock = null;
      function done(ok) {
        if (finished) return;
        finished = true;
        try { if (sock) sock.close(); } catch (e) {}
        notePing(clean, null, ok);
        resolve(!!ok);
      }
      try { sock = new WebSocket(clean); }
      catch (e) { resolve(false); return; }
      var timer = setTimeout(function () { done(false); }, ms || 8000);
      sock.addEventListener("open", function () { clearTimeout(timer); done(true); });
      sock.addEventListener("error", function () { clearTimeout(timer); done(false); });
    });
  }

  function commit(server, url) {
    if (!url) return "";
    url = cleanUrl(url) || url;
    var selected = null;
    try { selected = selectedServer(); } catch (e) {}
    if (server && selected && server.id && server.id === selected.id) picked = url;
    if (picked === url && applied && applied !== url) {
      applied = url;
      if (typeof reconnectTransport === "function") {
        try { reconnectTransport(); } catch (e) {}
      }
    } else if (!applied && picked === url) {
      applied = url;
    }
    return url;
  }

  function resolveAddress() {
    var server = forgetIfSwitched();
    if (!server) return Promise.resolve(picked || "");
    var want = preferred(server);
    var other = fallback(server, want);
    if (!want) return Promise.resolve(picked || "");
    if (!other) return Promise.resolve(commit(server, want));
    return socketAlive(want, 8000).then(function (ok) {
      if (ok) return commit(server, want);
      return socketAlive(other, 8000).then(function (ok2) {
        return commit(server, ok2 ? other : want);
      });
    }).catch(function () {
      return commit(server, other || want);
    });
  }

  function timedPing(orig, url, ms) {
    var key = cleanUrl(url) || String(url || "");
    var row = pingMemo[key];
    if (row && row.res && row.resAt && Date.now() - row.resAt < 10000) return Promise.resolve(row.res);
    return orig(url, ms || 8000).then(function (res) {
      notePing(url, res, !(res && res.offline));
      return res;
    });
  }

  function hookPing() {
    if (typeof pingWisp !== "function" || pingWisp.__hooked) return;
    var orig = pingWisp;
    function wrapped(url, ms) {
      var server = serverForUrl(url);
      if (!server) return orig(url, ms);
      var want = preferred(server);
      var other = fallback(server, want);
      var selected = selectedServer();
      var isSel = !!(selected && server.id === selected.id);
      var first = want;
      if (isSel && picked && belongs(server, picked)) first = picked;
      return timedPing(orig, first, ms).then(function (res) {
        if (res && !res.offline) {
          if (isSel) commit(server, first);
          return res;
        }
        var second = other && other !== first ? other : "";
        if (!second) {
          if (isSel) commit(server, first);
          return res;
        }
        return timedPing(orig, second, ms).then(function (res2) {
          if (res2 && !res2.offline) {
            if (isSel) commit(server, second);
            return res2;
          }
          if (isSel) commit(server, want || first);
          return res || res2;
        });
      });
    }
    wrapped.__hooked = true;
    window.pingWisp = wrapped;
  }

  function dotsOn() {
    try { return localStorage.getItem(DOTS_KEY) === "1"; } catch (e) { return false; }
  }

  function setDots(on) {
    try { localStorage.setItem(DOTS_KEY, on ? "1" : "0"); } catch (e) {}
  }

  function cloakIcon() {
    try {
      if (typeof cloak !== "undefined" && cloak && cloak.icon) return cloak.icon;
    } catch (e) {}
    return "image/favi.png";
  }

  function isVeilIcon(href) {
    var path = String(href || "").split("?")[0].split("#")[0];
    return /(?:^|\/)image\/favi\.png$/.test(path) || /(?:^|\/)favi\.png$/.test(path);
  }

  function setFav(href) {
    var link = document.getElementById("favicon");
    if (!link || !href) return;
    quiet = true;
    link.href = href;
    quiet = false;
  }

  function drawBadge(icon, done) {
    var img = new Image();
    img.onload = function () {
      try {
        var canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        var pen = canvas.getContext("2d");
        pen.drawImage(img, 0, 0, 64, 64);
        pen.beginPath();
        pen.arc(50, 50, 11, 0, Math.PI * 2);
        pen.fillStyle = "#111";
        pen.fill();
        pen.beginPath();
        pen.arc(50, 50, 8, 0, Math.PI * 2);
        pen.fillStyle = "#ff4d4f";
        pen.fill();
        done(canvas.toDataURL("image/png"));
      } catch (e) {
        done("");
      }
    };
    img.onerror = function () { done(""); };
    img.src = icon;
  }

  function paintBadge(on) {
    badgeOn = !!on;
    var icon = cloakIcon();
    if (!badgeOn) {
      setFav(icon);
      return;
    }
    drawBadge(icon, function (data) {
      if (!badgeOn) return;
      setFav(data || icon);
    });
  }

  function watchFavicon() {
    var link = document.getElementById("favicon");
    if (!link || link.__veilWatch) return;
    link.__veilWatch = true;
    new MutationObserver(function () {
      if (quiet) return;
      var href = link.getAttribute("href") || "";
      var icon = cloakIcon();
      if (!isVeilIcon(href) || isVeilIcon(icon)) return;
      if (badgeOn) paintBadge(true);
      else setFav(icon);
    }).observe(link, { attributes: true, attributeFilter: ["href"] });
  }

  function showMessagesInfo() {
    var open = document.querySelector(".modal-overlay.veil-info");
    if (open) open.remove();
    var box = document.createElement("div");
    box.className = "modal-overlay veil-info";
    box.innerHTML = '<div class="modal-box info-modal" role="dialog" aria-modal="true"><h2>Messages</h2><p>Shows a red dot on the tab icon when a new message arrives. The dot stays off until this switch is on.</p><div class="modal-actions"><button type="button" class="primary-btn" data-msg-info-ok>Got it</button></div></div>';
    document.body.appendChild(box);
    var close = function () { try { box.remove(); } catch (e) {} };
    box.querySelector("[data-msg-info-ok]").onclick = close;
    box.onclick = function (e) { if (e.target === box) close(); };
  }

  function addMessagesInfo() {
    var titles = document.querySelectorAll(".setting-title");
    for (var i = 0; i < titles.length; i++) {
      var title = titles[i];
      if ((title.childNodes[0] && title.childNodes[0].textContent || title.textContent || "").trim() !== "Messages") continue;
      if (title.querySelector(".info-btn")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "info-btn";
      btn.setAttribute("data-info", "messages");
      btn.title = "About this option";
      btn.setAttribute("aria-label", "About Messages");
      var img = document.createElement("img");
      img.src = "image/info.svg";
      img.alt = "";
      btn.appendChild(img);
      title.appendChild(document.createTextNode(" "));
      title.appendChild(btn);
    }
  }

  function hookSwitch() {
    var el = document.getElementById("chatNotifySwitch");
    if (!el || el.__veilDots) return;
    el.__veilDots = true;
    el.addEventListener("click", function (e) {
      if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
      var on = !dotsOn();
      setDots(on);
      try {
        if (typeof chatProfile === "function" && typeof saveChatProfile === "function") {
          var profile = chatProfile();
          profile.notifyDot = on;
          saveChatProfile(profile);
        }
      } catch (err) {}
      if (typeof setSwitch === "function") setSwitch(el, on);
      if (typeof paintChatAlerts === "function") paintChatAlerts();
    }, true);
    if (typeof setSwitch === "function") setSwitch(el, dotsOn());
  }

  function hookApp() {
    if (typeof currentWisp !== "function" || currentWisp.__hooked) return false;
    var original = currentWisp;

    function hookedCurrent() {
      var server = forgetIfSwitched();
      if (picked) return picked;
      var url = server ? preferred(server) : "";
      if (url) {
        resolveAddress();
        return url;
      }
      return original();
    }
    hookedCurrent.__hooked = true;
    window.currentWisp = hookedCurrent;

    window.useWorkingWisp = function () {
      forgetIfSwitched();
      if (picked) return Promise.resolve(picked);
      return resolveAddress().then(function (url) {
        return url || original();
      });
    };

    if (typeof chatProfile === "function" && !chatProfile.__hooked) {
      var originalProfile = chatProfile;
      function hookedProfile() {
        var profile = originalProfile();
        if (profile && typeof profile === "object") profile.notifyDot = dotsOn();
        return profile;
      }
      hookedProfile.__hooked = true;
      window.chatProfile = hookedProfile;
    }

    if (typeof paintBrowserBadge === "function") window.paintBrowserBadge = paintBadge;
    hookPing();
    hookSwitch();
    watchFavicon();
    return true;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.info-btn[data-info="messages"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    showMessagesInfo();
  }, true);

  function boot() {
    addMessagesInfo();
    watchFavicon();
    hookSwitch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.__veilBind = function () {
    try { hookApp(); } catch (e) {}
  };

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    boot();
    if (hookApp() || tries > 400) clearInterval(timer);
  }, 50);

  setInterval(function () {
    if (typeof currentWisp !== "function" || !currentWisp.__hooked) return;
    resolveAddress();
  }, 60000);
})();
