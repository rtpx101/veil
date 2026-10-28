/* Loaded before the app. Adjusts the server address, the tab icon, and the message-dot switch. */
(function () {
  if (window.__veilHook) return;
  window.__veilHook = 1;

  /* Second address for a saved server, keyed by the id the page already stores.
     The list keeps showing that name. Leave a server out when it only has one address. */
  var OTHER = {
    va1: "wss://serv-1-va-backup.onrender.com/",
    va2: "wss://serv-2-va-backup.onrender.com/",
    oh3: "wss://serv-3-oh-backup.onrender.com/",
    or4: "wss://serv-4-or-backup.onrender.com/"
  };

  var DOTS_KEY = "veil_msg_dots";
  var picked = "";
  var badgeOn = false;
  var quiet = false;

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
    if (!/\/$/.test(url)) url += "/";
    return url;
  }

  function selectedServer() {
    if (typeof allWispServers !== "function" || typeof settings === "undefined" || !settings) return null;
    var all = allWispServers();
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].id === settings.wispId) return all[i];
    }
    return null;
  }

  function addressPair(server) {
    var normal = cleanUrl(server && server.url);
    var other = cleanUrl(server && (server.alt || server.other || (server.id && OTHER[server.id])));
    if (!other || other === normal) other = "";
    return { normal: normal, other: other };
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
    var all = allWispServers();
    for (var i = 0; i < all.length; i++) {
      var pair = addressPair(all[i]);
      if (clean === pair.normal || (pair.other && clean === pair.other)) return all[i];
    }
    return null;
  }

  function resolveAddress() {
    var server = selectedServer();
    if (!server) return Promise.resolve("");
    var active = preferred(server);
    var other = fallback(server, active);
    if (!active) return Promise.resolve("");
    if (!other || typeof probeWisp !== "function") {
      picked = active;
      return Promise.resolve(active);
    }
    return probeWisp(active).then(function (ok) {
      if (ok) {
        picked = active;
        return active;
      }
      return probeWisp(other).then(function (ok2) {
        if (ok2) {
          picked = other;
          return other;
        }
        picked = "";
        return "";
      });
    }).catch(function () {
      picked = "";
      return "";
    });
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
    box.innerHTML = '<div class="modal-box info-modal" role="dialog" aria-modal="true"><h2>Messages</h2><p>Shows a red dot on the tab icon when a new message arrives. It stays off until this switch is on.</p><div class="modal-actions"><button type="button" class="primary-btn" data-msg-info-ok>Got it</button></div></div>';
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
    el.onclick = function () {
      var on = !dotsOn();
      setDots(on);
      try {
        if (typeof chatProfile === "function" && typeof saveChatProfile === "function") {
          var profile = chatProfile();
          profile.notifyDot = on;
          saveChatProfile(profile);
        }
      } catch (e) {}
      if (typeof setSwitch === "function") setSwitch(el, on);
      if (typeof paintChatAlerts === "function") paintChatAlerts();
    };
    if (typeof setSwitch === "function") setSwitch(el, dotsOn());
  }

  function hookApp() {
    if (typeof currentWisp !== "function" || currentWisp.__hooked) return false;
    var original = currentWisp;
    var originalUse = typeof useWorkingWisp === "function" ? useWorkingWisp : null;
    var originalPing = typeof pingWisp === "function" ? pingWisp : null;

    function hookedCurrent() {
      if (picked) return picked;
      var server = selectedServer();
      var url = server ? preferred(server) : "";
      if (url) return url;
      return original();
    }
    hookedCurrent.__hooked = true;
    window.currentWisp = hookedCurrent;

    window.useWorkingWisp = function () {
      return resolveAddress().then(function (url) {
        if (url) return url;
        if (originalUse) return originalUse();
        return original();
      });
    };

    if (originalPing && !originalPing.__hooked) {
      function hookedPing(url, timeout) {
        var server = serverForUrl(url);
        if (!server) return originalPing(url, timeout);
        var first = preferred(server);
        var second = fallback(server, first);
        return originalPing(first, timeout).then(function (res) {
          if (!res || !res.offline || !second || second === first) return res;
          return originalPing(second, timeout);
        });
      }
      hookedPing.__hooked = true;
      window.pingWisp = hookedPing;
    }

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
    hookSwitch();
    watchFavicon();
    return true;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.info-btn[data-info="messages"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    showMessagesInfo();
  }, true);

  function boot() {
    addMessagesInfo();
    watchFavicon();
    hookSwitch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    boot();
    if (hookApp() || tries > 400) clearInterval(timer);
  }, 50);

  setInterval(function () {
    if (typeof currentWisp !== "function" || !currentWisp.__hooked) return;
    var previous = picked;
    resolveAddress().then(function (url) {
      if (url && previous && url !== previous && typeof reconnectTransport === "function") {
        try { reconnectTransport(); } catch (e) {}
      }
    });
  }, 60000);
})();
