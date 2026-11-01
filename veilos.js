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
  var iconEls = {};
  var picked = {};
  var closeStart = function () {};

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
  function iconMarkup(kind) {
    if (kind === "favi") return '<img class="vos-logo" draggable="false" src="' + IMG + 'veil-logo-simple.png" alt="">';
    if (kind === "games") return '<img draggable="false" src="' + IMG + 'games.svg" alt="">';
    if (kind === "settings") return '<img draggable="false" src="' + IMG + 'settings.svg" alt="">';
    return svgChat();
  }
  function sharpIcon(url) {
    return String(url || "").replace(/([?&]sz=)\d+/i, "$1128");
  }
  function iconHtml(app) {
    if (app && app.iconUrl) return '<img class="vos-appicon" draggable="false" alt="" src="' + esc(sharpIcon(app.iconUrl)) + '">';
    return iconMarkup(app && (app.icon || app.kind));
  }

  function paintPick() {
    Object.keys(iconEls).forEach(function (id) {
      if (iconEls[id]) iconEls[id].classList.toggle("is-selected", !!picked[id]);
    });
  }
  function onlyPick(id) {
    picked = {};
    if (id) picked[id] = true;
    paintPick();
  }
  var installed = [];
  var iconsEl = null;
  var ctxEl = null;
  var ctxApp = null;

  function loadInstalled() {
    try { installed = JSON.parse(localStorage.getItem("veil_os_apps") || "[]"); } catch (err) { installed = []; }
    if (!Array.isArray(installed)) installed = [];
  }
  function saveInstalled() {
    try { localStorage.setItem("veil_os_apps", JSON.stringify(installed)); } catch (err) {}
  }
  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      if (ch === "&") return "&" + "amp;";
      if (ch === "<") return "&" + "lt;";
      if (ch === ">") return "&" + "gt;";
      if (ch === "\"") return "&" + "quot;";
      return "&" + "#039;";
    });
  }
  function shortcutList() {
    var list = APPS.map(function (app) {
      return { id: app.id, title: app.title, builtin: true, kind: app.icon };
    });
    installed.forEach(function (app) {
      list.push({ id: app.id, title: app.title, builtin: false, url: app.url, iconUrl: app.icon });
    });
    return list;
  }
  function iconPos(index) {
    var h = 0;
    try { h = deskEl.getBoundingClientRect().height; } catch (err) {}
    if (!h) h = Math.max(240, window.innerHeight - 48);
    var rows = Math.max(1, Math.floor((h - 20) / 112));
    return { x: 10 + Math.floor(index / rows) * 104, y: 10 + (index % rows) * 112 };
  }
  function closeCtx() {
    ctxApp = null;
    if (ctxEl) ctxEl.hidden = true;
  }
  function showCtx(app, x, y) {
    if (!ctxEl) return;
    ctxApp = app;
    var btn = ctxEl.querySelector("[data-act='rename']");
    if (btn) {
      btn.disabled = !!app.builtin;
      btn.classList.toggle("is-off", !!app.builtin);
    }
    ctxEl.hidden = false;
    ctxEl.style.left = x + "px";
    ctxEl.style.top = y + "px";
    var box = ctxEl.getBoundingClientRect();
    ctxEl.style.left = Math.max(8, Math.min(x, window.innerWidth - box.width - 8)) + "px";
    ctxEl.style.top = Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) + "px";
  }
  function renameInstalled(app) {
    if (!app || app.builtin) return;
    var current = null;
    installed.forEach(function (item) { if (item.id === app.id) current = item; });
    if (!current) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay rename-modal";
    overlay.innerHTML = "<div class=\"modal-box\"><h2>Rename app</h2><input class=\"text-input\" id=\"vosRenameInput\" maxlength=\"48\" value=\"" + esc(current.title || "") + "\"><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Save</button></div></div>";
    document.body.appendChild(overlay);
    var input = overlay.querySelector("#vosRenameInput");
    input.focus();
    input.select();
    function done() { overlay.remove(); }
    overlay.querySelector(".modal-cancel").onclick = done;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) done(); });
    function save() {
      var name = input.value.trim().slice(0, 48);
      if (name) {
        current.title = name;
        saveInstalled();
        var el = iconEls[current.id];
        if (el) {
          el.title = name;
          var label = el.querySelector("[data-label]");
          if (label) label.textContent = name;
        }
        if (wins[current.id]) {
          wins[current.id].title = name;
          var bar = wins[current.id].el.querySelector(".vos-title b");
          if (bar) bar.textContent = name;
          renderTasks();
        }
      }
      done();
    }
    overlay.querySelector(".modal-go").onclick = save;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") save();
      if (e.key === "Escape") done();
    });
  }
  function openShortcut(app) {
    if (!app) return;
    if (app.builtin) {
      openApp(app.id);
      return;
    }
    var stored = null;
    installed.forEach(function (item) { if (item.id === app.id) stored = item; });
    if (!stored) return;
    ensureInstalledWindow(stored);
    openApp(stored.id);
  }
  function renderDesktopIcons() {
    if (!iconsEl || !deskEl) return;
    closeCtx();
    iconsEl.innerHTML = "";
    iconEls = {};
    shortcutList().forEach(function (app, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-icon";
      btn.title = app.title;
      btn.dataset.app = app.id;
      var glyph = app.iconUrl
        ? '<img class="vos-appicon" draggable="false" src="' + esc(sharpIcon(app.iconUrl)) + '" alt="">'
        : iconMarkup(app.kind);
      btn.innerHTML = "<span class=\"vos-glyph\">" + glyph + "</span><span data-label>" + esc(app.title) + "</span>";
      var spot = iconPos(index);
      btn.style.left = spot.x + "px";
      btn.style.top = spot.y + "px";
      iconEls[app.id] = btn;
      btn.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        closeStart();
        closeCtx();
        if (e.ctrlKey || e.metaKey) {
          picked[app.id] = !picked[app.id];
          paintPick();
          return;
        }
        onlyPick(app.id);
      });
      btn.addEventListener("dblclick", function (e) {
        e.preventDefault();
        e.stopPropagation();
        onlyPick(app.id);
        openShortcut(app);
      });
      btn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeStart();
        onlyPick(app.id);
        showCtx(app, e.clientX, e.clientY);
      });
      iconsEl.appendChild(btn);
    });
    paintPick();
  }
  function installApp(info) {
    if (!info || !info.url) return false;
    var url = String(info.url);
    if (/^veil:/i.test(url)) return false;
    var existing = null;
    installed.forEach(function (item) { if (item.url === url) existing = item; });
    if (existing) return false;
    installed.push({
      id: "app_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: String(info.title || "App").trim().slice(0, 48) || "App",
      url: url,
      icon: String(info.icon || "")
    });
    saveInstalled();
    ensureInstalledWindow(installed[installed.length - 1]);
    renderDesktopIcons();
    return true;
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
      place(wins.settings.el, 32, 20, W - 48, H - 40);
      return;
    }
    place(wins.browser.el, 104, 12, W - 124, H - 24);
    place(wins.games.el, 124, 28, Math.min(1040, W - 150), H - 48);
    place(wins.chat.el, 148, 46, Math.min(920, W - 180), H - 70);
    place(wins.settings.el, 116, 20, Math.min(1100, W - 140), H - 36);
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

  function dockApps() {
    var list = APPS.map(function (app) {
      return { id: app.id, title: app.title, icon: app.icon };
    });
    installed.forEach(function (app) {
      list.push({ id: app.id, title: app.title, iconUrl: app.icon });
    });
    return list;
  }
  function renderTasks() {
    if (!tasksEl) return;
    var live = {};
    dockApps().forEach(function (app) {
      live[app.id] = true;
      var win = wins[app.id];
      var btn = tasksEl.querySelector('[data-app="' + app.id + '"]');
      if (!win || !win.running) {
        if (btn) btn.remove();
        return;
      }
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vos-taskbtn vos-still";
        btn.dataset.app = app.id;
        btn.innerHTML = iconHtml(app) + "<span></span>";
        btn.onclick = function () {
          if (win.el.classList.contains("is-min") || win.el.classList.contains("is-closed") || win.el.classList.contains("is-minimizing") || win.el.classList.contains("is-closing")) {
            openApp(app.id);
            return;
          }
          if (win.el.classList.contains("is-max")) {
            toggleMax(app.id);
            return;
          }
          if (focused === app.id) {
            minimize(app.id);
            return;
          }
          focusWin(app.id);
        };
        tasksEl.appendChild(btn);
      }
      var label = btn.querySelector("span");
      if (label) label.textContent = app.title;
      var dim = win.el.classList.contains("is-min") || win.el.classList.contains("is-minimizing");
      btn.classList.toggle("on", focused === app.id && !dim && !win.el.classList.contains("is-closing"));
      btn.classList.toggle("is-min", dim);
    });
    Array.prototype.forEach.call(tasksEl.querySelectorAll(".vos-taskbtn"), function (btn) {
      if (!live[btn.dataset.app]) btn.remove();
    });
  }

  function syncFull() {
    var shell = document.getElementById("veilOS");
    if (!shell) return;
    var on = false;
    Object.keys(wins).forEach(function (id) {
      var el = wins[id].el;
      if (!el.classList.contains("is-max")) return;
      if (el.classList.contains("is-closed") || el.classList.contains("is-min") || el.classList.contains("is-minimizing") || el.classList.contains("is-closing")) return;
      on = true;
    });
    shell.classList.toggle("is-full", on);
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

  var closeTimers = {};
  var motionOn = false;

  function motionOk() {
    try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (err) { return true; }
  }

  function openApp(id) {
    var win = wins[id];
    if (!win) return;
    if (closeTimers[id]) {
      clearTimeout(closeTimers[id]);
      closeTimers[id] = 0;
    }
    var hidden = win.el.classList.contains("is-closed") || win.el.classList.contains("is-min") || win.el.classList.contains("is-closing") || win.el.classList.contains("is-minimizing");
    win.running = true;
    win.el.classList.remove("is-closed", "is-min", "is-closing", "is-minimizing");
    if (id === "games") ensureGames(win.body);
    if (id === "chat") ensureChat(win.body);
    if (id === "settings") {
      try { fillWispSelect(); } catch (err) {}
      try { startLivePings(); } catch (err) {}
      try { fillChatSettings(); } catch (err) {}
    }
    if (win.installed) ensureProxy(win);
    if (hidden && motionOn) {
      win.el.classList.add("is-opening");
      void win.el.offsetWidth;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { win.el.classList.remove("is-opening"); });
      });
    }
    focusWin(id);
    syncFull();
  }

  function finishClose(id) {
    var win = wins[id];
    if (!win) return;
    win.el.classList.remove("is-closing", "is-minimizing", "is-opening");
    win.el.classList.add("is-closed");
    win.el.classList.remove("is-min", "is-focus");
    win.running = false;
    if (focused === id) focused = null;
    var next = null;
    Object.keys(wins).forEach(function (key) {
      var other = wins[key];
      if (!other || !other.running || other.el.classList.contains("is-min") || other.el.classList.contains("is-closed")) return;
      if (!next || Number(other.el.style.zIndex || 0) >= Number(wins[next].el.style.zIndex || 0)) next = key;
    });
    if (next) focusWin(next);
    else renderTasks();
    syncFull();
  }

  function closeApp(id) {
    var win = wins[id];
    if (!win || win.el.classList.contains("is-closed") || win.el.classList.contains("is-closing")) return;
    if (!motionOn) {
      finishClose(id);
      return;
    }
    win.el.classList.add("is-closing");
    win.el.classList.remove("is-focus", "is-min", "is-minimizing");
    if (focused === id) focused = null;
    renderTasks();
    syncFull();
    closeTimers[id] = setTimeout(function () {
      closeTimers[id] = 0;
      if (!win.el.classList.contains("is-closing")) return;
      finishClose(id);
    }, 220);
  }

  function minimize(id) {
    var win = wins[id];
    if (!win || win.el.classList.contains("is-min") || win.el.classList.contains("is-minimizing") || win.el.classList.contains("is-closed")) return;
    if (!motionOn) {
      win.el.classList.add("is-min");
      win.el.classList.remove("is-focus");
      if (focused === id) focused = null;
      renderTasks();
      syncFull();
      return;
    }
    win.el.classList.add("is-minimizing");
    win.el.classList.remove("is-focus");
    if (focused === id) focused = null;
    renderTasks();
    syncFull();
    closeTimers[id] = setTimeout(function () {
      closeTimers[id] = 0;
      if (!win.el.classList.contains("is-minimizing")) return;
      win.el.classList.remove("is-minimizing");
      win.el.classList.add("is-min");
    }, 220);
  }

  function toggleMax(id) {
    var win = wins[id];
    if (!win) return;
    var el = win.el;
    if (motionOn) {
      el.classList.add("is-sizing");
      clearTimeout(el._sizeTimer);
      el._sizeTimer = setTimeout(function () { el.classList.remove("is-sizing"); }, 280);
    }
    if (el.classList.contains("is-max")) {
      el.classList.remove("is-max");
      el.style.left = el.dataset.rx || el.style.left;
      el.style.top = el.dataset.ry || el.style.top;
      el.style.width = el.dataset.rw || el.style.width;
      el.style.height = el.dataset.rh || el.style.height;
    } else {
      Object.keys(wins).forEach(function (key) {
        if (key === id) return;
        var other = wins[key].el;
        if (!other.classList.contains("is-max")) return;
        other.classList.remove("is-max");
        if (other.dataset.rw) {
          other.style.left = other.dataset.rx || other.style.left;
          other.style.top = other.dataset.ry || other.style.top;
          other.style.width = other.dataset.rw;
          other.style.height = other.dataset.rh || other.style.height;
        }
      });
      el.dataset.rx = el.style.left;
      el.dataset.ry = el.style.top;
      el.dataset.rw = el.style.width;
      el.dataset.rh = el.style.height;
      el.classList.add("is-max");
    }
    focusWin(id);
    syncFull();
  }

  function bindDrag(win, title) {
    title.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button")) return;
      if (win.el.classList.contains("is-max")) return;
      e.preventDefault();
      focusWin(win.id);
      try { title.setPointerCapture(e.pointerId); } catch (err) {}
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
        title.removeEventListener("pointermove", move);
        title.removeEventListener("pointerup", up);
      }
      title.addEventListener("pointermove", move);
      title.addEventListener("pointerup", up);
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
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
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
    el.style.zIndex = "4";
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
    name.insertAdjacentHTML("beforebegin", app.iconUrl ? '<img class="vos-appicon" draggable="false" src="' + esc(sharpIcon(app.iconUrl)) + '" alt="">' : iconMarkup(app.icon));
    var body = el.querySelector(".vos-body");
    var win = { id: app.id, title: app.title, el: el, body: body, running: app.id === "browser", installed: !!app.installed, url: app.url || "", iconUrl: app.iconUrl || "", frameReady: false };
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

  function placeInstalled(win) {
    if (!deskEl || !win) return;
    var box = deskEl.getBoundingClientRect();
    var W = box.width || window.innerWidth;
    var H = box.height || (window.innerHeight - 48);
    var n = 0;
    Object.keys(wins).forEach(function (id) { if (wins[id].installed) n += 1; });
    var w = Math.max(420, Math.min(1040, W - 150));
    var h = Math.max(320, H - 56);
    place(win.el, 78 + ((n - 1) % 5) * 26, 24 + ((n - 1) % 5) * 22, w, h);
  }

  function ensureInstalledWindow(app) {
    if (!app) return null;
    var win = wins[app.id];
    if (win) {
      win.title = app.title;
      win.url = app.url;
      win.iconUrl = app.icon;
      win.installed = true;
      var bar = win.el.querySelector(".vos-title b");
      if (bar) bar.textContent = app.title;
      return win;
    }
    win = makeWindow({ id: app.id, title: app.title, iconUrl: app.icon, url: app.url, installed: true });
    if (deskEl) {
      deskEl.appendChild(win.el);
      placeInstalled(win);
    }
    return win;
  }

  function ensureProxy(win) {
    if (!win || !win.installed || win.frameReady) return;
    win.frameReady = true;
    var host = win.body.querySelector(".vos-proxy");
    if (!host) {
      host = document.createElement("div");
      host.className = "vos-proxy";
      win.body.appendChild(host);
    }
    host.innerHTML = '<div class="vos-app-wait">Opening…</div>';
    if (typeof window.openProxyFrame !== "function") {
      win.frameReady = false;
      host.innerHTML = '<div class="vos-app-wait">Proxy is not ready.</div>';
      return;
    }
    var job = window.openProxyFrame(host, win.url);
    if (job && typeof job.then === "function") {
      job.then(function (frame) {
        if (!frame) win.frameReady = false;
      }).catch(function (err) {
        console.warn("[veil] app", err);
        win.frameReady = false;
        host.innerHTML = '<div class="vos-app-wait">Could not open this app.</div>';
      });
    }
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
    iconsEl = icons;
    loadInstalled();
    icons.addEventListener("dragstart", function (e) { e.preventDefault(); });
    desk.appendChild(icons);
    desk.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (e.target.closest && (e.target.closest(".vos-win") || e.target.closest(".vos-icon"))) return;
      closeStart();
      var x0 = e.clientX;
      var y0 = e.clientY;
      var base = {};
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        Object.keys(picked).forEach(function (id) { if (picked[id]) base[id] = true; });
      }
      var dragging = false;
      var band = document.createElement("div");
      band.className = "vos-marquee";
      desk.appendChild(band);
      try { desk.setPointerCapture(e.pointerId); } catch (err) {}
      function move(ev) {
        var dx = ev.clientX - x0;
        var dy = ev.clientY - y0;
        if (!dragging && Math.hypot(dx, dy) < 4) return;
        dragging = true;
        var box = desk.getBoundingClientRect();
        var left = Math.min(x0, ev.clientX);
        var top = Math.min(y0, ev.clientY);
        var right = Math.max(x0, ev.clientX);
        var bottom = Math.max(y0, ev.clientY);
        band.style.left = (left - box.left) + "px";
        band.style.top = (top - box.top) + "px";
        band.style.width = (right - left) + "px";
        band.style.height = (bottom - top) + "px";
        var next = {};
        Object.keys(base).forEach(function (id) { next[id] = true; });
        Object.keys(iconEls).forEach(function (id) {
          var hit = iconEls[id].getBoundingClientRect();
          if (hit.right >= left && hit.left <= right && hit.bottom >= top && hit.top <= bottom) next[id] = true;
        });
        picked = next;
        paintPick();
      }
      function up() {
        desk.removeEventListener("pointermove", move);
        desk.removeEventListener("pointerup", up);
        if (band.parentNode) band.parentNode.removeChild(band);
        if (!dragging) onlyPick(null);
      }
      desk.addEventListener("pointermove", move);
      desk.addEventListener("pointerup", up);
    });
    desk.addEventListener("contextmenu", function (e) {
      if (e.target.closest && e.target.closest(".vos-win")) return;
      e.preventDefault();
    });
    APPS.forEach(function (app) {
      desk.appendChild(makeWindow(app).el);
    });
    var bar = document.createElement("div");
    bar.className = "vos-taskbar";
    var startWrap = document.createElement("div");
    startWrap.className = "vos-startwrap";
    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "vos-start";
    startBtn.title = "Start";
    startBtn.setAttribute("aria-label", "Start");
    startBtn.setAttribute("aria-expanded", "false");
    startBtn.innerHTML = '<img class="vos-logo" src="' + IMG + 'veil-logo-simple.png" alt="">';
    var menu = document.createElement("div");
    menu.className = "vos-startmenu";
    menu.setAttribute("role", "menu");
    APPS.forEach(function (app) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "vos-startitem";
      item.setAttribute("role", "menuitem");
      item.innerHTML = iconMarkup(app.icon) + "<span>" + app.title + "</span>";
      item.onclick = function () {
        closeStart();
        openApp(app.id);
      };
      menu.appendChild(item);
    });
    function setStart(open) {
      menu.classList.toggle("is-open", open);
      startBtn.classList.toggle("on", open);
      startBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    closeStart = function () { setStart(false); };
    startBtn.onclick = function (e) {
      e.stopPropagation();
      setStart(!menu.classList.contains("is-open"));
    };
    document.addEventListener("pointerdown", function (e) {
      if (ctxEl && !ctxEl.hidden && !ctxEl.contains(e.target)) closeCtx();
      if (!menu.classList.contains("is-open")) return;
      if (startWrap.contains(e.target)) return;
      closeStart();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeStart();
        closeCtx();
      }
    });
    startWrap.appendChild(startBtn);
    startWrap.appendChild(menu);
    var tasks = document.createElement("div");
    tasks.className = "vos-tasks";
    var clock = document.createElement("div");
    clock.className = "vos-clock";
    clock.id = "vosClock";
    bar.appendChild(startWrap);
    bar.appendChild(tasks);
    bar.appendChild(clock);
    shell.appendChild(desk);
    shell.appendChild(bar);
    ctxEl = document.createElement("div");
    ctxEl.className = "vos-ctx";
    ctxEl.hidden = true;
    ctxEl.innerHTML = "<button type=\"button\" data-act=\"rename\">Rename</button>";
    ctxEl.querySelector("[data-act='rename']").onclick = function (e) {
      e.stopPropagation();
      var app = ctxApp;
      closeCtx();
      renameInstalled(app);
    };
    shell.appendChild(ctxEl);
    document.body.appendChild(shell);
    deskEl = desk;
    tasksEl = tasks;
    installed.forEach(function (app) { ensureInstalledWindow(app); });
    renderDesktopIcons();
    window.addEventListener("resize", function () {
      shortcutList().forEach(function (app, index) {
        var el = iconEls[app.id];
        if (!el) return;
        var spot = iconPos(index);
        el.style.left = spot.x + "px";
        el.style.top = spot.y + "px";
      });
    });
    layoutDefaults();
    paintClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(paintClock, 1000);
    paintDesk();
  }

  function paintDesk() {
    if (!deskEl) return;
    var canvas = deskEl.querySelector("[data-home-fx]");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "home-fx";
      canvas.setAttribute("data-home-fx", "");
      deskEl.insertBefore(canvas, deskEl.firstChild);
    }
    try { setupHomeFx(deskEl); } catch (err) {}
    deskEl.querySelectorAll(".vos-wall").forEach(function (node) { node.remove(); });
    var url = "";
    try {
      if (settings && settings.animEnabled && settings.animStyle === "custom") {
        url = String(settings.backgroundUrl || "").trim();
      }
    } catch (err) {}
    if (!url) return;
    var wall;
    if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
      wall = document.createElement("video");
      wall.autoplay = true;
      wall.loop = true;
      wall.muted = true;
      wall.playsInline = true;
      wall.setAttribute("playsinline", "");
      wall.src = url;
      wall.play().catch(function () {});
    } else {
      wall = document.createElement("img");
      wall.alt = "";
      wall.src = url;
    }
    wall.className = "vos-wall";
    deskEl.insertBefore(wall, canvas.nextSibling);
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
    var shell = document.getElementById("veilOS");
    if (shell) shell.classList.add("vos-ready");
    motionOn = motionOk();
    setTimeout(function () {
      boot.remove();
      var style = document.getElementById("veilOsBootStyle");
      if (style) style.remove();
    }, 520);
    window.__veilOsBooting = false;
  }

  window.veilOSPaintWall = paintDesk;
  window.veilOSInstall = installApp;
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
