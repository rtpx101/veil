(function () {
  try {
    var params = new URLSearchParams(location.search);
    if (params.get("worker")) {
      localStorage.setItem("veil_worker_url", params.get("worker").replace(/\/$/, ""));
    }
  } catch (err) {}
  var workerUrl = (localStorage.getItem("veil_worker_url") || "https://veil-access.retropixel404.workers.dev").replace(/\/$/, "");
  var accessToken = "veil_access_token";
  var accessMeta = "veil_access_meta";
  var pendingEmailKey = "veil_pending_email";
  var accessGate = document.getElementById("accessGate");
  var browser = document.getElementById("browser") || document.getElementById("app");
  var accessMsg = document.getElementById("accessMsg");
  var gateAuthBox = document.getElementById("gateAuthBox") || accessGate && accessGate.querySelector(".box");
  function readCookie(value) {
    try {
      var state = document.cookie.split(";");
      for (var current = 0; current < state.length; current++) {
        var saved = state[current].trim();
        if (saved.indexOf(encodeURIComponent(value) + "=") === 0) {
          return decodeURIComponent(saved.slice(encodeURIComponent(value).length + 1));
        }
      }
    } catch (err) {}
    return "";
  }
  function writeCookie(value, extra, other) {
    try {
      var base = other == null ? 34560000 : other;
      document.cookie = encodeURIComponent(value) + "=" + encodeURIComponent(extra || "") + "; path=/; max-age=" + base + "; SameSite=Lax";
    } catch (err) {}
  }
  function clearCookie(value) {
    try {
      document.cookie = encodeURIComponent(value) + "=; path=/; max-age=0; SameSite=Lax";
    } catch (err) {}
  }
  function getToken() {
    try {
      return localStorage.getItem(accessToken) || sessionStorage.getItem(accessToken) || readCookie(accessToken) || "";
    } catch (err2) {
      try {
        return sessionStorage.getItem(accessToken) || readCookie(accessToken) || "";
      } catch (err) {}
      return readCookie(accessToken) || "";
    }
  }
  var liveTimer = null;
  var sessionMeta = null;
  function stopLivePoll() {
    if (liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  }
  function setToken(value, extra) {
    try {
      if (value) {
        localStorage.setItem(accessToken, value);
        sessionStorage.setItem(accessToken, value);
      } else {
        localStorage.removeItem(accessToken);
        sessionStorage.removeItem(accessToken);
      }
    } catch (err) {}
    if (!value) {
      clearCookie(accessToken);
      try {
        localStorage.removeItem(accessMeta);
      } catch (err) {}
      sessionMeta = null;
      stopLivePoll();
      return;
    }
    var word = 34560000;
    if (extra && extra.hasAccess && !extra.infinite && extra.expires) {
      var letter = Math.floor((Number(extra.expires) - Date.now()) / 1000);
      if (letter > 0) {
        word = Math.max(letter, 60);
      }
    }
    writeCookie(accessToken, value, word);
    sessionMeta = extra || null;
    try {
      localStorage.setItem(accessMeta, JSON.stringify({
        email: extra && extra.email,
        expires: extra && extra.expires,
        infinite: extra && extra.infinite,
        status: extra && extra.status,
        remainingMs: extra && extra.remainingMs,
        remainingLabel: extra && extra.remainingLabel,
        hasAccess: extra && extra.hasAccess
      }));
    } catch (err) {}
    try {
      window.dispatchEvent(new CustomEvent("veil-session-meta", {
        detail: extra
      }));
    } catch (err) {}
  }
  function clearToken() {
    setToken("", null);
    try {
      localStorage.removeItem(pendingEmailKey);
    } catch (err) {}
  }
  function isNetworkError(value) {
    if (!value || !value.res || value.res.status === 0) {
      return true;
    }
    var hash = String(value.data && value.data.error || "").toLowerCase();
    return hash.indexOf("could not reach") !== -1 || hash.indexOf("network") !== -1 || hash.indexOf("failed to fetch") !== -1 || hash.indexOf("offline") !== -1;
  }
  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(accessMeta) || "null");
    } catch (err) {
      return null;
    }
  }
  function restoreSession(value2) {
    var secret = readMeta();
    if (secret) {
      sessionMeta = secret;
    }
    if (!window.__VEIL_ACCESS_OK && (!secret || secret.hasAccess)) {
      unlockApp();
    }
    var addr = 0;
    function retrySession() {
      addr += 1;
      api("/api/session/check", {
        token: value2
      }).then(function (value) {
        if (isNetworkError(value)) {
          if (addr < 8) {
            setTimeout(retrySession, 2500);
          }
          return;
        }
        if (value.data && value.data.ok && value.data.user && value.data.user.hasAccess) {
          setToken(value2, value.data.user);
          if (!window.__VEIL_ACCESS_OK) {
            unlockApp();
          }
          return;
        }
        if (value.data && value.data.reason) {
          handleAuthResult(value.data, value.data.token || value2);
        }
      });
    }
    setTimeout(retrySession, 1500);
  }
  function startLivePoll() {
    stopLivePoll();
    liveTimer = setInterval(function () {
      var item = getToken();
      if (!item) {
        stopLivePoll();
        return;
      }
      api("/api/session/check", {
        token: item
      }).then(function (value) {
        if (isNetworkError(value)) {
          return;
        }
        if (!value.data) {
          return;
        }
        if (value.data.ok && value.data.user && value.data.user.hasAccess) {
          setToken(item, value.data.user);
          return;
        }
        stopLivePoll();
        window.__VEIL_ACCESS_OK = false;
        window.__VEIL_UNLOCKING = false;
        handleAuthResult(value.data, item);
        try {
          window.dispatchEvent(new CustomEvent("veil-access-revoked", {
            detail: value.data
          }));
        } catch (err) {}
      });
    }, 12000);
  }
  function doSignOut() {
    var link = getToken();
    if (link) {
      api("/api/auth/logout", {
        token: link
      }).catch(function () {});
    }
    clearToken();
    stopLivePoll();
    stopPendingPoll();
    window.__VEIL_ACCESS_OK = false;
    window.__VEIL_UNLOCKING = false;
    try {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (err) {}
    try {
      document.body.classList.add("gate-lock");
      if (browser) {
        browser.style.display = "none";
      }
    } catch (err) {}
    showGate(part, false);
    showPanel("login");
  }
  window.VeilAccess = {
    getToken: getToken,
    signOut: doSignOut,
    getMeta: function () {
      try {
        return sessionMeta || JSON.parse(localStorage.getItem(accessMeta) || "null");
      } catch (err) {
        return null;
      }
    },
    getUser: function () {
      return sessionMeta;
    },
    checkNow: function () {
      return checkSession();
    }
  };
  function closeChromeExtras() {
    try {
      document.querySelectorAll(".panel, #settingsPanel, #historyPanel, #bookmarksPanel").forEach(function (value) {
        value.classList.remove("open", "show");
        value.style.removeProperty("display");
      });
      var mainMenu = document.getElementById("mainMenu") || document.getElementById("menu");
      if (mainMenu) {
        mainMenu.classList.remove("open");
        mainMenu.style.removeProperty("display");
      }
      var backdrop = document.getElementById("backdrop");
      if (backdrop) {
        backdrop.classList.remove("show", "open");
        backdrop.style.removeProperty("display");
      }
    } catch (err) {}
  }
  function dismissBoot(value) {
    var veilBoot = document.getElementById("veilBoot");
    if (!veilBoot) {
      return;
    }
    if (veilBoot.classList.contains("err") && !value) {
      return;
    }
    if (value) {
      try {
        if (veilBoot.parentNode) {
          veilBoot.parentNode.removeChild(veilBoot);
        }
      } catch (err) {}
      return;
    }
    veilBoot.classList.add("done");
    setTimeout(function () {
      try {
        if (veilBoot.parentNode) {
          veilBoot.parentNode.removeChild(veilBoot);
        }
      } catch (err) {}
    }, 760);
  }
  function setBodyLocked(value) {
    document.body.classList.toggle("gate-lock", !!value);
    if (value) {
      closeChromeExtras();
    }
  }
  function ensureBlockedLayer() {
    var accessBlocked = document.getElementById("accessBlocked");
    if (accessBlocked) {
      return accessBlocked;
    }
    accessBlocked = document.createElement("div");
    accessBlocked.id = "accessBlocked";
    accessBlocked.innerHTML = "<div class=\"blocked-panel\"><h2>You are blocked from entering Veil</h2><p class=\"blocked-time\" id=\"blockedTimeMsg\"></p></div>";
    document.body.appendChild(accessBlocked);
    return accessBlocked;
  }
  function showBlack() {
    setBodyLocked(true);
    if (browser) {
      browser.style.display = "none";
    }
    var accessBlocked = document.getElementById("accessBlocked");
    if (accessBlocked) {
      accessBlocked.style.display = "none";
    }
    if (accessGate) {
      accessGate.style.display = "flex";
      accessGate.classList.add("checking");
      accessGate.classList.remove("is-blocked");
    }
    if (gateAuthBox) {
      gateAuthBox.style.visibility = "hidden";
    }
    if (accessMsg) {
      accessMsg.textContent = "";
    }
  }
  var part = "Sign in with your email to use Veil";
  function setMsg(value, extra, other) {
    if (!accessMsg) {
      return;
    }
    clearTimeout(accessMsg._t);
    accessMsg.textContent = value || part;
    accessMsg.style.color = extra ? "#ff5c5c" : "#888888";
    if (other && extra && value) {
      accessMsg._t = setTimeout(function () {
        accessMsg.textContent = part;
        accessMsg.style.color = "#888888";
      }, 4000);
    }
  }
  function showPanel(value2) {
    document.querySelectorAll(".gate-panel").forEach(function (value) {
      value.classList.toggle("active", value.id === "panel" + value2.charAt(0).toUpperCase() + value2.slice(1));
    });
    var colorA = {
      login: "panelLogin",
      signup: "panelSignup",
      verify: "panelVerify",
      pending: "panelPending"
    };
    document.querySelectorAll(".gate-panel").forEach(function (value) {
      value.classList.remove("active");
    });
    var colorB = document.getElementById(colorA[value2] || "panelLogin");
    if (colorB) {
      colorB.classList.add("active");
    }
    document.querySelectorAll("[data-gate-tab]").forEach(function (value) {
      value.classList.toggle("active", value.getAttribute("data-gate-tab") === value2);
    });
    var gateTabs = document.querySelector(".gate-tabs");
    if (gateTabs) {
      gateTabs.style.display = value2 === "login" || value2 === "signup" ? "flex" : "none";
    }
    var gateSub = document.getElementById("gateSub");
    if (gateSub) {
      if (value2 === "pending" || value2 === "verify") {
        gateSub.textContent = "";
        gateSub.classList.add("hidden-sub");
      } else {
        gateSub.classList.remove("hidden-sub");
        gateSub.textContent = "Sign in to continue";
      }
    }
  }
  function getOtpCode() {
    var profile = document.querySelectorAll(".otp-digit");
    var cloak = "";
    profile.forEach(function (value) {
      cloak += String(value.value || "").replace(/\D/g, "").slice(0, 1);
    });
    var verifyCode = document.getElementById("verifyCode");
    if (verifyCode) {
      verifyCode.value = cloak;
    }
    return cloak;
  }
  function clearOtp() {
    document.querySelectorAll(".otp-digit").forEach(function (value) {
      value.value = "";
    });
    var verifyCode = document.getElementById("verifyCode");
    if (verifyCode) {
      verifyCode.value = "";
    }
  }
  function wireOtpInputs() {
    var historyItem = Array.prototype.slice.call(document.querySelectorAll(".otp-digit"));
    if (!historyItem.length) {
      return;
    }
    historyItem.forEach(function (value2, extra) {
      value2.addEventListener("input", function () {
        var reason = String(value2.value || "").replace(/\D/g, "");
        if (reason.length > 1) {
          for (var note = 0; note < historyItem.length; note++) {
            historyItem[note].value = reason[note] || "";
          }
          getOtpCode();
          if (reason.length >= 6 && verifyBtn) {
            verifyBtn.click();
          } else {
            historyItem[Math.min(reason.length, historyItem.length - 1)].focus();
          }
          return;
        }
        value2.value = reason.slice(0, 1);
        getOtpCode();
        if (!value2.value) {
          if (value2._veilDel) {
            value2._veilDel = false;
            return;
          }
          if (extra > 0) {
            historyItem[extra - 1].focus();
          }
          return;
        }
        if (extra < historyItem.length - 1) {
          historyItem[extra + 1].focus();
        }
      });
      value2.addEventListener("keydown", function (value) {
        if (value.key === "Backspace" || value.key === "Delete") {
          value.preventDefault();
          value2._veilDel = true;
          if (value2.value) {
            value2.value = "";
            getOtpCode();
            if (extra > 0) {
              historyItem[extra - 1].focus();
            }
          } else if (extra > 0) {
            historyItem[extra - 1].value = "";
            getOtpCode();
            historyItem[extra - 1].focus();
          }
          return;
        }
        if (value.key === "Enter" && verifyBtn) {
          verifyBtn.click();
        }
      });
      value2.addEventListener("paste", function (value) {
        var force = (value.clipboardData || window.clipboardData).getData("text") || "";
        force = force.replace(/\D/g, "").slice(0, 6);
        if (!force) {
          return;
        }
        value.preventDefault();
        for (var immediate = 0; immediate < historyItem.length; immediate++) {
          historyItem[immediate].value = force[immediate] || "";
        }
        getOtpCode();
        if (force.length >= 6 && verifyBtn) {
          verifyBtn.click();
        } else if (force.length < historyItem.length) {
          historyItem[force.length].focus();
        }
      });
      value2.addEventListener("focus", function () {
        value2.select();
      });
    });
  }
  function showGate(value, extra) {
    setBodyLocked(true);
    closeChromeExtras();
    if (browser) {
      browser.style.display = "none";
    }
    var accessBlocked = document.getElementById("accessBlocked");
    if (accessBlocked) {
      accessBlocked.style.display = "none";
    }
    if (accessGate) {
      accessGate.style.display = "flex";
      accessGate.classList.remove("checking", "is-blocked");
    }
    if (gateAuthBox) {
      gateAuthBox.style.visibility = "visible";
    }
    setMsg(value || part, !!extra, !!extra);
    dismissBoot(false);
  }
  var input = null;
  function stopPendingPoll() {
    if (input) {
      clearInterval(input);
      input = null;
    }
  }
  function startPendingPoll() {
    stopPendingPoll();
    input = setInterval(function () {
      quietCheckAccess(true);
    }, 8000);
  }
  function showPending(value, extra) {
    stopLivePoll();
    window.__VEIL_ACCESS_OK = false;
    window.__VEIL_UNLOCKING = false;
    var group = value && value.email || "";
    try {
      if (group) {
        localStorage.setItem(pendingEmailKey, group);
      } else {
        group = localStorage.getItem(pendingEmailKey) || "";
      }
    } catch (err) {}
    var pending = extra || "pending";
    if (!extra && value) {
      if (value.status === "expired" || value.hasAccess === false && value.status === "allowed") {
        pending = "expired";
      } else if (value.status === "expired") {
        pending = "expired";
      }
    }
    showGate("", false);
    if (accessMsg) {
      accessMsg.textContent = "";
    }
    showPanel("pending");
    setGoogleVisible(false);
    var pendingTitle = document.getElementById("pendingTitle");
    var pendingEmail = document.getElementById("pendingEmail");
    var pendingText = document.getElementById("pendingText");
    var pendingHint = document.getElementById("pendingHint");
    var panelPendingPendingIcon = document.querySelector("#panelPending .pending-icon");
    if (pendingEmail) {
      pendingEmail.textContent = group || "";
    }
    if (pending === "expired" || pending === "signed_out") {
      if (pendingTitle) {
        pendingTitle.textContent = "Access paused";
      }
      if (pendingText) {
        pendingText.textContent = "Your time on Veil has run out. Ask an admin to add more time, then tap Check status.";
      }
      if (pendingHint) {
        pendingHint.textContent = "Stay on this page — we’ll keep checking automatically.";
      }
      if (panelPendingPendingIcon) {
        panelPendingPendingIcon.className = "pending-icon status-wait";
      }
    } else {
      if (pendingTitle) {
        pendingTitle.textContent = "Almost there";
      }
      if (pendingText) {
        pendingText.textContent = "Your account is ready. An admin still needs to approve you and add access time before you can browse.";
      }
      if (pendingHint) {
        pendingHint.textContent = "You can leave this open. We’ll check every few seconds and let you in when you’re approved.";
      }
      if (panelPendingPendingIcon) {
        panelPendingPendingIcon.className = "pending-icon status-wait";
      }
    }
    startPendingPoll();
  }
  function quietCheckAccess(value2) {
    var value3 = getToken();
    if (!value3) {
      stopPendingPoll();
      return;
    }
    var pendingRefreshBtn = document.getElementById("pendingRefreshBtn");
    if (pendingRefreshBtn && !value2) {
      pendingRefreshBtn.disabled = true;
      pendingRefreshBtn.textContent = "Checking…";
    }
    api("/api/session/check", {
      token: value3
    }).then(function (value) {
      if (pendingRefreshBtn && !value2) {
        pendingRefreshBtn.disabled = false;
        pendingRefreshBtn.textContent = "Check status";
      }
      if (!value.data) {
        return;
      }
      if (value.data.ok && value.data.user && value.data.user.hasAccess) {
        stopPendingPoll();
        setToken(value3, value.data.user);
        unlockApp();
        return;
      }
      if (value.data.user || value.data.reason) {
        var pending = value.data.reason || value.data.user && value.data.user.status || "pending";
        if (pending === "banned") {
          stopPendingPoll();
          handleAuthResult(value.data, value3);
          return;
        }
        showPending(value.data.user, pending === "signed_out" ? "expired" : pending);
      }
    });
  }
  function showBlocked(value) {
    setBodyLocked(true);
    closeChromeExtras();
    if (browser) {
      browser.style.display = "none";
    }
    if (accessGate) {
      accessGate.style.display = "none";
    }
    var detail = ensureBlockedLayer();
    detail.style.display = "flex";
    var blockedTimeMsg = document.getElementById("blockedTimeMsg");
    if (blockedTimeMsg) {
      blockedTimeMsg.textContent = value || "Contact an admin if you think this is a mistake.";
    }
    dismissBoot(false);
  }
  function ensureAppLoader() {
    var veilAppLoad = document.getElementById("veilAppLoad");
    if (veilAppLoad) {
      veilAppLoad.classList.remove("done");
      veilAppLoad.style.opacity = "1";
      veilAppLoad.style.visibility = "visible";
      veilAppLoad.style.display = "flex";
      return veilAppLoad;
    }
    veilAppLoad = document.createElement("div");
    veilAppLoad.id = "veilAppLoad";
    veilAppLoad.innerHTML = "<div class=\"boot-card\"><div class=\"boot-mark\"><img src=\"image/favi.png\" alt=\"\" onerror=\"this.style.display='none'\"></div><div class=\"boot-title\">Veil</div><div class=\"boot-sub\" id=\"veilAppLoadSub\">Loading browser…</div><div class=\"boot-bar\"><i></i></div></div>";
    veilAppLoad.style.cssText = "position:fixed;inset:0;z-index:200000;display:flex;align-items:center;justify-content:center;background:#0c0c0c;flex-direction:column;padding:28px;transition:opacity .5s ease,visibility .5s ease;opacity:1;visibility:visible";
    document.body.appendChild(veilAppLoad);
    return veilAppLoad;
  }
  function loadScript(value2) {
    return new Promise(function (value, extra) {
      var src = document.querySelector("script[src=\"" + value2 + "\"]");
      if (src) {
        value();
        return;
      }
      var dest = document.createElement("script");
      dest.src = value2;
      dest.async = false;
      dest.onload = function () {
        value();
      };
      dest.onerror = function () {
        extra(new Error("Failed to load " + value2));
      };
      document.body.appendChild(dest);
    });
  }
  function unlockApp() {
    if (window.__VEIL_UNLOCKING || window.__VEIL_ACCESS_OK) {
      return;
    }
    window.__VEIL_UNLOCKING = true;
    stopPendingPoll();
    var veilBoot = document.getElementById("veilBoot");
    var kind = veilBoot && !veilBoot.classList.contains("done") && !veilBoot.classList.contains("err");
    if (!kind) {
      dismissBoot(true);
    }
    if (accessGate) {
      accessGate.style.display = "none";
    }
    var accessBlocked = document.getElementById("accessBlocked");
    if (accessBlocked) {
      accessBlocked.style.display = "none";
    }
    function setBootSub(value) {
      var bootSub = document.getElementById("bootSub");
      if (bootSub) {
        bootSub.textContent = value;
      }
    }
    setBootSub("Loading browser…");
    startLivePoll();
    Promise.resolve().then(function () {
      setBootSub("Loading connection…");
      return loadScript("baremux/index.js");
    }).then(function () {
      setBootSub("Loading engine…");
      return loadScript("scramjet/scramjet.all.js");
    }).then(function () {
      setBootSub("Starting Veil…");
      return loadScript("veil-app.js");
    }).then(function () {
      window.__VEIL_ACCESS_OK = true;
      setBodyLocked(false);
      if (browser) {
        browser.style.display = "";
      }
      document.body.classList.add("boot-reveal");
      try {
        window.dispatchEvent(new CustomEvent("veil-access-ok"));
      } catch (err) {}
      try {
        if (typeof window.__veilStartApp === "function") {
          window.__veilStartApp();
        } else if (typeof window.bootVeilApp === "function") {
          window.bootVeilApp();
        }
      } catch (err) {
        console.error(err);
      }
      if (kind) {
        dismissBoot(false);
      }
      window.__VEIL_UNLOCKING = false;
      setTimeout(function () {
        document.body.classList.remove("boot-reveal");
      }, 700);
    }).catch(function (value) {
      window.__VEIL_UNLOCKING = false;
      setBootSub("Could not load Veil");
      if (veilBoot) {
        veilBoot.classList.add("err");
        var bootErrorMsg = document.getElementById("bootErrorMsg");
        if (bootErrorMsg) {
          bootErrorMsg.textContent = String(value && value.message || value);
        }
        var bootRetry = document.getElementById("bootRetry");
        if (bootRetry) {
          bootRetry.onclick = function () {
            location.reload();
          };
        }
      }
    });
  }
  function api(value3, extra) {
    return fetch(workerUrl + value3, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(extra || {})
    }).then(function (value2) {
      return value2.json().catch(function () {
        return {};
      }).then(function (value) {
        return {
          res: value2,
          data: value
        };
      });
    }).catch(function (value) {
      return {
        res: {
          ok: false,
          status: 0
        },
        data: {
          ok: false,
          error: "Could not reach server"
        }
      };
    });
  }
  function handleAuthResult(value, extra) {
    value = value || {};
    var password = value.user || null;
    var response = extra || value.token || "";
    if (value.ok && password && password.hasAccess) {
      if (response) {
        setToken(response, password);
      }
      unlockApp();
      return;
    }
    if (value.reason === "banned") {
      if (response) {
        setToken(response, password);
      }
      showBlocked((value.error || "You are banned from Veil") + "");
      return;
    }
    var clientId = value.reason === "unverified" || value.needsVerify || password && password.emailVerified === false;
    if (clientId) {
      if (password && password.email) {
        try {
          localStorage.setItem(pendingEmailKey, password.email);
        } catch (err) {}
      }
      if (!password || password.emailVerified === false) {
        try {
          localStorage.removeItem(accessToken);
          clearCookie(accessToken);
        } catch (err) {}
        sessionMeta = password || null;
      }
      showGate(value.error || "Enter the code sent to your email", false);
      showPanel("verify");
      clearOtp();
      return;
    }
    if (value.reason === "pending" || value.reason === "expired" || value.reason === "signed_out" || password && password.emailVerified && !password.hasAccess) {
      if (response) {
        setToken(response, password);
      }
      var pending = "pending";
      if (value.reason === "expired" || value.reason === "signed_out") {
        pending = "expired";
      } else if (password && password.status === "expired") {
        pending = "expired";
      }
      showPending(password, pending);
      return;
    }
    if (!value.ok) {
      showGate(value.error || "Sign in failed", true);
      showPanel("login");
    }
  }
  function checkSession() {
    var body = getToken();
    if (!body) {
      setTimeout(function () {
        if (getToken() && !window.__VEIL_ACCESS_OK) {
          checkSession();
        }
      }, 700);
      showGate(part, false);
      showPanel("login");
      return Promise.resolve();
    }
    if (!window.__VEIL_ACCESS_OK) {
      setBodyLocked(true);
      if (browser) {
        browser.style.display = "none";
      }
    }
    return api("/api/session/check", {
      token: body
    }).then(function (value) {
      if (isNetworkError(value) || !value.data) {
        restoreSession(body);
        return;
      }
      if (value.data.ok && value.data.user && value.data.user.hasAccess) {
        setToken(body, value.data.user);
        unlockApp();
        return;
      }
      if (!value.data.reason && !value.data.needsVerify && (!value.data.user || value.data.user.emailVerified !== false)) {
        restoreSession(body);
        return;
      }
      if (value.data.reason === "unverified" || value.data.needsVerify) {
        clearToken();
        if (value.data.user && value.data.user.email) {
          try {
            localStorage.setItem(pendingEmailKey, value.data.user.email);
          } catch (err) {}
        }
        showGate("Verify your email, then log in", false);
        showPanel("login");
        return;
      }
      if (value.data.token) {
        body = value.data.token;
      }
      if (body) {
        setToken(body, value.data.user || null);
      }
      handleAuthResult(value.data, body);
    });
  }
  function bootCheck() {
    var token = getToken();
    if (!token) {
      return;
    }
    if (!window.__VEIL_ACCESS_OK) {
      restoreSession(token);
    }
    setTimeout(function () {
      checkSession();
    }, 800);
  }
  document.querySelectorAll("[data-gate-tab]").forEach(function (value) {
    value.addEventListener("click", function () {
      showPanel(value.getAttribute("data-gate-tab"));
      setMsg(part, false);
    });
  });
  var loginBtn = document.getElementById("loginBtn");
  var signupBtn = document.getElementById("signupBtn");
  var verifyBtn = document.getElementById("verifyBtn");
  var backToLoginBtn = document.getElementById("backToLoginBtn");
  var pendingRefreshBtn2 = document.getElementById("pendingRefreshBtn");
  var pendingLogoutBtn = document.getElementById("pendingLogoutBtn");
  function accountMissing(value) {
    var data = String(value && value.reason || "").toLowerCase();
    var msg = String(value && value.error || "").toLowerCase();
    if (data === "not_found" || data === "unknown" || data === "no_account") {
      return true;
    }
    return /not found|no account|does not exist|unknown user|unknown email|no user/.test(msg);
  }
  function openVerify(value, extra) {
    try {
      localStorage.setItem(pendingEmailKey, String(value || "").trim().toLowerCase());
    } catch (err) {}
    clearToken();
    try {
      localStorage.setItem(pendingEmailKey, String(value || "").trim().toLowerCase());
    } catch (err) {}
    showGate("", false);
    showPanel("verify");
    clearOtp();
    setMsg(extra || "We emailed you a 6-digit code. Enter it below.", false);
  }
  function markOtpInvalid() {
    var otpRow = document.getElementById("otpRow");
    if (!otpRow) {
      return;
    }
    otpRow.classList.remove("otp-bad");
    otpRow.offsetWidth;
    otpRow.classList.add("otp-bad");
  }
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  }
  function clearPasswordFields() {
    ["loginPass", "signupPass"].forEach(function (value) {
      var count = document.getElementById(value);
      if (count) {
        count.value = "";
      }
    });
  }
  function beginEmailVerify(value2, extra) {
    setMsg("Sending a 6-digit code…", false);
    api("/api/auth/signup", {
      email: value2,
      password: extra
    }).then(function (value) {
      var entry = value.data || {};
      if (entry.ok && entry.emailSent) {
        openVerify(value2);
        return;
      }
      if (entry.needsVerify || entry.reason === "unverified") {
        openVerify(value2, "Enter the 6-digit code sent to your email.");
        return;
      }
      setMsg(entry.error || "Could not send a verification code", true, true);
    });
  }
  if (loginBtn) {
    loginBtn.onclick = function () {
      var meta = normalizeEmail((document.getElementById("loginEmail") || {}).value || "");
      var root = (document.getElementById("loginPass") || {}).value || "";
      if (!isEmail(meta)) {
        setMsg("Enter a valid email.", true, true);
        return;
      }
      if (String(root).length < 4) {
        setMsg("Password must be at least 4 characters.", true, true);
        return;
      }
      setMsg("Signing in…", false);
      api("/api/auth/login", {
        email: meta,
        password: root
      }).then(function (value) {
        clearPasswordFields();
        var show = value.data || {};
        if (show.token && show.user && show.user.emailVerified && show.reason !== "unverified") {
          setToken(show.token, show.user);
          handleAuthResult(show, show.token);
          if (!show.ok && !show.reason && !show.user) {
            setMsg(show.error || "Login failed", true, true);
          }
          return;
        }
        if (show.needsVerify || show.reason === "unverified") {
          openVerify(meta, "Enter the 6-digit code sent to your email.");
          return;
        }
        if (accountMissing(show)) {
          beginEmailVerify(meta, root);
          return;
        }
        if (show.token) {
          setToken(show.token, show.user || null);
        }
        handleAuthResult(show, show.token);
        if (!show.ok && !show.reason) {
          setMsg(show.error || "That email or password is not valid.", true, true);
        }
      });
    };
  }
  if (signupBtn) {
    signupBtn.onclick = function () {
      var wrap = normalizeEmail((document.getElementById("signupEmail") || {}).value || "");
      var page = (document.getElementById("signupPass") || {}).value || "";
      if (!isEmail(wrap)) {
        setMsg("Enter a valid email.", true, true);
        return;
      }
      if (String(page).length < 4) {
        setMsg("Password must be at least 4 characters.", true, true);
        return;
      }
      setMsg("Creating account…", false);
      api("/api/auth/signup", {
        email: wrap,
        password: page
      }).then(function (value) {
        clearPasswordFields();
        var password = value.data || {};
        if (password.needsVerify || password.reason === "unverified" || password.ok && password.emailSent) {
          openVerify(wrap);
          return;
        }
        setMsg(password.error || "Could not create that account.", true, true);
      });
    };
  }
  if (verifyBtn) {
    verifyBtn.onclick = function () {
      var tab = localStorage.getItem(pendingEmailKey) || (document.getElementById("signupEmail") || {}).value || (document.getElementById("loginEmail") || {}).value || "";
      var frame = getOtpCode();
      if (frame.length !== 6) {
        setMsg("Enter the 6-digit code", true, true);
        return;
      }
      setMsg("Verifying…", false);
      api("/api/auth/verify", {
        email: tab,
        code: frame
      }).then(function (value) {
        var clientId = value.data || {};
        var path = clientId.user || null;
        var body = clientId.reason === "pending" || clientId.reason === "banned" || path && (path.emailVerified || path.hasAccess) || clientId.ok && path;
        if (!body) {
          clearToken();
          markOtpInvalid();
          setMsg("That code is invalid.", true, false);
          clearOtp();
          return;
        }
        if (clientId.token) {
          setToken(clientId.token, path);
        }
        handleAuthResult({
          ok: !!clientId.ok && !!path && !!path.hasAccess,
          reason: clientId.reason || (path && path.hasAccess ? undefined : "pending"),
          error: clientId.error,
          user: path || {
            email: tab,
            emailVerified: true,
            status: "pending",
            hasAccess: false
          },
          token: clientId.token
        }, clientId.token);
      });
    };
  }
  if (backToLoginBtn) {
    backToLoginBtn.onclick = function () {
      clearToken();
      stopPendingPoll();
      showGate(part, false);
      showPanel("login");
      setMsg(part, false);
    };
  }
  if (pendingRefreshBtn2) {
    pendingRefreshBtn2.onclick = function () {
      quietCheckAccess(false);
    };
  }
  if (pendingLogoutBtn) {
    pendingLogoutBtn.onclick = function () {
      stopPendingPoll();
      doSignOut();
    };
  }
  ["loginPass", "loginEmail"].forEach(function (value2) {
    var amount = document.getElementById(value2);
    if (amount) {
      amount.addEventListener("keydown", function (value) {
        if (value.key === "Enter" && loginBtn) {
          loginBtn.click();
        }
      });
    }
  });
  ["signupPass", "signupEmail"].forEach(function (value2) {
    var stamp = document.getElementById(value2);
    if (stamp) {
      stamp.addEventListener("keydown", function (value) {
        if (value.key === "Enter" && signupBtn) {
          signupBtn.click();
        }
      });
    }
  });
  var letter2 = null;
  var code = false;
  function onGoogleCredential(value2) {
    if (!value2 || !value2.credential) {
      setMsg("Google sign-in failed", true, true);
      return;
    }
    setMsg("Signing in with Google…", false);
    api("/api/auth/google", {
      credential: value2.credential
    }).then(function (value) {
      var title = value.data || {};
      if (title.token) {
        setToken(title.token, title.user);
      }
      if (title.ok && title.user && title.user.hasAccess) {
        handleAuthResult(title, title.token);
        return;
      }
      if (title.user || title.reason) {
        handleAuthResult(title, title.token);
        return;
      }
      setMsg(title.error || "Google sign-in failed", true, true);
      showPanel("login");
    });
  }
  function currentGatePanel() {
    var err = ["panelLogin", "panelSignup", "panelVerify", "panelPending"];
    for (var list = 0; list < err.length; list++) {
      var item = document.getElementById(err[list]);
      if (item && item.style.display !== "none" && item.offsetParent !== null) {
        if (err[list] === "panelLogin") {
          return "login";
        }
        if (err[list] === "panelSignup") {
          return "signup";
        }
        if (err[list] === "panelVerify") {
          return "verify";
        }
        if (err[list] === "panelPending") {
          return "pending";
        }
      }
    }
    return "login";
  }
  function setGoogleVisible(value) {
    var googleSignInWrap = document.getElementById("googleSignInWrap");
    if (googleSignInWrap) {
      googleSignInWrap.style.display = value ? "block" : "none";
    }
    try {
      if (window.google && google.accounts && google.accounts.id) {
        if (!value) {
          google.accounts.id.cancel();
          google.accounts.id.disableAutoSelect();
        }
      }
    } catch (err) {}
  }
  function initGoogleButton() {
    if (!letter2 || code) {
      return;
    }
    if (!window.google || !google.accounts || !google.accounts.id) {
      return;
    }
    try {
      google.accounts.id.initialize({
        client_id: letter2,
        callback: onGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false
      });
      var googleSignInBtn = document.getElementById("googleSignInBtn");
      var googleSignInWrap = document.getElementById("googleSignInWrap");
      if (googleSignInBtn && googleSignInWrap) {
        googleSignInBtn.innerHTML = "";
        var prev = 320;
        try {
          if (gateAuthBox && gateAuthBox.clientWidth) {
            prev = Math.min(360, Math.max(240, gateAuthBox.clientWidth - 56));
          }
        } catch (err) {}
        google.accounts.id.renderButton(googleSignInBtn, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: prev
        });
        code = true;
        var timer = currentGatePanel();
        setGoogleVisible(timer === "login" || timer === "signup");
      }
    } catch (err) {
      console.warn("Google button init", err);
    }
  }
  function loadGoogleScript(value) {
    letter2 = value;
    if (window.google && google.accounts) {
      initGoogleButton();
      return;
    }
    var btn = document.createElement("script");
    btn.src = "https://accounts.google.com/gsi/client";
    btn.async = true;
    btn.defer = true;
    btn.onload = function () {
      initGoogleButton();
    };
    document.head.appendChild(btn);
  }
  function fetchAuthConfig() {
    return fetch(workerUrl + "/api/auth/config").then(function (value) {
      return value.json().catch(function () {
        return {};
      });
    }).then(function (value) {
      if (value && value.googleClientId) {
        loadGoogleScript(value.googleClientId);
      }
    }).catch(function () {});
  }
  var href = showPanel;
  showPanel = function (value) {
    href(value);
    setGoogleVisible(value === "login" || value === "signup");
  };
  window.VeilAccess.signOut = doSignOut;
  if (document.body) {
    document.body.classList.remove("booting");
  }
  fetchAuthConfig();
  wireOtpInputs();
  checkSession();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") {
      return;
    }
    bootCheck();
  });
  window.addEventListener("pageshow", function () {
    bootCheck();
  });
  window.addEventListener("online", bootCheck);
  document.addEventListener("resume", bootCheck);
})();
