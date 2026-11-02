'use strict';
(function () {
  var APPS = [
    { id: "browser", title: "Browser", icon: "favi" },
    { id: "store", title: "App Store", icon: "store" },
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
  var iconLayout = {};
  var closeStart = function () {};
  var POS_KEY = "veil-os-icon-pos";
  var FOLDER_KEY = "veil_os_folders";
  var folders = [];
  var openFolderId = null;
  var folderWin = null;
  var refreshStore = function () {};

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
    if (kind === "store") return '<img draggable="false" src="' + IMG + 'appstore.svg" alt="">';
    if (kind === "games") return '<img draggable="false" src="' + IMG + 'games.svg" alt="">';
    if (kind === "settings") return '<img draggable="false" src="' + IMG + 'settings.svg" alt="">';
    if (kind === "chat") return '<img class="vos-chat" draggable="false" src="' + IMG + 'chat.svg" alt="">';
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
  var files = [];
  var fileUrls = {};
  var iconsEl = null;
  var ctxEl = null;
  var ctxApp = null;
  var ctxX = 0;
  var ctxY = 0;

  function loadInstalled() {
    try { installed = JSON.parse(localStorage.getItem("veil_os_apps") || "[]"); } catch (err) { installed = []; }
    if (!Array.isArray(installed)) installed = [];
  }
  function saveInstalled() {
    try { localStorage.setItem("veil_os_apps", JSON.stringify(installed)); } catch (err) {}
  }
  function fileDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open("veil_os_files", 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function rememberFile(file) {
    if (fileUrls[file.id] && String(fileUrls[file.id]).indexOf("blob:") === 0) URL.revokeObjectURL(fileUrls[file.id]);
    if (file.blob) fileUrls[file.id] = URL.createObjectURL(file.blob);
    else fileUrls[file.id] = file.remote || "";
  }
  function loadFiles() {
    return fileDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction("files", "readonly").objectStore("files").getAll();
        req.onsuccess = function () {
          files = req.result || [];
          files.forEach(rememberFile);
          resolve(files);
        };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () {
      files = [];
      return false;
    });
  }
  function saveFileRecord(file) {
    return fileDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("files", "readwrite");
        tx.objectStore("files").put(file);
        tx.oncomplete = function () { resolve(file); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function deleteFileRecord(id) {
    return fileDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("files", "readwrite");
        tx.objectStore("files").delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () {});
  }
  function shrinkBlob(blob) {
    return new Promise(function (resolve) {
      if (!blob || blob.size < 1500000 || blob.type === "image/svg+xml") { resolve(blob); return; }
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width || 1;
        var h = img.naturalHeight || img.height || 1;
        var scale = Math.min(1, 1920 / Math.max(w, h));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (out) { resolve(out || blob); }, "image/jpeg", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(blob); };
      img.src = url;
    });
  }
  function addImageFile(blob, name, remote) {
    var title = String(name || "Image").replace(/\.[a-z0-9]{2,5}$/i, "").trim().slice(0, 48) || "Image";
    return shrinkBlob(blob).then(function (out) {
      if (out && out.size > 8 * 1024 * 1024) throw new Error("too big");
      var file = {
        id: "img_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        title: title,
        mime: out && out.type || "image/*",
        blob: out || null,
        remote: out ? "" : String(remote || "")
      };
      if (!file.blob && !file.remote) throw new Error("empty");
      rememberFile(file);
      files.push(file);
      return saveFileRecord(file).then(function () {
        renderDesktopIcons();
        onlyPick(file.id);
        return file;
      });
    }).catch(function (err) {
      try { alert(err && err.message === "too big" ? "That image is too large." : "Could not save that image."); } catch (e) {}
      return null;
    });
  }
  function deleteFile(id) {
    var file = null;
    files.forEach(function (item) { if (item.id === id) file = item; });
    if (!file) return;
    files = files.filter(function (item) { return item.id !== id; });
    folders.forEach(function (folder) {
      folder.items = folder.items.filter(function (item) { return item !== id; });
    });
    delete iconLayout[id];
    delete picked[id];
    if (fileUrls[id] && String(fileUrls[id]).indexOf("blob:") === 0) URL.revokeObjectURL(fileUrls[id]);
    delete fileUrls[id];
    saveFolders();
    saveLayout();
    deleteFileRecord(id);
    var win = wins[id];
    if (win) {
      if (closeTimers[id]) {
        clearTimeout(closeTimers[id]);
        closeTimers[id] = 0;
      }
      if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
      delete wins[id];
      if (focused === id) focused = null;
    }
    try {
      if (settings && settings.backgroundUrl === "veil-file:" + id) {
        settings.backgroundUrl = "";
        if (settings.animStyle === "custom") settings.animEnabled = false;
        if (typeof highlightTheme === "function") highlightTheme();
        if (typeof save === "function") save();
        if (typeof applyNewTabBackground === "function") applyNewTabBackground();
      }
    } catch (err) {}
    renderDesktopIcons();
    renderTasks();
    syncFull();
    if (openFolderId) paintFolder();
    paintDesk();
  }
  function setWallpaper(id) {
    if (!fileUrls[id]) return;
    try {
      settings.animEnabled = true;
      settings.animStyle = "custom";
      settings.backgroundUrl = "veil-file:" + id;
      if (typeof highlightTheme === "function") highlightTheme();
      if (typeof save === "function") save();
      if (typeof applyNewTabBackground === "function") applyNewTabBackground();
      else paintDesk();
    } catch (err) {}
  }
  function pruneMissingFiles() {
    var changed = false;
    folders.forEach(function (folder) {
      var next = folder.items.filter(function (id) { return !!appById(id); });
      if (next.length !== folder.items.length) {
        folder.items = next;
        changed = true;
      }
    });
    if (changed) saveFolders();
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
    files.forEach(function (file) {
      list.push({ id: file.id, title: file.title, builtin: false, file: true, kind: "image", iconUrl: fileUrls[file.id] || "" });
    });
    return list;
  }
  function appById(id) {
    var found = null;
    shortcutList().forEach(function (app) { if (app.id === id) found = app; });
    return found;
  }
  function loadFolders() {
    folders = [];
    try {
      var data = JSON.parse(localStorage.getItem(FOLDER_KEY) || "{}");
      if (data && Array.isArray(data.folders)) folders = data.folders;
    } catch (err) {}
    folders = folders.filter(function (folder) { return folder && folder.id; });
    folders.forEach(function (folder) {
      if (!Array.isArray(folder.items)) folder.items = [];
      folder.items = folder.items.map(function (id) { return id === "games" ? "store" : id; });
      folder.items = folder.items.filter(function (id) {
        return !!appById(id) || String(id).indexOf("img_") === 0;
      });
    });
  }
  function saveFolders() {
    try { localStorage.setItem(FOLDER_KEY, JSON.stringify({ folders: folders })); } catch (err) {}
  }
  function findFolder(id) {
    var found = null;
    folders.forEach(function (folder) { if (folder.id === id) found = folder; });
    return found;
  }
  function holdingFolder(id) {
    var found = null;
    folders.forEach(function (folder) {
      if (folder.items.indexOf(id) !== -1) found = folder;
    });
    return found;
  }
  function desktopItems() {
    var list = [];
    folders.forEach(function (folder) {
      list.push({ id: folder.id, title: folder.title || "Folder", folder: true, items: folder.items.slice() });
    });
    shortcutList().forEach(function (app) {
      if (!holdingFolder(app.id)) list.push(app);
    });
    return list;
  }
  function nextFolderName() {
    var used = {};
    folders.forEach(function (folder) { used[folder.title] = true; });
    if (!used["New folder"]) return "New folder";
    var n = 2;
    while (used["New folder " + n]) n += 1;
    return "New folder " + n;
  }
  function folderGlyph(items) {
    var real = [];
    (items || []).forEach(function (id) { if (appById(id)) real.push(id); });
    if (!real.length) return '<img draggable="false" src="' + IMG + 'folder.svg" alt="">';
    var shown = real.slice(0, real.length > 4 ? 3 : 4);
    var cells = "";
    shown.forEach(function (id) {
      var app = appById(id);
      var inner = app.iconUrl
        ? '<img class="vos-appicon" draggable="false" alt="" src="' + esc(sharpIcon(app.iconUrl)) + '">'
        : iconMarkup(app.kind);
      cells += '<span class="vos-mini">' + inner + "</span>";
    });
    if (real.length > 4) cells += '<span class="vos-mini vos-more">+' + (real.length - 3) + "</span>";
    var face = "vos-folder-face";
    if (real.length === 1) face += " one";
    else if (real.length === 2) face += " two";
    return '<span class="' + face + '">' + cells + "</span>";
  }
  function looseIds(ids) {
    return (ids || []).filter(function (id) {
      return iconEls[id] && iconEls[id].dataset.folder !== "1";
    });
  }
  function makeFolder(title, ids, x, y) {
    var folder = {
      id: "fld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: title || nextFolderName(),
      items: []
    };
    folders.push(folder);
    addToFolder(folder.id, ids || [], true);
    if (isFinite(x) && isFinite(y)) iconLayout[folder.id] = clampIcon(x, y);
    saveFolders();
    saveLayout();
    renderDesktopIcons();
    onlyPick(folder.id);
    return folder;
  }
  function addToFolder(folderId, ids, silent) {
    var folder = findFolder(folderId);
    if (!folder) return;
    (ids || []).forEach(function (id) {
      if (!id || String(id).indexOf("fld_") === 0) return;
      if (!appById(id)) return;
      folders.forEach(function (other) {
        other.items = other.items.filter(function (item) { return item !== id; });
      });
      if (folder.items.indexOf(id) === -1) folder.items.push(id);
      delete iconLayout[id];
    });
    if (!silent) {
      saveFolders();
      saveLayout();
      renderDesktopIcons();
      if (openFolderId) paintFolder();
    }
  }
  function removeFromFolder(folderId, id, x, y) {
    var folder = findFolder(folderId);
    if (!folder) return;
    folder.items = folder.items.filter(function (item) { return item !== id; });
    var px = 14;
    var py = 16;
    if (isFinite(x) && isFinite(y) && deskEl) {
      var desk = deskEl.getBoundingClientRect();
      var raw = clampIcon(x - desk.left - 43, y - desk.top - 30);
      px = raw.x;
      py = raw.y;
    } else if (iconLayout[folderId]) {
      px = iconLayout[folderId].x + 96;
      py = iconLayout[folderId].y;
    }
    var skip = {};
    skip[id] = true;
    iconLayout[id] = freeSpot(px, py, skip);
    saveFolders();
    saveLayout();
    renderDesktopIcons();
    paintFolder();
  }
  function deleteFolder(id) {
    var folder = findFolder(id);
    var anchor = iconLayout[id] || { x: 14, y: 16 };
    var items = folder ? folder.items.slice() : [];
    folders = folders.filter(function (entry) { return entry.id !== id; });
    delete iconLayout[id];
    items.forEach(function (itemId, n) {
      var skip = {};
      skip[itemId] = true;
      iconLayout[itemId] = freeSpot(anchor.x + (n % 4) * 96, anchor.y + Math.floor(n / 4) * 96, skip);
    });
    if (openFolderId === id) closeFolder();
    saveFolders();
    saveLayout();
    renderDesktopIcons();
  }
  function renameFolder(folder) {
    if (!folder) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay rename-modal";
    overlay.innerHTML = "<div class=\"modal-box\"><h2>Rename folder</h2><input class=\"text-input\" id=\"vosRenameInput\" maxlength=\"48\" value=\"" + esc(folder.title || "") + "\"><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Save</button></div></div>";
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
        folder.title = name;
        saveFolders();
        renderDesktopIcons();
        if (openFolderId === folder.id) paintFolder();
      }
      done();
    }
    overlay.querySelector(".modal-go").onclick = save;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") save();
      if (e.key === "Escape") done();
    });
  }
  function loadLayout() {
    try {
      iconLayout = JSON.parse(localStorage.getItem(POS_KEY) || "{}") || {};
      if (iconLayout.games && !iconLayout.store) iconLayout.store = iconLayout.games;
      delete iconLayout.games;
    } catch (err) {
      iconLayout = {};
    }
  }
  function saveLayout() {
    try { localStorage.setItem(POS_KEY, JSON.stringify(iconLayout)); } catch (err) {}
  }
  function clampIcon(x, y) {
    var dw = deskEl ? deskEl.clientWidth : window.innerWidth;
    var dh = deskEl ? deskEl.clientHeight : window.innerHeight;
    return {
      x: Math.max(6, Math.min(x, Math.max(6, dw - 92))),
      y: Math.max(6, Math.min(y, Math.max(6, dh - 100)))
    };
  }
  function spotsClose(a, b) {
    return Math.abs(a.x - b.x) < 78 && Math.abs(a.y - b.y) < 78;
  }
  function occupiedSpots(ignore) {
    var spots = [];
    desktopItems().forEach(function (item, index) {
      if (ignore && ignore[item.id]) return;
      var saved = iconLayout[item.id];
      if (saved && isFinite(saved.x) && isFinite(saved.y)) {
        spots.push(clampIcon(saved.x, saved.y));
        return;
      }
      var h = deskEl ? deskEl.clientHeight : 0;
      if (!h) h = Math.max(240, window.innerHeight - 48);
      var rows = Math.max(1, Math.floor((h - 20) / 96));
      spots.push(clampIcon(14 + Math.floor(index / rows) * 96, 16 + (index % rows) * 96));
    });
    return spots;
  }
  function freeSpot(x, y, ignore) {
    var spots = occupiedSpots(ignore);
    function taken(p) {
      var i;
      for (i = 0; i < spots.length; i++) if (spotsClose(spots[i], p)) return true;
      return false;
    }
    var prefer = clampIcon(isFinite(x) ? x : 14, isFinite(y) ? y : 16);
    if (!taken(prefer)) return prefer;
    var h = deskEl ? deskEl.clientHeight : 0;
    var w = deskEl ? deskEl.clientWidth : 0;
    if (!h) h = Math.max(240, window.innerHeight - 48);
    if (!w) w = Math.max(320, window.innerWidth);
    var rows = Math.max(1, Math.floor((h - 20) / 96));
    var cols = Math.max(1, Math.floor((w - 28) / 96));
    var c;
    var r;
    for (c = 0; c < cols + 6; c++) {
      for (r = 0; r < rows; r++) {
        var p = clampIcon(14 + c * 96, 16 + r * 96);
        if (!taken(p)) return p;
      }
    }
    return prefer;
  }
  function iconPos(index, id, used) {
    var saved = id && iconLayout[id];
    if (saved && isFinite(saved.x) && isFinite(saved.y)) return clampIcon(saved.x, saved.y);
    var h = 0;
    try { h = deskEl.getBoundingClientRect().height; } catch (err) {}
    if (!h) h = Math.max(240, window.innerHeight - 48);
    var rows = Math.max(1, Math.floor((h - 20) / 96));
    var n = index;
    var guard = 0;
    var list = used || [];
    while (guard < 100) {
      var spot = clampIcon(14 + Math.floor(n / rows) * 96, 16 + (n % rows) * 96);
      var clash = false;
      var i;
      for (i = 0; i < list.length; i++) {
        if (spotsClose(list[i], spot)) clash = true;
      }
      if (!clash) return spot;
      n += 1;
      guard += 1;
    }
    return clampIcon(14, 16);
  }
  function closeCtx() {
    ctxApp = null;
    if (ctxEl) ctxEl.hidden = true;
  }
  var ctxAt = 0;
  function showCtx(app, x, y) {
    if (!ctxEl) return;
    ctxAt = Date.now();
    ctxApp = app || null;
    ctxX = x;
    ctxY = y;
    var html = "";
    if (!app) {
      html = "<button type=\"button\" data-act=\"new\"><span>New folder</span></button>";
    } else if (app.inFolder) {
      html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button>";
      html += app.builtin
        ? "<button type=\"button\" data-act=\"rename\" disabled class=\"is-off\"><span>Rename</span></button>"
        : "<button type=\"button\" data-act=\"rename\"><span>Rename</span></button>";
      html += "<button type=\"button\" data-act=\"out\"><span>Remove from folder</span></button>";
      if (app.file) html += "<button type=\"button\" data-act=\"wall\"><span>Set as wallpaper</span></button>";
      if (app.file) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"deletefile\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Delete</span></button>";
      else if (!app.builtin) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"uninstall\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Uninstall</span></button>";
    } else if (app.folder) {
      html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button><button type=\"button\" data-act=\"rename\"><span>Rename</span></button><div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"delete\"><span>Delete folder</span></button>";
    } else {
      html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button>";
      html += app.builtin
        ? "<button type=\"button\" data-act=\"rename\" disabled class=\"is-off\"><span>Rename</span></button>"
        : "<button type=\"button\" data-act=\"rename\"><span>Rename</span></button>";
      if (folders.length) html += "<div class=\"vos-ctx-gap\"></div>";
      folders.forEach(function (folder) {
        html += "<button type=\"button\" data-act=\"move\" data-folder=\"" + esc(folder.id) + "\"><span>Move to " + esc(folder.title || "Folder") + "</span></button>";
      });
      html += "<button type=\"button\" data-act=\"new\"><span>New folder</span></button>";
      if (app.file) html += "<button type=\"button\" data-act=\"wall\"><span>Set as wallpaper</span></button>";
      if (app.file) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"deletefile\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Delete</span></button>";
      else if (!app.builtin) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"uninstall\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Uninstall</span></button>";
    }
    ctxEl.innerHTML = html;
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
    var file = null;
    if (app.file) {
      files.forEach(function (item) { if (item.id === app.id) file = item; });
      current = file;
    } else {
      installed.forEach(function (item) { if (item.id === app.id) current = item; });
    }
    if (!current) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay rename-modal";
    overlay.innerHTML = "<div class=\"modal-box\"><h2>" + (file ? "Rename image" : "Rename app") + "</h2><input class=\"text-input\" id=\"vosRenameInput\" maxlength=\"48\" value=\"" + esc(current.title || "") + "\"><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Save</button></div></div>";
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
        if (file) saveFileRecord(file);
        else saveInstalled();
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
        if (openFolderId) paintFolder();
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
    if (app.folder) {
      openFolder(app.id);
      return;
    }
    if (app.builtin) {
      openApp(app.id);
      return;
    }
    if (app.file) {
      ensureFileWindow(app);
      openApp(app.id);
      return;
    }
    var stored = null;
    installed.forEach(function (item) { if (item.id === app.id) stored = item; });
    if (!stored) return;
    ensureInstalledWindow(stored);
    openApp(stored.id);
  }
  function folderAtPoint(x, y, ignore) {
    if (folderWin && !folderWin.hidden && openFolderId && !(ignore && ignore[openFolderId])) {
      var fb = folderWin.getBoundingClientRect();
      if (x >= fb.left && x <= fb.right && y >= fb.top && y <= fb.bottom) return openFolderId;
    }
    var hit = "";
    Object.keys(iconEls).forEach(function (id) {
      if (ignore && ignore[id]) return;
      var el = iconEls[id];
      if (!el || el.dataset.folder !== "1") return;
      var box = el.getBoundingClientRect();
      if (x >= box.left - 10 && x <= box.right + 10 && y >= box.top - 10 && y <= box.bottom + 10) hit = id;
    });
    return hit;
  }
  function markDrop(over) {
    Object.keys(iconEls).forEach(function (id) {
      if (iconEls[id]) iconEls[id].classList.toggle("is-drop", !!over && id === over);
    });
    if (folderWin) folderWin.classList.toggle("is-drop", !!over && over === openFolderId && !folderWin.hidden);
  }
  function clearDropMarks() {
    markDrop("");
  }
  function markOpenFolder() {
    Object.keys(iconEls).forEach(function (id) {
      if (iconEls[id]) iconEls[id].classList.toggle("is-open", id === openFolderId);
    });
  }
  function closeFolder() {
    openFolderId = null;
    if (folderWin) {
      folderWin.hidden = true;
      folderWin.classList.remove("is-focus", "is-drop");
    }
    markOpenFolder();
  }
  function raiseFolder() {
    if (!folderWin) return;
    zTop += 1;
    folderWin.style.zIndex = String(zTop);
    folderWin.classList.add("is-focus");
  }
  function placeFolder(id) {
    if (!folderWin || !deskEl) return;
    var desk = deskEl.getBoundingClientRect();
    var w = folderWin.offsetWidth || 320;
    var h = folderWin.offsetHeight || 220;
    var x = 16;
    var y = 16;
    var el = iconEls[id];
    if (el) {
      var box = el.getBoundingClientRect();
      x = box.right - desk.left + 12;
      y = box.top - desk.top - 6;
      if (x + w > desk.width - 8) x = box.left - desk.left - w - 12;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      if (y + Math.min(h, 200) > desk.height - 8) y = Math.max(8, desk.height - h - 8);
    }
    folderWin.style.left = Math.round(x) + "px";
    folderWin.style.top = Math.round(y) + "px";
  }
  function bindFolderDrag() {
    var bar = folderWin.querySelector(".vos-fold-bar");
    if (!bar || bar.dataset.bound === "1") return;
    bar.dataset.bound = "1";
    bar.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault();
      e.stopPropagation();
      raiseFolder();
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      var desk = deskEl.getBoundingClientRect();
      var rect = folderWin.getBoundingClientRect();
      var ox = e.clientX - rect.left;
      var oy = e.clientY - rect.top;
      function move(ev) {
        var nx = ev.clientX - desk.left - ox;
        var ny = ev.clientY - desk.top - oy;
        var maxX = Math.max(8, desk.width - folderWin.offsetWidth - 8);
        var maxY = Math.max(8, desk.height - 40);
        nx = Math.max(8, Math.min(nx, maxX));
        ny = Math.max(8, Math.min(ny, maxY));
        folderWin.style.left = nx + "px";
        folderWin.style.top = ny + "px";
      }
      function up() {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
      }
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
    folderWin.addEventListener("pointerdown", function () { raiseFolder(); });
  }
  function paintFolder() {
    var folder = findFolder(openFolderId);
    if (!folder || !deskEl) {
      closeFolder();
      return;
    }
    if (!folderWin) {
      folderWin = document.createElement("div");
      folderWin.className = "vos-fold";
      folderWin.innerHTML = "<div class=\"vos-fold-bar\"><b></b><button type=\"button\" class=\"vos-ctl close\" aria-label=\"Close\">" + svgClose() + "</button></div><div class=\"vos-fold-grid\"></div>";
      folderWin.querySelector(".close").onclick = function (e) {
        e.stopPropagation();
        closeFolder();
      };
      deskEl.appendChild(folderWin);
      bindFolderDrag();
    }
    folderWin.hidden = false;
    folderWin.querySelector("b").textContent = folder.title || "Folder";
    var grid = folderWin.querySelector(".vos-fold-grid");
    grid.innerHTML = "";
    if (!folder.items.length) {
      grid.innerHTML = "<p class=\"vos-fold-empty\">Drag apps here</p>";
      return;
    }
    folder.items.forEach(function (id) {
      var app = appById(id);
      if (!app) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-fold-item";
      btn.title = app.title;
      btn.dataset.app = app.id;
      var glyph = app.iconUrl
        ? '<img class="vos-appicon" draggable="false" alt="" src="' + esc(sharpIcon(app.iconUrl)) + '">'
        : iconMarkup(app.kind);
      btn.innerHTML = "<span class=\"vos-glyph\">" + glyph + "</span><span data-label>" + esc(app.title) + "</span>";
      function choose() {
        Array.prototype.forEach.call(grid.querySelectorAll(".vos-fold-item"), function (node) {
          node.classList.remove("is-on");
        });
        btn.classList.add("is-on");
      }
      btn.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        closeStart();
        closeCtx();
        raiseFolder();
        choose();
        var startX = e.clientX;
        var startY = e.clientY;
        var moved = false;
        var ghost = null;
        var ended = false;
        function move(ev) {
          if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
          moved = true;
          if (!ghost) {
            ghost = document.createElement("div");
            ghost.className = "vos-fold-item vos-fold-ghost";
            ghost.innerHTML = btn.innerHTML;
            document.body.appendChild(ghost);
          }
          ghost.style.left = (ev.clientX - 42) + "px";
          ghost.style.top = (ev.clientY - 28) + "px";
          var over = folderAtPoint(ev.clientX, ev.clientY, {});
          if (over === folder.id) over = "";
          markDrop(over);
        }
        function up(ev) {
          if (ended) return;
          ended = true;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
          var raw = moved ? folderAtPoint(ev.clientX, ev.clientY, {}) : "";
          var selfEl = iconEls[folder.id];
          var onSelf = false;
          if (selfEl) {
            var ib = selfEl.getBoundingClientRect();
            onSelf = ev.clientX >= ib.left - 10 && ev.clientX <= ib.right + 10 && ev.clientY >= ib.top - 10 && ev.clientY <= ib.bottom + 10;
          }
          if (raw === folder.id || onSelf) raw = "";
          clearDropMarks();
          if (!moved || (!raw && onSelf)) return;
          if (raw) {
            addToFolder(raw, [id]);
            return;
          }
          var box = folderWin.getBoundingClientRect();
          var inside = ev.clientX >= box.left && ev.clientX <= box.right && ev.clientY >= box.top && ev.clientY <= box.bottom;
          if (!inside) removeFromFolder(folder.id, id, ev.clientX, ev.clientY);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      });
      btn.addEventListener("dblclick", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openShortcut(app);
      });
      btn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeStart();
        choose();
        showCtx({
          id: app.id,
          title: app.title,
          builtin: app.builtin,
          file: !!app.file,
          url: app.url,
          iconUrl: app.iconUrl,
          kind: app.kind,
          inFolder: folder.id
        }, e.clientX, e.clientY);
      });
      grid.appendChild(btn);
    });
  }
  function openFolder(id) {
    if (!findFolder(id)) return;
    var same = openFolderId === id && folderWin && !folderWin.hidden;
    openFolderId = id;
    paintFolder();
    if (!same) placeFolder(id);
    raiseFolder();
    markOpenFolder();
  }
  function renderDesktopIcons() {
    if (!iconsEl || !deskEl) return;
    closeCtx();
    iconsEl.innerHTML = "";
    iconEls = {};
    var used = [];
    var live = {};
    desktopItems().forEach(function (app, index) {
      live[app.id] = true;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-icon";
      btn.title = app.title;
      btn.dataset.app = app.id;
      if (app.folder) btn.dataset.folder = "1";
      var glyph = app.folder
        ? folderGlyph(app.items)
        : (app.iconUrl
          ? '<img class="vos-appicon" draggable="false" src="' + esc(sharpIcon(app.iconUrl)) + '" alt="">'
          : iconMarkup(app.kind));
      btn.innerHTML = "<span class=\"vos-glyph\">" + glyph + "</span><span data-label>" + esc(app.title) + "</span>";
      var spot = iconPos(index, app.id, used);
      used.push(spot);
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
        if (!picked[app.id]) onlyPick(app.id);
        var startX = e.clientX;
        var startY = e.clientY;
        var moved = false;
        var group = [];
        Object.keys(picked).forEach(function (id) {
          if (picked[id] && iconEls[id]) group.push(id);
        });
        if (!group.length) group = [app.id];
        var origins = {};
        group.forEach(function (id) {
          origins[id] = {
            x: parseFloat(iconEls[id].style.left) || 0,
            y: parseFloat(iconEls[id].style.top) || 0
          };
        });
        var ignore = {};
        group.forEach(function (id) { ignore[id] = true; });
        function move(ev) {
          var dx = ev.clientX - startX;
          var dy = ev.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 5) return;
          moved = true;
          group.forEach(function (id) {
            var el = iconEls[id];
            var spot = clampIcon(origins[id].x + dx, origins[id].y + dy);
            el.style.left = spot.x + "px";
            el.style.top = spot.y + "px";
            el.classList.add("is-moving");
          });
          var over = folderAtPoint(ev.clientX, ev.clientY, ignore);
          markDrop(over);
        }
        var ended = false;
        function up(ev) {
          if (ended) return;
          ended = true;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          var over = moved ? folderAtPoint(ev.clientX, ev.clientY, ignore) : "";
          clearDropMarks();
          group.forEach(function (id) {
            var el = iconEls[id];
            if (el) el.classList.remove("is-moving");
          });
          if (over) {
            var ids = looseIds(group);
            if (!ids.length && !app.folder) ids = [app.id];
            group.forEach(function (id) {
              if (ids.indexOf(id) !== -1) return;
              var el = iconEls[id];
              if (!el || !moved) return;
              iconLayout[id] = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
            });
            if (ids.length) {
              addToFolder(over, ids);
              return;
            }
          }
          group.forEach(function (id) {
            var el = iconEls[id];
            if (!el || !moved) return;
            iconLayout[id] = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
          });
          if (moved) saveLayout();
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
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
        if (!picked[app.id]) onlyPick(app.id);
        showCtx(app, e.clientX, e.clientY);
      });
      iconsEl.appendChild(btn);
    });
    Object.keys(picked).forEach(function (id) {
      if (!live[id]) delete picked[id];
    });
    paintPick();
    markOpenFolder();
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
  function uninstallApp(id) {
    var current = null;
    installed.forEach(function (item) { if (item.id === id) current = item; });
    if (!current) return;
    installed = installed.filter(function (item) { return item.id !== id; });
    folders.forEach(function (folder) {
      folder.items = folder.items.filter(function (item) { return item !== id; });
    });
    delete iconLayout[id];
    delete picked[id];
    saveInstalled();
    saveFolders();
    saveLayout();
    var win = wins[id];
    if (win) {
      if (closeTimers[id]) {
        clearTimeout(closeTimers[id]);
        closeTimers[id] = 0;
      }
      if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
      delete wins[id];
      if (focused === id) focused = null;
    }
    renderDesktopIcons();
    renderTasks();
    syncFull();
    if (openFolderId) paintFolder();
    refreshStore();
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

  function placeCentered(el, w, h) {
    var desk = deskEl.getBoundingClientRect();
    var width = Math.max(320, Math.min(w, desk.width - 32));
    var height = Math.max(240, Math.min(h, desk.height - 32));
    el.style.width = width + "px";
    el.style.height = height + "px";
    el.style.left = Math.max(8, Math.round((desk.width - width) / 2)) + "px";
    el.style.top = Math.max(8, Math.round((desk.height - height) / 2)) + "px";
  }

  function layoutDefaults() {
    var box = deskEl.getBoundingClientRect();
    var W = box.width;
    var H = box.height;
    var w = W < 760 ? W - 36 : Math.min(820, Math.round(W * 0.58));
    var h = W < 760 ? H - 36 : Math.min(540, Math.round(H * 0.66));
    ["browser", "store", "chat", "settings"].forEach(function (id) {
      if (wins[id]) placeCentered(wins[id].el, w, h);
    });
  }

  function focusWin(id) {
    var win = wins[id];
    if (!win || win.el.classList.contains("is-closed")) return;
    focused = id;
    zTop += 1;
    win.el.style.zIndex = String(zTop);
    if (folderWin) folderWin.classList.remove("is-focus");
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
    files.forEach(function (file) {
      list.push({ id: file.id, title: file.title, iconUrl: fileUrls[file.id] || "" });
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

  function ageLabel(code) {
    var map = { E: "Everyone", "E10+": "Everyone 10+", T: "Teen", M: "Mature 17+", AO: "Adults Only", NR: "Not Rated" };
    return map[code] || code || "Not Rated";
  }
  function easeLabel(n) {
    var d = Number(n);
    if (!isFinite(d) || d <= 2) return ["Casual", "Relaxed pace"];
    if (d <= 4) return ["Easy", "Light challenge"];
    if (d <= 6) return ["Medium", "Some challenge"];
    if (d <= 8) return ["Hard", "Takes practice"];
    return ["Expert", "Very demanding"];
  }
  function ensureStore(body) {
    if (!body || body.dataset.ready === "1") return;
    body.dataset.ready = "1";
    body.innerHTML = '<div class="vos-store"><div class="vos-store-scroll" data-home></div><div class="vos-store-detail" data-detail hidden></div></div>';
    var home = body.querySelector("[data-home]");
    var detail = body.querySelector("[data-detail]");
    var games = [];
    var query = "";
    function isInstalled(id) {
      var url = "veil-game:" + id;
      var hit = false;
      installed.forEach(function (item) { if (item.url === url) hit = true; });
      return hit;
    }
    function photosOf(game) {
      var large = "";
      var small = "";
      try { large = largeThumb(game) || ""; } catch (err) {}
      try { small = smallThumb(game) || ""; } catch (err) {}
      var photos = [];
      if (large) photos.push(large);
      if (small && small !== large) photos.push(small);
      if (!photos.length && small) photos.push(small);
      return photos;
    }
    function actions(game) {
      var id = gameId(game);
      var open = isInstalled(id);
      var trash = open ? '<button type="button" class="vos-trash" data-trash="' + esc(id) + '" title="Uninstall" aria-label="Uninstall"><img src="' + IMG + 'trash.svg" alt=""></button>' : "";
      return '<span class="vos-as-actions"><button type="button" class="vos-get' + (open ? " is-open" : "") + '" data-get="' + esc(id) + '">' + (open ? "OPEN" : "GET") + "</button>" + trash + "</span>";
    }
    function paintHome() {
      var q = query.trim().toLowerCase();
      var list = games.filter(function (game) {
        if (!q) return true;
        return String(game.name || "").toLowerCase().indexOf(q) !== -1 || String(game.category || "").toLowerCase().indexOf(q) !== -1;
      });
      var featured = "";
      if (!q) {
        featured = '<section class="vos-as-block"><h2>Featured</h2><div class="vos-as-rail">' + games.slice(0, 6).map(function (game) {
          var photo = photosOf(game)[0] || "";
          return '<button type="button" class="vos-as-card" data-open="' + esc(gameId(game)) + '"><img src="' + esc(photo) + '" alt=""><span><b>' + esc(game.name) + "</b><small>" + esc(game.category || "Game") + " · " + esc(game.maturity || "NR") + "</small></span></button>";
        }).join("") + "</div></section>";
      }
      var rows = list.map(function (game) {
        var icon = "";
        try { icon = smallThumb(game) || ""; } catch (err) {}
        return '<div class="vos-as-row"><button type="button" class="vos-as-hit" data-open="' + esc(gameId(game)) + '"><img src="' + esc(icon) + '" alt=""><span class="vos-as-copy"><b>' + esc(game.name) + "</b><small>" + esc(game.category || "Game") + " · " + esc(ageLabel(game.maturity)) + " · " + esc(easeLabel(game.difficulty)[0]) + "</small></span></button>" + actions(game) + "</div>";
      }).join("");
      home.innerHTML = '<div class="vos-as-top"><h1>App Store</h1><input class="vos-as-search" type="search" placeholder="Search" value="' + esc(query) + '"></div>' + featured + '<section class="vos-as-block"><h2>Games</h2>' + (rows || '<p class="vos-as-empty">No games match.</p>') + "</section>";
      var input = home.querySelector(".vos-as-search");
      if (input) {
        input.addEventListener("input", function () {
          query = input.value;
          var pos = input.selectionStart;
          paintHome();
          var next = home.querySelector(".vos-as-search");
          if (next) {
            next.focus();
            try { next.setSelectionRange(pos, pos); } catch (err) {}
          }
        });
      }
    }
    function findGame(id) {
      var found = null;
      games.forEach(function (game) { if (gameId(game) === id) found = game; });
      return found;
    }
    var detailId = "";
    function paintDetail(id) {
      var game = findGame(id);
      if (!game) return;
      var icon = "";
      try { icon = smallThumb(game) || ""; } catch (err) {}
      detail.hidden = false;
      detailId = id;
      var ease = easeLabel(game.difficulty);
      detail.innerHTML = '<div class="vos-as-back"><button type="button" data-back>‹ Apps</button></div>' +
        '<div class="vos-as-head"><img src="' + esc(icon) + '" alt=""><div><b>' + esc(game.name) + "</b><small>" + esc(game.category || "Games") + "</small></div>" + actions(game) + "</div>" +
        '<div class="vos-as-shots">' + photosOf(game).map(function (src) { return '<img src="' + esc(src) + '" alt="">'; }).join("") + "</div>" +
        '<section class="vos-as-block"><h2>Ratings</h2><div class="vos-as-rates"><div><small>Difficulty</small><strong>' + esc(ease[0]) + "</strong><small>" + esc(ease[1]) + '</small></div><div><strong class="vos-as-age">' + esc(game.maturity || "NR") + "</strong><small>" + esc(ageLabel(game.maturity)) + "</small></div></div></section>" +
        '<section class="vos-as-block"><h2>About</h2><p>' + esc(game.description || "No description.") + "</p></section>" +
        '<section class="vos-as-block"><h2>How to play</h2><p>' + esc(game.howToPlay || "Not listed.") + "</p><p>" + esc(game.controls || "") + "</p></section>" +
        (game.sideNotes ? '<section class="vos-as-block"><h2>Notes</h2><p>' + esc(game.sideNotes) + "</p></section>" : "") +
        '<section class="vos-as-block"><h2>Information</h2><dl class="vos-as-info"><div><dt>Category</dt><dd>' + esc(game.category || "Game") + "</dd></div><div><dt>Age</dt><dd>" + esc(ageLabel(game.maturity)) + "</dd></div><div><dt>Difficulty</dt><dd>" + esc(ease[0]) + "</dd></div></dl></section>";
    }
    body.addEventListener("click", function (e) {
      if (e.target.closest("[data-back]")) {
        detail.hidden = true;
        detailId = "";
        detail.innerHTML = "";
        paintHome();
        return;
      }
      var trash = e.target.closest("[data-trash]");
      if (trash) {
        e.preventDefault();
        e.stopPropagation();
        var gid = trash.getAttribute("data-trash");
        var doomed = null;
        installed.forEach(function (item) { if (item.url === "veil-game:" + gid) doomed = item; });
        if (doomed) uninstallApp(doomed.id);
        return;
      }
      var open = e.target.closest("[data-open]");
      if (open) {
        paintDetail(open.getAttribute("data-open"));
        return;
      }
      var get = e.target.closest("[data-get]");
      if (!get) return;
      e.preventDefault();
      e.stopPropagation();
      var id = get.getAttribute("data-get");
      var game = findGame(id);
      if (!game) return;
      if (isInstalled(id)) {
        var stored = null;
        installed.forEach(function (item) { if (item.url === "veil-game:" + id) stored = item; });
        if (stored) {
          ensureInstalledWindow(stored);
          openApp(stored.id);
        }
        return;
      }
      var icon = "";
      try { icon = smallThumb(game) || ""; } catch (err) {}
      installApp({ title: game.name, url: "veil-game:" + id, icon: icon });
      if (!detail.hidden) paintDetail(id);
      else paintHome();
    });
    home.innerHTML = '<div class="vos-as-top"><h1>App Store</h1></div><p class="vos-as-empty">Loading…</p>';
    refreshStore = function () {
      if (!body.isConnected) return;
      if (!detail.hidden && detailId) paintDetail(detailId);
      else paintHome();
    };
    Promise.resolve(typeof loadGameCatalog === "function" ? loadGameCatalog() : null).then(function () {
      games = (typeof gamesCatalog !== "undefined" && gamesCatalog) ? gamesCatalog.slice() : [];
      paintHome();
    }).catch(function () {
      home.innerHTML = '<div class="vos-as-top"><h1>App Store</h1></div><p class="vos-as-empty">Could not load games.</p>';
    });
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
    if (id === "store") ensureStore(win.body);
    if (id === "chat") ensureChat(win.body);
    if (id === "settings") {
      try { fillWispSelect(); } catch (err) {}
      try { startLivePings(); } catch (err) {}
      try { fillChatSettings(); } catch (err) {}
    }
    if (win.installed) ensureProxy(win);
    if (win.file) paintFile(win);
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
    var w = Math.min(760, Math.max(420, Math.round(W * 0.56)));
    var h = Math.min(500, Math.max(300, Math.round(H * 0.62)));
    placeCentered(win.el, w, h);
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

  function ensureFileWindow(app) {
    if (!app) return null;
    var win = wins[app.id];
    if (win) {
      win.title = app.title;
      win.file = true;
      var bar = win.el.querySelector(".vos-title b");
      if (bar) bar.textContent = app.title;
      return win;
    }
    win = makeWindow({ id: app.id, title: app.title, iconUrl: fileUrls[app.id] || "", installed: false });
    win.file = true;
    if (deskEl) {
      deskEl.appendChild(win.el);
      placeInstalled(win);
    }
    return win;
  }
  function paintFile(win) {
    if (!win || !win.file) return;
    var src = fileUrls[win.id] || "";
    win.body.innerHTML = '<div class="vos-photo"><img alt="" draggable="false" src="' + esc(src) + '"><div class="vos-photo-bar"><button type="button" data-wall>Set as wallpaper</button></div></div>';
    var btn = win.body.querySelector("[data-wall]");
    if (btn) btn.onclick = function (e) {
      e.stopPropagation();
      setWallpaper(win.id);
    };
  }

  function ensureProxy(win) {
    if (!win || !win.installed || win.frameReady) return;
    var gameId = "";
    var gameMatch = String(win.url || "").match(/^veil-game:(.+)$/i);
    if (gameMatch) gameId = gameMatch[1];
    win.frameReady = true;
    var host = win.body.querySelector(".vos-proxy");
    if (!host) {
      host = document.createElement("div");
      host.className = "vos-proxy";
      win.body.appendChild(host);
    }
    if (gameId) {
      var src = "";
      try { if (typeof window.veilGamePlay === "function") src = window.veilGamePlay(gameId) || ""; } catch (err) {}
      if (!src) {
        win.frameReady = false;
        host.innerHTML = '<div class="vos-app-wait">This game is not available.</div>';
        return;
      }
      host.innerHTML = '<iframe src="' + esc(src) + '" allow="gamepad *; autoplay *; fullscreen *" title=""></iframe>';
      return;
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
    loadFolders();
    loadLayout();
    icons.addEventListener("dragstart", function (e) { e.preventDefault(); });
    desk.appendChild(icons);
    desk.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (e.target.closest && (e.target.closest(".vos-win") || e.target.closest(".vos-icon") || e.target.closest(".vos-fold"))) return;
      closeStart();
      closeFolder();
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
    desk.addEventListener("dragover", function (e) {
      if (!e.dataTransfer) return;
      var types = e.dataTransfer.types ? Array.prototype.slice.call(e.dataTransfer.types) : [];
      if (types.indexOf("Files") === -1) return;
      e.preventDefault();
    });
    desk.addEventListener("drop", function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      var images = [];
      var i;
      for (i = 0; i < e.dataTransfer.files.length; i++) {
        if (String(e.dataTransfer.files[i].type || "").indexOf("image/") === 0) images.push(e.dataTransfer.files[i]);
      }
      if (!images.length) return;
      e.preventDefault();
      e.stopPropagation();
      images.forEach(function (file) { addImageFile(file, file.name, "").catch(function () {}); });
    });
    desk.addEventListener("contextmenu", function (e) {
      if (e.target.closest && (e.target.closest(".vos-win") || e.target.closest(".vos-icon") || e.target.closest(".vos-fold"))) return;
      e.preventDefault();
      closeStart();
      onlyPick(null);
      showCtx(null, e.clientX, e.clientY);
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
      if (e.button === 2) return;
      if (Date.now() - ctxAt < 400) return;
      if (ctxEl && !ctxEl.hidden && !ctxEl.contains(e.target)) closeCtx();
      if (!menu.classList.contains("is-open")) return;
      if (startWrap.contains(e.target)) return;
      closeStart();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeStart();
        closeCtx();
        closeFolder();
      }
      if (e.key !== "F2" || e.repeat) return;
      var host = e.target;
      if (host && host.closest && host.closest("input, textarea, .modal-overlay, .vos-win")) return;
      if (folderWin && !folderWin.hidden && openFolderId) {
        var chosen = folderWin.querySelector(".vos-fold-item.is-on");
        if (chosen && chosen.dataset.app) {
          e.preventDefault();
          renameInstalled(appById(chosen.dataset.app));
          return;
        }
      }
      var ids = [];
      Object.keys(picked).forEach(function (id) { if (picked[id]) ids.push(id); });
      if (ids.length !== 1) return;
      var target = null;
      desktopItems().forEach(function (item) { if (item.id === ids[0]) target = item; });
      if (!target) return;
      e.preventDefault();
      if (target.folder) renameFolder(findFolder(target.id));
      else renameInstalled(target);
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
    ctxEl.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      e.stopPropagation();
      var act = btn.getAttribute("data-act");
      var dest = btn.getAttribute("data-folder") || "";
      var app = ctxApp;
      closeCtx();
      if (act === "open" && app) openShortcut(app.folder ? app : (appById(app.id) || app));
      if (act === "rename" && app) {
        if (app.folder) renameFolder(findFolder(app.id));
        else renameInstalled(app);
      }
      if (act === "delete" && app && app.folder) deleteFolder(app.id);
      if (act === "uninstall" && app && !app.builtin && !app.folder && !app.file) uninstallApp(app.id);
      if (act === "deletefile" && app && app.file) deleteFile(app.id);
      if (act === "wall" && app && app.file) setWallpaper(app.id);
      if (act === "out" && app && app.inFolder) removeFromFolder(app.inFolder, app.id);
      if (act === "move" && dest) {
        var ids = [];
        Object.keys(picked).forEach(function (id) { if (picked[id]) ids.push(id); });
        ids = looseIds(ids);
        if (app && ids.indexOf(app.id) === -1) ids.push(app.id);
        addToFolder(dest, ids);
      }
      if (act === "new") {
        var box = deskEl.getBoundingClientRect();
        if (!app) {
          var spot = freeSpot(ctxX - box.left - 28, ctxY - box.top - 16, {});
          makeFolder(nextFolderName(), [], spot.x, spot.y);
          return;
        }
        if (app.folder) return;
        var chosen = [];
        Object.keys(picked).forEach(function (id) { if (picked[id]) chosen.push(id); });
        chosen = looseIds(chosen);
        if (chosen.indexOf(app.id) === -1) chosen.push(app.id);
        var icon = iconEls[app.id];
        makeFolder(nextFolderName(), chosen, icon ? parseFloat(icon.style.left) || 16 : 16, icon ? parseFloat(icon.style.top) || 16 : 16);
      }
    });
    document.body.appendChild(ctxEl);
    document.body.appendChild(shell);
    deskEl = desk;
    tasksEl = tasks;
    installed.forEach(function (app) { ensureInstalledWindow(app); });
    renderDesktopIcons();
    window.addEventListener("resize", function () {
      var used = [];
      desktopItems().forEach(function (app, index) {
        var el = iconEls[app.id];
        if (!el) return;
        var spot = iconPos(index, app.id, used);
        used.push(spot);
        el.style.left = spot.x + "px";
        el.style.top = spot.y + "px";
      });
      if (openFolderId && folderWin && !folderWin.hidden && deskEl) {
        var rect = folderWin.getBoundingClientRect();
        var desk = deskEl.getBoundingClientRect();
        var maxX = Math.max(8, desk.width - rect.width - 8);
        var maxY = Math.max(8, desk.height - 40);
        var x = Math.max(8, Math.min(rect.left - desk.left, maxX));
        var y = Math.max(8, Math.min(rect.top - desk.top, maxY));
        folderWin.style.left = Math.round(x) + "px";
        folderWin.style.top = Math.round(y) + "px";
      }
    });
    layoutDefaults();
    paintClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(paintClock, 1000);
    paintDesk();
    loadFiles().then(function (loaded) {
      if (loaded === false) return;
      pruneMissingFiles();
      renderDesktopIcons();
      paintDesk();
      try { if (typeof applyNewTabBackground === "function") applyNewTabBackground(); } catch (err) {}
    });
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
    if (url.indexOf("veil-file:") === 0) url = fileUrls[url.slice("veil-file:".length)] || "";
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
    setTimeout(function () {
      if (shell) shell.classList.add("vos-settled");
    }, 700);
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
  window.veilOSFileUrl = function (id) { return fileUrls[id] || ""; };
  window.veilOSAddImage = function (info) {
    if (!info) return Promise.resolve(null);
    return addImageFile(info.blob || null, info.name || "Image", info.remote || "");
  };
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
