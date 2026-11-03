'use strict';
(function () {
  var APPS = [
    { id: "browser", title: "Browser", icon: "favi" },
    { id: "store", title: "App Store", icon: "store" },
    { id: "chat", title: "Chat", icon: "chat" },
    { id: "settings", title: "Settings", icon: "settings" },
    { id: "calc", title: "Calculator", icon: "calc" },
    { id: "timer", title: "Timer", icon: "clock" },
    { id: "editor", title: "Code Editor", icon: "editor" },
    { id: "notes", title: "Notepad", icon: "note" },
    { id: "player", title: "Media Player", icon: "audio" },
    { id: "music", title: "Music", icon: "audio" },
    { id: "movies", title: "Movies", icon: "video" }
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
    if (kind === "store") return '<img class="vos-pad" draggable="false" src="' + IMG + 'appstore.svg" alt="">';
    if (kind === "games") return '<img draggable="false" src="' + IMG + 'games.svg" alt="">';
    if (kind === "settings") return '<img class="vos-pad" draggable="false" src="' + IMG + 'settings.svg" alt="">';
    if (kind === "chat") return '<img class="vos-chat" draggable="false" src="' + IMG + 'chat.svg" alt="">';
    if (kind === "calc") return '<img class="vos-pad" draggable="false" src="' + IMG + 'calculator.svg" alt="">';
    if (kind === "clock") return '<img class="vos-pad" draggable="false" src="' + IMG + 'clock.svg" alt="">';
    if (kind === "editor") return '<img class="vos-pad" draggable="false" src="' + IMG + 'editor.svg" alt="">';
    if (kind === "file") return '<img class="vos-pad" draggable="false" src="' + IMG + 'file.svg" alt="">';
    if (kind === "note") return '<img class="vos-pad" draggable="false" src="' + IMG + 'notepad.svg" alt="">';
    if (kind === "audio") return '<img class="vos-pad" draggable="false" src="' + IMG + 'audio.svg" alt="">';
    if (kind === "video") return '<img class="vos-pad" draggable="false" src="' + IMG + 'video.svg" alt="">';
    return svgChat();
  }
  function sharpIcon(url) {
    return String(url || "").replace(/([?&]sz=)\d+/i, "$1128");
  }
  function faviconFor(url) {
    var host = "";
    try { host = new URL(String(url || "")).hostname; } catch (err) { return ""; }
    host = String(host || "").replace(/^www\./, "");
    if (!host) return "";
    return "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(host);
  }
  function iconHtml(app) {
    var fav = app && app.url ? faviconFor(app.url) : "";
    if (fav) return '<img class="vos-appicon" draggable="false" alt="" src="' + esc(fav) + '">';
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
      var req = indexedDB.open("veil_os_files", 2);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
        if (!db.objectStoreNames.contains("wall")) db.createObjectStore("wall", { keyPath: "id" });
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
  function fileExt(name) {
    var match = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return match ? match[1] : "";
  }
  function withExt(name, ext) {
    var clean = String(ext || "").replace(/^\./, "").toLowerCase();
    var base = String(name || "").trim() || "untitled";
    if (!clean) return base.slice(0, 80);
    if (fileExt(base) === clean) return base.slice(0, 80);
    return (base + "." + clean).slice(0, 80);
  }
  function extForMime(mime, fallback) {
    var map = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
      "image/webp": "webp", "image/svg+xml": "svg", "image/bmp": "bmp", "image/avif": "avif",
      "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/wave": "wav", "audio/x-wav": "wav",
      "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/aac": "aac", "audio/flac": "flac", "audio/x-m4a": "m4a", "audio/webm": "weba",
      "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv", "video/quicktime": "mov"
    };
    var key = String(mime || "").split(";")[0].trim().toLowerCase();
    return map[key] || fallback || "";
  }
  var AUDIO_EXT = { mp3: 1, wav: 1, ogg: 1, oga: 1, m4a: 1, aac: 1, flac: 1, weba: 1 };
  var VIDEO_EXT = { mp4: 1, webm: 1, ogv: 1, mov: 1, m4v: 1 };
  function mediaKindFrom(name, mime) {
    var type = String(mime || "").toLowerCase();
    if (type.indexOf("audio/") === 0) return "audio";
    if (type.indexOf("video/") === 0) return "video";
    var ext = fileExt(name);
    if (AUDIO_EXT[ext]) return "audio";
    if (VIDEO_EXT[ext]) return "video";
    return "";
  }
  function extForFile(file) {
    if (!file) return "";
    if (file.kind === "note") return "txt";
    if (file.kind === "code") {
      var ext = "txt";
      var lang = file.lang || "javascript";
      LANGS.forEach(function (item) { if (item.id === lang) ext = item.ext; });
      return ext;
    }
    if (file.kind === "audio") {
      var got = fileExt(file.title);
      return AUDIO_EXT[got] ? got : extForMime(file.mime, "mp3");
    }
    if (file.kind === "video") {
      var gotV = fileExt(file.title);
      return VIDEO_EXT[gotV] ? gotV : extForMime(file.mime, "mp4");
    }
    return fileExt(file.title) || extForMime(file.mime, "png");
  }
  function nameWithKind(file, name) {
    var stem = String(name || "").replace(/\.[a-z0-9]{1,8}$/i, "").trim();
    return withExt(stem || "untitled", extForFile(file));
  }
  function addImageFile(blob, name, remote) {
    var mime = blob && blob.type || "";
    if (mediaKindFrom(name, mime)) return addMediaFile(blob, name, mime, remote, "");
    var ext = fileExt(name) || extForMime(mime, "png");
    var title = withExt(String(name || "Image").replace(/\.[a-z0-9]{1,8}$/i, ""), ext);
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
  function addCodeFile(info) {
    info = info || {};
    var title = nameWithKind({ kind: "code", lang: info.lang || "javascript" }, info.title || "untitled");
    var existing = null;
    if (info.id) files.forEach(function (item) { if (item.id === info.id) existing = item; });
    var file = existing || {
      id: "code_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      kind: "code"
    };
    file.title = title;
    file.kind = "code";
    file.lang = info.lang || file.lang || "javascript";
    file.text = String(info.text || "");
    file.input = String(info.input || "");
    if (!existing) {
      files.push(file);
      iconLayout[file.id] = freeSpot(24, 16, {});
    }
    return saveFileRecord(file).then(function () {
      saveLayout();
      renderDesktopIcons();
      if (openFolderId) paintFolder();
      return file;
    }).catch(function () { return null; });
  }
  function addNoteFile(info) {
    info = info || {};
    var existing = null;
    if (info.id) files.forEach(function (item) { if (item.id === info.id) existing = item; });
    var file = existing || {
      id: "note_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      kind: "note"
    };
    file.kind = "note";
    file.title = nameWithKind(file, info.title || "untitled");
    file.text = String(info.text || "");
    if (!existing) {
      files.push(file);
      iconLayout[file.id] = freeSpot(24, 16, {});
    }
    return saveFileRecord(file).then(function () {
      saveLayout();
      renderDesktopIcons();
      if (openFolderId) paintFolder();
      return file;
    }).catch(function () { return null; });
  }
  function addMediaFile(blob, name, mime, remote, kindHint) {
    var kind = kindHint || mediaKindFrom(name, mime || (blob && blob.type) || "");
    if (kind !== "audio" && kind !== "video") {
      try { alert("Veil can save MP3, WAV, OGG, M4A, FLAC, MP4, WEBM, and MOV."); } catch (err) {}
      return Promise.resolve(null);
    }
    if (blob && blob.size > 100 * 1024 * 1024) {
      try { alert("That file is too large."); } catch (err2) {}
      return Promise.resolve(null);
    }
    var ext = fileExt(name);
    var known = kind === "audio" ? AUDIO_EXT[ext] : VIDEO_EXT[ext];
    if (!known) ext = extForMime(mime || (blob && blob.type), kind === "audio" ? "mp3" : "mp4");
    var stem = String(name || (kind === "audio" ? "Audio" : "Video")).replace(/\.[a-z0-9]{1,8}$/i, "");
    var file = {
      id: (kind === "audio" ? "aud_" : "vid_") + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: withExt(stem, ext),
      kind: kind,
      mime: mime || (blob && blob.type) || (kind === "audio" ? "audio/mpeg" : "video/mp4"),
      blob: blob || null,
      remote: blob ? "" : String(remote || "")
    };
    if (!file.blob && !file.remote) {
      try { alert("Could not save that file."); } catch (err3) {}
      return Promise.resolve(null);
    }
    rememberFile(file);
    files.push(file);
    iconLayout[file.id] = freeSpot(24, 16, {});
    return saveFileRecord(file).then(function () {
      saveLayout();
      renderDesktopIcons();
      onlyPick(file.id);
      return file;
    }).catch(function () {
      try { alert("Could not save that file."); } catch (err4) {}
      return null;
    });
  }
  var deviceWallUrl = "";
  function readWallBlob() {
    return fileDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction("wall", "readonly").objectStore("wall").get("current");
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }
  function writeWallBlob(blob) {
    return fileDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("wall", "readwrite");
        tx.objectStore("wall").put({ id: "current", blob: blob });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function refreshDeviceWall() {
    return readWallBlob().then(function (rec) {
      if (deviceWallUrl) URL.revokeObjectURL(deviceWallUrl);
      deviceWallUrl = rec && rec.blob ? URL.createObjectURL(rec.blob) : "";
      paintDesk();
    });
  }
  var pins = [];
  var deskApps = [];
  var refreshStart = function () {};
  var DESK_KEY = "veil_os_desk";
  function loadPins() {
    pins = [];
    try { pins = JSON.parse(localStorage.getItem("veil_os_pins") || "[]"); } catch (err) { pins = []; }
    if (!Array.isArray(pins)) pins = [];
  }
  function savePins() {
    try { localStorage.setItem("veil_os_pins", JSON.stringify(pins)); } catch (err) {}
  }
  function loadDeskApps() {
    var raw = null;
    try { raw = localStorage.getItem(DESK_KEY); } catch (err) {}
    if (raw == null) {
      deskApps = ["browser", "movies"];
      Object.keys(iconLayout).forEach(function (id) {
        if (!id || id === "browser" || String(id).indexOf("fld_") === 0) return;
        if (/^(img_|note_|code_|aud_|vid_)/.test(id)) return;
        var app = appById(id);
        if (!app || app.file) return;
        if (holdingFolder(id)) return;
        if (deskApps.indexOf(id) === -1) deskApps.push(id);
      });
      saveDeskApps();
      return;
    }
    try { deskApps = JSON.parse(raw) || []; } catch (err2) { deskApps = []; }
    if (!Array.isArray(deskApps)) deskApps = [];
    if (deskApps.indexOf("browser") === -1) deskApps.unshift("browser");
    if (deskApps.indexOf("movies") === -1 && !holdingFolder("movies")) {
      deskApps.push("movies");
      saveDeskApps();
    }
  }
  function saveDeskApps() {
    try { localStorage.setItem(DESK_KEY, JSON.stringify(deskApps)); } catch (err) {}
  }
  function placeOnDesktop(id, x, y) {
    if (!id || id === "browser") return;
    var app = appById(id);
    if (!app || app.file || app.folder) return;
    var holder = holdingFolder(id);
    if (holder) {
      holder.items = holder.items.filter(function (item) { return item !== id; });
      saveFolders();
    }
    if (deskApps.indexOf(id) === -1) deskApps.push(id);
    iconLayout[id] = freeSpot(isFinite(x) ? x : 14, isFinite(y) ? y : 12, {});
    saveDeskApps();
    saveLayout();
    renderDesktopIcons();
    if (openFolderId) paintFolder();
  }
  function togglePin(id) {
    if (!id) return;
    var at = pins.indexOf(id);
    if (at === -1) pins.push(id);
    else pins.splice(at, 1);
    savePins();
    renderTasks();
  }
  function noteRecent(id) {
    if (!id) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem("veil_os_recent") || "[]"); } catch (err) { list = []; }
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (item) { return item !== id; });
    list.unshift(id);
    try { localStorage.setItem("veil_os_recent", JSON.stringify(list.slice(0, 10))); } catch (err2) {}
  }
  function profileBits() {
    var name = "Guest";
    var avatar = IMG + "profileplaceholder.png";
    var placeholder = true;
    try {
      var raw = localStorage.getItem("veil_profile");
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.name) name = String(data.name).slice(0, 32);
        if (data && data.avatar) { avatar = data.avatar; placeholder = false; }
      }
    } catch (err) {}
    return { name: name, avatar: avatar, placeholder: placeholder };
  }
  function gridSnap(x, y) {
    var h = deskEl ? deskEl.clientHeight : 0;
    if (!h) h = Math.max(240, window.innerHeight - 48);
    var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
    var col = Math.max(0, Math.round((x - 14) / ICON_X));
    var row = Math.max(0, Math.min(rows - 1, Math.round((y - 12) / ICON_Y)));
    return clampIcon(14 + col * ICON_X, 12 + row * ICON_Y);
  }
  function itemSpot(item, index) {
    var saved = iconLayout[item.id];
    if (saved && isFinite(saved.x) && isFinite(saved.y)) return clampIcon(saved.x, saved.y);
    var h = deskEl ? deskEl.clientHeight : 0;
    if (!h) h = Math.max(240, window.innerHeight - 48);
    var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
    return clampIcon(14 + Math.floor(index / rows) * ICON_X, 12 + (index % rows) * ICON_Y);
  }
  function nearestOpen(x, y, ignore, extra) {
    var spots = occupiedSpots(ignore).concat(extra || []);
    function taken(p) {
      var i;
      for (i = 0; i < spots.length; i++) if (spotsClose(spots[i], p)) return true;
      return false;
    }
    var h = deskEl ? deskEl.clientHeight : 0;
    var w = deskEl ? deskEl.clientWidth : 0;
    if (!h) h = Math.max(240, window.innerHeight - 48);
    if (!w) w = Math.max(320, window.innerWidth);
    var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
    var cols = Math.max(1, Math.floor((w - 28) / ICON_X));
    var startC = Math.max(0, Math.round((x - 14) / ICON_X));
    var startR = Math.max(0, Math.round((y - 12) / ICON_Y));
    var best = null;
    var bestD = 1e9;
    var c;
    var r;
    for (c = 0; c < cols + 4; c++) {
      for (r = 0; r < rows; r++) {
        var p = clampIcon(14 + c * ICON_X, 12 + r * ICON_Y);
        if (taken(p)) continue;
        var down = r - startR;
        if (down < 0) down += rows;
        var side = Math.abs(c - startC);
        var d = down * 10 + side * 14 + (c < startC ? 4 : 0);
        if (d < bestD) { bestD = d; best = p; }
      }
    }
    return best || clampIcon(x, y);
  }
  function pushOccupant(spot, ignore, extra) {
    var items = desktopItems();
    var victim = "";
    var i;
    for (i = 0; i < items.length; i++) {
      if (ignore[items[i].id] || victim) continue;
      if (spotsClose(itemSpot(items[i], i), spot)) victim = items[i].id;
    }
    if (!victim) return;
    ignore[victim] = true;
    var next = nearestOpen(spot.x, spot.y + 96, ignore, (extra || []).concat([spot]));
    iconLayout[victim] = next;
    if (iconEls[victim]) {
      iconEls[victim].style.left = next.x + "px";
      iconEls[victim].style.top = next.y + "px";
    }
  }
  function settleDragged(group) {
    var ignore = {};
    var used = [];
    group.forEach(function (id) { ignore[id] = true; });
    group.forEach(function (id) {
      var el = iconEls[id];
      if (!el) return;
      var spot = gridSnap(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0);
      var guard = 0;
      while (guard < 40) {
        var clash = false;
        var i;
        for (i = 0; i < used.length; i++) if (spotsClose(used[i], spot)) clash = true;
        if (!clash) break;
        spot = freeSpot(spot.x, spot.y + 96, ignore);
        guard += 1;
      }
      pushOccupant(spot, ignore, used);
      used.push(spot);
      iconLayout[id] = spot;
      el.style.left = spot.x + "px";
      el.style.top = spot.y + "px";
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
      if (settings && (settings.backgroundUrl === "veil-file:" + id || settings.osWallId === id)) {
        settings.backgroundUrl = settings.backgroundUrl === "veil-file:" + id ? "" : settings.backgroundUrl;
        if (settings.osWallId === id) settings.osWall = "default";
        if (settings.animStyle === "custom" && !settings.backgroundUrl) settings.animEnabled = false;
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
      settings.osWall = "file";
      settings.osWallId = id;
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
      if (file.kind === "code") {
        list.push({ id: file.id, title: file.title, builtin: false, file: true, code: true, kind: "file", lang: file.lang || "javascript", text: file.text || "", input: file.input || "" });
        return;
      }
      if (file.kind === "note") {
        list.push({ id: file.id, title: file.title, builtin: false, file: true, note: true, kind: "note", text: file.text || "" });
        return;
      }
      if (file.kind === "audio" || file.kind === "video") {
        list.push({ id: file.id, title: file.title, builtin: false, file: true, audio: file.kind === "audio", video: file.kind === "video", kind: file.kind });
        return;
      }
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
        id = String(id || "");
        if (appById(id)) return true;
        return id.indexOf("img_") === 0 || id.indexOf("note_") === 0 || id.indexOf("code_") === 0 || id.indexOf("aud_") === 0 || id.indexOf("vid_") === 0;
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
      if (holdingFolder(app.id)) return;
      if (app.file) { list.push(app); return; }
      if (app.id === "browser" || deskApps.indexOf(app.id) !== -1) list.push(app);
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
      cells += '<span class="vos-mini">' + iconHtml(app) + "</span>";
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
    if (deskApps.indexOf(id) === -1) {
      var back = appById(id);
      if (back && !back.file) deskApps.push(id);
    }
    saveDeskApps();
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
      iconLayout[itemId] = freeSpot(anchor.x + (n % 4) * ICON_X, anchor.y + Math.floor(n / 4) * ICON_Y, skip);
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
  var ICON_X = 104;
  var ICON_Y = 118;
  function clampIcon(x, y) {
    var dw = deskEl ? deskEl.clientWidth : window.innerWidth;
    var dh = deskEl ? deskEl.clientHeight : window.innerHeight;
    return {
      x: Math.max(8, Math.min(x, Math.max(8, dw - 104))),
      y: Math.max(8, Math.min(y, Math.max(8, dh - 120)))
    };
  }
  function spotsClose(a, b) {
    return Math.abs(a.x - b.x) < 96 && Math.abs(a.y - b.y) < 110;
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
      var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
      spots.push(clampIcon(14 + Math.floor(index / rows) * ICON_X, 12 + (index % rows) * ICON_Y));
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
    var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
    var cols = Math.max(1, Math.floor((w - 28) / ICON_X));
    var c;
    var r;
    for (c = 0; c < cols + 6; c++) {
      for (r = 0; r < rows; r++) {
        var p = clampIcon(14 + c * ICON_X, 12 + r * ICON_Y);
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
    var rows = Math.max(1, Math.floor((h - 16) / ICON_Y));
    var n = index;
    var guard = 0;
    var list = used || [];
    while (guard < 100) {
      var spot = clampIcon(14 + Math.floor(n / rows) * ICON_X, 12 + (n % rows) * ICON_Y);
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
      if (!app.file && !app.folder) html += "<button type=\"button\" data-act=\"pin\"><span>" + (pins.indexOf(app.id) === -1 ? "Pin to taskbar" : "Unpin from taskbar") + "</span></button>";
      html += "<button type=\"button\" data-act=\"out\"><span>Remove from folder</span></button>";
      if (app.file && app.kind === "image") html += "<button type=\"button\" data-act=\"wall\"><span>Set as wallpaper</span></button>";
      if (app.file) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"deletefile\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Delete</span></button>";
      else if (!app.builtin) html += "<div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"uninstall\"><img src=\"" + IMG + "trash.svg\" alt=\"\"><span>Uninstall</span></button>";
    } else if (app.folder) {
      html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button><button type=\"button\" data-act=\"rename\"><span>Rename</span></button><div class=\"vos-ctx-gap\"></div><button type=\"button\" data-act=\"delete\"><span>Delete folder</span></button>";
    } else {
      html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button>";
      html += app.builtin
        ? "<button type=\"button\" data-act=\"rename\" disabled class=\"is-off\"><span>Rename</span></button>"
        : "<button type=\"button\" data-act=\"rename\"><span>Rename</span></button>";
      if (!app.file) html += "<button type=\"button\" data-act=\"pin\"><span>" + (pins.indexOf(app.id) === -1 ? "Pin to taskbar" : "Unpin from taskbar") + "</span></button>";
      if (folders.length) html += "<div class=\"vos-ctx-gap\"></div>";
      folders.forEach(function (folder) {
        html += "<button type=\"button\" data-act=\"move\" data-folder=\"" + esc(folder.id) + "\"><span>Move to " + esc(folder.title || "Folder") + "</span></button>";
      });
      html += "<button type=\"button\" data-act=\"new\"><span>New folder</span></button>";
      if (app.file && app.kind === "image") html += "<button type=\"button\" data-act=\"wall\"><span>Set as wallpaper</span></button>";
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
  function showTaskCtx(app, x, y) {
    if (!ctxEl || !app) return;
    ctxAt = Date.now();
    ctxApp = app;
    ctxX = x;
    ctxY = y;
    var win = wins[app.id];
    var running = !!(win && win.running && !win.el.classList.contains("is-closed") && !win.el.classList.contains("is-closing"));
    var pinned = pins.indexOf(app.id) !== -1;
    var html = "<button type=\"button\" data-act=\"open\"><span>Open</span></button>";
    if (!app.file && !app.folder) html += "<button type=\"button\" data-act=\"pin\"><span>" + (pinned ? "Unpin from taskbar" : "Pin to taskbar") + "</span></button>";
    if (running) html += "<button type=\"button\" data-act=\"close\"><span>Close</span></button>";
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
    overlay.innerHTML = "<div class=\"modal-box\"><h2>" + (file ? "Rename file" : "Rename app") + "</h2><input class=\"text-input\" id=\"vosRenameInput\" maxlength=\"64\" value=\"" + esc(current.title || "") + "\"><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Save</button></div></div>";
    document.body.appendChild(overlay);
    var input = overlay.querySelector("#vosRenameInput");
    input.focus();
    input.select();
    function done() { overlay.remove(); }
    overlay.querySelector(".modal-cancel").onclick = done;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) done(); });
    function save() {
      var name = input.value.trim().slice(0, 64);
      if (name) {
        current.title = file ? nameWithKind(file, name) : name;
        if (file) saveFileRecord(file);
        else saveInstalled();
        var el = iconEls[current.id];
        if (el) {
          el.title = current.title;
          var label = el.querySelector("[data-label]");
          if (label) label.textContent = current.title;
        }
        if (wins[current.id]) {
          wins[current.id].title = current.title;
          var bar = wins[current.id].el.querySelector(".vos-title b");
          if (bar) bar.textContent = current.title;
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
      noteRecent(app.id);
      openFolder(app.id);
      return;
    }
    if (app.builtin) {
      openApp(app.id);
      return;
    }
    if (app.code) {
      openApp("editor");
      ensureEditor(wins.editor && wins.editor.body);
      editorOpenSaved(app);
      noteRecent(app.id);
      return;
    }
    if (app.note) {
      openApp("notes");
      ensureNotepad(wins.notes && wins.notes.body);
      noteOpenSaved(app);
      noteRecent(app.id);
      return;
    }
    if (app.video) {
      openApp("movies");
      moviePlay({
        id: app.id,
        title: movieNice(app.title),
        year: "Saved",
        by: "On this computer",
        local: true,
        file: ""
      });
      noteRecent("movies");
      return;
    }
    if (app.audio) {
      openApp("player");
      ensurePlayer(wins.player && wins.player.body);
      playerLoad(app);
      noteRecent(app.id);
      return;
    }
    if (app.file) {
      ensureFileWindow(app);
      openApp(app.id);
      noteRecent(app.id);
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
      var glyph = iconHtml(app);
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
          code: !!app.code,
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
      var glyph = app.folder ? folderGlyph(app.items) : iconHtml(app);
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
          if (moved) {
            settleDragged(group);
            saveLayout();
            renderDesktopIcons();
          }
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
    refreshStart();
    refreshStore();
    return true;
  }
  function uninstallApp(id) {
    var current = null;
    installed.forEach(function (item) { if (item.id === id) current = item; });
    if (!current) return;
    var at = pins.indexOf(id);
    if (at !== -1) { pins.splice(at, 1); savePins(); }
    var deskAt = deskApps.indexOf(id);
    if (deskAt !== -1) { deskApps.splice(deskAt, 1); saveDeskApps(); }
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
    var maxW = Math.max(120, desk.width - 12);
    var maxH = Math.max(100, desk.height - 12);
    var width = Math.min(w, maxW);
    var height = Math.min(h, maxH);
    var left = Math.max(0, Math.min(x, Math.max(0, desk.width - width)));
    var top = Math.max(0, Math.min(y, Math.max(0, desk.height - height)));
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
    el.style.width = Math.round(width) + "px";
    el.style.height = Math.round(height) + "px";
  }

  function placeCentered(el, w, h) {
    var desk = deskEl.getBoundingClientRect();
    var maxW = Math.max(120, desk.width - 16);
    var maxH = Math.max(100, desk.height - 16);
    var width = Math.min(w, maxW);
    var height = Math.min(h, maxH);
    el.style.width = Math.round(width) + "px";
    el.style.height = Math.round(height) + "px";
    el.style.left = Math.max(0, Math.round((desk.width - width) / 2)) + "px";
    el.style.top = Math.max(0, Math.round((desk.height - height) / 2)) + "px";
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
    ["calc", "timer", "editor", "notes", "player", "music", "movies"].forEach(function (id) {
      var size = appSize(id);
      if (wins[id] && size) placeCentered(wins[id].el, size.w, size.h);
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
      if (file.kind === "code") list.push({ id: file.id, title: file.title, icon: "file" });
      else if (file.kind === "note") list.push({ id: file.id, title: file.title, icon: "note" });
      else if (file.kind === "audio") list.push({ id: file.id, title: file.title, icon: "audio" });
      else if (file.kind === "video") list.push({ id: file.id, title: file.title, icon: "video" });
      else list.push({ id: file.id, title: file.title, iconUrl: fileUrls[file.id] || "" });
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
      var pinned = pins.indexOf(app.id) !== -1;
      if (!win || (!win.running && !pinned)) {
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
        btn.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeStart();
          var target = appById(btn.dataset.app);
          if (target) showTaskCtx(target, e.clientX, e.clientY);
        });
        tasksEl.appendChild(btn);
      }
      var label = btn.querySelector("span");
      if (label) label.textContent = app.title;
      var dim = win.running && (win.el.classList.contains("is-min") || win.el.classList.contains("is-minimizing"));
      btn.classList.toggle("on", win.running && focused === app.id && !dim && !win.el.classList.contains("is-closing"));
      btn.classList.toggle("is-min", dim || !win.running);
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
    var SITES = [
      { id: "site_youtube", name: "YouTube", url: "https://www.youtube.com/", mark: "Y" },
      { id: "site_geforce", name: "GeForce Now", url: "https://play.geforcenow.com/", mark: "G" },
      { id: "site_discord", name: "Discord", url: "https://discord.com/app", mark: "D" },
      { id: "site_tiktok", name: "TikTok", url: "https://www.tiktok.com/", mark: "T" },
      { id: "site_x", name: "X", url: "https://x.com/", mark: "X" }
    ];
    function siteById(id) {
      var found = null;
      SITES.forEach(function (site) { if (site.id === id) found = site; });
      return found;
    }
    function siteVisual(site) {
      var fav = faviconFor(site.url);
      if (fav) return '<img class="vos-appicon" src="' + esc(fav) + '" alt="">';
      if (site.icon) return '<img src="' + IMG + site.icon + '" alt="">';
      return '<span class="vos-as-mark">' + esc(site.mark || "?") + "</span>";
    }
    function siteIconUrl(site) {
      return faviconFor(site.url) || "";
    }
    var games = [];
    var query = "";
    function isInstalled(id) {
      var site = siteById(id);
      var url = site ? site.url : ("veil-game:" + id);
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
    function paintActions() {
      var buttons = body.querySelectorAll("[data-get]");
      Array.prototype.forEach.call(buttons, function (btn) {
        var id = btn.getAttribute("data-get");
        var open = isInstalled(id);
        var was = btn.classList.contains("is-open");
        btn.classList.toggle("is-open", open);
        btn.textContent = open ? "OPEN" : "GET";
        if (open !== was) {
          btn.classList.remove("is-flip");
          void btn.offsetWidth;
          btn.classList.add("is-flip");
        }
        var wrap = btn.parentElement;
        if (!wrap) return;
        var trash = null;
        Array.prototype.forEach.call(wrap.querySelectorAll("[data-trash]"), function (node) {
          if (node.getAttribute("data-trash") === id) trash = node;
        });
        if (open && !trash) {
          trash = document.createElement("button");
          trash.type = "button";
          trash.className = "vos-trash";
          trash.setAttribute("data-trash", id);
          trash.title = "Uninstall";
          trash.setAttribute("aria-label", "Uninstall");
          trash.innerHTML = '<img src="' + IMG + 'trash.svg" alt="">';
          wrap.appendChild(trash);
        } else if (!open && trash) {
          trash.remove();
        }
      });
    }
    function paintHome() {
      var q = query.trim().toLowerCase();
      var list = games.filter(function (game) {
        if (!q) return true;
        return String(game.name || "").toLowerCase().indexOf(q) !== -1 || String(game.category || "").toLowerCase().indexOf(q) !== -1;
      });
      var sites = SITES.filter(function (site) {
        if (!q) return true;
        return site.name.toLowerCase().indexOf(q) !== -1;
      });
      var featured = "";
      if (!q) {
        featured = '<section class="vos-as-block"><h2>Featured</h2><div class="vos-as-rail">' + games.slice(0, 6).map(function (game) {
          var photo = photosOf(game)[0] || "";
          return '<button type="button" class="vos-as-card" data-open="' + esc(gameId(game)) + '"><img src="' + esc(photo) + '" alt=""><span><b>' + esc(game.name) + "</b><small>" + esc(game.category || "Game") + " · " + esc(game.maturity || "NR") + "</small></span></button>";
        }).join("") + "</div></section>";
      }
      var siteRows = sites.map(function (site) {
        return '<div class="vos-as-row"><div class="vos-as-hit">' + siteVisual(site) + '<span class="vos-as-copy"><b>' + esc(site.name) + "</b><small>Website</small></span></div>" + actions({ id: site.id, name: site.name }) + "</div>";
      }).join("");
      var rows = list.map(function (game) {
        var icon = "";
        try { icon = smallThumb(game) || ""; } catch (err) {}
        return '<div class="vos-as-row"><button type="button" class="vos-as-hit" data-open="' + esc(gameId(game)) + '"><img src="' + esc(icon) + '" alt=""><span class="vos-as-copy"><b>' + esc(game.name) + "</b><small>" + esc(game.category || "Game") + " · " + esc(ageLabel(game.maturity)) + " · " + esc(easeLabel(game.difficulty)[0]) + "</small></span></button>" + actions(game) + "</div>";
      }).join("");
      home.innerHTML = '<div class="vos-as-top"><h1>App Store</h1><input class="vos-as-search" type="search" placeholder="Search" value="' + esc(query) + '"></div>' + featured + (siteRows ? '<section class="vos-as-block"><h2>Apps</h2>' + siteRows + "</section>" : "") + '<section class="vos-as-block"><h2>Games</h2>' + (rows || '<p class="vos-as-empty">No games match.</p>') + "</section>";
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
        var site = siteById(gid);
        var doomed = null;
        var url = site ? site.url : ("veil-game:" + gid);
        installed.forEach(function (item) { if (item.url === url) doomed = item; });
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
      var pickedSite = siteById(id);
      if (pickedSite) {
        if (isInstalled(id)) {
          var openSite = null;
          installed.forEach(function (item) { if (item.url === pickedSite.url) openSite = item; });
          if (openSite) {
            ensureInstalledWindow(openSite);
            openApp(openSite.id);
          }
          return;
        }
        installApp({ title: pickedSite.name, url: pickedSite.url, icon: siteIconUrl(pickedSite) });
        return;
      }
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
    });
    home.innerHTML = '<div class="vos-as-top"><h1>App Store</h1></div><p class="vos-as-empty">Loading…</p>';
    refreshStore = function () {
      if (!body.isConnected) return;
      if (body.querySelector("[data-get]")) paintActions();
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

  function restoreMax(id) {
    var win = wins[id];
    if (!win) return;
    var el = win.el;
    if (!el.classList.contains("is-max")) return;
    el.classList.remove("is-max");
    if (el.dataset.rw) {
      el.style.left = el.dataset.rx || el.style.left;
      el.style.top = el.dataset.ry || el.style.top;
      el.style.width = el.dataset.rw;
      el.style.height = el.dataset.rh || el.style.height;
      return;
    }
    win.placed = false;
    ensurePlaced(win);
  }
  function appSize(id) {
    if (id === "calc") return { w: 372, h: 680 };
    if (id === "timer") return { w: 420, h: 560 };
    if (id === "editor") return { w: 1100, h: 720 };
    if (id === "notes") return { w: 760, h: 560 };
    if (id === "player") return { w: 860, h: 540 };
    if (id === "music") return { w: 1180, h: 720 };
    if (id === "movies") return { w: 1100, h: 700 };
    return null;
  }
  function ensurePlaced(win) {
    if (!win || win.placed || !deskEl) return;
    var desk = deskEl.getBoundingClientRect();
    if (desk.width < 200 || desk.height < 200) return;
    var size = appSize(win.id);
    if (!size) {
      if (win.el.style.width) { win.placed = true; return; }
      size = {
        w: Math.min(860, Math.round(desk.width * 0.62)),
        h: Math.min(640, Math.round(desk.height * 0.72))
      };
    }
    win.placed = true;
    placeCentered(win.el, size.w, size.h);
  }

  function openApp(id) {
    var win = wins[id];
    if (!win) return;
    if (closeTimers[id]) {
      clearTimeout(closeTimers[id]);
      closeTimers[id] = 0;
    }
    var hidden = win.el.classList.contains("is-closed") || win.el.classList.contains("is-min") || win.el.classList.contains("is-closing") || win.el.classList.contains("is-minimizing");
    if (!win.el.classList.contains("is-max")) {
      Object.keys(wins).forEach(function (key) {
        if (key !== id) restoreMax(key);
      });
    }
    ensurePlaced(win);
    if (id === "store") ensureStore(win.body);
    if (id === "chat") ensureChat(win.body);
    if (id === "settings") {
      try { fillWispSelect(); } catch (err) {}
      try { startLivePings(); } catch (err) {}
      try { fillChatSettings(); } catch (err) {}
      try { fillDesktopSettings(); } catch (err) {}
    }
    if (id === "calc") ensureCalc(win.body);
    if (id === "timer") ensureTimer(win.body);
    if (id === "editor") ensureEditor(win.body);
    if (id === "notes") ensureNotepad(win.body);
    if (id === "player") ensurePlayer(win.body);
    if (id === "music") ensureMusic(win.body);
    if (id === "movies") ensureMovies(document.getElementById("osApp-movies") || win.body);
    noteRecent(id);
    if (win.installed) ensureProxy(win);
    if (win.file) paintFile(win);
    win.running = true;
    win.el.classList.remove("is-closed", "is-min", "is-closing", "is-minimizing");
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
    if (win.installed) {
      var host = win.body && win.body.querySelector(".vos-proxy");
      if (host) host.innerHTML = "";
      win.frameReady = false;
    }
    if (id === "music") stopMusic();
    if (id === "movies") stopMovies();
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

  function snapZone(ev) {
    if (!deskEl) return "";
    var desk = deskEl.getBoundingClientRect();
    var x = ev.clientX - desk.left;
    var y = ev.clientY - desk.top;
    var edge = 22;
    var left = x <= edge;
    var right = x >= desk.width - edge;
    var top = y <= edge;
    var bottom = y >= desk.height - edge;
    if (left && top) return "tl";
    if (right && top) return "tr";
    if (left && bottom) return "bl";
    if (right && bottom) return "br";
    if (left) return "left";
    if (right) return "right";
    if (top) return "top";
    return "";
  }
  function snapBox(zone) {
    var desk = deskEl.getBoundingClientRect();
    var w = desk.width;
    var h = desk.height;
    var hw = Math.round(w / 2);
    var hh = Math.round(h / 2);
    if (zone === "left") return { x: 0, y: 0, w: hw, h: h };
    if (zone === "right") return { x: hw, y: 0, w: w - hw, h: h };
    if (zone === "tl") return { x: 0, y: 0, w: hw, h: hh };
    if (zone === "tr") return { x: hw, y: 0, w: w - hw, h: hh };
    if (zone === "bl") return { x: 0, y: hh, w: hw, h: h - hh };
    if (zone === "br") return { x: hw, y: hh, w: w - hw, h: h - hh };
    return null;
  }
  function showSnap(zone) {
    var preview = deskEl && deskEl.querySelector(".vos-snap");
    if (!preview) return;
    if (!zone) { preview.style.display = "none"; return; }
    if (zone === "top") {
      preview.style.display = "block";
      preview.style.left = "8px";
      preview.style.top = "8px";
      preview.style.width = Math.max(0, deskEl.clientWidth - 16) + "px";
      preview.style.height = Math.max(0, deskEl.clientHeight - 16) + "px";
      return;
    }
    var box = snapBox(zone);
    if (!box) { preview.style.display = "none"; return; }
    preview.style.display = "block";
    preview.style.left = (box.x + 6) + "px";
    preview.style.top = (box.y + 6) + "px";
    preview.style.width = Math.max(0, box.w - 12) + "px";
    preview.style.height = Math.max(0, box.h - 12) + "px";
  }
  function bindDrag(win, title) {
    title.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault();
      focusWin(win.id);
      var desk = deskEl.getBoundingClientRect();
      if (win.el.classList.contains("is-max")) {
        var oldW = parseFloat(win.el.dataset.rw) || Math.round(desk.width * 0.56);
        var oldH = parseFloat(win.el.dataset.rh) || Math.round(desk.height * 0.62);
        win.el.classList.remove("is-max");
        win.el.style.width = oldW + "px";
        win.el.style.height = oldH + "px";
        win.el.style.left = Math.max(0, e.clientX - desk.left - oldW / 2) + "px";
        win.el.style.top = Math.max(0, e.clientY - desk.top - 18) + "px";
        syncFull();
      }
      try { title.setPointerCapture(e.pointerId); } catch (err) {}
      desk = deskEl.getBoundingClientRect();
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
        showSnap(snapZone(ev));
      }
      function up(ev) {
        title.removeEventListener("pointermove", move);
        title.removeEventListener("pointerup", up);
        title.removeEventListener("pointercancel", up);
        var zone = ev.type === "pointercancel" ? "" : snapZone(ev);
        showSnap("");
        if (!zone) { win.snap = ""; return; }
        if (zone === "top") {
          if (!win.el.classList.contains("is-max")) toggleMax(win.id);
          win.snap = "top";
          return;
        }
        if (!win.el.classList.contains("is-max")) {
          win.el.dataset.rx = win.el.style.left;
          win.el.dataset.ry = win.el.style.top;
          win.el.dataset.rw = win.el.style.width;
          win.el.dataset.rh = win.el.style.height;
        } else win.el.classList.remove("is-max");
        var box = snapBox(zone);
        if (!box) return;
        place(win.el, box.x, box.y, box.w, box.h);
        win.snap = zone;
        syncFull();
      }
      title.addEventListener("pointermove", move);
      title.addEventListener("pointerup", up);
      title.addEventListener("pointercancel", up);
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
        win.snap = "";
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

  var timerJob = 0;
  var battMgr = null;
  var editorState = null;
  var noteState = null;
  var playerState = null;
  var musicState = null;
  var movieState = null;

  var shellListeners = [];
  function shellListen(target, type, fn) {
    target.addEventListener(type, fn);
    shellListeners.push(target, type, fn);
  }
  function clearShellListeners() {
    var i;
    for (i = 0; i < shellListeners.length; i += 3) shellListeners[i].removeEventListener(shellListeners[i + 1], shellListeners[i + 2]);
    shellListeners = [];
  }
  function shutdownDesktop() {
    closeStart();
    closeCtx();
    try { if (typeof closePanels === "function") closePanels(); } catch (err) {}
    if (clockTimer) { clearInterval(clockTimer); clockTimer = 0; }
    if (timerJob) { clearInterval(timerJob); timerJob = 0; }
    if (battMgr) {
      try {
        battMgr.removeEventListener("levelchange", paintBatteryDesk);
        battMgr.removeEventListener("chargingchange", paintBatteryDesk);
        battMgr.removeEventListener("chargingtimechange", paintBatteryDesk);
        battMgr.removeEventListener("dischargingtimechange", paintBatteryDesk);
      } catch (err) {}
    }
    clearShellListeners();
    var deskTab = document.querySelector('[data-settings-tab="desktop"]');
    if (deskTab && deskTab.classList.contains("active")) {
      var custom = document.querySelector('[data-settings-tab="custom"]');
      if (custom) custom.click();
    }
    var settingsPanel = document.getElementById("settingsPanel");
    var saver = document.getElementById("veilSaver");
    var browser = document.getElementById("browser");
    if (browser) {
      if (saver && saver.parentNode) saver.parentNode.insertBefore(browser, saver);
      else document.body.appendChild(browser);
    }
    if (settingsPanel) {
      if (saver && saver.parentNode) saver.parentNode.insertBefore(settingsPanel, saver.nextSibling);
      else document.body.appendChild(settingsPanel);
    }
    var shell = document.getElementById("veilOS");
    if (shell) shell.remove();
    if (ctxEl && ctxEl.parentNode) ctxEl.parentNode.removeChild(ctxEl);
    ctxEl = null;
    document.body.classList.remove("veil-os");
    wins = {};
    focused = null;
    deskEl = null;
    tasksEl = null;
    iconsEl = null;
    iconEls = {};
    folderWin = null;
    openFolderId = null;
    editorState = null;
    noteState = null;
    if (playerState && playerState.raf) cancelAnimationFrame(playerState.raf);
    if (playerState && playerState.actx) { try { playerState.actx.close(); } catch (err2) {} }
    playerState = null;
    window.__veilOsStarted = false;
    window.__veilOsBooting = false;
  }
  function realBattery(b) {
    return !!(b && typeof b.level === "number" && isFinite(b.level));
  }
  function paintBatteryDesk() {
    var el = document.getElementById("vosBatt");
    if (!el) return;
    var level = realBattery(battMgr) ? battMgr.level : 1;
    var charging = battMgr ? !!battMgr.charging : true;
    el.hidden = false;
    var pct = Math.max(0, Math.min(100, Math.round(level * 100)));
    var step = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
    var src = IMG + "battery/" + (charging ? "charging/batteryCharge" : "normal/battery") + step + ".svg";
    var img = el.querySelector("img");
    if (img && img.getAttribute("src") !== src) img.src = src;
    var state = el.querySelector(".vos-batt-state");
    if (state) state.hidden = true;
    var num = el.querySelector(".vos-batt-pct");
    var showPct = true;
    try { showPct = !settings || settings.osBatteryPct !== false; } catch (err) {}
    if (num) {
      num.hidden = !showPct;
      num.textContent = pct + "%";
    }
    el.title = showPct ? pct + "%" : "";
  }
  function bootBattery() {
    paintBatteryDesk();
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (b) {
      battMgr = b;
      paintBatteryDesk();
      b.addEventListener("levelchange", paintBatteryDesk);
      b.addEventListener("chargingchange", paintBatteryDesk);
      b.addEventListener("chargingtimechange", paintBatteryDesk);
      b.addEventListener("dischargingtimechange", paintBatteryDesk);
    }).catch(function () { paintBatteryDesk(); });
  }
  var timerAudio = null;
  function primeTimerAudio() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      if (!timerAudio) timerAudio = new AudioCtx();
      if (timerAudio.state === "suspended") timerAudio.resume();
    } catch (err) { return null; }
    return timerAudio;
  }
  function playTimerSound() {
    var kind = "chime";
    try { kind = (settings && settings.osTimerSound) || "chime"; } catch (err) {}
    if (kind === "none") return;
    var ctx = primeTimerAudio();
    if (!ctx) return;
    try {
      function tone(freq, at, dur, type) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + dur + 0.05);
      }
      if (kind === "beep") tone(880, 0, 0.16, "square");
      else if (kind === "bell") { tone(523, 0, 0.8, "sine"); tone(784, 0.03, 0.9, "sine"); }
      else { tone(523, 0, 0.15, "sine"); tone(659, 0.16, 0.15, "sine"); tone(784, 0.32, 0.28, "sine"); }
    } catch (err) {}
  }
  function ensureCalc(body) {
    if (!body || body.dataset.ready === "1") return;
    body.dataset.ready = "1";
    body.tabIndex = 0;
    body.innerHTML = '<div class="vos-calc vos-rise"><div class="vos-calc-out">0</div><div class="vos-calc-keys"></div></div>';
    var view = body.querySelector(".vos-calc-out");
    var keys = body.querySelector(".vos-calc-keys");
    var acc = null;
    var entry = "0";
    var oper = "";
    var fresh = false;
    function show() {
      view.textContent = entry;
      view.classList.remove("is-tick");
      void view.offsetWidth;
      view.classList.add("is-tick");
    }
    function apply(a, b, op) {
      var x = Number(a);
      var y = Number(b);
      var n = y;
      if (op === "+") n = x + y;
      else if (op === "−") n = x - y;
      else if (op === "×") n = x * y;
      else if (op === "÷") n = y === 0 ? null : x / y;
      if (n === null || !isFinite(n)) return "Error";
      return String(Math.round(n * 1e10) / 1e10);
    }
    function typeDigit(d) {
      if (entry === "Error") { entry = "0"; fresh = false; }
      if (fresh) { entry = d === "." ? "0." : d; fresh = false; show(); return; }
      if (d === "." && entry.indexOf(".") !== -1) return;
      entry = entry === "0" && d !== "." ? d : entry + d;
      if (entry.length > 14) entry = entry.slice(0, 14);
      show();
    }
    function hit(label) {
      if (label >= "0" && label <= "9" || label === ".") { typeDigit(label); return; }
      if (label === "AC") { acc = null; entry = "0"; oper = ""; fresh = false; show(); return; }
      if (label === "±") { if (entry !== "Error") entry = String(Number(entry) * -1); show(); return; }
      if (label === "%") { if (entry !== "Error") entry = String(Number(entry) / 100); show(); return; }
      if (label === "=") {
        if (!oper || acc === null) return;
        entry = apply(acc, entry, oper);
        acc = entry === "Error" ? null : Number(entry);
        oper = "";
        fresh = true;
        show();
        return;
      }
      if (oper && acc !== null && !fresh) {
        entry = apply(acc, entry, oper);
        if (entry === "Error") { acc = null; oper = ""; fresh = true; show(); return; }
      }
      acc = Number(entry);
      oper = label;
      fresh = true;
      show();
    }
    [["AC", ""], ["±", ""], ["%", ""], ["÷", "op"], ["7", ""], ["8", ""], ["9", ""], ["×", "op"], ["4", ""], ["5", ""], ["6", ""], ["−", "op"], ["1", ""], ["2", ""], ["3", ""], ["+", "op"], ["0", "zero"], [".", ""], ["=", "eq"]].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pair[0];
      if (pair[1]) btn.className = pair[1];
      btn.onclick = function () { hit(pair[0]); };
      keys.appendChild(btn);
    });
    body.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest("button")) return;
      body.focus();
    });
    body.addEventListener("keydown", function (e) {
      if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
      var map = { Enter: "=", Escape: "AC", "*": "×", "/": "÷", "-": "−", "+": "+" };
      var key = map[e.key] || e.key;
      if (/^[0-9.]$/.test(key) || key === "=" || key === "+" || key === "−" || key === "×" || key === "÷" || key === "AC") {
        e.preventDefault();
        hit(key);
      }
    });
  }
  function fmtDur(ms) {
    var n = Math.max(0, Math.floor(ms));
    var cs = Math.floor(n / 10) % 100;
    var s = Math.floor(n / 1000) % 60;
    var m = Math.floor(n / 60000) % 60;
    var h = Math.floor(n / 3600000);
    function z(v) { return (v < 10 ? "0" : "") + v; }
    return (h ? h + ":" : "") + z(m) + ":" + z(s) + "." + z(cs);
  }
  function ensureTimer(body) {
    if (!body || body.dataset.ready === "1") return;
    body.dataset.ready = "1";
    body.innerHTML = '<div class="vos-timeapp vos-rise"><div class="vos-time-modes"><button type="button" data-mode="timer" class="on">Timer</button><button type="button" data-mode="watch">Stopwatch</button></div><div class="vos-time-read" data-read>01:00.00</div><div class="vos-time-set"><label>Hours<input data-h value="0" inputmode="numeric" aria-label="Hours"></label><label>Minutes<input data-m value="1" inputmode="numeric" aria-label="Minutes"></label><label>Seconds<input data-s value="0" inputmode="numeric" aria-label="Seconds"></label></div><div class="vos-time-actions"><button type="button" data-go>Start</button><button type="button" data-reset>Reset</button><button type="button" data-lap>Lap</button></div><div class="vos-laps" data-laps></div></div>';
    var mode = "timer";
    var running = false;
    var remain = 60000;
    var endAt = 0;
    var watchBase = 0;
    var watchStart = 0;
    var laps = [];
    var alarmed = false;
    var read = body.querySelector("[data-read]");
    var setRow = body.querySelector(".vos-time-set");
    var lapBtn = body.querySelector("[data-lap]");
    var lapsEl = body.querySelector("[data-laps]");
    function fields() {
      function n(sel) { return Math.max(0, Math.min(99, parseInt(body.querySelector(sel).value, 10) || 0)); }
      return ((n("[data-h]") * 60 + n("[data-m]")) * 60 + n("[data-s]")) * 1000;
    }
    function paint() {
      var ms = mode === "timer" ? remain : watchBase + (running ? Date.now() - watchStart : 0);
      read.textContent = fmtDur(ms);
      body.querySelector(".vos-timeapp").classList.toggle("is-run", running);
      setRow.style.display = mode === "timer" && !running ? "flex" : "none";
      lapBtn.style.display = mode === "watch" ? "" : "none";
      body.querySelector("[data-go]").textContent = running ? "Pause" : "Start";
    }
    function tick() {
      if (mode === "timer" && running) {
        remain = Math.max(0, endAt - Date.now());
        if (remain <= 0 && !alarmed) {
          alarmed = true;
          running = false;
          playTimerSound();
        }
      }
      paint();
    }
    body.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.onclick = function () {
        mode = btn.getAttribute("data-mode");
        body.querySelectorAll("[data-mode]").forEach(function (other) { other.classList.toggle("on", other === btn); });
        running = false;
        paint();
      };
    });
    body.querySelector("[data-go]").onclick = function () {
      if (mode === "timer") {
        if (running) { remain = Math.max(0, endAt - Date.now()); running = false; }
        else {
          if (remain <= 0) remain = fields();
          if (remain <= 0) return;
          alarmed = false;
          endAt = Date.now() + remain;
          running = true;
          primeTimerAudio();
        }
      } else if (running) {
        watchBase += Date.now() - watchStart;
        running = false;
      } else {
        watchStart = Date.now();
        running = true;
        primeTimerAudio();
      }
      paint();
    };
    body.querySelector("[data-reset]").onclick = function () {
      running = false;
      alarmed = false;
      if (mode === "timer") remain = fields() || 60000;
      else { watchBase = 0; laps = []; lapsEl.innerHTML = ""; }
      paint();
    };
    lapBtn.onclick = function () {
      var ms = watchBase + (running ? Date.now() - watchStart : 0);
      laps.unshift(ms);
      lapsEl.innerHTML = laps.map(function (item, index) { return "<div>Lap " + (laps.length - index) + " · " + fmtDur(item) + "</div>"; }).join("");
    };
    ["[data-h]", "[data-m]", "[data-s]"].forEach(function (sel) {
      body.querySelector(sel).addEventListener("input", function () {
        if (!running) remain = fields();
        paint();
      });
    });
    if (timerJob) clearInterval(timerJob);
    timerJob = setInterval(tick, 50);
    paint();
  }
  var LANGS = [
    { id: "javascript", name: "JavaScript", ext: "js" },
    { id: "html", name: "HTML", ext: "html" },
    { id: "css", name: "CSS", ext: "css" },
    { id: "markdown", name: "Markdown", ext: "md" },
    { id: "python", name: "Python", ext: "py" },
    { id: "lua", name: "Lua", ext: "lua" },
    { id: "sql", name: "SQL", ext: "sql" },
    { id: "brainfuck", name: "Brainfuck", ext: "bf" },
    { id: "processing", name: "Processing (p5.js)", ext: "js" }
  ];
  var EXAMPLES = {
    javascript: "function hello(name) {\n  console.log(\"Hello, \" + name);\n}\n\nhello(\"Veil\");\n",
    html: "<h1>Hello</h1>\n<p>Edit this page, then press Run.</p>\n<button>Click</button>\n",
    css: "body {\n  margin: 0;\n  font-family: sans-serif;\n  background: #111;\n  color: #f4f4f4;\n}\n\nh1 {\n  color: #9cf;\n}\n",
    markdown: "# Notes\n\nA short **example**.\n\n- one\n- two\n",
    python: "name = \"Veil\"\nprint(\"Hello, \" + name)\n",
    lua: "local name = \"Veil\"\nprint(\"Hello, \" .. name)\n",
    sql: "CREATE TABLE notes (id INTEGER, title TEXT);\nINSERT INTO notes VALUES (1, 'Hello');\nSELECT * FROM notes;\n",
    brainfuck: "++++++++[>+++++++++<-]>.<+++[>++++++<-]>+.\n",
    processing: "function setup() {\n  createCanvas(400, 240);\n}\n\nfunction draw() {\n  background(18);\n  fill(220);\n  ellipse(mouseX, mouseY, 40, 40);\n}\n"
  };
  var COMPLETIONS = {
    javascript: ["console", "console.log", "function", "const", "let", "return", "if", "else", "for", "while", "document", "querySelector", "addEventListener", "class", "async", "await", "true", "false"],
    html: ["html", "head", "body", "div", "span", "h1", "h2", "p", "a", "img", "button", "input", "ul", "li", "section", "style", "script"],
    css: ["color", "background", "background-color", "margin", "padding", "display", "flex", "grid", "width", "height", "font-size", "font-family", "position", "border", "border-radius", "justify-content", "align-items", "gap"],
    markdown: ["bold", "italic", "code", "heading"],
    python: ["print", "def", "class", "return", "if", "elif", "else", "for", "while", "import", "from", "True", "False", "None", "len", "range", "input"],
    lua: ["print", "function", "local", "end", "if", "then", "else", "elseif", "for", "while", "do", "return", "true", "false", "nil"],
    sql: ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "DROP", "JOIN", "ORDER", "GROUP", "LIMIT"],
    brainfuck: ["[-]", "[->+<]"],
    processing: ["function", "setup", "draw", "createCanvas", "background", "fill", "ellipse", "rect", "line", "mouseX", "mouseY", "stroke"]
  };
  function exampleFor(lang) {
    return Object.prototype.hasOwnProperty.call(EXAMPLES, lang) ? EXAMPLES[lang] : "";
  }
  function editorComplete(area, lang) {
    var end = area.selectionEnd || 0;
    if ((area.selectionStart || 0) !== end) return false;
    var before = area.value.slice(0, end);
    var match = before.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    if (!match) return false;
    var word = match[0];
    var list = COMPLETIONS[lang] || [];
    var hits = [];
    var i;
    var lower = word.toLowerCase();
    for (i = 0; i < list.length; i++) {
      if (list[i].toLowerCase().indexOf(lower) === 0 && list[i].length > word.length) hits.push(list[i]);
    }
    if (!hits.length) return false;
    hits.sort(function (a, b) { return a.length - b.length; });
    var rest = hits[0].slice(word.length);
    area.value = before + rest + area.value.slice(end);
    area.selectionStart = area.selectionEnd = end + rest.length;
    area.dispatchEvent(new Event("input"));
    return true;
  }
  var LANG_KEYS = {
    javascript: "const let var function return if else for while do switch case break continue new this class extends super try catch finally throw typeof instanceof import export from default async await of in",
    processing: "const let var function return if else for while setup draw new this class",
    python: "def class return if elif else for while import from as try except finally with lambda yield pass break continue and or not None True False async await",
    lua: "function end if then else elseif for while do return local repeat until break and or not nil true false",
    sql: "select from where insert into values update set delete create table drop join left right inner outer on group by order limit as and or not null primary key",
    css: "color background background-color border margin padding display flex grid width height font font-size position absolute relative none block inline content hover",
    html: "",
    markdown: "",
    brainfuck: ""
  };
  function highlightCode(src, lang) {
    var raw = String(src || "");
    var keySrc = Object.prototype.hasOwnProperty.call(LANG_KEYS, lang) ? LANG_KEYS[lang] : LANG_KEYS.javascript;
    var keys = {};
    String(keySrc || "").split(" ").forEach(function (word) { if (word) keys[word] = true; });
    var out = "";
    var i = 0;
    function push(text, cls) {
      var safe = esc(text);
      out += cls ? '<span class="' + cls + '">' + safe + "</span>" : safe;
    }
    while (i < raw.length) {
      var rest = raw.slice(i);
      var m = null;
      if (lang !== "python" && lang !== "sql" && (m = /^\/\*[\s\S]*?\*\//.exec(rest))) { push(m[0], "tok-c"); i += m[0].length; continue; }
      if (lang !== "python" && lang !== "sql" && (m = /^\/\/[^\n]*/.exec(rest))) { push(m[0], "tok-c"); i += m[0].length; continue; }
      if (lang === "python" && (m = /^#[^\n]*/.exec(rest))) { push(m[0], "tok-c"); i += m[0].length; continue; }
      if ((lang === "lua" || lang === "sql") && (m = /^--[^\n]*/.exec(rest))) { push(m[0], "tok-c"); i += m[0].length; continue; }
      if ((m = /^(?:`(?:\\.|[^`])*`|'(?:\\.|[^'\n])*'|"(?:\\.|[^"\n])*")/.exec(rest))) { push(m[0], "tok-s"); i += m[0].length; continue; }
      if ((m = /^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b/.exec(rest))) { push(m[0], "tok-n"); i += m[0].length; continue; }
      if (lang === "html" && (m = /^<\/?[A-Za-z][^>\n]*>/.exec(rest))) { push(m[0], "tok-k"); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][\w]*/.exec(rest))) { push(m[0], keys[m[0]] ? "tok-k" : ""); i += m[0].length; continue; }
      push(raw.charAt(i), "");
      i += 1;
    }
    return out || "\n";
  }
  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var found = document.querySelector('script[data-vos="' + src + '"]');
      if (found && found.dataset.ready === "1") { resolve(); return; }
      if (found && found.dataset.failed === "1" && found.parentNode) {
        found.parentNode.removeChild(found);
        found = null;
      }
      var script = found || document.createElement("script");
      function ok() { script.dataset.ready = "1"; script.dataset.failed = ""; resolve(); }
      function bad() { script.dataset.failed = "1"; reject(new Error("Could not load that runtime.")); }
      script.addEventListener("load", ok, { once: true });
      script.addEventListener("error", bad, { once: true });
      if (!found) {
        script.src = src;
        script.dataset.vos = src;
        document.head.appendChild(script);
      }
    });
  }
  function runBrainfuck(code, input) {
    var mem = [];
    var ptr = 0;
    var ip = 0;
    var inn = 0;
    var out = "";
    var jumps = {};
    var stack = [];
    var i;
    for (i = 0; i < code.length; i++) {
      if (code.charAt(i) === "[") stack.push(i);
      else if (code.charAt(i) === "]") {
        var open = stack.pop();
        jumps[open] = i;
        jumps[i] = open;
      }
    }
    var steps = 0;
    while (ip < code.length && steps < 1000000) {
      var c = code.charAt(ip);
      if (!mem[ptr]) mem[ptr] = 0;
      if (c === ">") ptr += 1;
      else if (c === "<") ptr = Math.max(0, ptr - 1);
      else if (c === "+") mem[ptr] = (mem[ptr] + 1) & 255;
      else if (c === "-") mem[ptr] = (mem[ptr] + 255) & 255;
      else if (c === ".") out += String.fromCharCode(mem[ptr]);
      else if (c === ",") mem[ptr] = inn < input.length ? input.charCodeAt(inn++) : 0;
      else if (c === "[" && !mem[ptr]) ip = jumps[ip] || ip;
      else if (c === "]" && mem[ptr]) ip = jumps[ip] || ip;
      ip += 1;
      steps += 1;
    }
    return { out: out, error: steps >= 1000000 ? "Stopped: too many steps" : "" };
  }
  function renderMarkdown(src) {
    var inCode = false;
    return String(src || "").split("\n").map(function (line) {
      if (/^```/.test(line)) { inCode = !inCode; return inCode ? "<pre>" : "</pre>"; }
      if (inCode) return esc(line);
      var text = esc(line).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
      if (/^### /.test(line)) return "<h3>" + text.slice(4) + "</h3>";
      if (/^## /.test(line)) return "<h2>" + text.slice(3) + "</h2>";
      if (/^# /.test(line)) return "<h1>" + text.slice(2) + "</h1>";
      if (/^- /.test(line)) return "<div>• " + text.slice(2) + "</div>";
      return "<div>" + (text || "&nbsp;") + "</div>";
    }).join("");
  }
  function editorSync() {
    if (!editorState) return;
    var tab = editorState.tabs[editorState.active];
    var body = editorState.body;
    if (!tab || !body) return;
    var area = body.querySelector("[data-code]");
    var name = body.querySelector("[data-name]");
    var lang = body.querySelector("[data-lang]");
    if (area) tab.text = area.value;
    if (name) tab.name = name.value.trim().slice(0, 64) || tab.name;
    if (lang) tab.lang = lang.value;
  }
  function editorLangName(id) {
    var found = "JavaScript";
    LANGS.forEach(function (lang) { if (lang.id === id) found = lang.name; });
    return found;
  }
  function editorSplit(lang) {
    return lang === "html" || lang === "css" || lang === "processing";
  }
  function editorShowPane(which) {
    if (!editorState) return;
    editorState.pane = which === "con" ? "con" : "out";
    var body = editorState.body;
    var out = body.querySelector("[data-out]");
    var con = body.querySelector("[data-console]");
    if (out) out.hidden = editorState.pane !== "out";
    if (con) con.hidden = editorState.pane !== "con";
    body.querySelectorAll("[data-pane]").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-pane") === editorState.pane);
    });
    editorTouchLog();
  }
  function editorTouchLog() {
    if (!editorState) return;
    var body = editorState.body;
    var out = body.querySelector("[data-out]");
    var con = body.querySelector("[data-console]");
    var root = body.querySelector(".vos-edit");
    var has = !!((out && out.textContent.trim()) || (con && con.textContent.trim()));
    if (root) root.classList.toggle("has-log", has);
  }
  function editorGutter() {
    if (!editorState) return;
    var body = editorState.body;
    var area = body.querySelector("[data-code]");
    var gutter = body.querySelector("[data-gutter]");
    var pre = body.querySelector("[data-hl]");
    if (!area || !gutter) return;
    var text = area.value;
    var before = text.slice(0, area.selectionStart || 0);
    var line = before.split("\n").length;
    var col = before.length - before.lastIndexOf("\n");
    var count = Math.max(1, text.split("\n").length);
    var html = "";
    var i;
    for (i = 1; i <= count; i++) html += "<div" + (i === line ? " class=\"on\"" : "") + ">" + i + "</div>";
    gutter.innerHTML = html;
    gutter.scrollTop = area.scrollTop;
    if (pre) {
      pre.scrollTop = area.scrollTop;
      pre.scrollLeft = area.scrollLeft;
    }
    var pos = body.querySelector("[data-status-pos]");
    if (pos) pos.textContent = "Ln " + line + ", Col " + col;
  }
  function editorLayout() {
    if (!editorState) return;
    var tab = editorState.tabs[editorState.active];
    var root = editorState.body.querySelector(".vos-edit");
    var preview = editorState.body.querySelector("[data-preview]");
    var split = !!(tab && editorSplit(tab.lang));
    if (root) root.classList.toggle("is-split", split);
    if (preview) preview.hidden = !split;
    var lang = editorState.body.querySelector("[data-status-lang]");
    if (lang && tab) lang.textContent = editorLangName(tab.lang);
  }
  function editorCloseTab(index) {
    if (!editorState) return;
    editorSync();
    if (editorState.tabs.length <= 1) {
      editorState.tabs[0] = { fileId: "", name: "untitled.js", lang: "javascript", text: exampleFor("javascript"), input: "" };
      editorState.active = 0;
    } else {
      editorState.tabs.splice(index, 1);
      if (editorState.active > index) editorState.active -= 1;
      if (editorState.active >= editorState.tabs.length) editorState.active = editorState.tabs.length - 1;
    }
    editorPaint();
  }
  function editorPaint() {
    if (!editorState) return;
    var body = editorState.body;
    var tab = editorState.tabs[editorState.active];
    if (!body || !tab) return;
    var tabs = body.querySelector("[data-tabs]");
    tabs.innerHTML = "";
    editorState.tabs.forEach(function (item, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-edit-tab" + (index === editorState.active ? " on" : "");
      btn.innerHTML = "<span data-tab-name></span><span class=\"vos-tab-x\" title=\"Close\" aria-label=\"Close\">×</span>";
      btn.querySelector("[data-tab-name]").textContent = item.name || "untitled";
      btn.onclick = function () {
        if (editorState.active === index) return;
        editorSync();
        editorState.active = index;
        editorPaint();
      };
      btn.querySelector(".vos-tab-x").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        editorCloseTab(index);
      });
      btn.addEventListener("auxclick", function (e) {
        if (e.button !== 1) return;
        e.preventDefault();
        editorCloseTab(index);
      });
      tabs.appendChild(btn);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "vos-edit-add";
    add.title = "New file";
    add.setAttribute("aria-label", "New file");
    add.textContent = "+";
    add.onclick = function () {
      editorSync();
      editorState.tabs.push({ fileId: "", name: "untitled.js", lang: "javascript", text: exampleFor("javascript"), input: "" });
      editorState.active = editorState.tabs.length - 1;
      editorPaint();
    };
    tabs.appendChild(add);
    var name = body.querySelector("[data-name]");
    if (name) name.value = tab.name;
    var lang = body.querySelector("[data-lang]");
    if (lang) lang.value = tab.lang;
    var area = body.querySelector("[data-code]");
    if (area) area.value = tab.text || "";
    var pre = body.querySelector("[data-hl]");
    if (pre) pre.innerHTML = highlightCode(tab.text || "", tab.lang);
    var out = body.querySelector("[data-out]");
    var con = body.querySelector("[data-console]");
    if (out) out.textContent = "";
    if (con) con.textContent = "";
    editorState.runId = (editorState.runId || 0) + 1;
    editorLayout();
    editorGutter();
    editorTouchLog();
    var wrap = body.querySelector(".vos-codewrap");
    if (wrap) {
      wrap.classList.remove("vos-pop");
      void wrap.offsetWidth;
      wrap.classList.add("vos-pop");
    }
    if (editorSplit(tab.lang) && tab.lang !== "processing") editorPreviewLive();
    else {
      var stage = body.querySelector("[data-stage]");
      if (stage) stage.innerHTML = "";
    }
  }
  function editorOpenSaved(app) {
    if (!editorState || !app) return;
    var tabs = editorState.tabs;
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].fileId && tabs[i].fileId === app.id) { editorState.active = i; editorPaint(); return; }
    }
    var blank = tabs.length === 1 && !tabs[0].fileId && !tabs[0].text;
    var tab = blank ? tabs[0] : { fileId: "", name: "untitled.js", lang: "javascript", text: exampleFor("javascript"), input: "" };
    tab.fileId = app.id;
    tab.name = app.title || tab.name;
    tab.lang = app.lang || "javascript";
    tab.text = app.text || "";
    tab.input = app.input || "";
    if (!blank) tabs.push(tab);
    editorState.active = blank ? 0 : tabs.length - 1;
    editorPaint();
  }
  function editorNote(text) {
    if (!editorState) return;
    var note = editorState.body.querySelector("[data-note]");
    if (note) note.textContent = text || "";
  }
  function editorSave() {
    editorSync();
    var tab = editorState && editorState.tabs[editorState.active];
    if (!tab) return;
    addCodeFile({ id: tab.fileId, title: tab.name, lang: tab.lang, text: tab.text, input: tab.input }).then(function (file) {
      if (!editorState) return;
      if (!file) { editorNote("Could not save."); return; }
      tab.fileId = file.id;
      tab.name = file.title;
      var name = editorState.body.querySelector("[data-name]");
      if (name) name.value = file.title;
      var label = editorState.body.querySelector(".vos-edit-tab.on [data-tab-name]");
      if (label) label.textContent = file.title;
      editorNote("Saved to the desktop.");
    });
  }
  function editorFrame(html) {
    var stage = editorState && editorState.body.querySelector("[data-stage]");
    if (!stage) return;
    stage.innerHTML = "";
    var frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.title = "Preview";
    frame.srcdoc = html;
    stage.appendChild(frame);
  }
  function editorHtmlDoc(code) {
    var hook = "<script>window.onerror=function(m){parent.postMessage({veilOut:1,type:'error',text:String(m)},'*');};['log','warn','error'].forEach(function(k){var old=console[k];console[k]=function(){try{parent.postMessage({veilOut:1,type:'log',text:[].join.call(arguments,' ')},'*');}catch(e){}if(old)old.apply(console,arguments);};});<\/script>";
    var src = String(code || "");
    if (!/<html[\s>]/i.test(src) && !/<!doctype/i.test(src)) {
      return "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" + hook + "</head><body>" + src + "</body></html>";
    }
    if (/<head[^>]*>/i.test(src)) return src.replace(/<head[^>]*>/i, function (tag) { return tag + hook; });
    return hook + src;
  }
  function editorPreviewLive() {
    if (!editorState) return;
    editorSync();
    var tab = editorState.tabs[editorState.active];
    if (!tab || !editorSplit(tab.lang) || tab.lang === "processing") return;
    var code = String(tab.text || "");
    if (tab.lang === "html") {
      editorFrame(editorHtmlDoc(code));
      return;
    }
    editorFrame("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" + code.replace(/<\/style/gi, "") + "</style></head><body style=\"margin:0;background:#fff;color:#222;font-family:sans-serif\"><div style=\"padding:28px\"><h1>Heading</h1><p>Sample paragraph for this stylesheet.</p><button>Button</button> <a href=\"#\">Link</a></div></body></html>");
  }
  function editorQueuePreview() {
    if (!editorState) return;
    clearTimeout(editorState.previewTimer);
    editorState.previewTimer = setTimeout(editorPreviewLive, 220);
  }
  function editorRun() {
    editorSync();
    var tab = editorState.tabs[editorState.active];
    var out = editorState.body.querySelector("[data-out]");
    var con = editorState.body.querySelector("[data-console]");
    out.textContent = "";
    con.textContent = "";
    editorState.runId = (editorState.runId || 0) + 1;
    var runId = editorState.runId;
    function live() { return !!(editorState && editorState.runId === runId && out.isConnected); }
    editorNote("Running…");
    var code = tab.text || "";
    var input = tab.input || "";
    if (tab.lang === "javascript") {
      var blob = new Blob(["self.onmessage=function(e){var input=e.data.input;var logs=[];console.log=function(){var t=[].join.call(arguments,' ');logs.push(t);self.postMessage({type:'log',text:t});};try{var result=eval(e.data.code);if(result&&typeof result.then==='function'){result.then(function(v){self.postMessage({type:'done',value:v==null?'':String(v)});},function(err){self.postMessage({type:'error',text:String(err)});});}else self.postMessage({type:'done',value:result==null?'':String(result)});}catch(err){self.postMessage({type:'error',text:String(err&&err.stack||err)});}};"], { type: "text/javascript" });
      var url = URL.createObjectURL(blob);
      var worker = new Worker(url);
      var timer = setTimeout(function () {
        worker.terminate();
        if (!live()) return;
        con.textContent += "Stopped: took too long\n";
        editorNote("Stopped");
      }, 8000);
      worker.onmessage = function (ev) {
        if (!live()) { clearTimeout(timer); worker.terminate(); return; }
        var data = ev.data || {};
        if (data.type === "log") con.textContent += data.text + "\n";
        if (data.type === "done") {
          out.textContent = data.value || "";
          editorNote("Finished");
          editorShowPane((con.textContent || "").trim() ? "con" : "out");
          clearTimeout(timer);
          worker.terminate();
        }
        if (data.type === "error") { con.textContent += data.text + "\n"; editorNote("Error"); editorShowPane("con"); clearTimeout(timer); worker.terminate(); }
      };
      worker.onerror = function (ev) {
        if (!live()) return;
        con.textContent += String(ev.message || ev) + "\n";
        editorNote("Error");
        editorShowPane("con");
        clearTimeout(timer);
      };
      worker.postMessage({ code: code, input: input });
      return;
    }
    if (tab.lang === "html") {
      editorLayout();
      editorPreviewLive();
      editorNote("Preview");
      editorShowPane("out");
      return;
    }
    if (tab.lang === "css") {
      editorLayout();
      editorPreviewLive();
      editorNote("Preview");
      editorShowPane("out");
      return;
    }
    if (tab.lang === "markdown") {
      out.innerHTML = renderMarkdown(code);
      editorNote("Rendered");
      editorShowPane("out");
      return;
    }
    if (tab.lang === "brainfuck") {
      var bf = runBrainfuck(code, input);
      out.textContent = bf.out;
      if (bf.error) con.textContent = bf.error;
      editorNote(bf.error ? "Stopped" : "Finished");
      editorShowPane(bf.error ? "con" : "out");
      return;
    }
    if (tab.lang === "python") {
      editorNote("Loading Python…");
      var pyUrl = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
      loadScriptOnce(pyUrl).then(function () {
        if (!editorState.py) editorState.py = window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
        return editorState.py;
      }).then(function (py) {
        if (!live()) return;
        var logs = [];
        try { py.setStdout({ batched: function (text) { logs.push(text); } }); } catch (err) {}
        try { py.setStderr({ batched: function (text) { logs.push(text); } }); } catch (err) {}
        return py.runPythonAsync("import sys\nfrom io import StringIO\nsys.stdin = StringIO(" + JSON.stringify(input) + ")\n").then(function () {
          return py.runPythonAsync(code);
        }).then(function (value) {
          if (!live()) return;
          out.textContent = value == null ? "" : String(value);
          con.textContent = logs.join("");
          editorNote("Finished");
          editorShowPane(logs.length ? "con" : "out");
        });
      }).catch(function (err) {
        if (!live()) return;
        con.textContent = String(err && err.message || err);
        editorNote("Python could not run");
        editorShowPane("con");
      });
      return;
    }
    if (tab.lang === "lua") {
      editorNote("Loading Lua…");
      loadScriptOnce("https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js").then(function () {
        if (!live()) return;
        var fengari = window.fengari;
        var lua = fengari.lua;
        var lauxlib = fengari.lauxlib;
        var L = lauxlib.luaL_newstate();
        fengari.lualib.luaL_openlibs(L);
        var logs = [];
        var oldLog = console.log;
        console.log = function () {
          logs.push([].join.call(arguments, "\t"));
          if (oldLog) oldLog.apply(console, arguments);
        };
        try {
          var push = lua.lua_pushjsfunction || lua.lua_pushcfunction;
          if (push) {
            push(L, function (LL) {
              var n = lua.lua_gettop(LL);
              var parts = [];
              var i;
              for (i = 1; i <= n; i++) {
                var text = "";
                try {
                  if (lauxlib.luaL_tolstring) {
                    lauxlib.luaL_tolstring(LL, i);
                    var str = lua.lua_tostring(LL, -1);
                    text = str ? fengari.to_jsstring(str) : "";
                    lua.lua_pop(LL, 1);
                  } else {
                    var raw = lua.lua_tostring(LL, i);
                    text = raw ? fengari.to_jsstring(raw) : "";
                  }
                } catch (err) {}
                parts.push(text);
              }
              logs.push(parts.join("\t"));
              return 0;
            });
            lua.lua_setglobal(L, fengari.to_luastring("print"));
          }
          if (input) {
            lua.lua_pushstring(L, fengari.to_luastring(String(input)));
            lua.lua_setglobal(L, fengari.to_luastring("input"));
          }
        } catch (err) {}
        var status = 1;
        try {
          status = lauxlib.luaL_dostring(L, fengari.to_luastring(code));
        } catch (err) {
          logs.push(String(err && err.message || err));
        }
        console.log = oldLog;
        if (!live()) return;
        if (status !== 0) {
          var msg = logs.join("\n") || "Lua error";
          try {
            var rawMsg = lua.lua_tostring(L, -1);
            if (rawMsg) msg = fengari.to_jsstring(rawMsg);
          } catch (err2) {}
          con.textContent = msg;
          editorNote("Error");
          editorShowPane("con");
        } else {
          con.textContent = logs.join("\n");
          editorNote("Finished");
          editorShowPane("con");
        }
      }).catch(function (err) {
        if (!live()) return;
        con.textContent = String(err && err.message || err);
        editorNote("Lua could not run");
        editorShowPane("con");
      });
      return;
    }
    if (tab.lang === "sql") {
      editorNote("Loading SQL…");
      loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.js").then(function () {
        if (!editorState.sql) editorState.sql = window.initSqlJs({ locateFile: function (file) { return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/" + file; } });
        return editorState.sql;
      }).then(function (SQL) {
        if (!live()) return;
        var db = new SQL.Database();
        var rows = db.exec(code);
        var text = rows.map(function (row) {
          return row.columns.join(" | ") + "\n" + row.values.map(function (line) { return line.join(" | "); }).join("\n");
        }).join("\n\n");
        out.textContent = text || "Done. No rows.";
        try { db.close(); } catch (err) {}
        editorNote("Finished");
        editorShowPane("out");
      }).catch(function (err) {
        if (!live()) return;
        con.textContent = String(err && err.message || err);
        editorNote("SQL could not run");
        editorShowPane("con");
      });
      return;
    }
    if (tab.lang === "processing") {
      editorLayout();
      editorFrame("<script src='https://cdn.jsdelivr.net/npm/p5@1.11.2/lib/p5.min.js'><\/script><script>['log','warn','error'].forEach(function(k){var old=console[k];console[k]=function(){parent.postMessage({veilOut:1,type:'log',text:[].join.call(arguments,' ')},'*');if(old)old.apply(console,arguments);};});window.onerror=function(m){parent.postMessage({veilOut:1,type:'error',text:String(m)},'*');};<\/script><script>" + code.replace(/<\/script/gi, "<\\/script") + "<\/script>");
      editorNote("Sketch");
      editorShowPane("out");
      return;
    }
    editorNote("That language cannot run here.");
  }
  function ensureEditor(body) {
    if (!body || (body.dataset.ready === "1" && editorState)) return;
    body.dataset.ready = "1";
    var options = LANGS.map(function (lang) { return '<option value="' + lang.id + '">' + lang.name + "</option>"; }).join("");
    body.innerHTML = '<div class="vos-edit vos-rise"><div class="vos-edit-top"><div class="vos-edit-tabs" data-tabs></div><div class="vos-edit-bar"><input data-name spellcheck="false" aria-label="File name" placeholder="File name"><select data-lang>' + options + '</select><button type="button" data-run>Run</button><button type="button" data-save>Save</button></div></div><div class="vos-edit-stage"><div class="vos-edit-main"><div class="vos-codewrap"><div class="vos-gutter" data-gutter></div><pre data-hl></pre><textarea data-code spellcheck="false" aria-label="Code"></textarea></div><section class="vos-preview" data-preview hidden><div class="vos-stage" data-stage></div></section></div><div class="vos-panel"><div class="vos-panel-tabs"><button type="button" data-pane="out" class="on">Output</button><button type="button" data-pane="con">Console</button></div><div class="vos-panel-body"><div class="vos-out" data-out></div><pre data-console hidden></pre></div></div></div><div class="vos-statusbar"><span data-status-lang>JavaScript</span><span data-status-pos>Ln 1, Col 1</span><span data-note></span></div></div>';
    editorState = { body: body, tabs: [{ fileId: "", name: "untitled.js", lang: "javascript", text: exampleFor("javascript"), input: "" }], active: 0, py: null, sql: null, pane: "out" };
    var area = body.querySelector("[data-code]");
    var pre = body.querySelector("[data-hl]");
    function refreshCode() {
      editorSync();
      var tab = editorState.tabs[editorState.active];
      pre.innerHTML = highlightCode(area.value, tab.lang);
      editorGutter();
      if (editorSplit(tab.lang) && tab.lang !== "processing") editorQueuePreview();
    }
    area.addEventListener("input", refreshCode);
    area.addEventListener("keyup", editorGutter);
    area.addEventListener("click", editorGutter);
    area.addEventListener("select", editorGutter);
    area.addEventListener("scroll", editorGutter);
    area.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        editorSync();
        var tabNow = editorState.tabs[editorState.active];
        if (editorComplete(area, tabNow && tabNow.lang)) return;
        var start = area.selectionStart;
        area.value = area.value.slice(0, start) + "  " + area.value.slice(area.selectionEnd);
        area.selectionStart = area.selectionEnd = start + 2;
        area.dispatchEvent(new Event("input"));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); editorRun(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); editorSave(); }
    });
    body.querySelector("[data-name]").addEventListener("input", function () {
      editorSync();
      var label = body.querySelector(".vos-edit-tab.on [data-tab-name]");
      var tab = editorState.tabs[editorState.active];
      if (label && tab) label.textContent = tab.name;
    });
    body.querySelector("[data-lang]").addEventListener("change", function () {
      var tab = editorState.tabs[editorState.active];
      var prev = tab ? tab.text : "";
      var wasExample = false;
      Object.keys(EXAMPLES).forEach(function (key) { if (EXAMPLES[key] === prev) wasExample = true; });
      editorSync();
      tab = editorState.tabs[editorState.active];
      var lang = LANGS.filter(function (item) { return item.id === tab.lang; })[0];
      if (lang && /^untitled\./.test(tab.name)) {
        tab.name = "untitled." + lang.ext;
        var name = body.querySelector("[data-name]");
        if (name) name.value = tab.name;
      }
      if (tab && (!tab.text || wasExample)) tab.text = exampleFor(tab.lang);
      editorPaint();
    });
    body.querySelectorAll("[data-pane]").forEach(function (btn) {
      btn.onclick = function () { editorShowPane(btn.getAttribute("data-pane")); };
    });
    body.querySelector("[data-save]").onclick = editorSave;
    body.querySelector("[data-run]").onclick = editorRun;
    if (!body.dataset.msg) {
      body.dataset.msg = "1";
      shellListen(window, "message", function (ev) {
        var data = ev.data;
        if (!data || data.veilOut !== 1 || !editorState) return;
        var con = editorState.body.querySelector("[data-console]");
        if (con) con.textContent += (data.text || "") + "\n";
        editorShowPane("con");
      });
    }
    editorPaint();
  }

  function noteOpenSaved(app) {
    if (!noteState || !app) return;
    var tabs = noteState.tabs;
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].fileId && tabs[i].fileId === app.id) { noteState.active = i; notePaint(); return; }
    }
    var blank = tabs.length === 1 && !tabs[0].fileId && !tabs[0].text;
    var tab = blank ? tabs[0] : { fileId: "", name: "untitled.txt", text: "" };
    tab.fileId = app.id;
    tab.name = app.title || "untitled.txt";
    tab.text = app.text || "";
    if (!blank) tabs.push(tab);
    noteState.active = blank ? 0 : tabs.length - 1;
    notePaint();
  }
  function noteSync() {
    if (!noteState) return;
    var tab = noteState.tabs[noteState.active];
    var area = noteState.body.querySelector("[data-text]");
    var name = noteState.body.querySelector("[data-name]");
    if (!tab) return;
    if (area) tab.text = area.value;
    if (name) tab.name = name.value.trim().slice(0, 64) || tab.name;
  }
  function noteClose(index) {
    if (!noteState) return;
    noteSync();
    if (noteState.tabs.length <= 1) {
      noteState.tabs[0] = { fileId: "", name: "untitled.txt", text: "" };
      noteState.active = 0;
    } else {
      noteState.tabs.splice(index, 1);
      if (noteState.active > index) noteState.active -= 1;
      if (noteState.active >= noteState.tabs.length) noteState.active = noteState.tabs.length - 1;
    }
    notePaint();
  }
  function notePaint() {
    if (!noteState) return;
    var body = noteState.body;
    var tab = noteState.tabs[noteState.active];
    var tabs = body.querySelector("[data-tabs]");
    if (!tabs || !tab) return;
    tabs.innerHTML = "";
    noteState.tabs.forEach(function (item, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-note-tab" + (index === noteState.active ? " on" : "");
      btn.innerHTML = "<span data-tab-name></span><span class=\"vos-tab-x\" title=\"Close\">×</span>";
      btn.querySelector("[data-tab-name]").textContent = item.name || "untitled.txt";
      btn.onclick = function () {
        if (noteState.active === index) return;
        noteSync();
        noteState.active = index;
        notePaint();
      };
      btn.querySelector(".vos-tab-x").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        noteClose(index);
      });
      btn.addEventListener("auxclick", function (e) {
        if (e.button !== 1) return;
        e.preventDefault();
        noteClose(index);
      });
      tabs.appendChild(btn);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "vos-note-add";
    add.textContent = "+";
    add.title = "New note";
    add.onclick = function () {
      noteSync();
      noteState.tabs.push({ fileId: "", name: "untitled.txt", text: "" });
      noteState.active = noteState.tabs.length - 1;
      notePaint();
    };
    tabs.appendChild(add);
    var name = body.querySelector("[data-name]");
    var area = body.querySelector("[data-text]");
    if (name) name.value = tab.name;
    if (area) area.value = tab.text || "";
    var status = body.querySelector("[data-note]");
    if (status) status.textContent = "";
  }
  function noteSave() {
    noteSync();
    var tab = noteState && noteState.tabs[noteState.active];
    if (!tab) return;
    addNoteFile({ id: tab.fileId, title: tab.name, text: tab.text }).then(function (file) {
      if (!noteState || !file) {
        var status = noteState && noteState.body.querySelector("[data-note]");
        if (status) status.textContent = "Could not save.";
        return;
      }
      tab.fileId = file.id;
      tab.name = file.title;
      var name = noteState.body.querySelector("[data-name]");
      if (name) name.value = file.title;
      var label = noteState.body.querySelector(".vos-note-tab.on [data-tab-name]");
      if (label) label.textContent = file.title;
      var status = noteState.body.querySelector("[data-note]");
      if (status) status.textContent = "Saved to the desktop.";
    });
  }
  function ensureNotepad(body) {
    if (!body || (body.dataset.ready === "1" && noteState)) return;
    body.dataset.ready = "1";
    body.innerHTML = '<div class="vos-note vos-rise"><aside class="vos-note-side"><div class="vos-note-tabs" data-tabs></div></aside><div class="vos-note-sheet"><div class="vos-note-bar"><input data-name spellcheck="false" aria-label="File name" placeholder="Note name"><button type="button" data-save>Save</button></div><textarea data-text spellcheck="true" aria-label="Note" placeholder="Start writing…"></textarea><div class="vos-note-status"><span data-note></span></div></div></div>';
    noteState = { body: body, tabs: [{ fileId: "", name: "untitled.txt", text: "" }], active: 0 };
    var area = body.querySelector("[data-text]");
    area.addEventListener("input", noteSync);
    body.querySelector("[data-name]").addEventListener("input", function () {
      noteSync();
      var label = body.querySelector(".vos-note-tab.on [data-tab-name]");
      var tab = noteState.tabs[noteState.active];
      if (label && tab) label.textContent = tab.name;
    });
    area.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); noteSave(); }
    });
    body.querySelector("[data-save]").onclick = noteSave;
    notePaint();
  }
  function stopMusic() {
    if (!musicState) return;
    var audio = musicState.audio;
    if (audio) { try { audio.pause(); } catch (err) {} }
  }
  function musicClock(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    if (!isFinite(sec)) sec = 0;
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  var musicPushTimer = 0;
  var musicPushGen = 0;
  var MUSIC_INV = ["https://yt.omada.cafe", "https://invidious.schenkel.eti.br", "https://echostreamz.com"];
  var MUSIC_SEARCH = ["https://api.piped.private.coffee", "https://pipedapi.ducks.party"];
  function musicSlimTrack(track) {
    if (!track || !track.id) return null;
    return {
      id: String(track.id).slice(0, 80),
      title: String(track.title || "Untitled").slice(0, 140),
      author: String(track.author || "").slice(0, 80),
      seconds: Math.max(0, Math.floor(Number(track.seconds) || 0)),
      local: !!track.local
    };
  }
  function musicWithThumb(track) {
    if (!track.thumb) track.thumb = track.local ? (IMG + "audio.svg") : ("https://i.ytimg.com/vi/" + track.id + "/hqdefault.jpg");
    return track;
  }
  function musicNormalizeLib(raw) {
    var lib = { liked: [], playlists: [] };
    if (!raw || typeof raw !== "object") return lib;
    (Array.isArray(raw.liked) ? raw.liked : []).forEach(function (track) {
      var slim = musicSlimTrack(track);
      if (!slim || slim.local) return;
      if (lib.liked.length < 400) lib.liked.push(musicWithThumb(slim));
    });
    (Array.isArray(raw.playlists) ? raw.playlists : []).slice(0, 40).forEach(function (pl) {
      if (!pl || typeof pl !== "object") return;
      var tracks = [];
      (Array.isArray(pl.tracks) ? pl.tracks : []).slice(0, 200).forEach(function (track) {
        var slim = musicSlimTrack(track);
        if (slim) tracks.push(musicWithThumb(slim));
      });
      lib.playlists.push({
        id: String(pl.id || ("pl_" + Date.now().toString(36))).slice(0, 40),
        name: String(pl.name || "Playlist").slice(0, 40),
        tracks: tracks
      });
    });
    return lib;
  }
  function musicMergePreferLocal(remote, local) {
    var base = musicNormalizeLib(local);
    var other = musicNormalizeLib(remote);
    var seen = {};
    base.liked.forEach(function (track) { seen[track.id] = 1; });
    other.liked.forEach(function (track) { if (!seen[track.id]) base.liked.push(track); });
    var ids = {};
    base.playlists.forEach(function (pl) { ids[pl.id] = 1; });
    other.playlists.forEach(function (pl) { if (!ids[pl.id]) base.playlists.push(pl); });
    return base;
  }
  function musicAccountSlice() {
    if (!musicState || !musicState.lib) return null;
    var lib = musicNormalizeLib(musicState.lib);
    return {
      liked: lib.liked.map(function (track) {
        return { id: track.id, title: track.title, author: track.author, seconds: track.seconds, local: false };
      }),
      playlists: lib.playlists.map(function (pl) {
        return {
          id: pl.id,
          name: pl.name,
          tracks: pl.tracks.map(function (track) {
            return { id: track.id, title: track.title, author: track.author, seconds: track.seconds, local: !!track.local };
          })
        };
      })
    };
  }
  try { window.veilMusicAccountSlice = musicAccountSlice; } catch (err) {}
  function musicLoadLib() {
    try { return musicNormalizeLib(JSON.parse(localStorage.getItem("veil_os_music") || "")); }
    catch (err) { return musicNormalizeLib(null); }
  }
  function musicSchedulePush() {
    if (typeof accountToken !== "function" || !accountToken()) return;
    if (typeof fetchAccountData !== "function" || typeof postAccountData !== "function") return;
    if (musicPushTimer) clearTimeout(musicPushTimer);
    musicPushTimer = setTimeout(function () {
      musicPushTimer = 0;
      var gen = ++musicPushGen;
      var slice = musicAccountSlice();
      if (!slice) return;
      fetchAccountData().catch(function () { return null; }).then(function (data) {
        if (gen !== musicPushGen || !musicState) return;
        if (!data || typeof data !== "object") data = {};
        var next = Object.assign({}, data, { music: slice });
        if (typeof gamesDataReady !== "undefined" && gamesDataReady && typeof gamesUserData !== "undefined") {
          next.favorites = gamesUserData.favorites || [];
          next.recent = gamesUserData.recent || [];
          next.notes = gamesUserData.notes || {};
        }
        if (typeof chatProfile === "function" && typeof chatBundleFromState === "function") {
          try {
            var profile = chatProfile();
            if (profile && profile.uid) next.chat = chatBundleFromState(profile);
          } catch (err) {}
        }
        return postAccountData(next);
      }).catch(function () {});
    }, 500);
  }
  function musicSaveLib() {
    if (!musicState) return;
    if (musicState.hydrating) musicState.pendingSave = true;
    try { localStorage.setItem("veil_os_music", JSON.stringify(musicAccountSlice())); } catch (err) {}
    if (!musicState.hydrating) musicSchedulePush();
  }
  function musicHydrate() {
    if (!musicState) return;
    if (typeof accountToken !== "function" || !accountToken() || typeof fetchAccountData !== "function") return;
    musicState.hydrating = true;
    fetchAccountData().then(function (data) {
      if (!musicState) return;
      musicState.hydrating = false;
      var remote = data && data.music;
      var hasRemote = !!(remote && ((Array.isArray(remote.liked) && remote.liked.length) || (Array.isArray(remote.playlists) && remote.playlists.length)));
      if (hasRemote && !musicState.pendingSave) {
        musicState.lib = musicNormalizeLib(remote);
        try { localStorage.setItem("veil_os_music", JSON.stringify(musicAccountSlice())); } catch (err) {}
        musicPaint();
        return;
      }
      if (hasRemote && musicState.pendingSave) musicState.lib = musicMergePreferLocal(remote, musicState.lib);
      musicState.pendingSave = false;
      var lib = musicState.lib || { liked: [], playlists: [] };
      if ((lib.liked && lib.liked.length) || (lib.playlists && lib.playlists.length)) {
        musicPaint();
        musicSchedulePush();
      }
    }).catch(function () {
      if (!musicState) return;
      musicState.hydrating = false;
      if (musicState.pendingSave) {
        musicState.pendingSave = false;
        musicSchedulePush();
      }
    });
  }
  function musicFetchJson(urls) {
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error("offline"));
      var url = urls[i];
      i += 1;
      return fetch(url, { headers: { "Accept": "application/json" } }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }).catch(function () { return next(); });
    }
    return next();
  }
  function musicTrackFrom(item) {
    var id = item && item.videoId ? String(item.videoId) : (String(item && item.url || "").split("v=")[1] || "");
    id = id.split("&")[0];
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    if (item && item.type && item.type !== "video" && item.type !== "stream") return null;
    return musicWithThumb({
      id: id,
      title: item.title || "Untitled",
      author: item.author || item.uploaderName || "",
      seconds: Number(item.lengthSeconds || item.duration) || 0,
      local: false
    });
  }
  function musicAudioUrls(id) {
    var urls = [];
    MUSIC_INV.forEach(function (host) {
      urls.push(host + "/latest_version?id=" + encodeURIComponent(id) + "&itag=140&local=true");
      urls.push(host + "/latest_version?id=" + encodeURIComponent(id) + "&itag=251&local=true");
    });
    return urls;
  }
  function musicLiked(id) {
    var hit = false;
    if (!musicState) return false;
    musicState.lib.liked.forEach(function (track) { if (track.id === id) hit = true; });
    return hit;
  }
  function musicToggleLike(track) {
    if (!musicState || !track || track.local) return;
    if (musicLiked(track.id)) musicState.lib.liked = musicState.lib.liked.filter(function (item) { return item.id !== track.id; });
    else musicState.lib.liked.unshift({ id: track.id, title: track.title, author: track.author, thumb: track.thumb, seconds: track.seconds, local: false });
    musicSaveLib();
    musicPaint();
  }
  function musicQueue() {
    if (!musicState) return [];
    if (musicState.view === "liked") return musicState.lib.liked.slice();
    if (musicState.view === "saved") {
      return files.filter(function (file) { return file.kind === "audio"; }).map(function (file) {
        return { id: file.id, title: file.title || "Audio", author: "On this computer", thumb: IMG + "audio.svg", seconds: 0, local: true };
      });
    }
    if (musicState.view === "playlist") {
      var found = null;
      musicState.lib.playlists.forEach(function (pl) { if (pl.id === musicState.playlistId) found = pl; });
      return found ? found.tracks.slice() : [];
    }
    return musicState.results.slice();
  }
  function musicCurrent() {
    if (!musicState || musicState.index < 0) return null;
    return musicState.queue[musicState.index] || null;
  }
  function musicStatus(text) {
    if (!musicState) return;
    var el = musicState.body.querySelector("[data-status]");
    if (el) el.textContent = text || "";
  }
  function musicPaint() {
    if (!musicState) return;
    var body = musicState.body;
    body.classList.toggle("is-no-now", !musicState.showNow);
    body.classList.toggle("is-live", !!(musicState.audio && musicState.audio.src && !musicState.audio.paused && !musicState.audio.ended));
    var heading = body.querySelector("[data-heading]");
    var find = body.querySelector("[data-search]");
    var title = "Search for a song";
    if (musicState.view === "liked") title = "Liked Songs";
    if (musicState.view === "saved") title = "Saved";
    if (musicState.view === "playlist") {
      title = "Playlist";
      musicState.lib.playlists.forEach(function (pl) { if (pl.id === musicState.playlistId) title = pl.name || "Playlist"; });
    }
    if (heading) heading.textContent = title;
    if (find) find.hidden = musicState.view !== "home";
    Array.prototype.forEach.call(body.querySelectorAll("[data-nav]"), function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-nav") === musicState.view);
    });
    var pls = body.querySelector("[data-pl]");
    if (pls) {
      pls.innerHTML = "";
      musicState.lib.playlists.forEach(function (pl) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = musicState.view === "playlist" && musicState.playlistId === pl.id ? "on" : "";
        btn.textContent = pl.name || "Playlist";
        btn.onclick = function () {
          musicState.view = "playlist";
          musicState.playlistId = pl.id;
          musicPaint();
        };
        pls.appendChild(btn);
      });
    }
    var rows = musicState.view === "home" ? musicState.results : musicQueue();
    var count = body.querySelector("[data-count]");
    if (count && !musicState.status) count.textContent = rows.length ? (rows.length + (rows.length === 1 ? " song" : " songs")) : "";
    var list = body.querySelector("[data-list]");
    if (list) {
      var rowsKey = musicState.view + ":" + (musicState.playlistId || "") + ":" + rows.length + ":" + (rows[0] ? rows[0].id : "");
      list.innerHTML = "";
      if (!rows.length) {
        var empty = document.createElement("div");
        empty.className = "vos-mu-empty";
        empty.textContent = musicState.view === "home" ? "Search for a song." : "Nothing here yet.";
        list.appendChild(empty);
      }
      rows.forEach(function (track, index) {
        var row = document.createElement("div");
        var current = musicCurrent();
        row.className = "vos-mu-row" + (current && current.id === track.id ? " is-on" : "");
        var thumb = track.thumb || "";
        row.innerHTML = '<span class="n">' + (index + 1) + '</span><span class="vos-mu-thumb"><img alt=""></span><button type="button" class="meta"><b></b><small></small></button><span class="acts"><button type="button" class="heart" aria-label="Like">♥</button><button type="button" class="add" aria-label="Add to playlist">+</button></span>';
        var thumbImg = row.querySelector("img");
        if (thumb && thumbImg) {
          thumbImg.src = thumb;
          thumbImg.onerror = function () { thumbImg.onerror = null; thumbImg.removeAttribute("src"); };
        }
        row.querySelector("b").textContent = track.title || "Untitled";
        row.querySelector("small").textContent = track.author || "";
        var heart = row.querySelector(".heart");
        if (track.local) heart.hidden = true;
        else heart.classList.toggle("on", musicLiked(track.id));
        row.querySelector(".meta").onclick = function () {
          musicState.queue = rows.slice();
          musicPlay(index);
        };
        heart.onclick = function (e) {
          e.stopPropagation();
          musicToggleLike(track);
        };
        row.querySelector(".add").onclick = function (e) {
          e.stopPropagation();
          musicAddMenu(e.clientX, e.clientY, track);
        };
        list.appendChild(row);
      });
      if (list.getAttribute("data-key") !== rowsKey) {
        list.setAttribute("data-key", rowsKey);
        list.classList.remove("is-swap");
        void list.offsetWidth;
        list.classList.add("is-swap");
      }
    }
    var trackNow = musicCurrent();
    var art = body.querySelector("[data-art]");
    var barArt = body.querySelector("[data-barart]");
    function paintArt(img, src) {
      if (!img) return;
      if (!src) {
        img.hidden = true;
        img.removeAttribute("src");
        return;
      }
      if (img.getAttribute("src") !== src) {
        img.hidden = false;
        img.classList.remove("is-in");
        img.src = src;
        void img.offsetWidth;
        img.classList.add("is-in");
      } else {
        img.hidden = false;
      }
      img.onerror = function () {
        img.onerror = null;
        img.hidden = true;
        img.removeAttribute("src");
      };
    }
    paintArt(art, trackNow && trackNow.thumb ? trackNow.thumb : "");
    paintArt(barArt, trackNow && trackNow.thumb ? trackNow.thumb : "");
    var nt = body.querySelector("[data-ntitle]");
    var na = body.querySelector("[data-nauthor]");
    var bt = body.querySelector("[data-btitle]");
    var ba = body.querySelector("[data-bauthor]");
    if (nt) nt.textContent = trackNow ? trackNow.title : "Nothing playing";
    if (na) na.textContent = trackNow ? trackNow.author : "";
    if (bt) bt.textContent = trackNow ? trackNow.title : "Nothing playing";
    if (ba) ba.textContent = trackNow ? trackNow.author : "";
    var nlike = body.querySelector("[data-nlike]");
    if (nlike) {
      nlike.hidden = !trackNow || trackNow.local;
      nlike.classList.toggle("on", !!(trackNow && musicLiked(trackNow.id)));
    }
    var play = body.querySelector("[data-play]");
    if (play) play.textContent = musicState.audio && !musicState.audio.paused ? "❚❚" : "▶";
    var rep = body.querySelector("[data-repeat]");
    if (rep) rep.textContent = musicState.repeat === "one" ? "1" : "↻";
    var dur = body.querySelector("[data-dur]");
    if (dur) dur.textContent = trackNow && trackNow.seconds ? musicClock(trackNow.seconds) : "0:00";
  }
  function musicAddMenu(x, y, track) {
    var old = document.querySelector(".vos-mu-pop");
    if (old) old.remove();
    var pop = document.createElement("div");
    pop.className = "vos-mu-pop";
    function addBtn(label, run) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.onclick = function () { pop.remove(); run(); };
      pop.appendChild(btn);
    }
    musicState.lib.playlists.forEach(function (pl) {
      addBtn(pl.name || "Playlist", function () {
        if (!pl.tracks) pl.tracks = [];
        var exists = false;
        pl.tracks.forEach(function (item) { if (item.id === track.id) exists = true; });
        if (!exists) pl.tracks.push({ id: track.id, title: track.title, author: track.author, thumb: track.thumb, seconds: track.seconds, local: !!track.local });
        musicSaveLib();
        musicPaint();
      });
    });
    addBtn("New playlist", function () {
      var name = window.prompt("Playlist name");
      if (!name) return;
      var pl = { id: "pl_" + Date.now().toString(36), name: String(name).slice(0, 40), tracks: [] };
      if (!track.local) pl.tracks.push({ id: track.id, title: track.title, author: track.author, thumb: track.thumb, seconds: track.seconds, local: false });
      else pl.tracks.push({ id: track.id, title: track.title, author: track.author, thumb: track.thumb, seconds: 0, local: true });
      musicState.lib.playlists.push(pl);
      musicSaveLib();
      musicState.view = "playlist";
      musicState.playlistId = pl.id;
      musicPaint();
    });
    document.body.appendChild(pop);
    pop.style.left = Math.max(8, x) + "px";
    pop.style.top = Math.max(8, y) + "px";
    setTimeout(function () {
      function bye(e) {
        if (pop.contains(e.target)) return;
        pop.remove();
        document.removeEventListener("pointerdown", bye, true);
      }
      document.addEventListener("pointerdown", bye, true);
    }, 0);
  }
  function musicKick(audio, id) {
    var job = musicState && musicState.failovers;
    if (!job || job.id !== id || job.done) return;
    if (!musicCurrent() || musicCurrent().id !== id) return;
    if (job.i >= job.urls.length) {
      job.done = true;
      musicStatus("Couldn't play that song. Try another.");
      musicPaint();
      return;
    }
    job.busy = true;
    audio.src = job.urls[job.i];
    audio.play().then(function () {
      if (!musicState || musicState.failovers !== job) return;
      job.busy = false;
      job.ok = true;
      musicStatus("");
      musicPaint();
    }).catch(function (err) {
      if (!musicState || musicState.failovers !== job) return;
      job.busy = false;
      if (err && err.name === "NotAllowedError") {
        job.done = true;
        musicStatus("Press play to start.");
        musicPaint();
        return;
      }
      job.i += 1;
      musicKick(audio, id);
    });
  }
  function musicPlay(index) {
    if (!musicState) return;
    var queue = musicState.queue || [];
    if (!queue.length) return;
    if (index < 0) index = queue.length - 1;
    if (index >= queue.length) index = 0;
    musicState.index = index;
    var track = queue[index];
    var audio = musicState.audio;
    musicStatus("");
    musicPaint();
    if (!audio || !track) return;
    if (track.local) {
      musicState.failovers = null;
      var localSrc = fileUrls[track.id] || "";
      if (!localSrc) {
        musicStatus("That file isn't on this computer.");
        return;
      }
      audio.src = localSrc;
      audio.play().catch(function () { musicStatus("Couldn't play that file."); });
      return;
    }
    musicStatus("Loading…");
    musicState.failovers = { id: track.id, urls: musicAudioUrls(track.id), i: 0, busy: false, done: false, ok: false };
    musicKick(audio, track.id);
  }
  function ensureMusic(body) {
    if (!body) return;
    if (body.dataset.ready === "1" && musicState) { musicPaint(); return; }
    body.dataset.ready = "1";
    body.innerHTML = '<div class="vos-music vos-rise"><aside class="vos-mu-side"><div class="vos-mu-brand"><i>♪</i> Music</div><button type="button" class="nav on" data-nav="home">Home</button><button type="button" class="nav" data-nav="liked">Liked Songs</button><button type="button" class="nav" data-nav="saved">Saved</button><div class="vos-mu-plhead"><span>Playlists</span><button type="button" data-newpl aria-label="New playlist">+</button></div><div class="vos-mu-pls" data-pl></div></aside><section class="vos-mu-main"><h1 data-heading>Search for a song</h1><form class="vos-mu-find" data-search><input data-q type="search" placeholder="Search" aria-label="Search for a song"><button type="submit">Search</button></form><div class="vos-mu-meta" data-count></div><div class="vos-mu-status" data-status></div><div class="vos-mu-list" data-list></div></section><aside class="vos-mu-now" data-now><div class="vos-mu-nowtop"><span>Now playing</span><button type="button" data-hide-now aria-label="Hide">×</button></div><div class="vos-mu-art"><span class="vos-mu-ph" aria-hidden="true">♪</span><img data-art alt="" hidden></div><div class="vos-mu-nowrow"><div><b data-ntitle>Nothing playing</b><br><small data-nauthor></small></div><button type="button" class="vos-mu-heart" data-nlike aria-label="Like">♥</button></div></aside><footer class="vos-mu-bar"><div class="vos-mu-who"><span class="vos-mu-barart"><span class="vos-mu-ph" aria-hidden="true">♪</span><img data-barart alt="" hidden></span><div><b data-btitle>Nothing playing</b><small data-bauthor></small></div><span class="vos-mu-eq" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="vos-mu-transport"><div class="vos-mu-btns"><button type="button" data-prev aria-label="Previous">⏮</button><button type="button" class="play" data-play aria-label="Play">▶</button><button type="button" data-next aria-label="Next">⏭</button><button type="button" data-repeat aria-label="Repeat">↻</button></div><div class="vos-mu-seek"><span data-cur>0:00</span><input data-seek type="range" min="0" max="1000" value="0" aria-label="Position"><span data-dur>0:00</span></div></div><input class="vos-mu-vol" data-vol type="range" min="0" max="100" value="100" aria-label="Volume"></footer><audio data-audio preload="none"></audio></div>';
    var root = body.querySelector(".vos-music");
    var audio = body.querySelector("[data-audio]");
    musicState = { body: root, audio: audio, lib: musicLoadLib(), view: "home", playlistId: "", results: [], queue: [], index: -1, repeat: "off", showNow: true, seeking: false, status: "", hydrating: false, pendingSave: false, failovers: null };
    root.querySelector("[data-search]").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = root.querySelector("[data-q]").value.trim();
      if (!q) return;
      musicState.view = "home";
      musicStatus("Searching…");
      var qEnc = encodeURIComponent(q);
      var urls = [];
      MUSIC_SEARCH.forEach(function (host) { urls.push(host + "/search?q=" + qEnc + "&filter=music_songs"); });
      MUSIC_INV.forEach(function (host) { urls.push(host + "/api/v1/search?q=" + qEnc + "&type=video"); });
      musicFetchJson(urls).then(function (data) {
        var items = Array.isArray(data) ? data : ((data && data.items) || []);
        var tracks = [];
        items.forEach(function (item) {
          var track = musicTrackFrom(item);
          if (track) tracks.push(track);
        });
        musicState.results = tracks.slice(0, 40);
        musicStatus(tracks.length ? "" : "No songs found.");
        musicPaint();
      }).catch(function () {
        musicStatus("Search failed. Try again in a moment.");
        musicPaint();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-nav]"), function (btn) {
      btn.onclick = function () {
        musicState.view = btn.getAttribute("data-nav");
        musicPaint();
      };
    });
    root.querySelector("[data-newpl]").onclick = function () {
      var name = window.prompt("Playlist name");
      if (!name) return;
      var pl = { id: "pl_" + Date.now().toString(36), name: String(name).slice(0, 40), tracks: [] };
      musicState.lib.playlists.push(pl);
      musicSaveLib();
      musicState.view = "playlist";
      musicState.playlistId = pl.id;
      musicPaint();
    };
    root.querySelector("[data-hide-now]").onclick = function () {
      musicState.showNow = !musicState.showNow;
      musicPaint();
    };
    root.querySelector("[data-nlike]").onclick = function () {
      var track = musicCurrent();
      if (track) musicToggleLike(track);
    };
    root.querySelector("[data-prev]").onclick = function () { musicPlay((musicState.index || 0) - 1); };
    root.querySelector("[data-next]").onclick = function () { musicPlay((musicState.index || 0) + 1); };
    root.querySelector("[data-play]").onclick = function () {
      if (!audio.src) {
        var rows = musicQueue();
        if (!rows.length) return;
        musicState.queue = rows;
        musicPlay(musicState.index >= 0 ? musicState.index : 0);
        return;
      }
      if (audio.paused) audio.play().then(function () { musicPaint(); }).catch(function () {});
      else { audio.pause(); musicPaint(); }
    };
    root.querySelector("[data-repeat]").onclick = function () {
      musicState.repeat = musicState.repeat === "off" ? "all" : musicState.repeat === "all" ? "one" : "off";
      musicPaint();
    };
    root.querySelector("[data-vol]").addEventListener("input", function () {
      audio.volume = Math.max(0, Math.min(1, Number(this.value) / 100));
    });
    var seek = root.querySelector("[data-seek]");
    seek.addEventListener("pointerdown", function () { musicState.seeking = true; });
    seek.addEventListener("pointerup", function () { musicState.seeking = false; });
    seek.addEventListener("input", function () {
      if (!audio.duration) return;
      audio.currentTime = (Number(this.value) / 1000) * audio.duration;
    });
    audio.addEventListener("timeupdate", function () {
      var cur = root.querySelector("[data-cur]");
      var dur = root.querySelector("[data-dur]");
      if (cur) cur.textContent = musicClock(audio.currentTime);
      if (dur && audio.duration) dur.textContent = musicClock(audio.duration);
      if (!musicState.seeking && audio.duration) seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    });
    audio.addEventListener("play", function () { musicPaint(); });
    audio.addEventListener("pause", function () { musicPaint(); });
    audio.addEventListener("error", function () {
      var job = musicState && musicState.failovers;
      if (!job || job.busy || job.done || !job.ok) return;
      if (!musicCurrent() || musicCurrent().id !== job.id) return;
      job.ok = false;
      job.i += 1;
      musicKick(audio, job.id);
    });
    audio.addEventListener("ended", function () {
      if (musicState.repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(function () {});
        return;
      }
      var last = musicState.index >= musicState.queue.length - 1;
      if (last && musicState.repeat !== "all") return;
      musicPlay(musicState.index + 1);
    });
    musicPaint();
    musicHydrate();
  }
  var MOVIE_SHELF = [
    { id: "NightOfTheLivingDead-MPEG", title: "Night of the Living Dead", year: "1968", by: "George A. Romero", file: "NightOfTheLivingDead_512kb.mp4", blurb: "A farmhouse, a news report, and the night the dead don't stay down." },
    { id: "DasKabinettdesDoktorCaligariTheCabinetofDrCaligari", title: "The Cabinet of Dr. Caligari", year: "1919", by: "Robert Wiene", file: "The_Cabinet_of_Dr._Caligari_512kb.mp4", blurb: "A sleeping town, a cabinet, and a story told by a man who may be the monster." },
    { id: "his_girl_friday", title: "His Girl Friday", year: "1940", by: "Howard Hawks", file: "his_girl_friday_512kb.mp4", blurb: "A newsroom, a deadline, and an editor who will not let his best reporter leave." },
    { id: "TheGeneral", title: "The General", year: "1926", by: "Buster Keaton", file: "The_General_512kb.mp4", blurb: "A locomotive, a war, and one engineer who will not leave his engine behind." },
    { id: "house_on_haunted_hill_ipod", title: "House on Haunted Hill", year: "1959", by: "William Castle", file: "house_on_haunted_hill_512kb.mp4", blurb: "A millionaire, a locked house, and a party no one is meant to finish." },
    { id: "Levoyagedanslalune", title: "A Trip to the Moon", year: "1902", by: "Georges Méliès", file: "Le_voyage_dans_la_lune_A_trip_to_the_moon__Georges_Mlis_1902_512kb.mp4", blurb: "A shell fired at the moon, and the astronomers who climb out of it." },
    { id: "The_Little_Shop_of_Horrors.mpeg", title: "The Little Shop of Horrors", year: "1960", by: "Roger Corman", file: "The_Little_Shop_of_Horrors_512kb.mp4", blurb: "A florist, a strange plant, and a hunger that starts small." },
    { id: "carnival_of_souls", title: "Carnival of Souls", year: "1962", by: "Herk Harvey", file: "carnival_of_souls_512kb.mp4", blurb: "A woman walks out of a river and into a pavilion that isn't finished with her." },
    { id: "Intolerance", title: "Intolerance", year: "1916", by: "D. W. Griffith", file: "Intolerance_512kb.mp4", blurb: "Four stories, one verdict, cut together before anyone else dared." }
  ];
  function movieNice(name) {
    return String(name || "Video").replace(/\.[a-z0-9]{1,8}$/i, "").replace(/[_]+/g, " ").trim() || "Video";
  }
  function movieLoadProgress() {
    try {
      var data = JSON.parse(localStorage.getItem("veil_os_movies") || "");
      if (data && typeof data.progress === "object" && data.progress) return data.progress;
    } catch (err) {}
    return {};
  }
  function movieSaveProgress() {
    if (!movieState) return;
    try { localStorage.setItem("veil_os_movies", JSON.stringify({ progress: movieState.progress || {} })); } catch (err) {}
  }
  function movieDownload(id, file) {
    return "https://archive.org/download/" + encodeURIComponent(id) + "/" + encodeURIComponent(file);
  }
  function moviePoster(id) {
    return "https://archive.org/services/img/" + encodeURIComponent(id);
  }
  function moviePerson(value) {
    if (Array.isArray(value)) return String(value[0] || "");
    return String(value || "");
  }
  function movieSafeFile(files) {
    var best = null;
    (files || []).forEach(function (file) {
      var name = String(file && file.name || "");
      var fmt = String(file && file.format || "");
      if (!/\.mp4$/i.test(name)) return;
      var low = name.toLowerCase();
      var bad = /bluray|bdrip|webrip|yify|1080p|720p|x264-|web-dl|hdtv|dvdrip/.test(low);
      var size = Number(file.size) || 0;
      var rank = 0;
      if (/512kb/.test(low) || fmt === "512Kb MPEG4") rank = 3;
      else if (!bad && size > 8000000 && size < 700000000) rank = 2;
      if (!rank) return;
      if (!best || rank > best.rank || (rank === best.rank && size && size < best.size)) best = { rank: rank, size: size || 999999999999, name: name };
    });
    return best ? best.name : "";
  }
  function movieSaved() {
    return files.filter(function (file) { return file.kind === "video"; }).map(function (file) {
      return { id: file.id, title: movieNice(file.title), year: "Saved", by: "On this computer", local: true, file: "" };
    });
  }
  function movieShelfMatch(q) {
    var needle = String(q || "").trim().toLowerCase();
    if (!needle) return MOVIE_SHELF.slice();
    return MOVIE_SHELF.filter(function (film) {
      return (film.title + " " + film.by + " " + film.year).toLowerCase().indexOf(needle) !== -1;
    });
  }
  function movieContinue() {
    if (!movieState) return [];
    var items = [];
    Object.keys(movieState.progress || {}).forEach(function (id) {
      var mark = movieState.progress[id];
      if (!mark || mark.t < 20) return;
      if (mark.d && mark.t > mark.d - 30) return;
      var known = null;
      MOVIE_SHELF.forEach(function (film) { if (film.id === id) known = film; });
      if (known) { items.push(known); return; }
      movieSaved().forEach(function (film) { if (film.id === id) items.push(film); });
    });
    return items;
  }
  function movieProgressOf(id) {
    var mark = movieState && movieState.progress && movieState.progress[id];
    if (!mark || !mark.d || mark.t < 8) return 0;
    return Math.max(0, Math.min(1, mark.t / mark.d));
  }
  function movieCard(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vos-mv-card";
    btn.innerHTML = '<span class="vos-mv-poster"><img alt="" hidden><i></i><span class="vos-mv-progress" hidden><b></b></span></span><span class="vos-mv-name"></span><span class="vos-mv-year"></span>';
    btn.querySelector(".vos-mv-name").textContent = item.title || "Untitled";
    btn.querySelector(".vos-mv-year").textContent = item.year && item.year !== "Saved" ? (item.year + (item.by ? " · " + item.by : "")) : (item.by || "");
    var fallback = btn.querySelector("i");
    fallback.textContent = item.title || "Film";
    var img = btn.querySelector("img");
    if (!item.local && item.id) {
      img.hidden = false;
      img.src = moviePoster(item.id);
      img.onload = function () { fallback.hidden = true; };
      img.onerror = function () { img.hidden = true; img.removeAttribute("src"); fallback.hidden = false; };
    }
    var ratio = movieProgressOf(item.id);
    if (ratio > 0.02 && ratio < 0.96) {
      var bar = btn.querySelector(".vos-mv-progress");
      bar.hidden = false;
      bar.querySelector("b").style.width = Math.round(ratio * 100) + "%";
    }
    btn.onclick = function () { moviePlay(item); };
    return btn;
  }
  function movieHero(item) {
    var sec = document.createElement("section");
    sec.className = "vos-mv-hero";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = '<span class="vos-mv-hero-art"><img alt=""></span><span class="vos-mv-hero-copy"><span class="vos-mv-kicker">Now showing</span><h2></h2><p class="vos-mv-meta"></p><p class="vos-mv-blurb"></p><span class="vos-mv-play">Play</span></span>';
    btn.querySelector("h2").textContent = item.title || "Film";
    btn.querySelector(".vos-mv-meta").textContent = [item.year, item.by].filter(Boolean).join(" · ");
    btn.querySelector(".vos-mv-blurb").textContent = item.blurb || "";
    var img = btn.querySelector("img");
    if (!item.local && item.id) img.src = moviePoster(item.id);
    btn.onclick = function () { moviePlay(item); };
    sec.appendChild(btn);
    return sec;
  }
  function movieSection(title, items) {
    if (!items.length) return null;
    var sec = document.createElement("section");
    sec.className = "vos-mv-shelf";
    var heading = document.createElement("h2");
    heading.textContent = title;
    sec.appendChild(heading);
    var row = document.createElement("div");
    row.className = "vos-mv-row";
    items.forEach(function (item) { row.appendChild(movieCard(item)); });
    sec.appendChild(row);
    return sec;
  }
  function movieStatus(text) {
    if (!movieState) return;
    var el = movieState.body.querySelector("[data-status]");
    if (el) el.textContent = text || "";
  }
  function stopMovies() {
    if (!movieState) return;
    var video = movieState.body && movieState.body.querySelector("[data-video]");
    if (video) { try { video.pause(); } catch (err) {} }
  }
  function moviePaint() {
    if (!movieState) return;
    var scroll = movieState.body.querySelector("[data-scroll]");
    if (!scroll) return;
    var q = movieState.query || "";
    scroll.innerHTML = "";
    var house = movieShelfMatch(q);
    var saved = movieSaved().filter(function (film) {
      if (!q) return true;
      return film.title.toLowerCase().indexOf(q.toLowerCase()) !== -1;
    });
    if (!q) {
      var cont = movieSection("Continue", movieContinue());
      if (cont) scroll.appendChild(cont);
    }
    if (!q && house.length) {
      scroll.appendChild(movieHero(house[0]));
      var rest = movieSection("Also showing", house.slice(1));
      if (rest) scroll.appendChild(rest);
    } else {
      var shelf = movieSection(q ? "Matches" : "Now showing", house);
      if (shelf) scroll.appendChild(shelf);
    }
    var mine = movieSection("On this computer", saved);
    if (mine) scroll.appendChild(mine);
    if (q) {
      var found = movieSection("Early films", movieState.results || []);
      if (found) scroll.appendChild(found);
    }
    if (q && !house.length && !saved.length && !(movieState.results && movieState.results.length) && !movieState.searching) {
      var empty = document.createElement("p");
      empty.className = "vos-mv-empty";
      empty.textContent = "Nothing free to watch under that title.";
      scroll.appendChild(empty);
    }
  }
  function movieResolve(item) {
    if (!item || item.local || item.file) return Promise.resolve(item);
    return fetch("https://archive.org/metadata/" + encodeURIComponent(item.id), { headers: { "Accept": "application/json" } }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (data) {
      var file = movieSafeFile(data && data.files);
      if (!file) throw new Error("nofile");
      item.file = file;
      return item;
    });
  }
  function moviePlay(item) {
    if (!movieState || !item) return;
    var stage = movieState.body.querySelector("[data-stage]");
    var video = movieState.body.querySelector("[data-video]");
    var title = movieState.body.querySelector("[data-title]");
    var by = movieState.body.querySelector("[data-by]");
    if (!stage || !video) return;
    movieState.current = item;
    if (title) title.textContent = item.title || "Film";
    if (by) by.textContent = item.by ? (item.year && item.year !== "Saved" ? item.year + " · " + item.by : item.by) : "Opening…";
    stage.hidden = false;
    function start(src) {
      if (!src) {
        if (by) by.textContent = "That film isn't on this computer.";
        return;
      }
      var mark = movieState.progress[item.id];
      function seek() {
        video.removeEventListener("loadedmetadata", seek);
        if (!mark || mark.t < 12) return;
        if (mark.d && mark.t > mark.d - 25) return;
        try { video.currentTime = mark.t; } catch (err) {}
      }
      video.addEventListener("loadedmetadata", seek);
      video.src = src;
      video.play().catch(function () {});
    }
    if (item.local) {
      start(fileUrls[item.id] || "");
      return;
    }
    if (item.file) {
      if (by && item.by) by.textContent = (item.year ? item.year + " · " : "") + item.by;
      start(movieDownload(item.id, item.file));
      return;
    }
    if (by) by.textContent = "Opening…";
    movieResolve(item).then(function (ready) {
      if (!movieState || movieState.current !== item) return;
      if (by) by.textContent = (ready.year ? ready.year + " · " : "") + (ready.by || "");
      start(movieDownload(ready.id, ready.file));
    }).catch(function () {
      if (!movieState || movieState.current !== item) return;
      if (by) by.textContent = "That copy isn't playable here.";
    });
  }
  function movieSearch(q) {
    if (!movieState) return;
    movieState.query = q;
    movieState.results = [];
    movieState.searching = true;
    movieStatus(q ? "Searching…" : "");
    moviePaint();
    if (!q) { movieState.searching = false; return; }
    var safe = q.replace(/[^\w\s'-]/g, " ").trim().slice(0, 60);
    if (safe.length < 2) {
      movieState.searching = false;
      movieStatus("");
      moviePaint();
      return;
    }
    var query = 'mediatype:movies AND format:"h.264" AND year:[1895 TO 1930] AND title:(' + safe + ")";
    var url = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(query) + "&fl[]=identifier&fl[]=title&fl[]=year&fl[]=creator&rows=16&output=json";
    fetch(url, { headers: { "Accept": "application/json" } }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (data) {
      if (!movieState || movieState.query !== q) return;
      var docs = (data && data.response && data.response.docs) || [];
      var seen = {};
      MOVIE_SHELF.forEach(function (film) { seen[film.id] = 1; });
      var results = [];
      docs.forEach(function (doc) {
        var id = String(doc.identifier || "");
        if (!id || seen[id]) return;
        seen[id] = 1;
        results.push({
          id: id,
          title: movieNice(moviePerson(doc.title) || id),
          year: moviePerson(doc.year),
          by: moviePerson(doc.creator),
          file: "",
          local: false
        });
      });
      movieState.results = results;
      movieState.searching = false;
      movieStatus("");
      moviePaint();
    }).catch(function () {
      if (!movieState || movieState.query !== q) return;
      movieState.searching = false;
      movieStatus("Search didn't answer. The house shelf is still here.");
      moviePaint();
    });
  }
  function ensureMovies(body) {
    var host = document.getElementById("osApp-movies");
    if (!host && body && body.id === "osApp-movies") host = body;
    if (!host || host.id !== "osApp-movies") return;
    if (host.querySelector("[data-cinema]") && movieState && movieState.body && movieState.body.isConnected && movieState.host === host) {
      moviePaint();
      return;
    }
    host.dataset.ready = "1";
    host.innerHTML = '<div class="vos-movies vos-rise" data-cinema="1" data-movies-app="1"><header class="vos-mv-bar"><div class="vos-mv-brand"><h1>Movies</h1><p>A theater. Press play.</p></div><form class="vos-mv-find" data-search><input data-q type="search" placeholder="Search films" aria-label="Search films"><button type="submit">Search</button></form></header><p class="vos-mv-status" data-status></p><div class="vos-mv-scroll" data-scroll></div><div class="vos-movies-stage" data-stage hidden><video data-video controls playsinline></video><div class="vos-mv-chrome"><button type="button" data-back>Library</button><div><b data-title></b><small data-by></small></div></div></div></div>';
    var root = host.querySelector(".vos-movies");
    var video = root.querySelector("[data-video]");
    movieState = { host: host, body: root, progress: movieLoadProgress(), query: "", results: [], searching: false, current: null, lastSave: 0 };
    root.querySelector("[data-back]").onclick = function () {
      try { video.pause(); } catch (err) {}
      root.querySelector("[data-stage]").hidden = true;
      moviePaint();
    };
    root.querySelector("[data-search]").addEventListener("submit", function (e) {
      e.preventDefault();
      movieSearch(root.querySelector("[data-q]").value.trim());
    });
    video.addEventListener("timeupdate", function () {
      if (!movieState || !movieState.current) return;
      var now = video.currentTime || 0;
      if (now < 8) return;
      if (movieState.lastSave && Date.now() - movieState.lastSave < 4000) return;
      movieState.lastSave = Date.now();
      var item = movieState.current;
      movieState.progress[item.id] = { t: now, d: video.duration || 0, local: !!item.local };
      movieSaveProgress();
    });
    video.addEventListener("error", function () {
      var by = root.querySelector("[data-by]");
      if (by && video.src) by.textContent = "Couldn't start that film.";
    });
    moviePaint();
  }
  function stopVis() {
    if (!playerState || !playerState.raf) return;
    cancelAnimationFrame(playerState.raf);
    playerState.raf = 0;
  }
  function detachVis() {
    stopVis();
    if (!playerState || !playerState.hooked) return;
    var old = playerState.body.querySelector("[data-audio]");
    if (old) {
      try { old.pause(); } catch (err) {}
      var next = document.createElement("audio");
      next.setAttribute("data-audio", "");
      next.controls = true;
      if (old.hidden) next.hidden = true;
      old.replaceWith(next);
    }
    if (playerState.actx) {
      try { playerState.actx.close(); } catch (err2) {}
    }
    playerState.actx = null;
    playerState.analyser = null;
    playerState.bins = null;
    playerState.hooked = false;
  }
  function localMedia(src) {
    return /^(blob:|data:)/i.test(String(src || ""));
  }
  function armVis(audio) {
    if (!playerState || !audio || !localMedia(audio.currentSrc || audio.src)) return;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      if (!playerState.actx) {
        playerState.actx = new AudioCtx();
        var node = playerState.actx.createMediaElementSource(audio);
        var analyser = playerState.actx.createAnalyser();
        analyser.fftSize = 64;
        node.connect(analyser);
        analyser.connect(playerState.actx.destination);
        playerState.analyser = analyser;
        playerState.bins = new Uint8Array(analyser.frequencyBinCount);
        playerState.hooked = true;
      }
      if (playerState.actx.state === "suspended") playerState.actx.resume();
    } catch (err) {
      if (playerState && !playerState.hooked && playerState.actx) {
        try { playerState.actx.close(); } catch (e) {}
        playerState.actx = null;
      }
      return;
    }
    var canvas = playerState.body.querySelector("[data-vis]");
    if (!canvas || !playerState.analyser) return;
    function draw() {
      if (!playerState || !playerState.analyser) return;
      var box = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(box.width));
      var h = Math.max(1, Math.round(box.height));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      var ctx = canvas.getContext("2d");
      playerState.analyser.getByteFrequencyData(playerState.bins);
      ctx.clearRect(0, 0, w, h);
      var n = playerState.bins.length;
      var gap = 4;
      var bw = Math.max(3, (w - gap * n) / n);
      var color = "#fff";
      try { color = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#fff"; } catch (err) {}
      ctx.fillStyle = color;
      var i;
      for (i = 0; i < n; i++) {
        var bh = Math.max(3, (playerState.bins[i] / 255) * (h - 10));
        ctx.fillRect(i * (bw + gap), h - bh - 4, bw, bh);
      }
      playerState.raf = requestAnimationFrame(draw);
    }
    stopVis();
    playerState.raf = requestAnimationFrame(draw);
  }
  function playerLoad(app) {
    if (!playerState || !app) return;
    var body = playerState.body;
    var src = fileUrls[app.id] || "";
    var empty = body.querySelector("[data-empty]");
    var view = body.querySelector("[data-view]");
    if (!localMedia(src) && playerState.hooked) detachVis();
    var video = body.querySelector("[data-video]");
    var audio = body.querySelector("[data-audio]");
    var canvas = body.querySelector("[data-vis]");
    var audioMode = !!(app.audio || app.kind === "audio");
    if (!src) {
      if (empty) empty.hidden = false;
      if (view) view.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (view) view.hidden = false;
    if (video) video.hidden = audioMode;
    if (audio) audio.hidden = !audioMode;
    if (canvas) canvas.hidden = !audioMode;
    var el = audioMode ? audio : video;
    var other = audioMode ? video : audio;
    if (other) { try { other.pause(); } catch (err) {} }
    if (!audioMode) stopVis();
    if (el && el.getAttribute("src") !== src) el.src = src;
    var title = wins.player && wins.player.el.querySelector(".vos-title b");
    if (title) title.textContent = app.title || "Media Player";
    if (audioMode && audio) audio.onplay = function () {
      if (localMedia(audio.currentSrc || audio.src)) armVis(audio);
      else stopVis();
    };
  }
  function ensurePlayer(body) {
    if (!body || (body.dataset.ready === "1" && playerState)) return;
    body.dataset.ready = "1";
    body.innerHTML = '<div class="vos-player vos-rise"><div class="vos-player-empty" data-empty>Open a song from the desktop.</div><div class="vos-player-view" data-view hidden><canvas data-vis hidden></canvas><video data-video controls playsinline hidden></video><audio data-audio controls hidden></audio></div></div>';
    playerState = { body: body, actx: null, analyser: null, bins: null, raf: 0, hooked: false };
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
    loadPins();
    loadDeskApps();
    icons.addEventListener("dragstart", function (e) { e.preventDefault(); });
    desk.appendChild(icons);
    var snap = document.createElement("div");
    snap.className = "vos-snap";
    desk.appendChild(snap);
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
      var media = [];
      var i;
      for (i = 0; i < e.dataTransfer.files.length; i++) {
        var dropped = e.dataTransfer.files[i];
        var kind = mediaKindFrom(dropped.name, dropped.type);
        if (kind) media.push(dropped);
        else if (String(dropped.type || "").indexOf("image/") === 0) images.push(dropped);
      }
      if (!images.length && !media.length) return;
      e.preventDefault();
      e.stopPropagation();
      images.forEach(function (file) { addImageFile(file, file.name, "").catch(function () {}); });
      media.forEach(function (file) { addMediaFile(file, file.name, file.type, "", "").catch(function () {}); });
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
    menu.innerHTML = '<div class="vos-start-head"><img data-pfp class="vos-start-pfp" alt=""><b data-user>Guest</b></div><div class="vos-start-search"><input data-find type="text" placeholder="Search programs" spellcheck="false" aria-label="Search programs"></div><div class="vos-start-cols"><div class="vos-start-col" data-left></div><div class="vos-start-col" data-right></div></div><div class="vos-start-foot"><button type="button" class="vos-startitem" data-lock><img src="' + IMG + 'lock.svg" alt=""><span>Lock</span></button><button type="button" class="vos-startitem vos-power" data-power><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3.2v7.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7.1 6.4a7 7 0 1 0 9.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Shut down</span></button></div>';
    function startRow(app, canDrag) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vos-startitem";
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = iconHtml(app) + "<span></span>";
      btn.querySelector("span").textContent = app.title || "App";
      var dragged = false;
      if (canDrag) {
        btn.addEventListener("pointerdown", function (e) {
          if (e.button !== 0) return;
          dragged = false;
          var sx = e.clientX;
          var sy = e.clientY;
          var ghost = null;
          function move(ev) {
            if (!dragged && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            dragged = true;
            if (!ghost) {
              ghost = document.createElement("div");
              ghost.className = "vos-drag-ghost";
              ghost.innerHTML = '<span class="vos-glyph">' + iconHtml(app) + "</span>";
              document.body.appendChild(ghost);
            }
            ghost.style.left = (ev.clientX - 28) + "px";
            ghost.style.top = (ev.clientY - 28) + "px";
          }
          function up(ev) {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
            if (!dragged || !deskEl) return;
            var box = deskEl.getBoundingClientRect();
            var onDesk = ev.clientX >= box.left && ev.clientX <= box.right && ev.clientY >= box.top && ev.clientY <= box.bottom;
            if (!onDesk) return;
            placeOnDesktop(app.id, ev.clientX - box.left - 48, ev.clientY - box.top - 20);
            closeStart();
          }
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        });
      }
      btn.onclick = function () {
        if (dragged) { dragged = false; return; }
        closeStart();
        openShortcut(appById(app.id) || app);
      };
      return btn;
    }
    function paintStart() {
      var bits = profileBits();
      var face = menu.querySelector("[data-pfp]");
      var who = menu.querySelector("[data-user]");
      if (face) {
        face.src = bits.avatar;
        face.classList.toggle("is-ph", bits.placeholder);
      }
      if (who) who.textContent = bits.name;
      var query = "";
      var find = menu.querySelector("[data-find]");
      if (find) query = String(find.value || "").trim().toLowerCase();
      var left = menu.querySelector("[data-left]");
      var right = menu.querySelector("[data-right]");
      if (!left || !right) return;
      left.innerHTML = "";
      right.innerHTML = "";
      var appsLabel = document.createElement("div");
      appsLabel.className = "vos-start-label";
      appsLabel.textContent = "Apps";
      left.appendChild(appsLabel);
      var recentLabel = document.createElement("div");
      recentLabel.className = "vos-start-label";
      recentLabel.textContent = "Recent";
      right.appendChild(recentLabel);
      var apps = [];
      shortcutList().forEach(function (app) {
        if (app.file || app.folder || app.id === "browser") return;
        if (query && String(app.title || "").toLowerCase().indexOf(query) === -1) return;
        apps.push(app);
      });
      if (!apps.length) {
        var empty = document.createElement("div");
        empty.className = "vos-start-empty";
        empty.textContent = query ? "No matches" : "No apps";
        left.appendChild(empty);
      }
      apps.forEach(function (app) { left.appendChild(startRow(app, true)); });
      var recent = [];
      try { recent = JSON.parse(localStorage.getItem("veil_os_recent") || "[]"); } catch (err) { recent = []; }
      if (!Array.isArray(recent)) recent = [];
      var shown = 0;
      recent.forEach(function (id) {
        var app = appById(id);
        if (!app || app.folder) return;
        if (query && String(app.title || "").toLowerCase().indexOf(query) === -1) return;
        right.appendChild(startRow(app, !app.file && app.id !== "browser"));
        shown += 1;
      });
      if (!shown) {
        var none = document.createElement("div");
        none.className = "vos-start-empty";
        none.textContent = query ? "No matches" : "Nothing opened yet";
        right.appendChild(none);
      }
    }
    refreshStart = paintStart;
    menu.querySelector("[data-lock]").onclick = function () {
      closeStart();
      if (typeof lockVeil === "function") lockVeil();
    };
    menu.querySelector("[data-power]").onclick = function () {
      closeStart();
      shutdownDesktop();
    };
    menu.querySelector("[data-find]").addEventListener("input", paintStart);
    function setStart(open) {
      if (open) paintStart();
      menu.classList.toggle("is-open", open);
      startBtn.classList.toggle("on", open);
      startBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        var find = menu.querySelector("[data-find]");
        if (find) find.value = "";
      }
    }
    closeStart = function () { setStart(false); };
    startBtn.onclick = function (e) {
      e.stopPropagation();
      setStart(!menu.classList.contains("is-open"));
    };
    shellListen(document, "pointerdown", function (e) {
      if (e.button === 2) return;
      if (Date.now() - ctxAt < 400) return;
      if (ctxEl && !ctxEl.hidden && !ctxEl.contains(e.target)) closeCtx();
      if (!menu.classList.contains("is-open")) return;
      if (startWrap.contains(e.target)) return;
      closeStart();
    });
    shellListen(window, "veil-dismiss-popups", function () {
      closeCtx();
      closeStart();
    });
    shellListen(document, "keydown", function (e) {
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
    var batt = document.createElement("div");
    batt.className = "vos-batt";
    batt.id = "vosBatt";
    batt.hidden = true;
    batt.innerHTML = '<img alt=""><span class="vos-batt-pct"></span>';
    var clock = document.createElement("div");
    clock.className = "vos-clock";
    clock.id = "vosClock";
    bar.appendChild(startWrap);
    bar.appendChild(tasks);
    bar.appendChild(batt);
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
      if (act === "wall" && app && app.file && !app.code) setWallpaper(app.id);
      if (act === "pin" && app && !app.folder && !app.file) togglePin(app.id);
      if (act === "close" && app) closeApp(app.id);
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
    ensureMovies(wins.movies && wins.movies.body);
    deskEl = desk;
    tasksEl = tasks;
    installed.forEach(function (app) { ensureInstalledWindow(app); });
    renderDesktopIcons();
    shellListen(window, "resize", function () {
      var used = [];
      desktopItems().forEach(function (app, index) {
        var el = iconEls[app.id];
        if (!el) return;
        var spot = iconPos(index, app.id, used);
        used.push(spot);
        el.style.left = spot.x + "px";
        el.style.top = spot.y + "px";
      });
      if (deskEl) {
        var deskBox = deskEl.getBoundingClientRect();
        Object.keys(wins).forEach(function (id) {
          var win = wins[id];
          if (!win || !win.el || win.el.classList.contains("is-max")) return;
          var w = parseFloat(win.el.style.width) || win.el.offsetWidth;
          var h = parseFloat(win.el.style.height) || win.el.offsetHeight;
          var x = parseFloat(win.el.style.left) || 0;
          var y = parseFloat(win.el.style.top) || 0;
          if (w > deskBox.width - 12) w = Math.max(280, deskBox.width - 12);
          if (h > deskBox.height - 12) h = Math.max(160, deskBox.height - 12);
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          if (x + w > deskBox.width) x = Math.max(0, deskBox.width - w);
          if (y + h > deskBox.height) y = Math.max(0, deskBox.height - h);
          win.el.style.left = Math.round(x) + "px";
          win.el.style.top = Math.round(y) + "px";
          win.el.style.width = Math.round(w) + "px";
          win.el.style.height = Math.round(h) + "px";
        });
      }
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
    paintBatteryDesk();
    bootBattery();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      paintClock();
      paintBatteryDesk();
    }, 1000);
    paintDesk();
    refreshDeviceWall();
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
    deskEl.querySelectorAll(".vos-wall,.vos-markwall").forEach(function (node) { node.remove(); });
    var mode = "logo";
    var src = "";
    try {
      if (settings && settings.osWall === "device" && deviceWallUrl) {
        mode = "image";
        src = deviceWallUrl;
      } else if (settings && settings.osWall === "file") {
        mode = "image";
        src = fileUrls[settings.osWallId] || "";
      } else if (settings && settings.osWall !== "default" && settings.animEnabled && settings.animStyle === "custom") {
        src = String(settings.backgroundUrl || "").trim();
        if (src.indexOf("veil-file:") === 0) src = fileUrls[src.slice("veil-file:".length)] || "";
        if (src) mode = "image";
      }
    } catch (err) {}
    if (canvas) canvas.style.display = "none";
    if (mode === "image" && src) {
      var wall = document.createElement("img");
      wall.className = "vos-wall";
      wall.alt = "";
      wall.src = src;
      deskEl.insertBefore(wall, canvas.nextSibling);
      return;
    }
    var mark = document.createElement("img");
    mark.className = "vos-markwall";
    mark.alt = "";
    mark.draggable = false;
    mark.src = IMG + "veil-logo-simple.png";
    deskEl.insertBefore(mark, canvas.nextSibling);
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
  window.veilOSAddMedia = function (info) {
    if (!info) return Promise.resolve(null);
    return addMediaFile(info.blob || null, info.name || "", info.mime || "", info.remote || "", info.kind || "");
  };
  window.veilOSSetWall = function (file) {
    if (!file) return Promise.resolve();
    return shrinkBlob(file).then(function (out) {
      return writeWallBlob(out || file);
    }).then(function () {
      try {
        settings.osWall = "device";
        if (typeof save === "function") save();
      } catch (err) {}
      return refreshDeviceWall();
    }).catch(function () {
      try { alert("Could not use that image."); } catch (err) {}
    });
  };
  window.veilOSResetWall = function () {
    try {
      settings.osWall = "default";
      if (typeof save === "function") save();
    } catch (err) {}
    paintDesk();
  };
  window.veilOSPaintBattery = paintBatteryDesk;
  window.veilOSSaveCode = addCodeFile;
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
