'use strict';
(function () {
  var APPS = [
    { id: "browser", title: "Browser", icon: "favi" },
    { id: "games", title: "Games", icon: "games" },
    { id: "chat", title: "Chat", icon: "chat" },
    { id: "settings", title: "Settings", icon: "settings" }
  ];
  var wins = {};
  var focused = null;
  var zTop = 5;
  var deskEl = null;
  var tasksEl = null;
  var clockTimer = 0;

  function svgChat() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.2V16.5H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z"></path></svg>';
  }
  function svgMin() {
    return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><rect x="1" y="5.4" width="10" height="1.4" fill="currentColor"></rect></svg>';
  }
  function svgMax() {
    return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><rect x="1.3" y="1.3" width="9.4" height="9.4" fill="none" stroke="currentColor" stroke-width="1.3"></rect></svg>';
  }
  function svgClose() {
    return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.4"></path></svg>';
  }
  function iconMarkup(kind, cls) {
    var extra = cls ? ' class="' + cls + '"' : "";
    if (kind === "favi") return '<img' + extra + ' src="' + FAVI + '" alt="">';
    if (kind === "games") return '<img' + extra + ' src="' + IMG + 'games.svg" alt="">';
    if (kind === "settings") return '<img' + extra + ' src="' + IMG + 'settings.svg" alt="">';
    return svgChat();
  }
  function iconClass(kind) {
    return kind === "games" || kind === "settings" ? "inv" : "";
  }

  function place(el, x, y, w, h) {
    var desk = deskEl.getBoundingClientRect();
    var width = Math.max(320, Math.min(w, desk.width - 16));
    var height = Math.max(220, Math.min(h, desk.height - 16));
    var left = Math.max(0, Math.min(x, Math.max(0, desk.width - 80)));
    var top = Math.max(0, Math.min(y, Math.max(0, desk.height - 40)));
    if (left + width > desk.width) left = Math.max(0, desk.width - width);
    if (top + height > desk.height) top = Math.max(0, desk.height - height);
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.width = width + "px";
    el.style.height = height + "px";
  }

  function layoutDefaults() {
    var box = deskEl.getBoundingClientRect();
    var W = box.width;
    var H = box.height;
    if (W < 760) {
      place(wins.browser.el, 8, 8, W - 16, H - 16);
      place(wins.games.el, 12, 12, W - 24, H - 24);
      place(wins.chat.el, 16, 16, W - 32, H - 32);
      place(wins.settings.el, 20, 20, Math.min(480, W - 28), H - 36);
      return;
    }
    place(wins.browser.el, 104, 12, W - 124, H - 24);
    place(wins.games.el, 124, 28, Math.min(1040, W - 150), H - 48);
    place(wins.chat.el, 148, 46, Math.min(920, W - 180), H - 70);
    place(wins.settings.el, Math.max(108, W - 500), 24, Math.min(480, W - 120), H - 40);
  }

  function focusWin(id) {
    var win = wins[id];
    if (!win || win.el.classList.contains("is-closed")) return;
    focused = id;
    zTop += 1;
    win.el.style.zIndex = String(zTop);
    Object.keys(wins).forEach(function (key) {
      wins[key].el.classList.toggle("is-focus", key === id);
    });
    renderTasks();
  }

  function renderTasks() {
    if (!tasksEl) return;
    tasksEl.innerHTML = "";
    APPS.forEach(function (app) {
      var win = wins[app.id];
      if (!win || !win.running) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-taskbtn";
      if (focused === app.id && !win.el.classList.contains("is-min")) btn.classList.add("on");
      if (win.el.classList.contains("is-min")) btn.classList.add("is-min");
      btn.innerHTML = iconMarkup(app.icon, iconClass(app.icon)) + "<span>" + app.title + "</span>";
      btn.onclick = function () {
        if (win.el.classList.contains("is-min") || win.el.classList.contains("is-closed")) {
          openApp(app.id);
          return;
        }
        if (focused === app.id) {
          minimize(app.id);
          return;
        }
        focusWin(app.id);
      };
      tasksEl.appendChild(btn);
    });
  }

  function ensureGames(body) {
    if (body.dataset.ready === "1") return;
    body.dataset.ready = "1";
    var root = document.createElement("div");
    root.className = "games-page";
    root.innerHTML = '<div class="vos-app-wait">Loading games…</div>';
    body.appendChild(root);
    try {
      var job = renderGamesPage(root);
      if (job && typeof job.catch === "function") {
        job.catch(function (err) {
          console.warn("[veil] games", err);
          root.innerHTML = '<div class="vos-app-wait">Games could not load.</div>';
        });
      }
    } catch (err) {
      console.warn("[veil] games", err);
      root.innerHTML = '<div class="vos-app-wait">Games could not load.</div>';
    }
  }

  function ensureChat(body) {
    if (body.dataset.ready === "1") return;
    body.dataset.ready = "1";
    var root = document.createElement("div");
    root.className = "chat-page";
    body.appendChild(root);
    try {
      renderChatPage(root);
    } catch (err) {
      console.warn("[veil] chat", err);
    }
    try {
      var job = bootChatLink();
      if (job && typeof job.catch === "function") job.catch(function () {});
    } catch (err) {}
  }

  function openApp(id) {
    var win = wins[id];
    if (!win) return;
    win.running = true;
    win.el.classList.remove("is-closed", "is-min");
    if (id === "games") ensureGames(win.body);
    if (id === "chat") ensureChat(win.body);
    if (id === "settings") {
      try { fillWispSelect(); } catch (err) {}
      try { startLivePings(); } catch (err) {}
      try { fillChatSettings(); } catch (err) {}
    }
    focusWin(id);
  }

  function closeApp(id) {
    var win = wins[id];
    if (!win) return;
    win.el.classList.add("is-closed");
    win.el.classList.remove("is-min", "is-focus");
    win.running = false;
    if (focused === id) focused = null;
    var next = null;
    APPS.forEach(function (app) {
      var other = wins[app.id];
      if (!other || !other.running || other.el.classList.contains("is-min")) return;
      if (!next || Number(other.el.style.zIndex || 0) >= Number(wins[next].el.style.zIndex || 0)) next = app.id;
    });
    if (next) focusWin(next);
    else renderTasks();
  }

  function minimize(id) {
    var win = wins[id];
    if (!win) return;
    win.el.classList.add("is-min");
    win.el.classList.remove("is-focus");
    if (focused === id) focused = null;
    renderTasks();
  }

  function toggleMax(id) {
    var win = wins[id];
    if (!win) return;
    var el = win.el;
    if (el.classList.contains("is-max")) {
      el.classList.remove("is-max");
      el.style.left = el.dataset.rx || el.style.left;
      el.style.top = el.dataset.ry || el.style.top;
      el.style.width = el.dataset.rw || el.style.width;
      el.style.height = el.dataset.rh || el.style.height;
    } else {
      el.dataset.rx = el.style.left;
      el.dataset.ry = el.style.top;
      el.dataset.rw = el.style.width;
      el.dataset.rh = el.style.height;
      el.classList.add("is-max");
    }
    focusWin(id);
  }

  function bindDrag(win, title) {
    title.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button")) return;
      if (win.el.classList.contains("is-max")) return;
      focusWin(win.id);
      var desk = deskEl.getBoundingClientRect();
      var rect = win.el.getBoundingClientRect();
      var ox = e.clientX - rect.left;
      var oy = e.clientY - rect.top;
      function move(ev) {
        var x = ev.clientX - desk.left - ox;
        var y = ev.clientY - desk.top - oy;
        x = Math.max(0, Math.min(x, desk.width - 80));
        y = Math.max(0, Math.min(y, desk.height - 36));
        win.el.style.left = x + "px";
        win.el.style.top = y + "px";
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
    title.addEventListener("dblclick", function (e) {
      if (e.target.closest("button")) return;
      toggleMax(win.id);
    });
  }

  function bindResize(win) {
    win.el.querySelectorAll(".vos-rz").forEach(function (handle) {
      handle.addEventListener("pointerdown", function (e) {
        if (e.button !== 0 || win.el.classList.contains("is-max")) return;
        e.preventDefault();
        e.stopPropagation();
        focusWin(win.id);
        var dir = handle.getAttribute("data-dir") || "";
        var desk = deskEl.getBoundingClientRect();
        var start = {
          x: e.clientX,
          y: e.clientY,
          l: win.el.offsetLeft,
          t: win.el.offsetTop,
          w: win.el.offsetWidth,
          h: win.el.offsetHeight
        };
        function move(ev) {
          var left = start.l;
          var top = start.t;
          var width = start.w;
          var height = start.h;
          var dx = ev.clientX - start.x;
          var dy = ev.clientY - start.y;
          if (dir.indexOf("e") !== -1) width = start.w + dx;
          if (dir.indexOf("s") !== -1) height = start.h + dy;
          if (dir.indexOf("w") !== -1) {
            width = start.w - dx;
            left = start.l + dx;
          }
          if (dir.indexOf("n") !== -1) {
            height = start.h - dy;
            top = start.t + dy;
          }
          if (width < 320) {
            if (dir.indexOf("w") !== -1) left -= 320 - width;
            width = 320;
          }
          if (height < 220) {
            if (dir.indexOf("n") !== -1) top -= 220 - height;
            height = 220;
          }
          if (left < 0) {
            width += left;
            left = 0;
          }
          if (top < 0) {
            height += top;
            top = 0;
          }
          if (left + width > desk.width) width = desk.width - left;
          if (top + height > desk.height) height = desk.height - top;
          win.el.style.left = left + "px";
          win.el.style.top = top + "px";
          win.el.style.width = Math.max(320, width) + "px";
          win.el.style.height = Math.max(220, height) + "px";
        }
        function up() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
    });
  }

  function makeWindow(app) {
    var el = document.createElement("section");
    el.className = "vos-win" + (app.id === "browser" ? "" : " is-closed");
    el.dataset.app = app.id;
    el.innerHTML = '<div class="vos-title"><b></b>' +
      '<button type="button" class="vos-ctl" data-act="min" title="Minimize" aria-label="Minimize">' + svgMin() + '</button>' +
      '<button type="button" class="vos-ctl" data-act="max" title="Maximize" aria-label="Maximize">' + svgMax() + '</button>' +
      '<button type="button" class="vos-ctl close" data-act="close" title="Close" aria-label="Close">' + svgClose() + '</button></div>' +
      '<div class="vos-body" id="osApp-' + app.id + '"></div>' +
      '<i class="vos-rz n" data-dir="n"></i><i class="vos-rz s" data-dir="s"></i><i class="vos-rz e" data-dir="e"></i><i class="vos-rz w" data-dir="w"></i>' +
      '<i class="vos-rz ne" data-dir="ne"></i><i class="vos-rz nw" data-dir="nw"></i><i class="vos-rz se" data-dir="se"></i><i class="vos-rz sw" data-dir="sw"></i>';
    var title = el.querySelector(".vos-title");
    var name = title.querySelector("b");
    name.textContent = app.title;
    name.insertAdjacentHTML("beforebegin", iconMarkup(app.icon, iconClass(app.icon)));
    var body = el.querySelector(".vos-body");
    var win = { id: app.id, title: app.title, el: el, body: body, running: app.id === "browser" };
    el.addEventListener("pointerdown", function () { focusWin(app.id); });
    el.querySelector('[data-act="min"]').onclick = function (e) {
      e.stopPropagation();
      minimize(app.id);
    };
    el.querySelector('[data-act="max"]').onclick = function (e) {
      e.stopPropagation();
      toggleMax(app.id);
    };
    el.querySelector('[data-act="close"]').onclick = function (e) {
      e.stopPropagation();
      closeApp(app.id);
    };
    bindDrag(win, title);
    bindResize(win);
    wins[app.id] = win;
    return win;
  }

  function paintClock() {
    var el = document.getElementById("vosClock");
    if (!el) return;
    var now = new Date();
    var h24 = false;
    try { h24 = settings && settings.timeFormat === "24"; } catch (err) {}
    var time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !h24 });
    var date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    el.innerHTML = "<div>" + time + "</div><small>" + date + "</small>";
  }

  function mountShell() {
    var shell = document.createElement("div");
    shell.id = "veilOS";
    var desk = document.createElement("div");
    desk.className = "vos-desk";
    var icons = document.createElement("div");
    icons.className = "vos-icons";
    APPS.forEach(function (app) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-icon";
      btn.title = app.title;
      btn.innerHTML = iconMarkup(app.icon, iconClass(app.icon)) + "<span>" + app.title + "</span>";
      btn.onclick = function () { openApp(app.id); };
      icons.appendChild(btn);
    });
    desk.appendChild(icons);
    APPS.forEach(function (app) {
      desk.appendChild(makeWindow(app).el);
    });
    var bar = document.createElement("div");
    bar.className = "vos-taskbar";
    var tasks = document.createElement("div");
    tasks.className = "vos-tasks";
    var clock = document.createElement("div");
    clock.className = "vos-clock";
    clock.id = "vosClock";
    bar.appendChild(tasks);
    bar.appendChild(clock);
    shell.appendChild(desk);
    shell.appendChild(bar);
    document.body.appendChild(shell);
    deskEl = desk;
    tasksEl = tasks;
    layoutDefaults();
    paintClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(paintClock, 1000);
  }

  function mountBrowser() {
    var browser = document.getElementById("browser");
    var browserBody = wins.browser && wins.browser.body;
    if (browser && browserBody) browserBody.appendChild(browser);
    ["mainMenu", "backdrop", "historyPanel", "bookmarksPanel"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node && browser) browser.appendChild(node);
    });
    focusWin("browser");
  }

  function mountSettings() {
    var settings = document.getElementById("settingsPanel");
    if (settings && wins.settings) wins.settings.body.appendChild(settings);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function run(boot) {
    var status = boot.querySelector("[data-boot-status]");
    var setStatus = function (text) { if (status) status.textContent = text; };
    var started = Date.now();
    setStatus("Starting veilOS");
    document.body.classList.add("veil-os");
    mountShell();
    await sleep(420);
    setStatus("Loading Browser");
    mountBrowser();
    await sleep(480);
    setStatus("Preparing apps");
    mountSettings();
    await sleep(420);
    setStatus("Almost ready");
    var left = 2000 - (Date.now() - started);
    if (left > 0) await sleep(left);
    boot.classList.add("done");
    setTimeout(function () {
      boot.remove();
      var style = document.getElementById("veilOsBootStyle");
      if (style) style.remove();
    }, 520);
    window.__veilOsBooting = false;
  }

  window.veilOSOpenApp = function (id) {
    if (!wins[id]) return;
    openApp(id);
  };

  window.startVeilOS = function (boot) {
    if (window.__veilOsStarted) return;
    window.__veilOsStarted = true;
    run(boot).catch(function (err) {
      console.warn("[veil] veilOS", err);
      window.__veilOsBooting = false;
      var status = boot && boot.querySelector("[data-boot-status]");
      if (status) status.textContent = "Could not start veilOS.";
    });
  };
})();
