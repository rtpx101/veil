'use strict';
try { if (typeof window.__veilBind === "function") window.__veilBind(); } catch (err) {}


(function () {
  var invite = Element.prototype.remove;
  Element.prototype.remove = function () {
    var saved = this;
    if (saved && saved.classList && saved.isConnected && !saved.classList.contains("closing") && (saved.classList.contains("modal-overlay") || saved.classList.contains("cookie-overlay") || saved.classList.contains("signup-overlay") || saved.classList.contains("game-player-overlay"))) {
      saved.classList.add("closing");
      setTimeout(function () {
        try {
          invite.call(saved);
        } catch (err) {}
      }, 200);
      return;
    }
    return invite.call(saved);
  };
})();
const BASE = (() => {
  let next = location.pathname || "/";
  next = next.replace(/\/index\.html$/i, "");
  if (next.length > 1 && next.endsWith("/")) {
    next = next.slice(0, -1);
  }
  if (next === "/" || next === "") {
    return "";
  }
  return next;
})();
const REPO_PATH = BASE ? BASE + "/" : "/";
const IMG = REPO_PATH + "image/";
const FAVI = IMG + "favi.png";
const SCRAMJET_PREFIX = BASE + "/service/";
const SCRAMJET_FILES = {
  all: BASE + "/scramjet/scramjet.all.js",
  sync: BASE + "/scramjet/scramjet.sync.js",
  wasm: BASE + "/scramjet/scramjet.wasm.wasm"
};
const BAREMUX_SCRIPT = BASE + "/baremux/index.js";
const BAREMUX_WORKER = BASE + "/baremux/worker.js";
const EPOXY_MODULE = BASE + "/epoxy/index.mjs";
const LIBCURL_MODULE = BASE + "/libcurl/indexmjs.mjs";
const DEFAULT_WISP = "wss://serv-1-va.onrender.com/";
const SW_URL = BASE + "/sw.js";
const SW_SCOPE = BASE + "/";
const MAX_TABS = 20;
const SEARCH_ENGINES = {
  duckduckgo: {
    id: "duckduckgo",
    name: "DuckDuckGo",
    prefix: "https://duckduckgo.com/?q="
  },
  google: {
    id: "google",
    name: "Google",
    prefix: "https://www.google.com/search?q="
  },
  bing: {
    id: "bing",
    name: "Bing",
    prefix: "https://www.bing.com/search?pglt=299&q="
  },
  brave: {
    id: "brave",
    name: "Brave",
    prefix: "https://search.brave.com/search?q="
  }
};
const WISP_BUILTIN = [{
  id: "va1",
  name: "Virginia Server 1",
  url: "wss://serv-1-va.onrender.com/"
}, {
  id: "va2",
  name: "Virginia Server 2",
  url: "wss://serv-2-va.onrender.com/"
}, {
  id: "oh3",
  name: "Ohio Server 3",
  url: "wss://serv-3-oh.onrender.com/"
}, {
  id: "or4",
  name: "Oregon Server 4",
  url: "wss://serv-4-or.onrender.com/"
}, {
  id: "s5",
  name: "Anura Server",
  url: "wss://anura.pro/"
}];
function allWispServers() {
  const html = settings && Array.isArray(settings.customServers) ? settings.customServers : [];
  return WISP_BUILTIN.concat(html);
}
const CLOAK_PRESETS = {
  drive: {
    title: "Home - Google Drive",
    icon: IMG + "favi/drive.png"
  },
  gmail: {
    title: null,
    icon: IMG + "favi/gmail.png",
    dynamic: "gmail"
  },
  docs: {
    title: "Google Docs",
    icon: IMG + "favi/docs.png"
  },
  "campus-student": {
    title: "Campus Student",
    icon: IMG + "favi/campus-student.png"
  },
  "campus-grades": {
    title: "Grades | Infinite Campus",
    icon: IMG + "favi/campus-student.png"
  },
  "campus-profile": {
    title: "Student Profile | Home | Infinite Campus",
    icon: IMG + "favi/campus-student.png"
  },
  "campus-assignments": {
    title: "Assignments | Infinite Campus",
    icon: IMG + "favi/campus-student.png"
  },
  veil: {
    title: "Veil",
    icon: FAVI
  }
};
function resolveCloakPreset(value) {
  const style = CLOAK_PRESETS[value];
  if (!style) {
    return null;
  }
  if (style.dynamic === "gmail") {
    let admin = "";
    try {
      const word = JSON.parse(localStorage.getItem("veil_access_meta") || "null");
      if (word && word.email) {
        admin = word.email;
      }
    } catch (err) {}
    if (!admin && window.VeilAccess && typeof window.VeilAccess.getMeta === "function") {
      try {
        const fresh = window.VeilAccess.getMeta();
        if (fresh && fresh.email) {
          admin = fresh.email;
        }
      } catch (err) {}
    }
    const session = 200 + Math.floor(Math.random() * 1801);
    return {
      title: "Inbox (" + session + ")" + (admin ? " - " + admin : ""),
      icon: style.icon
    };
  }
  return {
    title: style.title,
    icon: style.icon
  };
}
let engineReady = false;
let engineController = null;
let engineInitPromise = null;
let muxConnection = null;
function loadScript(value2) {
  return new Promise((value, extra) => {
    const hash = document.createElement("script");
    hash.src = value2;
    hash.onload = value;
    hash.onerror = () => extra(new Error("Could not load " + value2));
    document.head.appendChild(hash);
  });
}
function currentWisp() {
  let src = DEFAULT_WISP;
  try {
    if (typeof settings !== "undefined") {
      const sign = allWispServers();
      const secret = sign.find(value => value.id === settings.wispId);
      if (secret && secret.url) {
        src = secret.url;
      }
    }
  } catch {}
  src = String(src || "").trim();
  if (!src || src.length < 12) {
    src = DEFAULT_WISP;
  }
  if (!/^wss?:\/\//i.test(src)) {
    if (/^https:\/\//i.test(src)) {
      src = "wss://" + src.slice(8);
    } else if (/^http:\/\//i.test(src)) {
      src = "ws://" + src.slice(7);
    } else {
      src = DEFAULT_WISP;
    }
  }
  try {
    const uRL = new URL(src);
    if (!uRL.hostname || uRL.hostname.length < 2) {
      src = DEFAULT_WISP;
    }
  } catch {
    src = DEFAULT_WISP;
  }
  if (!src.endsWith("/")) {
    src += "/";
  }
  return src;
}
function absUrl(value) {
  if (!value) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return location.origin + (value.startsWith("/") ? value : "/" + value);
}
function serverDisplayName() {
  try {
    const gate = allWispServers();
    const overlay = gate.find(value => value.id === (settings && settings.wispId));
    return overlay && overlay.name || "Server";
  } catch {
    return "Server";
  }
}
function engineStatusReady() {
  const libcurl = settings && settings.transport === "libcurl" ? "Libcurl" : "Epoxy";
  return "Ready - " + libcurl + " - " + serverDisplayName();
}
function paintEngineStatus(value) {
  const engineStatus = document.getElementById("engineStatus");
  if (!engineStatus) {
    return;
  }
  if (value) {
    engineStatus.textContent = value;
    return;
  }
  const libcurl = settings && settings.transport === "libcurl" ? "Libcurl" : "Epoxy";
  engineStatus.textContent = engineReady ? engineStatusReady() : libcurl + " - " + serverDisplayName();
}
function transportModule() {
  if (typeof settings !== "undefined" && settings.transport === "libcurl") {
    return LIBCURL_MODULE;
  }
  return EPOXY_MODULE;
}
async function ensureScramjetDB() {
  const rec = (await indexedDB.databases?.()) ?? [];
  const row = rec.find(value => value && value.name === "$scramjet");
  if (!row) {
    return;
  }
  const count = await new Promise(value => {
    const base = indexedDB.open("$scramjet");
    base.onsuccess = () => {
      const ev = base.result;
      const handler = [...ev.objectStoreNames];
      ev.close();
      value(handler);
    };
    base.onerror = () => value([]);
  });
  if (count.length > 0) {
    return;
  }
  await Promise.race([new Promise(value => {
    const page = indexedDB.deleteDatabase("$scramjet");
    page.onsuccess = page.onerror = page.onblocked = () => value();
  }), new Promise(value => setTimeout(value, 1500))]);
}
async function pushScramjetConfig() {
  let worker = navigator.serviceWorker.controller;
  if (!worker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      worker = registration && registration.active;
    } catch (err) {}
  }
  if (!worker) return;
  let config = null;
  try {
    const db = await new Promise((value, extra) => {
      const open = indexedDB.open("$scramjet");
      open.onsuccess = () => value(open.result);
      open.onerror = () => extra(open.error);
    });
    if (db.objectStoreNames.contains("config")) {
      config = await new Promise((value, extra) => {
        const tx = db.transaction("config", "readonly");
        const req = tx.objectStore("config").get("config");
        req.onsuccess = () => value(req.result || null);
        req.onerror = () => extra(req.error);
      });
    }
    db.close();
  } catch (err) {}
  try {
    if (config && config.prefix) {
      worker.postMessage({
        scramjet$type: "loadConfig",
        config: config
      });
    } else {
      worker.postMessage({
        type: "veil-config"
      });
    }
  } catch (err) {}
}
async function initEngine() {
  if (engineInitPromise) {
    return engineInitPromise;
  }
  engineInitPromise = (async () => {
    const engineStatus = document.getElementById("engineStatus");
    try {
      if (location.protocol === "about:") {
        const base = document.querySelector("base") && document.querySelector("base").href || "https://rtpx101.github.io/veil/";
        document.body.innerHTML = "<iframe src=\"" + String(base).replace(/"/g, "") + "\" style=\"position:fixed;inset:0;width:100%;height:100%;border:0\"></iframe>";
        return;
      }
      paintEngineStatus();
      if (!window.BareMux) {
        await loadScript(BAREMUX_SCRIPT);
      }
      if (!window.$scramjetLoadController && !window.ScramjetController) {
        await loadScript(SCRAMJET_FILES.all);
      }
      if (!window.BareMux) {
        throw new Error("BareMux did not load.");
      }
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers unavailable.");
      }
      try {
        await ensureScramjetDB();
      } catch (err) {
        console.warn("DB check failed", err);
      }
      paintEngineStatus();
      const tab = typeof window.$scramjetLoadController === "function" ? window.$scramjetLoadController() : null;
      const frame = tab && tab.ScramjetController || window.ScramjetController;
      if (typeof frame !== "function") {
        throw new Error("Scramjet controller unavailable.");
      }
      engineController = new frame({
        prefix: SCRAMJET_PREFIX,
        files: {
          wasm: SCRAMJET_FILES.wasm,
          all: SCRAMJET_FILES.all,
          sync: SCRAMJET_FILES.sync
        },
        flags: {
          captureErrors: true,
          strictRewrites: true,
          rewriterLogs: false
        }
      });
      try {
        await engineController.init();
      } catch (err) {
        if (String(err.message || err).includes("object stores") || String(err.message || err).includes("IDBDatabase")) {
          console.warn("IDB error, force-clear and retry");
          try {
            indexedDB.deleteDatabase("$scramjet");
          } catch {}
          await new Promise(value => setTimeout(value, 400));
          await engineController.init();
        } else {
          throw err;
        }
      }
      paintEngineStatus();
      await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
        updateViaCache: "none"
      });
      const registration = await navigator.serviceWorker.ready;
      try {
        if (registration && registration.update) registration.update();
      } catch (err) {}
      try {
        await pushScramjetConfig();
      } catch (err) {}
      paintEngineStatus();
      await applyMuxTransport();
      engineReady = true;
      paintEngineStatus();
      try {
        pushAdblockToSW();
      } catch (err) {}
    } catch (err) {
      const overlay = String(err && err.message || err);
      if (location.protocol === "about:" || /invalid state/i.test(overlay)) {
        const base = document.querySelector("base") && document.querySelector("base").href || "https://rtpx101.github.io/veil/";
        document.body.innerHTML = "<iframe src=\"" + String(base).replace(/"/g, "") + "\" style=\"position:fixed;inset:0;width:100%;height:100%;border:0\"></iframe>";
        return;
      }
      console.error(err);
      engineReady = false;
      if (engineStatus) {
        engineStatus.textContent = err && err.message || String(err);
      }
      throw err;
    }
  })();
  return engineInitPromise;
}
async function applyMuxTransport() {
  await useWorkingWisp();
  const index = currentWisp();
  const entry = transportModule();
  const meta = entry === LIBCURL_MODULE ? EPOXY_MODULE : LIBCURL_MODULE;
  muxConnection = new BareMux.BareMuxConnection(BAREMUX_WORKER);
  try {
    await muxConnection.setTransport(entry, [{
      wisp: index
    }]);
    return entry;
  } catch (err) {
    console.warn("[veil] transport failed, trying fallback", err);
    muxConnection = new BareMux.BareMuxConnection(BAREMUX_WORKER);
    await muxConnection.setTransport(meta, [{
      wisp: index
    }]);
    settings.transport = meta === LIBCURL_MODULE ? "libcurl" : "epoxy";
    return meta;
  }
}
async function reconnectTransport() {
  try {
    await applyMuxTransport();
    const engineStatus = document.getElementById("engineStatus");
    if (engineStatus) {
      engineStatus.textContent = engineStatusReady();
    }
  } catch (err) {
    console.warn("reconnect failed", err);
    const engineStatus = document.getElementById("engineStatus");
    if (engineStatus) {
      engineStatus.textContent = "Server offline - try another server";
    }
  }
}
const THEMES = {
  matte: {
    bg: "#101010",
    bg2: "#151515",
    bg3: "#1b1b1b",
    panel: "#181818",
    panel2: "#202020",
    border: "#2b2b2b",
    text: "#f2f2f2",
    muted: "#888888",
    accent: "#ffffff",
    accentText: "#111111",
    newtab: "#101010"
  },
  ember: {
    bg: "#1a0a0a",
    bg2: "#220e0e",
    bg3: "#3a1212",
    panel: "#2a1010",
    panel2: "#401818",
    border: "#5a2020",
    text: "#ffeaea",
    muted: "#b88888",
    accent: "#ff4d4d",
    accentText: "#1a0505",
    newtab: "#1a0a0a"
  },
  sunlight: {
    bg: "#191108",
    bg2: "#211609",
    bg3: "#32200c",
    panel: "#281a0a",
    panel2: "#3a250e",
    border: "#513716",
    text: "#fff8eb",
    muted: "#bca783",
    accent: "#ffb84d",
    accentText: "#241303",
    newtab: "#191108"
  },
  forest: {
    bg: "#0b140e",
    bg2: "#101b13",
    bg3: "#17291b",
    panel: "#132219",
    panel2: "#1b3020",
    border: "#29452f",
    text: "#effff1",
    muted: "#8da993",
    accent: "#73c982",
    accentText: "#071109",
    newtab: "#0b140e"
  },
  moonlight: {
    bg: "#080b12",
    bg2: "#0d111b",
    bg3: "#121827",
    panel: "#101521",
    panel2: "#171e2d",
    border: "#263047",
    text: "#eef3ff",
    muted: "#8490a7",
    accent: "#7aa2ff",
    accentText: "#08101f",
    newtab: "#080b12"
  },
  twilight: {
    bg: "#110d1a",
    bg2: "#171122",
    bg3: "#241936",
    panel: "#1c142b",
    panel2: "#2b1d40",
    border: "#412c5c",
    text: "#f7f0ff",
    muted: "#a89ab8",
    accent: "#b88cff",
    accentText: "#160c24",
    newtab: "#110d1a"
  },
  sakura: {
    bg: "#190e14",
    bg2: "#21111a",
    bg3: "#321725",
    panel: "#28131e",
    panel2: "#3a1b29",
    border: "#512538",
    text: "#fff0f6",
    muted: "#b991a3",
    accent: "#ff8fba",
    accentText: "#250b16",
    newtab: "#190e14"
  },
  ocean: {
    bg: "#06141c",
    bg2: "#0a1c26",
    bg3: "#0f2833",
    panel: "#0c222c",
    panel2: "#12303c",
    border: "#1e4554",
    text: "#e6f7ff",
    muted: "#7aa0b0",
    accent: "#3ecfce",
    accentText: "#042028",
    newtab: "#06141c"
  },
  slate: {
    bg: "#12151a",
    bg2: "#181c24",
    bg3: "#222833",
    panel: "#1a1f28",
    panel2: "#252b36",
    border: "#343b4a",
    text: "#e8ecf4",
    muted: "#8b93a7",
    accent: "#9db0ff",
    accentText: "#10131a",
    newtab: "#12151a"
  },
  mono: {
    bg: "#0c0c0c",
    bg2: "#141414",
    bg3: "#1c1c1c",
    panel: "#161616",
    panel2: "#222",
    border: "#333",
    text: "#eee",
    muted: "#777",
    accent: "#ccc",
    accentText: "#111",
    newtab: "#0c0c0c"
  },
  rose: {
    bg: "#160c10",
    bg2: "#1e1016",
    bg3: "#2a1620",
    panel: "#24141c",
    panel2: "#321c28",
    border: "#4a2838",
    text: "#ffe8f0",
    muted: "#c090a0",
    accent: "#ff6b9d",
    accentText: "#2a0a14",
    newtab: "#160c10"
  },
  crimson: {
    bg: "#140808",
    bg2: "#1c0c0c",
    bg3: "#2a1010",
    panel: "#221010",
    panel2: "#321818",
    border: "#5a2020",
    text: "#ffd6d6",
    muted: "#c88888",
    accent: "#e63232",
    accentText: "#1a0505",
    newtab: "#140808"
  },
  amber: {
    bg: "#161008",
    bg2: "#1e160c",
    bg3: "#2a1e10",
    panel: "#241810",
    panel2: "#322414",
    border: "#5a3c18",
    text: "#fff0d6",
    muted: "#c8a878",
    accent: "#ff9f1a",
    accentText: "#1a1005",
    newtab: "#161008"
  },
  lime: {
    bg: "#0c1408",
    bg2: "#121c0c",
    bg3: "#1a2810",
    panel: "#162214",
    panel2: "#203018",
    border: "#3a5028",
    text: "#f0ffe6",
    muted: "#98b878",
    accent: "#8dff4d",
    accentText: "#0a1405",
    newtab: "#0c1408"
  },
  scarlet: {
    bg: "#1a0606",
    bg2: "#220a0a",
    bg3: "#321010",
    panel: "#281010",
    panel2: "#3a1414",
    border: "#6a2020",
    text: "#ffe0e0",
    muted: "#d09090",
    accent: "#ff2a2a",
    accentText: "#1a0505",
    newtab: "#1a0606"
  }
};
const DEFAULT_SETTINGS = {
  theme: "matte",
  transport: "libcurl",
  wispId: "default",
  wispCustom: "",
  launchMode: "manual",
  launchEmbed: "1",
  closeOriginOnBlank: false,
  backgroundUrl: "",
  adBlocker: true,
  maxLoadedTabs: 4,
  searchEngine: "google",
  wispId: "va1",
  customServers: [],
  lockUnload: false,
  confirmLeave: false,
  animEnabled: false,
  animStyle: "orbs",
  animSpeed: 1,
  animCount: 18,
  animSize: 1,
  animMediaSpeed: 1,
  animColorA: "#7aa2ff",
  animColorB: "#b88cff",
  timeFormat: "12",
  transportMigratedV2: true,
  saverMinutes: 0,
  saverDelay: "",
  saverEnabled: false,
  saverStyle: "orbs",
  saverUrl: "",
  saverColorA: "#7aa2ff",
  saverColorB: "#b88cff",
  saverSpeed: 1,
  saverCount: 18,
  saverSize: 1,
  saverMediaSpeed: 1,
  customOutline: "",
  colorMode: "dark",
  customPalette: null,
  ...THEMES.matte
};
const DEFAULT_PANIC = {
  key: "",
  code: "",
  url: "https://classroom.google.com"
};
let settings = {
  ...DEFAULT_SETTINGS
};
let profile = {
  name: "",
  password: ""
};
let welcomeClockTimer = null;
let panic = {
  ...DEFAULT_PANIC
};
let bookmarks = [];
let visitHistory = [];
let cloak = {
  title: "Veil",
  icon: FAVI
};
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let bindingPanic = false;
const COOKIE = {
  consent: false,
  set(value, extra, other = 365) {
    if (!this.consent) {
      return;
    }
    try {
      const part = new Date(Date.now() + other * 86400000).toUTCString();
      document.cookie = encodeURIComponent(value) + "=" + encodeURIComponent(extra) + "; expires=" + part + "; path=/; SameSite=Lax";
    } catch (err) {}
    try {
      localStorage.setItem("veil_c_" + value, extra);
    } catch (err) {}
  },
  get(value) {
    try {
      const child = encodeURIComponent(value) + "=";
      for (const word of document.cookie.split(";")) {
        const icon = word.trim();
        if (icon.startsWith(child)) {
          return decodeURIComponent(icon.slice(child.length));
        }
      }
    } catch (err) {}
    try {
      return localStorage.getItem("veil_c_" + value);
    } catch (err) {}
    return null;
  }
};
const STORAGE = {
  bookmarks: "veil_bookmarks",
  settings: "veil_settings",
  cloak: "veil_cloak",
  panic: "veil_panic",
  profile: "veil_profile",
  history: "veil_history"
};
function uid() {
  return "tab_" + Date.now().toString(36) + "_" + (++tabCounter).toString(36);
}
function escapeHTML(value2) {
  const wrap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return String(value2 ?? "").replace(/[&<>"']/g, function (value) {
    return wrap[value];
  });
}
function getTab(value2 = activeTabId) {
  return tabs.find(value => value.id === value2) || null;
}
function getActiveTab() {
  return getTab();
}
function isBookmarked(value2) {
  return bookmarks.some(value => value.url === value2);
}
function faviconFor(value) {
  try {
    const extra = new URL(value).hostname;
    return "https://www.google.com/s2/favicons?sz=32&domain=" + encodeURIComponent(extra);
  } catch {
    return FAVI;
  }
}
function save() {
  if (!COOKIE.consent) {
    return;
  }
  try {
    const other = JSON.stringify(bookmarks);
    const detail = JSON.stringify(settings);
    const source = JSON.stringify(cloak);
    const target = JSON.stringify(panic);
    const reason = JSON.stringify(visitHistory.slice(0, 200));
    COOKIE.set(STORAGE.bookmarks, other);
    COOKIE.set(STORAGE.settings, detail);
    COOKIE.set(STORAGE.cloak, source);
    COOKIE.set(STORAGE.panic, target);
    COOKIE.set(STORAGE.history, reason);
    try {
      localStorage.setItem(STORAGE.bookmarks, other);
      localStorage.setItem(STORAGE.settings, detail);
      localStorage.setItem(STORAGE.cloak, source);
      localStorage.setItem(STORAGE.panic, target);
      localStorage.setItem(STORAGE.history, reason);
    } catch (err) {}
  } catch (err) {
    console.warn("save failed", err);
  }
}
function loadProfile() {
  try {
    const note = localStorage.getItem(STORAGE.profile) || COOKIE.get(STORAGE.profile);
    if (note) {
      profile = {
        ...profile,
        ...JSON.parse(note)
      };
    }
  } catch {}
}
function saveProfile() {
  const icon = JSON.stringify({
    name: profile.name || "",
    password: profile.password || "",
    avatar: profile.avatar || ""
  });
  try {
    localStorage.setItem(STORAGE.profile, icon);
  } catch (err) {}
  try {
    if (COOKIE.consent && icon.length < 3800) {
      COOKIE.set(STORAGE.profile, icon);
    }
  } catch (err) {}
}
function migrateSettings() {
  if (!settings.wispId || settings.wispId === "default" || settings.wispId === "custom") {
    settings.wispId = "va1";
  }
  if (!SEARCH_ENGINES[settings.searchEngine]) {
    settings.searchEngine = "google";
  }
  if (!Array.isArray(settings.customServers)) {
    settings.customServers = [];
  }
  if (settings.animCount == null) {
    settings.animCount = 18;
  }
  if (settings.animSize == null) {
    settings.animSize = 1;
  }
  if (settings.timeFormat !== "12" && settings.timeFormat !== "24") {
    settings.timeFormat = "12";
  }
  if (settings.saverMinutes == null || !Number.isFinite(Number(settings.saverMinutes))) {
    settings.saverMinutes = 0;
  }
  settings.saverMinutes = Number(settings.saverMinutes) || 0;
  if (!["orbs", "stars", "constellation", "rain", "custom"].includes(settings.saverStyle)) {
    settings.saverStyle = "orbs";
  }
  if (!["orbs", "stars", "constellation", "rain", "custom"].includes(settings.animStyle)) {
    settings.animStyle = "orbs";
  }
  if (typeof settings.backgroundUrl !== "string") {
    settings.backgroundUrl = "";
  }
  if (settings.animMediaSpeed == null || !Number.isFinite(Number(settings.animMediaSpeed))) {
    settings.animMediaSpeed = 1;
  }
  if ((settings.backgroundUrl || "").trim() && !settings.animEnabled) {
    settings.animStyle = "custom";
    settings.animEnabled = true;
  }
  if (typeof settings.saverUrl !== "string") {
    settings.saverUrl = "";
  }
  if (typeof settings.customOutline !== "string") {
    settings.customOutline = "";
  }
  if (settings.colorMode !== "dark") {
    settings.colorMode = "dark";
  }
  if (typeof settings.saverDelay !== "string") {
    settings.saverDelay = "";
  }
  if (!settings.saverDelay && Number(settings.saverMinutes) > 0) {
    settings.saverDelay = String(Number(settings.saverMinutes)) + "m";
  }
  if (typeof settings.saverEnabled !== "boolean") {
    settings.saverEnabled = !!parseVeilDuration(settings.saverDelay);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(settings.saverColorA || "")) {
    settings.saverColorA = "#7aa2ff";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(settings.saverColorB || "")) {
    settings.saverColorB = "#b88cff";
  }
  if (!Number.isFinite(Number(settings.saverSpeed))) {
    settings.saverSpeed = 1;
  }
  if (!Number.isFinite(Number(settings.saverCount))) {
    settings.saverCount = 18;
  }
  if (!Number.isFinite(Number(settings.saverSize))) {
    settings.saverSize = 1;
  }
  if (!Number.isFinite(Number(settings.saverMediaSpeed))) {
    settings.saverMediaSpeed = 1;
  }
  settings.saverSpeed = Math.max(0.25, Math.min(2.5, Number(settings.saverSpeed) || 1));
  settings.saverCount = Math.max(4, Math.min(80, Math.round(Number(settings.saverCount) || 18)));
  settings.saverSize = Math.max(0.4, Math.min(2.5, Number(settings.saverSize) || 1));
  settings.saverMediaSpeed = Math.max(0.25, Math.min(3, Number(settings.saverMediaSpeed) || 1));
  if (settings.customPalette && typeof settings.customPalette !== "object") {
    settings.customPalette = null;
  }
  if (settings.theme === "custom" && !settings.customPalette) {
    settings.customPalette = {
      bg: settings.bg,
      panel: settings.panel,
      accent: settings.accent,
      text: settings.text,
      outline: settings.customOutline || settings.border || ""
    };
  }
  if (settings.launchMode !== "auto" && settings.launchMode !== "manual") {
    settings.launchMode = "manual";
  }
  if (settings.transport !== "libcurl" && settings.transport !== "epoxy") {
    settings.transport = "libcurl";
  }
  if (!settings.transportMigratedV2) {
    settings.transport = "libcurl";
    settings.transportMigratedV2 = true;
  }
  if (!settings.theme || !THEMES[settings.theme]) {
    settings.theme = "matte";
    Object.assign(settings, THEMES.matte);
  }
}
function loadSavedData() {
  loadProfile();
  try {
    const kind = COOKIE.get(STORAGE.bookmarks) || localStorage.getItem(STORAGE.bookmarks);
    const mode = COOKIE.get(STORAGE.settings) || localStorage.getItem(STORAGE.settings);
    const force = COOKIE.get(STORAGE.cloak) || localStorage.getItem(STORAGE.cloak);
    const immediate = COOKIE.get(STORAGE.panic) || localStorage.getItem(STORAGE.panic);
    if (kind) {
      bookmarks = JSON.parse(kind) || [];
    }
    if (mode) {
      settings = {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(mode)
      };
    }
    migrateSettings();
    if (force) {
      cloak = {
        ...cloak,
        ...JSON.parse(force)
      };
    }
    if (immediate) {
      panic = {
        ...DEFAULT_PANIC,
        ...JSON.parse(immediate)
      };
    }
    try {
      const href = COOKIE.get(STORAGE.history) || localStorage.getItem(STORAGE.history);
      if (href) {
        visitHistory = JSON.parse(href) || [];
      }
    } catch {}
  } catch (err) {
    console.warn("load failed", err);
  }
  try {
    paintEngineStatus();
  } catch (err) {}
}
function cssHexToRgb(value2) {
  let color = String(value2 || "").trim().replace("#", "");
  if (color.length === 3) {
    color = color.split("").map(value => value + value).join("");
  }
  const hex = parseInt(color, 16);
  if (!Number.isFinite(hex) || color.length !== 6) {
    return {
      r: 16,
      g: 16,
      b: 16
    };
  }
  return {
    r: hex >> 16 & 255,
    g: hex >> 8 & 255,
    b: hex & 255
  };
}
function rgbToHex(value2, extra, other) {
  const part = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return "#" + part(value2) + part(extra) + part(other);
}
function mixHex(value, extra, other) {
  const result = cssHexToRgb(value);
  const ok = cssHexToRgb(extra);
  const ms = Math.max(0, Math.min(1, other));
  return rgbToHex(result.r + (ok.r - result.r) * ms, result.g + (ok.g - result.g) * ms, result.b + (ok.b - result.b) * ms);
}
function relLuma(value2) {
  const {
    r: output,
    g: ev,
    b: handler
  } = cssHexToRgb(value2);
  const nodes = value => {
    const blob = value / 255;
    if (blob <= 0.03928) {
      return blob / 12.92;
    } else {
      return Math.pow((blob + 0.055) / 1.055, 2.4);
    }
  };
  return nodes(output) * 0.2126 + nodes(ev) * 0.7152 + nodes(handler) * 0.0722;
}
function channelDistance(value, extra) {
  const chunk = cssHexToRgb(value);
  const bits = cssHexToRgb(extra);
  return Math.abs(chunk.r - bits.r) + Math.abs(chunk.g - bits.g) + Math.abs(chunk.b - bits.b);
}
function outlineColor(value) {
  const delay = relLuma(value) > 0.5;
  const stamp = delay ? "#000000" : "#ffffff";
  let payload = mixHex(value, stamp, delay ? 0.22 : 0.28);
  if (channelDistance(payload, value) < 32) {
    payload = mixHex(value, stamp, 0.45);
  }
  return payload;
}
function contrastRatio(value, extra) {
  const state = Math.max(relLuma(value), relLuma(extra));
  const current = Math.min(relLuma(value), relLuma(extra));
  return (state + 0.05) / (current + 0.05);
}
function bestInk(value) {
  if (relLuma(value) > 0.58) {
    return "#141414";
  } else {
    return "#f4f4f4";
  }
}
function ensureContrast(value, extra, other) {
  if (contrastRatio(value, extra) >= other) {
    return value;
  }
  return bestInk(extra);
}
function deriveCustomSurfaces() {
  if (!settings || settings.theme !== "custom") {
    return;
  }
  const base = settings.bg || "#101010";
  const full = settings.panel || "#181818";
  let short = settings.text || "#f2f2f2";
  let line = settings.accent || "#ffffff";
  short = ensureContrast(short, base, 4.2);
  if (contrastRatio(short, full) < 3) {
    short = bestInk(full);
  }
  if (contrastRatio(line, full) < 1.45 && contrastRatio(line, base) < 1.45) {
    line = mixHex(line, bestInk(full), 0.62);
  }
  settings._ink = short;
  settings._accentDraw = line;
  settings.bg2 = mixHex(base, full, 0.7);
  settings.bg3 = mixHex(full, short, relLuma(full) > 0.55 ? 0.06 : 0.1);
  settings.panel2 = mixHex(full, short, relLuma(full) > 0.55 ? 0.08 : 0.14);
  settings.border = /^#[0-9a-fA-F]{6}$/.test(settings.customOutline || "") ? settings.customOutline : outlineColor(full);
  if (contrastRatio(settings.border, full) < 1.15) {
    settings.border = outlineColor(full);
  }
  settings.muted = mixHex(short, base, 0.42);
  if (contrastRatio(settings.muted, full) < 2) {
    settings.muted = mixHex(short, full, 0.38);
  }
  settings.newtab = base;
  settings.accentText = relLuma(line) > 0.62 ? "#141414" : "#f7f7f7";
}
function colorfulHex(value) {
  const {
    r: letter,
    g: code,
    b: hash
  } = cssHexToRgb(value);
  const sign = Math.max(letter, code, hash);
  const secret = Math.min(letter, code, hash);
  const addr = relLuma(value);
  return sign - secret > 28 && addr > 0.05 && addr < 0.95;
}
function toLightPalette(value) {
  const link = value.accent || "";
  const href = value.bg || "";
  const file = colorfulHex(link) ? link : colorfulHex(href) ? mixHex(href, "#ffffff", 0.62) : "";
  const blob = file ? mixHex("#ffffff", file, 0.16) : "#e8eaed";
  const image = file ? mixHex("#ffffff", file, 0.14) : "#f1f3f4";
  const canvas = file ? mixHex("#ffffff", file, 0.12) : "#f8f9fa";
  const ctx = file ? mixHex("#ffffff", file, 0.09) : "#f8f9fa";
  const width = file ? mixHex("#ffffff", file, 0.14) : "#e8eaed";
  let height = file ? mixHex("#ffffff", file, 0.32) : "#dadce0";
  if (channelDistance(height, canvas) < 18) {
    height = mixHex("#ffffff", file || "#5f6368", 0.28);
  }
  const size = "#202124";
  const ratio = file ? mixHex("#5f6368", file, 0.22) : "#5f6368";
  let speed = colorfulHex(link) ? link : "#3c4043";
  if (relLuma(speed) > 0.82) {
    speed = mixHex(speed, "#202124", 0.72);
  }
  const colorA = relLuma(speed) > 0.62 ? "#202124" : "#ffffff";
  return {
    bg: blob,
    bg2: image,
    bg3: ctx,
    panel: canvas,
    panel2: width,
    border: height,
    text: size,
    muted: ratio,
    accent: speed,
    accentText: colorA,
    newtab: "#ffffff"
  };
}
function applyCSSVariables() {
  if (settings.theme === "custom") {
    deriveCustomSurfaces();
  }
  const colorB = ["bg", "bg2", "bg3", "panel", "panel2", "border", "text", "muted", "accent", "accentText", "newtab"];
  const themeName = {};
  colorB.forEach(value => {
    themeName[value] = settings[value];
  });
  if (settings.theme === "custom") {
    if (settings._ink) {
      themeName.text = settings._ink;
    }
    if (settings._accentDraw) {
      themeName.accent = settings._accentDraw;
    }
    themeName.accentText = relLuma(themeName.accent) > 0.62 ? "#141414" : "#f7f7f7";
  }
  const setting = themeName;
  const profile2 = document.documentElement;
  colorB.forEach(value => profile2.style.setProperty("--" + value, setting[value]));
  const cloak2 = relLuma(settings.panel || "#181818");
  const panic2 = relLuma(settings.bg || settings.newtab || "#101010");
  profile2.style.setProperty("--icon-invert", cloak2 > 0.62 ? "0" : "1");
  profile2.style.setProperty("--page-icon-invert", panic2 > 0.62 ? "0" : "1");
  profile2.dataset.mode = "dark";
}
function isVideoUrl(value) {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(value || "");
}
const homeFrameState = new WeakMap();
function stopHomeFrames(value) {
  const game = homeFrameState.get(value);
  if (!game) {
    return;
  }
  game.token++;
  if (game.timer) {
    clearTimeout(game.timer);
    game.timer = null;
  }
}
function playHomeAnimated(value2, extra) {
  stopHomeFrames(value2);
  const message = {
    token: 1,
    timer: null
  };
  homeFrameState.set(value2, message);
  let canvasNewtabRaster = value2.querySelector("canvas.newtab-raster");
  if (!canvasNewtabRaster) {
    canvasNewtabRaster = document.createElement("canvas");
    canvasNewtabRaster.className = "newtab-raster";
    value2.insertBefore(canvasNewtabRaster, value2.firstChild);
  }
  const group = () => {
    if (message.token !== homeFrameState.get(value2)?.token) {
      return;
    }
    canvasNewtabRaster.remove();
    const canvas = document.createElement("img");
    canvas.className = "newtab-media-img";
    canvas.src = extra;
    canvas.alt = "";
    value2.insertBefore(canvas, value2.firstChild);
  };
  if (typeof ImageDecoder === "undefined") {
    group();
    return;
  }
  const pending = /\.webp(\?|#|$)/i.test(extra) ? "image/webp" : "image/gif";
  const invite = message.token;
  fetch(extra).then(value => {
    if (!value.ok) {
      throw new Error("miss");
    }
    return value.arrayBuffer();
  }).then(async value => {
    if (invite !== homeFrameState.get(value2)?.token) {
      return;
    }
    const imageDecoder = new ImageDecoder({
      data: value,
      type: pending
    });
    await imageDecoder.tracks.ready;
    const secret = imageDecoder.tracks.selectedTrack;
    const addr = Math.max(1, secret.frameCount || 1);
    if (addr < 2) {
      throw new Error("still");
    }
    const port = canvasNewtabRaster.getContext("2d");
    let link = 0;
    const href = async () => {
      if (invite !== homeFrameState.get(value2)?.token || !canvasNewtabRaster.isConnected) {
        return;
      }
      try {
        const clientId = await imageDecoder.decode({
          frameIndex: link
        });
        const path = clientId.image;
        const body = value2.getBoundingClientRect();
        const token = Math.max(1, Math.floor(body.width || value2.clientWidth || 1));
        const user = Math.max(1, Math.floor(body.height || value2.clientHeight || 1));
        if (canvasNewtabRaster.width !== token) {
          canvasNewtabRaster.width = token;
        }
        if (canvasNewtabRaster.height !== user) {
          canvasNewtabRaster.height = user;
        }
        port.drawImage(path, 0, 0, token, user);
        const data = path.duration || 100000;
        if (path.close) {
          path.close();
        }
        const msg = Math.max(0.25, Math.min(3, Number(settings.animMediaSpeed) || 1));
        link = (link + 1) % addr;
        message.timer = setTimeout(href, Math.max(16, data / 1000 / msg));
      } catch (err) {
        group();
      }
    };
    href();
  }).catch(() => group());
}
function applyNewTabBackground() {
  const admin = !!settings.animEnabled && settings.animStyle === "custom";
  const session = admin ? (settings.backgroundUrl || "").trim() : "";
  const workerUrl = Math.max(0.25, Math.min(3, Number(settings.animMediaSpeed) || 1));
  document.querySelectorAll(".newtab-page").forEach(value2 => {
    stopHomeFrames(value2);
    value2.querySelectorAll(".newtab-media, .newtab-media-img, .newtab-raster").forEach(value => value.remove());
    value2.style.backgroundImage = "none";
    if (!session) {
      return;
    }
    if (isVideoUrl(session)) {
      const file = document.createElement("video");
      file.className = "newtab-media";
      file.src = session;
      file.autoplay = true;
      file.loop = true;
      file.muted = true;
      file.playsInline = true;
      file.setAttribute("playsinline", "");
      const blob = () => {
        try {
          file.playbackRate = Math.max(0.25, Math.min(3, Number(settings.animMediaSpeed) || 1));
        } catch (err) {}
      };
      file.addEventListener("loadedmetadata", blob);
      file.addEventListener("play", blob);
      value2.insertBefore(file, value2.firstChild);
      file.play().then(blob).catch(() => {});
    } else if (/\.(gif|webp)(\?|#|$)/i.test(session)) {
      playHomeAnimated(value2, session);
    } else {
      const color = document.createElement("img");
      color.className = "newtab-media-img";
      color.src = session;
      color.alt = "";
      value2.insertBefore(color, value2.firstChild);
    }
  });
  workerUrl;
}
function imgIcon(value) {
  return "<img src=\"" + IMG + value + "\" alt=\"\">";
}
function searchPrefix() {
  const google = settings && settings.searchEngine || "google";
  const value = SEARCH_ENGINES[google] || SEARCH_ENGINES.google;
  return value.prefix;
}
function normalizeUrl(value) {
  let other = String(value || "").trim();
  if (!other) {
    return null;
  }
  other = unwrapProxyUrl(other) || other;
  if (/^https?:\/\//i.test(other)) {
    return other;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(other)) {
    return other;
  }
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(other)) {
    return "https://" + other;
  }
  return searchPrefix() + encodeURIComponent(other);
}
function unwrapProxyUrl(value) {
  if (!value || value === "about:blank") {
    return value;
  }
  try {
    let locked = String(value);
    const show = location.origin;
    const email = "/service/";
    for (let row = 0; row < 8; row++) {
      let width;
      try {
        width = new URL(locked, show);
      } catch (err) {
        break;
      }
      const height = width.pathname.indexOf(email);
      if (height === -1) {
        break;
      }
      if (width.origin !== show && !/github\.io$/i.test(width.hostname)) {
        break;
      }
      let size = width.pathname.slice(height + email.length);
      if (width.search) {
        size += width.search;
      }
      if (width.hash) {
        size += width.hash;
      }
      let ratio = size;
      try {
        ratio = decodeURIComponent(size);
      } catch (err) {}
      if (!/^https?:\/\//i.test(ratio) || ratio === locked) {
        break;
      }
      locked = ratio;
    }
    if (/^https?:\/\//i.test(locked)) {
      try {
        const uRL = new URL(locked);
        if (uRL.origin === show && uRL.pathname.indexOf(email) !== -1) {
          return value;
        }
      } catch (err) {}
      return locked;
    }
  } catch (err) {}
  return value;
}
function openInVeilTab(value) {
  const target = normalizeUrl(value);
  if (!target) {
    return;
  }
  const reason = getActiveTab();
  if (reason && !reason.isAdmin) {
    activeTabId = reason.id;
    navigate(target);
    return;
  }
  createTab(true);
  navigate(target);
}
function titleIsJustHost(value, extra) {
  try {
    const password = new URL(extra).hostname.replace(/^www\./, "").toLowerCase();
    const response = String(value || "").trim().toLowerCase().replace(/^www\./, "");
    return !!response && response === password;
  } catch {
    return false;
  }
}
function readFrameTitle(value) {
  try {
    return String(value && value.contentDocument && value.contentDocument.title || "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
function syncStoredTitle(value2) {
  if (!value2 || !value2.url || !value2.title || value2.title === "Loading") {
    return;
  }
  let immediate = false;
  const locked = visitHistory.find(value => value.url === value2.url);
  if (locked && locked.title !== value2.title) {
    locked.title = value2.title;
    immediate = true;
  }
  const show = bookmarks.find(value => value.url === value2.url);
  if (show && (show.title === "Loading" || titleIsJustHost(show.title, value2.url) || show.title === value2.url)) {
    show.title = value2.title;
    immediate = true;
  }
  if (immediate) {
    save();
  }
}
function applyRealPageTitle(value, extra, other) {
  const clientId = readFrameTitle(extra);
  if (!clientId || clientId === "Loading") {
    return false;
  }
  if (!other && titleIsJustHost(clientId, value.url)) {
    return false;
  }
  if (value.title === clientId) {
    return true;
  }
  value.title = clientId.slice(0, 180);
  syncStoredTitle(value);
  renderTabs();
  return true;
}
function watchFrameTitle(value, extra) {
  if (!extra || extra.__veilTitleWatch) {
    return;
  }
  extra.__veilTitleWatch = true;
  const token = () => {
    if (!extra.isConnected) {
      return;
    }
    const colorB = !!value._titleWait && !!(Date.now() - value._titleWait > 6000);
    applyRealPageTitle(value, extra, colorB);
  };
  const user = () => {
    try {
      if (extra.__veilTitleObs) {
        extra.__veilTitleObs.disconnect();
        extra.__veilTitleObs = null;
      }
    } catch {}
    token();
    try {
      const canvas = extra.contentDocument;
      if (!canvas || extra.__veilTitleObs) {
        return;
      }
      const mutationObserver = new MutationObserver(token);
      if (canvas.head) {
        mutationObserver.observe(canvas.head, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
      const title = canvas.querySelector("title");
      if (title) {
        mutationObserver.observe(title, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }
      extra.__veilTitleObs = mutationObserver;
    } catch {}
  };
  extra.addEventListener("load", user);
  const data = setInterval(() => {
    if (!extra.isConnected) {
      clearInterval(data);
      return;
    }
    token();
  }, 700);
}
function showPageLoader(value) {
  const isErr = document.querySelector(".page[data-page-id=\"" + value.id + "\"]");
  if (!isErr) {
    return;
  }
  let scopePageLoader = isErr.querySelector(":scope > .page-loader");
  if (!scopePageLoader) {
    scopePageLoader = document.createElement("div");
    scopePageLoader.className = "page-loader";
    scopePageLoader.innerHTML = "<div class=\"page-loader-card\"><div class=\"page-loader-mark\"><img src=\"" + FAVI + "\" alt=\"\"></div><div class=\"page-loader-prompt\">Loading</div><div class=\"page-loader-bar\" aria-hidden=\"true\"><i></i></div><button type=\"button\" class=\"page-loader-skip\">Skip</button></div>";
    scopePageLoader.querySelector(".page-loader-skip").addEventListener("click", () => {
      scopePageLoader.classList.remove("on");
    });
    isErr.appendChild(scopePageLoader);
  }
  const maxAge = (value._loadGen || 0) + 1;
  value._loadGen = maxAge;
  value._titleWait = Date.now();
  scopePageLoader.dataset.gen = String(maxAge);
  scopePageLoader.classList.add("on");
}
function finishPageLoader(value) {
  const id = value && document.querySelector(".page[data-page-id=\"" + value.id + "\"]");
  if (!id) {
    return;
  }
  const scopePageLoader = id.querySelector(":scope > .page-loader");
  if (!scopePageLoader) {
    return;
  }
  if (String(value._loadGen || "") !== scopePageLoader.dataset.gen) {
    return;
  }
  let el = null;
  try {
    const clientId = value.engineFrame && (value.engineFrame.element || value.engineFrame.frame || value.engineFrame);
    el = clientId && clientId.contentDocument;
  } catch {}
  if (el && el.readyState && el.readyState !== "complete") {
    if (!el.__veilReadyWait) {
      el.__veilReadyWait = true;
      el.addEventListener("readystatechange", () => {
        if (el.readyState === "complete") {
          finishPageLoader(value);
        }
      });
    }
    return;
  }
  scopePageLoader.classList.remove("on");
}
function trapFrameExternalOpens(value2, extra2) {
  if (!extra2) {
    return;
  }
  const list = () => {
    try {
      const height = extra2.contentWindow;
      const size = extra2.contentDocument;
      if (!height || !size) {
        return;
      }
      try {
        height.open = function (value) {
          try {
            if (value && String(value) !== "about:blank") {
              const extra = String(value);
              openInVeilTab(unwrapProxyUrl(extra) || extra);
            }
          } catch (err) {}
          return null;
        };
      } catch (err) {}
      if (size.__veilTrapClicks) {
        return;
      }
      size.__veilTrapClicks = true;
      size.addEventListener("click", value => {
        try {
          const name2 = value.target && value.target.closest && value.target.closest("a");
          if (!name2) {
            return;
          }
          const maxAge = (name2.getAttribute("target") || "").toLowerCase();
          if (maxAge === "_blank" || maxAge === "_new" || maxAge === "_parent" || maxAge === "_top") {
            const note = name2.href || name2.getAttribute("href");
            if (!note || note.startsWith("javascript:")) {
              return;
            }
            value.preventDefault();
            value.stopPropagation();
            openInVeilTab(unwrapProxyUrl(note) || note);
          }
        } catch (err) {}
      }, true);
    } catch (err) {}
  };
  extra2.addEventListener("load", list);
  try {
    list();
  } catch (err) {}
}
function bindFrameEvents(value2, extra) {
  const raw = extra.element || extra.frame || extra;
  const found = value => {
    let setting = value && (value.url || value.detail && value.detail.url) || "";
    if (!setting || setting === "about:blank") {
      return;
    }
    setting = unwrapProxyUrl(setting) || setting;
    value2.url = setting;
    value2.newTab = false;
    value2.favicon = faviconFor(setting);
    if (!Array.isArray(value2.history)) {
      value2.history = [];
    }
    if (value2.history[value2.historyIndex] !== setting) {
      if (value2.historyIndex < value2.history.length - 1) {
        value2.history = value2.history.slice(0, value2.historyIndex + 1);
      }
      value2.history.push(setting);
      value2.historyIndex = value2.history.length - 1;
    }
    applyRealPageTitle(value2, raw);
    if (!value2.title || titleIsJustHost(value2.title, setting)) {
      value2.title = "Loading";
    }
    if (value2.id === activeTabId) {
      renderTabs();
      renderToolbar();
    } else {
      renderTabs();
    }
  };
  if (typeof extra.addEventListener === "function") {
    extra.addEventListener("urlchange", found);
  }
  if (raw && raw.addEventListener) {
    raw.addEventListener("load", () => {
      try {
        const other = raw.contentWindow && raw.contentWindow.location && raw.contentWindow.location.href;
        if (other) {
          found({
            url: other
          });
        }
      } catch {}
    });
    trapFrameExternalOpens(value2, raw);
    watchFrameTitle(value2, raw);
    raw.addEventListener("load", () => {
      try {
        if (raw.__veilTitleObs) {
          raw.__veilTitleObs.disconnect();
          raw.__veilTitleObs = null;
        }
      } catch {}
      finishPageLoader(value2);
      applyRealPageTitle(value2, raw);
    });
  }
}
async function createEngineFrame(value, extra) {
  if (!engineReady) {
    await initEngine();
  }
  if (!engineReady) {
    extra.innerHTML = "<div class=\"engine-error\"><div class=\"engine-error-box\"><h2>Browser engine unavailable</h2><p>Check scramjet/, baremux/, epoxy/, libcurl/, and sw.js.</p><button data-retry-engine>Retry</button></div></div>";
    extra.querySelector("[data-retry-engine]").onclick = async () => {
      engineInitPromise = null;
      extra.innerHTML = "";
      await createEngineFrame(value, extra);
    };
    return;
  }
  try {
    if (value.engineFrame) {
      const profile2 = value.engineFrame.element || value.engineFrame.frame || value.engineFrame;
      if (profile2 && profile2.isConnected) {
        return;
      }
    }
    let path = engineController && engineController.createFrame && engineController.createFrame();
    if (!path) {
      throw new Error("Scramjet frame API unavailable.");
    }
    const body = path.element || path.frame || path;
    if (body.classList) {
      body.classList.add("engine-frame");
    }
    if (body.style) {
      body.style.width = "100%";
      body.style.height = "100%";
      body.style.border = "0";
      body.style.background = "#fff";
    }
    try {
      body.setAttribute("allow", "fullscreen *; clipboard-read *; clipboard-write *; autoplay *; encrypted-media *; picture-in-picture *; payment *");
      body.removeAttribute("allowfullscreen");
      body.setAttribute("referrerpolicy", "no-referrer");
    } catch {}
    extra.innerHTML = "";
    extra.appendChild(body);
    value.engineFrame = path;
    bindFrameEvents(value, path);
    await goFrame(value, value.url);
  } catch (err) {
    console.error(err);
    finishPageLoader(value);
    extra.innerHTML = "<div class=\"engine-error\"><div class=\"engine-error-box\"><h2>Could not open this page</h2><p>" + escapeHTML(err.message) + "</p><button data-retry-engine>Retry</button></div></div>";
    const meta = extra.querySelector("[data-retry-engine]");
    if (meta) {
      meta.onclick = async () => {
        await reconnectTransport();
        extra.innerHTML = "";
        await createEngineFrame(value, extra);
      };
    }
  }
}
async function flipTransport() {
  settings.transport = settings.transport === "libcurl" ? "epoxy" : "libcurl";
  try {
    save();
  } catch (err) {}
  await reconnectTransport();
  return settings.transport;
}
async function goFrame(value2, extra) {
  const btn = value2.engineFrame;
  if (!btn || !extra) {
    return;
  }
  extra = unwrapProxyUrl(extra) || extra;
  value2.url = extra;
  value2.title = "Loading";
  showPageLoader(value2);
  try {
    renderTabs();
  } catch {}
  const html = async value => {
    const panic2 = value || extra;
    if (typeof btn.go === "function") {
      await btn.go(panic2);
    } else if (typeof btn.navigate === "function") {
      await btn.navigate(panic2);
    } else {
      const part = btn.element || btn.frame || btn;
      if (part instanceof HTMLIFrameElement) {
        part.src = SCRAMJET_PREFIX + encodeURIComponent(panic2);
      }
    }
  };
  const cls = value => /MuxTaskEnded|headers is not iterable|Invalid URL|Failed to fetch|network|Wisp|WebSocket|websocket did not open|tls handshake|UnexpectedEof|Hyper client|client error \(IO|SSL connect error|curl error 35/i.test(value);
  const style = () => {
    try {
      const ratio = btn.element || btn.frame || btn;
      const speed = ratio && ratio.contentDocument && ratio.contentDocument.body ? ratio.contentDocument.body.innerText : "";
      return cls(speed);
    } catch (err) {
      return false;
    }
  };
  try {
    await html(extra);
    await new Promise(value => setTimeout(value, 350));
    if (style()) {
      throw new Error("Wisp WebSocket failed to connect");
    }
  } catch (err2) {
    const tab = String(err2 && err2.message || err2);
    if (!cls(tab) && !style()) {
      console.warn(err2);
      return;
    }
    console.warn("[veil] navigation transport error, switching server...", tab);
    try {
      if (/websocket|wisp|hyper client|did not open/i.test(tab)) {
        settings.transport = "libcurl";
      }
      await useWorkingWisp();
      await applyMuxTransport();
      await html(extra);
    } catch (err) {
      console.warn("[veil] retry failed", err);
      const engineStatus = document.getElementById("engineStatus");
      if (engineStatus) {
        engineStatus.textContent = "Connection lost - try another proxy server";
      }
      finishPageLoader(value2);
    }
  }
}
function renderTabs() {
  const tabs2 = document.getElementById("tabs");
  const src = tabs.map(value => "<div class=\"tab " + (value.id === activeTabId ? "active " : "") + (value.animOpen ? "opening" : "") + "\" data-tab-id=\"" + value.id + "\"><div class=\"tab-icon\"><img src=\"" + escapeHTML(value.favicon || FAVI) + "\" alt=\"\">" + (value.isChat ? "<span class=\"chat-alert\" data-chat-alert></span>" : "") + "</div><div class=\"tab-title\">" + escapeHTML(value.title) + "</div><button class=\"tab-close\" data-close=\"" + value.id + "\" aria-label=\"Close\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></button></div>").join("");
  tabs2.innerHTML = src + "<button class=\"new-tab\" id=\"newTabBtn\" type=\"button\" aria-label=\"New tab\"><img src=\"" + IMG + "plus.svg\" alt=\"\"></button>";
  tabs.forEach(value => {
    value.animOpen = false;
  });
  tabs2.querySelectorAll(".tab").forEach(value2 => {
    value2.addEventListener("click", value => {
      if (value.target.closest(".tab-close")) {
        return;
      }
      switchTab(value2.dataset.tabId);
    });
  });
  tabs2.querySelectorAll("[data-close]").forEach(value2 => value2.addEventListener("click", value => {
    value.stopPropagation();
    closeTab(value2.dataset.close);
  }));
  const newTabBtn = document.getElementById("newTabBtn");
  if (newTabBtn) {
    newTabBtn.onclick = () => createTab(true);
  }
  requestAnimationFrame(() => {
    tabs2.scrollLeft = tabs2.scrollWidth;
  });
  try {
    paintChatAlerts();
  } catch (err) {}
}
function formatWelcomeClock(value2) {
  const query = value => String(value).padStart(2, "0");
  const res = query(value2.getMinutes());
  const req = query(value2.getSeconds());
  const rec = query(value2.getMonth() + 1) + "/" + query(value2.getDate()) + "/" + value2.getFullYear();
  const row = settings && settings.timeFormat === "24";
  let count;
  if (row) {
    count = query(value2.getHours()) + ":" + res + ":" + req;
  } else {
    let token = value2.getHours();
    const pM = token >= 12 ? "PM" : "AM";
    token = token % 12;
    if (token === 0) {
      token = 12;
    }
    count = token + ":" + res + ":" + req + " " + pM;
  }
  return {
    time: count,
    date: rec
  };
}
function welcomeHTML() {
  const guest = profile && profile.name ? profile.name : "guest";
  const {
    time: entry,
    date: meta
  } = formatWelcomeClock(new Date());
  return "<div class=\"welcome-bar\"><div class=\"welcome-line\">Welcome to Veil, " + escapeHTML(guest) + ".</div><div class=\"welcome-time\">It is currently <span data-welcome-time>" + entry + "</span> on <span data-welcome-date>" + meta + "</span>.</div></div>";
}
function startWelcomeClock() {
  if (welcomeClockTimer) {
    clearInterval(welcomeClockTimer);
  }
  const root = () => {
    const {
      time: game,
      date: room
    } = formatWelcomeClock(new Date());
    document.querySelectorAll("[data-welcome-time]").forEach(value => {
      value.textContent = game;
    });
    document.querySelectorAll("[data-welcome-date]").forEach(value => {
      value.textContent = room;
    });
  };
  root();
  welcomeClockTimer = setInterval(root, 1000);
}
function engineOptionsHTML() {
  const google = settings && settings.searchEngine || "google";
  return Object.values(SEARCH_ENGINES).map(value => "<option value=\"" + value.id + "\"" + (value.id === google ? " selected" : "") + ">" + value.name + "</option>").join("");
}
const HOME_DESIGN_W = 700;
const HOME_DESIGN_H = 640;
const homeScaleObservers = new WeakMap();
function fitHomeScale(value) {
  if (!value || !value.isConnected) {
    return;
  }
  const newtabStage = value.querySelector(".newtab-stage");
  const newtabOverlay = value.querySelector(".newtab-overlay");
  if (!newtabStage || !newtabOverlay || newtabStage.dataset.fitting === "1") {
    return;
  }
  newtabStage.dataset.fitting = "1";
  const icon = newtabStage.style.zoom;
  newtabStage.style.zoom = "1";
  newtabStage.style.margin = "0";
  newtabStage.style.transform = "none";
  const title = newtabStage.offsetWidth || HOME_DESIGN_W;
  const color = newtabStage.offsetHeight || HOME_DESIGN_H;
  const hex = getComputedStyle(newtabOverlay);
  const now = (parseFloat(hex.paddingLeft) || 0) + (parseFloat(hex.paddingRight) || 0);
  const left = (parseFloat(hex.paddingTop) || 0) + (parseFloat(hex.paddingBottom) || 0);
  const flag = Math.max(1, newtabOverlay.clientWidth - now);
  const part = Math.max(1, newtabOverlay.clientHeight - left);
  let child = Math.min(flag / title, part / color);
  if (!isFinite(child) || child <= 0) {
    child = 1;
  }
  child = Math.min(1, child);
  const label = String(Math.round(child * 1000) / 1000);
  newtabStage.style.zoom = label;
  newtabStage.style.setProperty("--home-scale", label);
  newtabStage.dataset.fitting = "0";
  if (icon === label) {
    return;
  }
}
function observeHomeScale(value) {
  fitHomeScale(value);
  if (homeScaleObservers.has(value)) {
    return;
  }
  const newtabPage = value.classList.contains("newtab-page") ? value : value.querySelector(".newtab-page");
  if (!newtabPage || typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", () => fitHomeScale(value));
    return;
  }
  const resizeObserver = new ResizeObserver(() => fitHomeScale(value));
  resizeObserver.observe(newtabPage);
  const newtabOverlay = value.querySelector(".newtab-overlay");
  if (newtabOverlay) {
    resizeObserver.observe(newtabOverlay);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => fitHomeScale(value));
  }
  homeScaleObservers.set(value, resizeObserver);
  window.addEventListener("resize", () => fitHomeScale(value));
}
function homepageHTML(value) {
  return '<div class="newtab-page"><canvas class="home-fx" data-home-fx></canvas><div class="newtab-overlay">' + '<div class="newtab-stage">' + welcomeHTML() + '<div class="newtab-center">' + '<div class="veil-mark"><img src="' + FAVI + '" alt="Veil"></div>' + '<div class="newtab-title">Veil</div>' + '<div class="newtab-sub">Browse quietly. Stay undetected.</div>' + '<div class="search-row"><div class="search-box" style="width:100%"><span class="home-search-icon"></span>' + '<input class="newtab-search" data-page="' + value + '" placeholder="Search or enter a site..." autocomplete="off" spellcheck="false">' + '</div></div>' + '<div class="quick-links">' + '<button class="quick-link" title="X" data-url="https://x.com">' + imgIcon("x.svg") + '</button>' + '<button class="quick-link" title="Discord" data-url="https://discord.com/">' + imgIcon("discord.svg") + '</button>' + '<button class="quick-link" title="Reddit" data-url="https://www.reddit.com/">' + imgIcon("reddit.svg") + '</button>' + '<button class="quick-link" title="GeForce NOW" data-url="https://play.geforcenow.com/mall">' + imgIcon("nvidia.svg") + '</button>' + '</div>' + '<div class="quick-links row2">' + '<button class="quick-link" title="Games" data-games="1">' + imgIcon("games.svg") + '</button>' + '<button class="quick-link" title="Chat" data-chat="1">' + imgIcon("chat.svg") + '<span class="chat-alert" data-chat-alert></span></button>' + '<button class="quick-link soon" title="AI (soon)" data-soon="1">' + imgIcon("ai.svg") + '</button>' + '<button class="quick-link soon" title="Toolbox (soon)" data-soon="1">' + imgIcon("util.svg") + '</button>' + '</div>' + '<button class="launch-btn" id="launchOptionsBtn" type="button">Launch Options...</button>' + '</div></div></div>' + '<div class="time-bar" id="timeBar"><div class="time-dev">Site under development. Bugs may occur.</div>' + '<div class="time-cluster"><span class="time-batt"><span class="time-battery" hidden><img alt="" width="18" height="18"><span class="time-battery-pct"></span></span></span>' + '<span class="time-left">Time Remaining: …</span><span class="time-os"></span></div></div></div>';
}
const SETTINGS_INFO = {
  theme: {
    title: "Site theme colors",
    body: "Changes Veil’s colors (toolbars and menus only — not the sites you visit). Custom works like the other themes: pick it to use your saved colors, then Apply colors to update them."
  },
  appearance: {
    title: "Appearance",
    body: "Light mode keeps your theme’s color as a light tint on the toolbars, like Chrome, and leaves the page white. Turn it off to go back to the dark version."
  },
  background: {
    title: "Home page background",
    body: "Puts your own image, GIF, or video on the home page. Leave blank for a plain background."
  },
  avatar: {
    title: "Profile picture",
    body: "Shown in Settings and on the lock screen. Veil does not ask for this when you create an account. If you skip it, the default picture is used."
  },
  time24: {
    title: "24-hour time",
    body: "Shows the home-page clock as 24-hour time instead of AM/PM."
  },
  animations: {
    title: "Live wallpaper",
    body: "Adds a moving background on the home page. Pick a Veil animation and set its speed, amount, size, and colors, or choose Custom URL for an image, GIF, WebP, or video. A speed slider appears for video, GIF, and WebP."
  },
  screensaver: {
    title: "Screen saver",
    body: "Turn the screen saver on, then type how long Veil should wait. Use the same time format as the admin panel: 30s, 5m, 2h, 1d, or combine them with semicolons like 1h;30m. You can also write 5 minutes or 2 hours. Pick a live wallpaper and set Color A and Color B, or choose Custom URL for an image, GIF, WebP, or video. Move the mouse or press a key and it fades away."
  },
  cloak: {
    title: "Tab cloak",
    body: "Changes the tab title and icon so Veil can look like another site (for example Google Drive)."
  },
  panic: {
    title: "Panic key",
    body: "Pick a key and a website. Press the key to jump there quickly (does not work while typing)."
  },
  aboutblank: {
    title: "About:blank launch",
    body: "Opens Veil in a blank browser page so the address bar stays empty. If unload is on, the original tab is wiped after launch and Veil only keeps running in the new page."
  },
  pagelock: {
    title: "Page lock",
    body: "When you lock Veil, also close open pages so others cannot see what you were viewing."
  },
  confirmleave: {
    title: "Leave warning",
    body: "Asks “are you sure?” before the browser tab is closed or refreshed."
  },
  search: {
    title: "Search engine",
    body: "Used when you type words instead of a full website address."
  },
  adblock: {
    title: "Ad blocker",
    body: "Hides many ads and trackers. Turn off if a site looks broken."
  },
  maxtabs: {
    title: "Loaded tabs at once",
    body: "How many tabs stay active at once. Lower numbers use less memory."
  },
  proxy: {
    title: "Proxy servers",
    body: "Servers Veil uses to load sites. Prefer green (fast). Try another if a page will not open."
  },
  messages: {
    title: "Messages",
    body: "Shows a red dot on the tab icon when a new message arrives. The dot stays off until this switch is on."
  },
  engine: {
    title: "Browser engine",
    body: "How Veil connects. Epoxy is the usual choice; try Libcurl if pages get stuck."
  },
  username: {
    title: "Change username",
    body: "Name shown in the home-page welcome message on this device."
  },
  password: {
    title: "Change password",
    body: "Password used to lock Veil on this device (not your email login)."
  },
  account: {
    title: "Account",
    body: "Signs you out on this device. You will need to log in again next time."
  },
  cleardata: {
    title: "Clear cookies & cache",
    body: "Clears saved data on this device and signs you out. Use if something is stuck."
  },
  reset: {
    title: "Factory reset",
    body: "Resets theme and browser options to the defaults."
  },
  admin: {
    title: "Admin",
    body: "Opens the admin panel to manage accounts. Requires the admin password."
  }
};
function showSettingsInfo(value2) {
  const ev = SETTINGS_INFO[value2];
  if (!ev) {
    return;
  }
  const modalOverlayVeilInfo = document.querySelector(".modal-overlay.veil-info");
  if (modalOverlayVeilInfo) {
    modalOverlayVeilInfo.remove();
  }
  const nodes = document.createElement("div");
  nodes.className = "modal-overlay veil-info";
  nodes.innerHTML = "<div class=\"modal-box info-modal\" role=\"dialog\" aria-modal=\"true\"><h2>" + escapeHTML(ev.title) + "</h2><p>" + escapeHTML(ev.body) + "</p><div class=\"modal-actions\"><button type=\"button\" class=\"primary-btn\" data-info-ok>Got it</button></div></div>";
  document.body.appendChild(nodes);
  const match = () => {
    try {
      nodes.remove();
    } catch (err) {}
  };
  nodes.querySelector("[data-info-ok]").onclick = match;
  nodes.onclick = value => {
    if (value.target === nodes) {
      match();
    }
  };
}
document.addEventListener("click", value => {
  const msg = value.target && value.target.closest && value.target.closest(".info-btn[data-info]");
  if (!msg) {
    return;
  }
  value.preventDefault();
  value.stopPropagation();
  showSettingsInfo(msg.getAttribute("data-info"));
});
function wireHome(value3, extra) {
  applyNewTabBackground();
  startWelcomeClock();
  observeHomeScale(value3);
  setupHomeFx(value3);
  value3.querySelectorAll(".newtab-search").forEach(value2 => {
    value2.addEventListener("keydown", value => {
      if (value.key === "Enter") {
        value.preventDefault();
        activeTabId = extra.id;
        const delay = value2.value;
        navigate(delay);
      }
    });
  });
  value3.querySelectorAll(".quick-link[data-url]").forEach(value2 => {
    value2.addEventListener("click", value => {
      value.preventDefault();
      activeTabId = extra.id;
      navigate(value2.getAttribute("data-url") || value2.dataset.url);
    });
  });
  value3.querySelectorAll(".quick-link[data-games]").forEach(value2 => {
    value2.addEventListener("click", value => {
      value.preventDefault();
      openGamesPage();
    });
  });
  value3.querySelectorAll(".quick-link[data-chat]").forEach(value2 => {
    value2.addEventListener("click", value => {
      value.preventDefault();
      openChatPage();
    });
  });
  const launchOptionsBtn = value3.querySelector("#launchOptionsBtn");
  if (launchOptionsBtn) {
    launchOptionsBtn.onclick = () => openLaunchModal();
  }
  try {
    paintChatAlerts();
  } catch (err) {}
}
function ensurePage(value) {
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return null;
  }
  let stamp = viewport.querySelector(".page[data-page-id=\"" + value.id + "\"]");
  if (!stamp) {
    stamp = document.createElement("section");
    stamp.className = "page";
    stamp.dataset.pageId = value.id;
    viewport.appendChild(stamp);
  }
  const payload = value.newTab && !stamp.querySelector(".newtab-page");
  if (payload) {
    stamp.innerHTML = homepageHTML(value.id);
    wireHome(stamp, value);
  } else if (!value.newTab && !value.isAdmin && !stamp.querySelector("[data-engine-container], .engine-frame")) {
    const hex = document.createElement("div");
    hex.style.cssText = "width:100%;height:100%";
    hex.dataset.engineContainer = value.id;
    stamp.appendChild(hex);
    createEngineFrame(value, hex);
  }
  stamp.classList.toggle("active", value.id === activeTabId);
  stamp.style.display = value.id === activeTabId ? "block" : "none";
  return stamp;
}
function prunePages() {
  const viewport = document.getElementById("viewport");
  const set = new Set(tabs.map(value => value.id));
  viewport.querySelectorAll(".page").forEach(value => {
    if (!set.has(value.dataset.pageId)) {
      value.remove();
    }
  });
}
function maxLoaded() {
  const state = Number(settings && settings.maxLoadedTabs);
  if (!Number.isFinite(state)) {
    return 8;
  }
  return Math.min(MAX_TABS, Math.max(1, Math.round(state)));
}
function showActiveOnly() {
  try {
    updateGamesChromeLocks();
  } catch (err) {}
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }
  const saved = maxLoaded();
  const fresh = tabs.slice().sort((value, extra) => {
    if (value.id === activeTabId) {
      return -1;
    }
    if (extra.id === activeTabId) {
      return 1;
    }
    return (extra.lastActive || 0) - (value.lastActive || 0);
  });
  const set = new Set(fresh.slice(0, saved).map(value => value.id));
  tabs.forEach(value => {
    const session = viewport.querySelector(".page[data-page-id=\"" + value.id + "\"]");
    if (!session) {
      return;
    }
    const workerUrl = value.id === activeTabId;
    session.classList.toggle("active", workerUrl);
    session.style.display = workerUrl ? "block" : "none";
    if (!set.has(value.id) && value.engineFrame) {
      try {
        const force = value.engineFrame.element || value.engineFrame.frame;
        if (force && force.remove) {
          force.remove();
        }
      } catch {}
      value.engineFrame = null;
      if (!value.newTab && value.url) {
        session.dataset.unloaded = "1";
      }
    }
  });
}
function switchTab(value) {
  activeTabId = value;
  const base = getTab(value);
  if (base) {
    base.lastActive = Date.now();
  }
  try {
    if (base && base.isGames) {
      sessionStorage.setItem("veil_active_special", "games");
    } else if (base && base.isChat) {
      sessionStorage.setItem("veil_active_special", "chat");
    } else if (base && base.isAdmin) {
      sessionStorage.setItem("veil_active_special", "admin");
    } else {
      sessionStorage.removeItem("veil_active_special");
    }
  } catch (err) {}
  showActiveOnly();
  if (base && base.isGames) {
    const isErr = document.querySelector(".page[data-page-id=\"" + base.id + "\"]");
    if (isErr && !isErr.querySelector("#gamesRoot")) {
      isErr.innerHTML = "<div class=\"games-page\" id=\"gamesRoot\"><div class=\"games-inner\">Loading games…</div></div>";
      renderGamesPage(isErr.querySelector("#gamesRoot"));
    }
  } else if (base && base.isChat) {
    const flag = document.querySelector(".page[data-page-id=\"" + base.id + "\"]");
    if (flag && !flag.querySelector("#chatRoot")) {
      flag.innerHTML = "<div class=\"chat-page\" id=\"chatRoot\"></div>";
      renderChatPage(flag.querySelector("#chatRoot"));
    }
  } else if (base && !base.newTab && base.url && base.url !== "veil://games" && base.url !== "veil://chat" && !base.engineFrame && !base.isAdmin && !base.isChat) {
    const gate = document.querySelector(".page[data-page-id=\"" + base.id + "\"]");
    if (gate) {
      gate.innerHTML = "";
      gate.dataset.unloaded = "0";
      const cloak2 = document.createElement("div");
      cloak2.style.cssText = "width:100%;height:100%";
      cloak2.dataset.engineContainer = base.id;
      gate.appendChild(cloak2);
      createEngineFrame(base, cloak2);
    }
  }
  renderTabs();
  renderToolbar();
  updateGamesChromeLocks();
}
function tabUrlLocked(value) {
  return !!value && (!!value.isGames || !!value.isAdmin || !!value.isChat);
}
function renderToolbar() {
  const short = getActiveTab();
  let line = "";
  if (short) {
    if (short.isGames) {
      line = "veil://games";
    } else if (short.isChat) {
      line = "veil://chat";
    } else if (short.isAdmin) {
      line = "veil://admin";
    } else {
      line = short.url || "";
    }
  }
  const address = document.getElementById("address");
  const letter = tabUrlLocked(short);
  if (address) {
    address.value = line;
    address.readOnly = letter;
    if (letter) {
      address.setAttribute("readonly", "readonly");
    } else {
      address.removeAttribute("readonly");
    }
  }
  const code = address && address.closest(".address-wrap");
  if (code) {
    code.classList.toggle("locked", letter);
  }
  document.getElementById("backBtn").disabled = !short || !short.url || short.isGames || short.isAdmin || short.isChat;
  document.getElementById("forwardBtn").disabled = !short || !short.url || short.isGames || short.isAdmin || short.isChat;
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  const bookmarkIcon = document.getElementById("bookmarkIcon");
  if (!bookmarkBtn) {
    return;
  }
  const secret = !short || short.newTab || short.isGames || short.isChat || !short.url || String(short.url).indexOf("veil://") === 0;
  bookmarkBtn.hidden = !!secret;
  const addr = !secret && isBookmarked(short.url);
  bookmarkBtn.classList.toggle("saved", addr);
  if (bookmarkIcon) {
    bookmarkIcon.src = IMG + (addr ? "bookmark.svg" : "bookmarkh.svg");
  }
}
function renderChrome() {
  try {
    renderTabs();
  } catch (err) {
    console.warn("renderTabs", err);
  }
  try {
    renderToolbar();
  } catch (err) {
    console.warn("renderToolbar", err);
  }
  try {
    renderBookmarks();
  } catch (err) {
    console.warn("renderBookmarks", err);
  }
  try {
    loadColorInputs();
  } catch (err) {
    console.warn("loadColorInputs", err);
  }
  try {
    loadCloakInputs();
  } catch (err) {
    console.warn("loadCloakInputs", err);
  }
  try {
    loadPanicInputs();
  } catch (err) {
    console.warn("loadPanicInputs", err);
  }
  try {
    highlightTheme();
  } catch (err) {
    console.warn("highlightTheme", err);
  }
  try {
    fillWispSelect();
  } catch (err) {
    console.warn("fillWispSelect", err);
  }
}
async function navigate(value2) {
  let link = getActiveTab();
  if (!link) {
    createTab(true);
    link = getActiveTab();
  }
  if (!link) {
    return;
  }
  if (tabUrlLocked(link)) {
    renderToolbar();
    return;
  }
  const href = normalizeUrl(value2);
  if (!href) {
    return;
  }
  activeTabId = link.id;
  link.url = href;
  link.newTab = false;
  link.isAdmin = false;
  link.favicon = faviconFor(href);
  link.title = "Loading";
  pushVisitHistory(href, link.title);
  if (!Array.isArray(link.history)) {
    link.history = [];
  }
  if (link.historyIndex < link.history.length - 1) {
    link.history = link.history.slice(0, link.historyIndex + 1);
  }
  link.history.push(href);
  link.historyIndex = link.history.length - 1;
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }
  let blob = viewport.querySelector(".page[data-page-id=\"" + link.id + "\"]");
  if (!blob) {
    blob = document.createElement("section");
    blob.className = "page active";
    blob.dataset.pageId = link.id;
    viewport.appendChild(blob);
  }
  blob.classList.add("active");
  blob.style.display = "block";
  if (blob.querySelector(".newtab-page")) {
    link.engineFrame = null;
    blob.innerHTML = "";
  }
  try {
    if (link.engineFrame) {
      const overlay = link.engineFrame.element || link.engineFrame.frame || link.engineFrame;
      if (overlay && overlay.isConnected) {
        await goFrame(link, href);
      } else {
        link.engineFrame = null;
        blob.innerHTML = "";
        const panic2 = document.createElement("div");
        panic2.style.cssText = "width:100%;height:100%";
        panic2.dataset.engineContainer = link.id;
        blob.appendChild(panic2);
        await createEngineFrame(link, panic2);
      }
    } else {
      blob.innerHTML = "";
      const value = document.createElement("div");
      value.style.cssText = "width:100%;height:100%";
      value.dataset.engineContainer = link.id;
      blob.appendChild(value);
      await createEngineFrame(link, value);
    }
  } catch (err) {
    console.error("navigate failed", err);
    finishPageLoader(link);
    blob.innerHTML = "<div class=\"engine-error\"><div class=\"engine-error-box\"><h2>Could not open this page</h2><p>" + escapeHTML(err && err.message || String(err)) + "</p><button data-retry-nav type=\"button\">Retry</button></div></div>";
    const ev = blob.querySelector("[data-retry-nav]");
    if (ev) {
      ev.onclick = () => navigate(href);
    }
  }
  showActiveOnly();
  renderChrome();
}
async function probeWisp(value3) {
  return new Promise(value2 => {
    let other = false;
    let detail = null;
    const source = value => {
      if (other) {
        return;
      }
      other = true;
      try {
        if (detail) {
          detail.close();
        }
      } catch (err) {}
      value2(value);
    };
    try {
      detail = new WebSocket(value3);
    } catch (err) {
      value2(false);
      return;
    }
    const target = setTimeout(() => source(false), 2500);
    detail.addEventListener("open", () => {
      clearTimeout(target);
      source(true);
    });
    detail.addEventListener("error", () => {
      clearTimeout(target);
      source(false);
    });
  });
}
async function useWorkingWisp() {
  return currentWisp();
}
async function goBack() {
  const height = getActiveTab();
  if (!height || height.newTab || height.isGames || height.isAdmin || height.isChat) {
    return;
  }
  if (!height.history || height.historyIndex <= 0) {
    return;
  }
  height.historyIndex--;
  height.url = height.history[height.historyIndex];
  height.newTab = false;
  showPageLoader(height);
  height.title = "Loading";
  await goFrame(height, height.url);
  renderChrome();
}
async function goForward() {
  const size = getActiveTab();
  if (!size || size.newTab || size.isGames || size.isAdmin || size.isChat) {
    return;
  }
  if (!size.history || size.historyIndex >= size.history.length - 1) {
    return;
  }
  size.historyIndex++;
  size.url = size.history[size.historyIndex];
  size.newTab = false;
  showPageLoader(size);
  size.title = "Loading";
  await goFrame(size, size.url);
  renderChrome();
}
function reload() {
  const ratio = getActiveTab();
  if (!ratio) {
    return;
  }
  if (ratio.isGames) {
    openGamesPage();
    return;
  }
  if (ratio.isChat) {
    openChatPage();
    return;
  }
  if (ratio.isAdmin) {
    const name2 = document.querySelector(".page[data-page-id=\"" + ratio.id + "\"] iframe");
    if (name2) {
      name2.src = name2.src;
    }
    return;
  }
  if (!ratio.url) {
    goHome();
    return;
  }
  showPageLoader(ratio);
  ratio.title = "Loading";
  renderTabs();
  if (ratio.engineFrame && typeof ratio.engineFrame.reload === "function") {
    ratio.engineFrame.reload();
  } else {
    goFrame(ratio, ratio.url);
  }
}
function veilConfirm(value3, extra) {
  return new Promise(value2 => {
    const modalOverlayVeilConfirm = document.querySelector(".modal-overlay.veil-confirm");
    if (modalOverlayVeilConfirm) {
      modalOverlayVeilConfirm.remove();
    }
    const mode = document.createElement("div");
    mode.className = "modal-overlay veil-confirm";
    mode.innerHTML = "<div class=\"modal-box\"><h2>" + escapeHTML(value3 || "Confirm") + "</h2><p style=\"margin-top:10px;color:var(--muted);font-size:13px;line-height:1.55\">" + escapeHTML(extra || "") + "</p><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">No</button><button class=\"modal-go\" type=\"button\">Yes</button></div></div>";
    document.body.appendChild(mode);
    const force = value => {
      mode.remove();
      value2(value);
    };
    mode.querySelector(".modal-cancel").onclick = () => force(false);
    mode.querySelector(".modal-go").onclick = () => force(true);
    mode.onclick = value => {
      if (value.target === mode) {
        force(false);
      }
    };
  });
}
function pushVisitHistory(value2, extra) {
  if (!value2 || value2 === "about:blank") {
    return;
  }
  try {
    const maxAge = new URL(value2, location.href).href;
    visitHistory = visitHistory.filter(value => value.url !== maxAge);
    visitHistory.unshift({
      id: uid(),
      url: maxAge,
      title: extra || maxAge,
      at: Date.now()
    });
    if (visitHistory.length > 200) {
      visitHistory.length = 200;
    }
    save();
  } catch {}
}
function renderHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";
  if (!visitHistory.length) {
    historyList.innerHTML = "<div style=\"color:var(--muted);font-size:13px;padding:12px\">No history yet</div>";
    return;
  }
  visitHistory.forEach(value2 => {
    const locked = document.createElement("div");
    locked.className = "history-item";
    const show = document.createElement("a");
    show.href = "#";
    show.textContent = value2.title || value2.url;
    show.title = value2.url;
    show.onclick = value => {
      value.preventDefault();
      closeHistory();
      navigate(value2.url);
    };
    const email = document.createElement("button");
    email.type = "button";
    email.innerHTML = "<img src=\"image/exit.svg\" alt=\"Remove\">";
    email.onclick = () => {
      visitHistory = visitHistory.filter(value => value.id !== value2.id);
      save();
      renderHistory();
    };
    locked.appendChild(show);
    locked.appendChild(email);
    historyList.appendChild(locked);
  });
}
function openHistory() {
  closeMenu();
  openPanel("historyPanel");
  renderHistory();
}
function closeHistory() {
  document.getElementById("historyPanel")?.classList.remove("open");
  document.getElementById("backdrop")?.classList.remove("open");
}
function createTab(value = true) {
  if (tabs.length >= MAX_TABS) {
    return;
  }
  const cloak2 = {
    id: uid(),
    title: "New Tab",
    url: "",
    history: [],
    historyIndex: -1,
    newTab: true,
    engineFrame: null,
    favicon: FAVI,
    animOpen: true,
    lastActive: Date.now()
  };
  tabs.push(cloak2);
  activeTabId = cloak2.id;
  ensurePage(cloak2);
  showActiveOnly();
  renderChrome();
}
function closeTab(value2) {
  const bookmark = tabs.findIndex(value => value.id === value2);
  if (bookmark < 0) {
    return;
  }
  const historyItem = document.querySelector("[data-tab-id=\"" + value2 + "\"]");
  const game = () => {
    const response = tabs[bookmark];
    if (response && response.engineFrame) {
      try {
        const password = response.engineFrame.element || response.engineFrame.frame;
        if (password && password.remove) {
          password.remove();
        }
      } catch {}
      response.engineFrame = null;
    }
    tabs.splice(bookmark, 1);
    prunePages();
    if (!tabs.length) {
      createTab(true);
      return;
    }
    if (activeTabId === value2) {
      activeTabId = tabs[Math.min(bookmark, tabs.length - 1)].id;
    }
    showActiveOnly();
    renderChrome();
  };
  if (historyItem) {
    historyItem.classList.add("closing");
    setTimeout(game, 160);
  } else {
    game();
  }
}
function renameCurrentTab() {
  const room = getActiveTab();
  if (!room) {
    return;
  }
  closeMenu();
  const modalOverlayRenameModal = document.querySelector(".modal-overlay.rename-modal");
  if (modalOverlayRenameModal) {
    modalOverlayRenameModal.remove();
  }
  const message = document.createElement("div");
  message.className = "modal-overlay rename-modal";
  message.innerHTML = "<div class=\"modal-box\"><h2>Rename tab</h2><input class=\"text-input\" id=\"renameInput\" maxlength=\"64\" value=\"" + escapeHTML(room.title || "") + "\"><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Save</button></div></div>";
  document.body.appendChild(message);
  const renameInput = message.querySelector("#renameInput");
  renameInput.focus();
  renameInput.select();
  const group = () => message.remove();
  message.querySelector(".modal-cancel").onclick = group;
  message.onclick = value => {
    if (value.target === message) {
      group();
    }
  };
  const pending = () => {
    const path = renameInput.value.trim();
    if (path) {
      room.title = path;
      renderTabs();
    }
    group();
  };
  message.querySelector(".modal-go").onclick = pending;
  renameInput.addEventListener("keydown", value => {
    if (value.key === "Enter") {
      pending();
    }
    if (value.key === "Escape") {
      group();
    }
  });
}
function goHome() {
  const invite = getActiveTab();
  if (!invite) {
    createTab(true);
    return;
  }
  if (tabUrlLocked(invite)) {
    return;
  }
  if (invite.engineFrame) {
    try {
      const token = invite.engineFrame.element || invite.engineFrame.frame;
      if (token && token.remove) {
        token.remove();
      }
    } catch {}
    invite.engineFrame = null;
  }
  invite.newTab = true;
  invite.url = "";
  invite.title = "New Tab";
  invite.favicon = FAVI;
  invite.history = [];
  invite.historyIndex = -1;
  const admin = document.querySelector(".page[data-page-id=\"" + invite.id + "\"]");
  if (admin) {
    admin.innerHTML = homepageHTML(invite.id);
    wireHome(admin, invite);
  }
  renderChrome();
}
function toggleBookmark() {
  const session = getActiveTab();
  if (!session || !session.url || session.newTab || session.isGames || String(session.url).indexOf("veil://") === 0) {
    return;
  }
  if (bookmarks.some(value => value.url === session.url)) {
    bookmarks = bookmarks.filter(value => value.url !== session.url);
  } else {
    bookmarks.push({
      id: uid(),
      title: session.title || session.url,
      url: session.url
    });
  }
  save();
  renderToolbar();
  renderBookmarks();
}
function renderBookmarks() {
  const bookmarkList = document.getElementById("bookmarkList");
  if (!bookmarks.length) {
    bookmarkList.innerHTML = "<div class=\"empty\">No bookmarks yet.</div>";
    return;
  }
  bookmarkList.innerHTML = bookmarks.map(value => "<div class=\"bookmark-row\"><div class=\"bookmark-main\" data-open-bookmark=\"" + escapeHTML(value.url) + "\"><div class=\"bookmark-title\">" + escapeHTML(value.title) + "</div><div class=\"bookmark-url\">" + escapeHTML(value.url) + "</div></div><button class=\"bookmark-delete\" data-delete-bookmark=\"" + escapeHTML(value.id) + "\" type=\"button\" aria-label=\"Remove\" title=\"Remove\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></button></div>").join("");
  bookmarkList.querySelectorAll("[data-open-bookmark]").forEach(value => value.onclick = () => {
    closePanels();
    navigate(value.dataset.openBookmark);
  });
  bookmarkList.querySelectorAll("[data-delete-bookmark]").forEach(value2 => value2.onclick = () => {
    bookmarks = bookmarks.filter(value => value.id !== value2.dataset.deleteBookmark);
    save();
    renderBookmarks();
    renderToolbar();
  });
}
function openPanel(value) {
  closeMenu();
  document.getElementById("backdrop").classList.add("open");
  document.getElementById(value).classList.add("open");
  if (value === "settingsPanel") {
    try {
      fillWispSelect();
      startLivePings();
    } catch {}
    try {
      fillChatSettings();
    } catch (err) {}
  }
}
function closePanels() {
  try {
    closeHistory();
  } catch {}
  return closePanelsInner();
}
function closePanelsInner() {
  document.getElementById("backdrop").classList.remove("open");
  document.querySelectorAll(".panel").forEach(value => value.classList.remove("open"));
}
function closeMenu() {
  document.getElementById("mainMenu").classList.remove("open");
}
function safeColorValue(value, extra) {
  const extra2 = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(extra2)) {
    return extra2;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(extra2)) {
    return "#" + extra2[1] + extra2[1] + extra2[2] + extra2[2] + extra2[3] + extra2[3];
  }
  return extra || "#101010";
}
function loadColorInputs() {
  try {
    const colorBg = document.getElementById("colorBg");
    if (colorBg) {
      colorBg.value = safeColorValue(settings.bg || settings.newtab, "#101010");
    }
    const colorPanel = document.getElementById("colorPanel");
    if (colorPanel) {
      colorPanel.value = safeColorValue(settings.panel, "#161616");
    }
    const colorAccent = document.getElementById("colorAccent");
    if (colorAccent) {
      colorAccent.value = safeColorValue(settings.accent, "#ffffff");
    }
    const colorText = document.getElementById("colorText");
    if (colorText) {
      colorText.value = safeColorValue(settings.text, "#f0f0f0");
    }
    const colorOutline = document.getElementById("colorOutline");
    if (colorOutline) {
      colorOutline.value = safeColorValue(settings.customOutline || settings.border, "#2b2b2b");
    }
    const backgroundUrl = document.getElementById("backgroundUrl");
    if (backgroundUrl) {
      backgroundUrl.value = settings.backgroundUrl || "";
    }
  } catch (err) {
    console.warn("loadColorInputs", err);
  }
}
function loadCloakInputs() {
  try {
    const cloakTitle = document.getElementById("cloakTitle");
    if (cloakTitle) {
      cloakTitle.value = cloak.title || "";
    }
    const cloakIcon = document.getElementById("cloakIcon");
    if (cloakIcon) {
      cloakIcon.value = cloak.icon || "";
    }
  } catch (err) {}
}
function loadPanicInputs() {
  try {
    const panicKey = document.getElementById("panicKey");
    if (panicKey) {
      panicKey.value = panic.key ? "Bound: " + panic.key : "Not bound";
    }
    const panicUrl = document.getElementById("panicUrl");
    if (panicUrl) {
      panicUrl.value = panic.url || "";
    }
  } catch (err) {}
}
function pingClass(value, extra) {
  if (extra || value == null || !Number.isFinite(value)) {
    return "ping-off";
  }
  if (value <= 199) {
    return "ping-good";
  }
  if (value <= 499) {
    return "ping-mid";
  }
  return "ping-bad";
}
function pingWisp(value3, extra2 = 4000) {
  return new Promise(value2 => {
    let data = false;
    const msg = performance.now();
    let isErr;
    const name2 = (value, extra) => {
      if (data) {
        return;
      }
      data = true;
      try {
        if (isErr) {
          isErr.close();
        }
      } catch {}
      value2({
        ms: value,
        offline: !!extra
      });
    };
    try {
      if (!value3 || !/^wss?:\/\//i.test(value3) || value3.length < 12) {
        name2(null, true);
        return;
      }
      isErr = new WebSocket(value3);
      isErr.onopen = () => name2(Math.round(performance.now() - msg), false);
      isErr.onerror = () => name2(null, true);
      isErr.onclose = () => {
        if (!data) {
          name2(null, true);
        }
      };
      setTimeout(() => name2(null, true), extra2);
    } catch {
      name2(null, true);
    }
  });
}
function normalizeWispUrl(value) {
  let note = String(value || "").trim();
  if (!note) {
    return "";
  }
  note = note.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
  if (!/^wss?:\/\//i.test(note)) {
    note = "wss://" + note;
  }
  if (!note.endsWith("/")) {
    note += "/";
  }
  if (!/^wss?:\/\/[^\s/]+/i.test(note) || note.length < 12) {
    return "";
  }
  return note;
}
function fillWispSelect() {
  const serverList = document.getElementById("serverList");
  if (!serverList) {
    return;
  }
  const mode = allWispServers();
  serverList.innerHTML = mode.map(value => {
    const body = settings.wispId === value.id;
    const token = body ? " selected" : "";
    const user = value.custom && body ? "<span class=\"server-actions\"><span class=\"server-edit\" data-edit=\"" + value.id + "\" title=\"Rename\"><img src=\"" + IMG + "pencil.svg\" alt=\"\"></span><span class=\"server-del\" data-del=\"" + value.id + "\" title=\"Remove\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></span></span>" : "";
    return "<button type=\"button\" class=\"server-row" + token + "\" data-server-id=\"" + value.id + "\"><span class=\"server-dot ping-wait\" data-dot=\"" + value.id + "\"><img src=\"" + IMG + "status.svg\" alt=\"\"></span><span class=\"server-name\">" + escapeHTML(value.name) + "</span><span class=\"server-ping\" data-ping=\"" + value.id + "\">...</span>" + user + "</button>";
  }).join("") + "<button type=\"button\" class=\"server-row server-add\" id=\"addCustomServer\">+ Custom Server</button>";
  serverList.querySelectorAll("[data-server-id]").forEach(value2 => {
    value2.addEventListener("click", value => {
      if (value.target.closest("[data-edit], [data-del]")) {
        return;
      }
      settings.wispId = value2.dataset.serverId;
      save();
      fillWispSelect();
      applyMuxTransport().catch(() => {});
      const engineStatus = document.getElementById("engineStatus");
      if (engineStatus) {
        engineStatus.textContent = engineStatusReady();
      }
    });
  });
  serverList.querySelectorAll("[data-edit]").forEach(value3 => {
    value3.addEventListener("click", value2 => {
      value2.stopPropagation();
      const name2 = value3.dataset.edit;
      const maxAge = (settings.customServers || []).find(value => value.id === name2);
      if (!maxAge) {
        return;
      }
      const key = prompt("Server name", maxAge.name);
      if (key && key.trim()) {
        maxAge.name = key.trim();
        save();
        fillWispSelect();
      }
    });
  });
  serverList.querySelectorAll("[data-del]").forEach(value3 => {
    value3.addEventListener("click", value2 => {
      value2.stopPropagation();
      const url = value3.dataset.del;
      settings.customServers = (settings.customServers || []).filter(value => value.id !== url);
      if (settings.wispId === url) {
        settings.wispId = "va1";
      }
      save();
      fillWispSelect();
      applyMuxTransport().catch(() => {});
    });
  });
  serverList.querySelector("#addCustomServer")?.addEventListener("click", value => {
    value.stopPropagation();
    openAddServerModal();
  });
  updateServerPings();
}
let _pingTimer = null;
function updateServerPings() {
  const serverList = document.getElementById("serverList");
  if (!serverList) {
    return;
  }
  const immediate = allWispServers();
  immediate.forEach(async value => {
    const node = await pingWisp(value.url);
    const err = serverList.querySelector("[data-ping=\"" + value.id + "\"]");
    const list = serverList.querySelector("[data-dot=\"" + value.id + "\"]");
    if (!err) {
      return;
    }
    err.textContent = node.offline ? "offline" : node.ms + " ms";
    err.className = "server-ping " + pingClass(node.ms, node.offline);
    if (list) {
      list.className = "server-dot " + pingClass(node.ms, node.offline);
    }
  });
}
let _addServerPing = 0;
function openAddServerModal() {
  document.getElementById("addServerModal")?.remove();
  const locked = document.createElement("div");
  locked.className = "modal-overlay";
  locked.id = "addServerModal";
  locked.innerHTML = "<div class=\"modal-box\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"addServerTitle\"><h2 id=\"addServerTitle\">Add Custom Server</h2><label class=\"input-label\" for=\"addServerName\">Server Name</label><input class=\"text-input\" id=\"addServerName\" autocomplete=\"off\" spellcheck=\"false\"><label class=\"input-label\" for=\"addServerUrl\">Server URL</label><div class=\"add-server-url\"><input class=\"text-input\" id=\"addServerUrl\" placeholder=\"wss://your-server\" autocomplete=\"off\" spellcheck=\"false\"><span class=\"add-server-status\"><span class=\"server-dot ping-off\" id=\"addServerDot\"><img src=\"" + IMG + "status.svg\" alt=\"\"></span><span class=\"server-ping ping-off\" id=\"addServerPing\"></span></span></div><div class=\"modal-actions\"><button type=\"button\" class=\"modal-cancel\" id=\"addServerCancel\">Cancel</button><button type=\"button\" class=\"modal-go\" id=\"addServerConfirm\" disabled>Add Server</button></div></div>";
  document.body.appendChild(locked);
  const addServerName = locked.querySelector("#addServerName");
  const addServerUrl = locked.querySelector("#addServerUrl");
  const addServerDot = locked.querySelector("#addServerDot");
  const addServerPing = locked.querySelector("#addServerPing");
  const addServerConfirm = locked.querySelector("#addServerConfirm");
  let path = false;
  let body = null;
  const token = () => locked.remove();
  locked.addEventListener("click", value => {
    if (value.target === locked) {
      token();
    }
  });
  locked.querySelector("#addServerCancel").addEventListener("click", token);
  const user = () => {
    addServerConfirm.disabled = !addServerName.value.trim() || !path;
  };
  const data = (value, extra) => {
    addServerDot.className = "server-dot " + value;
    addServerPing.className = "server-ping " + value;
    addServerPing.textContent = extra;
  };
  const msg = () => {
    const found = ++_addServerPing;
    const next = normalizeWispUrl(addServerUrl.value);
    path = false;
    user();
    if (!next) {
      data("ping-off", "");
      return;
    }
    data("ping-wait", "...");
    pingWisp(next).then(value => {
      if (found !== _addServerPing || !locked.isConnected) {
        return;
      }
      if (normalizeWispUrl(addServerUrl.value) !== next) {
        return;
      }
      if (value.offline) {
        path = false;
        data("ping-off", "offline");
      } else {
        path = true;
        const payload = pingClass(value.ms, false);
        data(payload, value.ms + " ms");
      }
      user();
    });
  };
  addServerName.addEventListener("input", user);
  addServerUrl.addEventListener("input", () => {
    path = false;
    user();
    if (body) {
      clearTimeout(body);
    }
    const prev = normalizeWispUrl(addServerUrl.value);
    if (!prev) {
      data("ping-off", "");
      return;
    }
    data("ping-wait", "...");
    body = setTimeout(msg, 350);
  });
  addServerConfirm.addEventListener("click", () => {
    const timer = addServerName.value.trim();
    const box = normalizeWispUrl(addServerUrl.value);
    if (!timer || !box || !path) {
      return;
    }
    if (!settings.customServers) {
      settings.customServers = [];
    }
    settings.customServers.push({
      id: "c_" + Date.now().toString(36),
      name: timer,
      url: box,
      custom: true
    });
    save();
    token();
    fillWispSelect();
  });
  addServerName.focus();
}
function startLivePings() {
  if (_pingTimer) {
    clearInterval(_pingTimer);
  }
  updateServerPings();
  _pingTimer = setInterval(updateServerPings, 12000);
}
const homeFxLoops = new WeakMap();
function hexToRgb(value) {
  const name2 = String(value || "").replace("#", "");
  if (name2.length !== 6) {
    return {
      r: 122,
      g: 162,
      b: 255
    };
  }
  return {
    r: parseInt(name2.slice(0, 2), 16),
    g: parseInt(name2.slice(2, 4), 16),
    b: parseInt(name2.slice(4, 6), 16)
  };
}
function stopHomeFx(value) {
  const key = homeFxLoops.get(value);
  if (key && key.raf) {
    cancelAnimationFrame(key.raf);
  }
  if (key && key.ro) {
    key.ro.disconnect();
  }
  homeFxLoops.delete(value);
}
function setupHomeFx(value3, extra2) {
  const el = !!extra2 && !!extra2.force;
  stopHomeFx(value3);
  const node2 = value3.querySelector("[data-home-fx]");
  if (!node2) {
    return;
  }
  if (!el && settings.animStyle === "custom") {
    node2.style.display = "none";
    return;
  }
  if (!el && (!settings.animEnabled || !COOKIE.consent)) {
    node2.style.display = "none";
    return;
  }
  node2.style.display = "block";
  const err2 = node2.getContext("2d");
  const list2 = {
    raf: 0,
    t: 0,
    particles: [],
    bolts: [],
    flash: 0
  };
  const item2 = () => {
    const btn = value3.getBoundingClientRect();
    node2.width = Math.max(1, Math.floor(btn.width * (window.devicePixelRatio || 1)));
    node2.height = Math.max(1, Math.floor(btn.height * (window.devicePixelRatio || 1)));
    node2.style.width = btn.width + "px";
    node2.style.height = btn.height + "px";
  };
  item2();
  let orbs = extra2 && extra2.style || settings.animStyle || "orbs";
  if (orbs === "waves" || orbs === "pulse") {
    orbs = "rain";
  }
  const raw = Math.max(0.25, Math.min(2.5, Number(extra2 && extra2.saverColors ? settings.saverSpeed : settings.animSpeed) || 1));
  const found2 = Math.max(0.4, Math.min(2.5, Number(extra2 && extra2.saverColors ? settings.saverSize : settings.animSize) || 1));
  let next2 = Number(extra2 && extra2.saverColors ? settings.saverCount : settings.animCount);
  if (!Number.isFinite(next2)) {
    next2 = 18;
  }
  next2 = Math.max(4, Math.min(80, Math.round(next2)));
  if (orbs === "stars") {
    next2 = Math.max(next2, 12);
  }
  if (orbs === "rain") {
    next2 = Math.max(20, Math.min(120, Math.round(next2 * 1.4)));
  }
  list2.shooters = [];
  list2.clouds = [];
  if (orbs === "rain") {
    for (let delay = 0; delay < next2; delay++) {
      const html = delay % 3;
      const cls = html === 0 ? 0.45 : html === 1 ? 0.75 : 1;
      const style = 0.38 + Math.random() * 0.22;
      list2.particles.push({
        x: Math.random() * 1.5 - 0.4,
        y: -0.2 - Math.random() * 1.1,
        len: (0.02 + Math.random() * 0.05) * found2 * (0.7 + cls * 0.5),
        spd: (0.004 + Math.random() * 0.01) * (0.55 + cls * 0.55),
        thick: (0.55 + Math.random() * 1.1) * cls,
        alpha: (0.12 + Math.random() * 0.28) * (0.5 + cls * 0.6),
        ang: style,
        layer: html
      });
    }
  } else {
    for (let stamp = 0; stamp < next2; stamp++) {
      const opts = orbs === "stars";
      list2.particles.push({
        x: Math.random(),
        y: Math.random(),
        r: opts ? 0.4 + Math.random() * 1.6 : (0.015 + Math.random() * 0.07) * found2,
        vx: opts ? 0 : (Math.random() - 0.5) * 0.0004,
        vy: opts ? 0 : (Math.random() - 0.5) * 0.00035,
        phase: Math.random() * Math.PI * 2,
        tw: Math.random() * Math.PI * 2
      });
    }
  }
  const prev2 = (value, extra) => {
    const host = [];
    let query = (0.15 + Math.random() * 0.7) * value;
    let res = 0;
    const req = extra * (0.35 + Math.random() * 0.4);
    while (res < req) {
      const room = query + (Math.random() - 0.5) * 28 * found2;
      const channel = res + 12 + Math.random() * 22;
      host.push({
        x: query,
        y: res,
        nx: room,
        ny: channel
      });
      query = room;
      res = channel;
    }
    list2.bolts.push({
      segs: host,
      life: 1,
      branch: Math.random() > 0.55
    });
    list2.flash = 0.55 + Math.random() * 0.35;
  };
  function animColor(value) {
    if (extra2 && extra2.saverColors) {
      if (value === "a") {
        return settings.saverColorA || "#7aa2ff";
      } else {
        return settings.saverColorB || "#b88cff";
      }
    }
    if (value === "a") {
      return settings.animColorA || "#7aa2ff";
    } else {
      return settings.animColorB || "#b88cff";
    }
  }
  const box = () => {
    if (!el && !settings.animEnabled) {
      return;
    }
    const rec = raw * 0.42;
    list2.t += rec * 0.016;
    const row = node2.width;
    const count = node2.height;
    const index = window.devicePixelRatio || 1;
    err2.clearRect(0, 0, row, count);
    const entry = hexToRgb(animColor("a"));
    const meta = hexToRgb(animColor("b"));
    if (orbs === "rain") {
      const message = err2.createLinearGradient(0, 0, 0, count);
      message.addColorStop(0, "rgba(" + entry.r + "," + entry.g + "," + entry.b + ",0.08)");
      message.addColorStop(0.45, "rgba(" + entry.r + "," + entry.g + "," + entry.b + ",0.03)");
      message.addColorStop(1, "rgba(0,0,0,0)");
      err2.fillStyle = message;
      err2.fillRect(0, 0, row, count);
      if (Math.random() < rec * 0.0014) {
        prev2(row, count);
      }
      if (list2.flash > 0) {
        err2.fillStyle = "rgba(190,210,255," + list2.flash * 0.14 + ")";
        err2.fillRect(0, 0, row, count);
        list2.flash *= 0.9;
        if (list2.flash < 0.015) {
          list2.flash = 0;
        }
      }
      list2.bolts = list2.bolts.filter(value2 => {
        value2.life -= rec / 0.42 * 0.05;
        if (value2.life <= 0) {
          return false;
        }
        err2.strokeStyle = "rgba(200,220,255," + value2.life * 0.4 + ")";
        err2.lineWidth = Math.max(0.8, found2 * 1.25 * index);
        err2.lineCap = "round";
        err2.beginPath();
        value2.segs.forEach((value, extra) => {
          if (extra === 0) {
            err2.moveTo(value.x, value.y);
          }
          err2.lineTo(value.nx, value.ny);
        });
        err2.stroke();
        if (value2.branch && value2.segs.length > 3) {
          const immediate = value2.segs[Math.floor(value2.segs.length / 2)];
          err2.beginPath();
          err2.moveTo(immediate.x, immediate.y);
          err2.lineTo(immediate.x + found2 * 16, immediate.y + found2 * 24);
          err2.stroke();
        }
        return true;
      });
      err2.lineCap = "round";
      const friend = list2.particles.slice().sort((value, extra) => (value.layer || 0) - (extra.layer || 0));
      friend.forEach(value => {
        const current = value.ang;
        const saved = (0.009 + value.spd) * rec * 1.05;
        value.x += Math.sin(current) * saved;
        value.y += Math.cos(current * 0.12) * saved * 1.4;
        if (value.y > 1.15 || value.x > 1.3) {
          value.x = Math.random() * 1.25 - 0.4;
          value.y = -0.15 - Math.random() * 0.4;
        }
        const fresh = value.x * row;
        const old = value.y * count;
        const copy = value.len * Math.min(row, count) * 1.2;
        const base = fresh + Math.sin(current) * copy;
        const full = old + Math.cos(current * 0.18) * copy * 0.95;
        err2.strokeStyle = "rgba(" + entry.r + "," + entry.g + "," + entry.b + "," + value.alpha * 0.55 + ")";
        err2.lineWidth = Math.max(0.6, value.thick * found2 * index * 0.55);
        err2.beginPath();
        err2.moveTo(fresh, old);
        err2.lineTo(base, full);
        err2.stroke();
        if ((value.layer || 0) >= 2) {
          err2.strokeStyle = "rgba(" + meta.r + "," + meta.g + "," + meta.b + "," + value.alpha * 0.35 + ")";
          err2.lineWidth = Math.max(0.5, value.thick * found2 * index * 0.35);
          err2.beginPath();
          err2.moveTo(fresh + (base - fresh) * 0.35, old + (full - old) * 0.35);
          err2.lineTo(base, full);
          err2.stroke();
        }
      });
      const group = err2.createLinearGradient(0, count * 0.72, 0, count);
      group.addColorStop(0, "rgba(" + entry.r + "," + entry.g + "," + entry.b + ",0)");
      group.addColorStop(1, "rgba(" + entry.r + "," + entry.g + "," + entry.b + ",0.06)");
      err2.fillStyle = group;
      err2.fillRect(0, count * 0.72, row, count * 0.28);
    } else if (orbs === "stars") {
      list2.particles.forEach(value => {
        const now = 0.35 + (0.5 + Math.sin(list2.t * 1.4 + value.tw) * 0.5) * 0.65;
        err2.fillStyle = "rgba(" + entry.r + "," + entry.g + "," + entry.b + "," + now + ")";
        err2.beginPath();
        err2.arc(value.x * row, value.y * count, value.r * found2 * index * 0.5, 0, Math.PI * 2);
        err2.fill();
      });
      if (Math.random() < rec * 0.008) {
        list2.shooters.push({
          x: -0.08 - Math.random() * 0.2,
          y: -0.08 - Math.random() * 0.15,
          vx: 0.01 + Math.random() * 0.012,
          vy: 0.006 + Math.random() * 0.008,
          life: 1
        });
      }
      list2.shooters = list2.shooters.filter(value => {
        value.x += value.vx * rec;
        value.y += value.vy * rec;
        value.life -= rec * 0.018;
        if (value.life <= 0 || value.x > 1.2 || value.y > 1.2) {
          return false;
        }
        const node = value.x * row;
        const err = value.y * count;
        const list = (value.x - value.vx * 4) * row;
        const item = (value.y - value.vy * 4) * count;
        const text = err2.createLinearGradient(node, err, list, item);
        text.addColorStop(0, "rgba(" + entry.r + "," + entry.g + "," + entry.b + "," + value.life * 0.7 + ")");
        text.addColorStop(1, "rgba(" + entry.r + "," + entry.g + "," + entry.b + ",0)");
        err2.strokeStyle = text;
        err2.lineWidth = Math.max(1, found2 * 1.4 * index);
        err2.lineCap = "round";
        err2.beginPath();
        err2.moveTo(list, item);
        err2.lineTo(node, err);
        err2.stroke();
        return true;
      });
    } else if (orbs === "constellation") {
      const node = list2.particles;
      node.forEach(value => {
        value.x += value.vx * rec;
        value.y += value.vy * rec;
        if (value.x < 0 || value.x > 1) {
          value.vx *= -1;
        }
        if (value.y < 0 || value.y > 1) {
          value.vy *= -1;
        }
      });
      for (let cloak2 = 0; cloak2 < node.length; cloak2++) {
        for (let left = cloak2 + 1; left < node.length; left++) {
          const found = node[cloak2].x - node[left].x;
          const next = node[cloak2].y - node[left].y;
          const prev = Math.hypot(found, next);
          if (prev < 0.18) {
            err2.strokeStyle = "rgba(" + entry.r + "," + entry.g + "," + entry.b + "," + (1 - prev / 0.18) * 0.22 + ")";
            err2.beginPath();
            err2.moveTo(node[cloak2].x * row, node[cloak2].y * count);
            err2.lineTo(node[left].x * row, node[left].y * count);
            err2.stroke();
          }
        }
      }
      node.forEach(value => {
        err2.fillStyle = "rgba(" + meta.r + "," + meta.g + "," + meta.b + ",0.85)";
        err2.beginPath();
        err2.arc(value.x * row, value.y * count, index * 2.2, 0, Math.PI * 2);
        err2.fill();
      });
    } else {
      list2.particles.forEach((value, extra) => {
        value.x += value.vx * rec;
        value.y += value.vy * rec;
        if (value.x < -0.1) {
          value.x = 1.1;
        }
        if (value.x > 1.1) {
          value.x = -0.1;
        }
        if (value.y < -0.1) {
          value.y = 1.1;
        }
        if (value.y > 1.1) {
          value.y = -0.1;
        }
        const html = 0.55 + Math.sin(list2.t * 1.2 + value.phase) * 0.35;
        const cls = value.r * Math.min(row, count) * html;
        const style = extra % 2 ? entry : meta;
        const opts = err2.createRadialGradient(value.x * row, value.y * count, 0, value.x * row, value.y * count, cls);
        opts.addColorStop(0, "rgba(" + style.r + "," + style.g + "," + style.b + ",0.35)");
        opts.addColorStop(1, "rgba(" + style.r + "," + style.g + "," + style.b + ",0)");
        err2.fillStyle = opts;
        err2.beginPath();
        err2.arc(value.x * row, value.y * count, cls, 0, Math.PI * 2);
        err2.fill();
      });
    }
    list2.raf = requestAnimationFrame(box);
  };
  list2.raf = requestAnimationFrame(box);
  const resizeObserver = new ResizeObserver(item2);
  resizeObserver.observe(value3);
  list2.ro = resizeObserver;
  homeFxLoops.set(value3, list2);
}
function setSwitch(value, extra) {
  if (!value) {
    return;
  }
  value.classList.toggle("on", !!extra);
  value.setAttribute("aria-checked", extra ? "true" : "false");
}
function refreshHomeFxAll() {
  applyNewTabBackground();
  document.querySelectorAll(".page").forEach(value2 => {
    const wrap = value2.dataset.pageId;
    const page = tabs.find(value => value.id === wrap);
    if (page && page.newTab) {
      setupHomeFx(value2);
    }
  });
}
let saverTimer = null;
let saverVisible = false;
let saverHideTimer = null;
function parseVeilDuration(value) {
  if (value == null) {
    return 0;
  }
  const opts = String(value).trim().toLowerCase();
  if (!opts || ["inf", "infinite", "perm", "permanent", "0", "off", "disabled"].includes(opts)) {
    return 0;
  }
  let src = opts.replace(/days?/g, "d").replace(/hours?/g, "h").replace(/hrs?/g, "h").replace(/minutes?/g, "m").replace(/mins?/g, "m").replace(/seconds?/g, "s").replace(/secs?/g, "s").replace(/,/g, ";").replace(/\s+/g, "");
  const dest = src.split(";").filter(Boolean);
  let host = 0;
  const query = /^(\d+)(ms|s|m|h|hr|d)$/;
  for (const box of dest) {
    const next = box.match(query);
    if (!next) {
      return 0;
    }
    const prev = parseInt(next[1], 10);
    const timer = next[2];
    if (timer === "ms") {
      host += prev;
    } else if (timer === "s") {
      host += prev * 1000;
    } else if (timer === "m") {
      host += prev * 60 * 1000;
    } else if (timer === "h" || timer === "hr") {
      host += prev * 3600 * 1000;
    } else if (timer === "d") {
      host += prev * 86400 * 1000;
    }
  }
  if (host > 0) {
    return host;
  } else {
    return 0;
  }
}
function saverWaitMs() {
  if (!settings.saverEnabled) {
    return 0;
  }
  const res = (settings.saverDelay || "").trim();
  if (res) {
    return parseVeilDuration(res);
  }
  const req = Number(settings.saverMinutes) || 0;
  if (req > 0) {
    return req * 60000;
  } else {
    return 0;
  }
}
function themeSurface(value, extra) {
  const count = (getComputedStyle(document.documentElement).getPropertyValue(value) || "").trim();
  return count || extra;
}
function isTimedMedia(value) {
  return /\.(mp4|webm|ogg|gif|webp)(\?|#|$)/i.test(value || "");
}
let saverFrameToken = 0;
let saverFrameTimer = null;
function stopSaverFrames() {
  saverFrameToken++;
  if (saverFrameTimer) {
    clearTimeout(saverFrameTimer);
    saverFrameTimer = null;
  }
}
function playSaverStill(value2) {
  const veilSaver = document.getElementById("veilSaver");
  if (!veilSaver) {
    return;
  }
  const imgSaverMedia = veilSaver.querySelector("img.saver-media");
  const canvasSaverRaster = veilSaver.querySelector("canvas.saver-raster");
  const page = Math.max(0.25, Number(settings.saverMediaSpeed) || 1);
  const tab = /\.(gif|webp)(\?|#|$)/i.test(value2 || "");
  if (!tab || typeof ImageDecoder === "undefined") {
    if (canvasSaverRaster) {
      canvasSaverRaster.hidden = true;
    }
    if (imgSaverMedia) {
      imgSaverMedia.hidden = false;
      imgSaverMedia.src = value2;
    }
    return;
  }
  const frame = ++saverFrameToken;
  const icon = /\.webp(\?|#|$)/i.test(value2) ? "image/webp" : "image/gif";
  fetch(value2).then(value => {
    if (!value.ok) {
      throw new Error("miss");
    }
    return value.arrayBuffer();
  }).then(async value => {
    if (frame !== saverFrameToken) {
      return;
    }
    const imageDecoder = new ImageDecoder({
      data: value,
      type: icon
    });
    await imageDecoder.tracks.ready;
    const admin = imageDecoder.tracks.selectedTrack;
    const session = Math.max(1, admin.frameCount || 1);
    if (session < 2) {
      throw new Error("still");
    }
    if (imgSaverMedia) {
      imgSaverMedia.hidden = true;
    }
    if (canvasSaverRaster) {
      canvasSaverRaster.hidden = false;
    }
    const workerUrl = canvasSaverRaster.getContext("2d");
    let gate = 0;
    const overlay = async () => {
      if (frame !== saverFrameToken || !canvasSaverRaster) {
        return;
      }
      try {
        const src = await imageDecoder.decode({
          frameIndex: gate
        });
        const dest = src.image;
        const host = veilSaver.getBoundingClientRect();
        canvasSaverRaster.width = Math.max(1, Math.floor(host.width));
        canvasSaverRaster.height = Math.max(1, Math.floor(host.height));
        workerUrl.drawImage(dest, 0, 0, canvasSaverRaster.width, canvasSaverRaster.height);
        const query = dest.duration || 100000;
        if (dest.close) {
          dest.close();
        }
        const res = Math.max(0.25, Number(settings.saverMediaSpeed) || 1);
        gate = (gate + 1) % session;
        saverFrameTimer = setTimeout(overlay, Math.max(16, query / 1000 / res));
      } catch (err) {
        if (imgSaverMedia) {
          imgSaverMedia.hidden = false;
          imgSaverMedia.src = value2;
        }
        if (canvasSaverRaster) {
          canvasSaverRaster.hidden = true;
        }
      }
    };
    overlay();
  }).catch(() => {
    if (frame !== saverFrameToken) {
      return;
    }
    if (canvasSaverRaster) {
      canvasSaverRaster.hidden = true;
    }
    if (imgSaverMedia) {
      imgSaverMedia.hidden = false;
      imgSaverMedia.src = value2;
    }
  });
  page;
}
function renderSaverVisual() {
  const veilSaver = document.getElementById("veilSaver");
  if (!veilSaver) {
    return;
  }
  veilSaver.style.background = themeSurface("--bg", "#101010");
  const color = veilSaver.querySelector("[data-home-fx]");
  const imgSaverMedia = veilSaver.querySelector("img.saver-media");
  const videoSaverMedia = veilSaver.querySelector("video.saver-media");
  stopHomeFx(veilSaver);
  stopSaverFrames();
  if (imgSaverMedia) {
    imgSaverMedia.removeAttribute("src");
    imgSaverMedia.hidden = true;
  }
  const canvasSaverRaster = veilSaver.querySelector("canvas.saver-raster");
  if (canvasSaverRaster) {
    canvasSaverRaster.hidden = true;
  }
  if (videoSaverMedia) {
    try {
      videoSaverMedia.pause();
    } catch (err) {}
    videoSaverMedia.removeAttribute("src");
    videoSaverMedia.hidden = true;
  }
  const orbs = settings.saverStyle || "orbs";
  const part = (settings.saverUrl || "").trim();
  if (orbs === "custom" && part) {
    if (color) {
      color.style.display = "none";
    }
    if (isVideoUrl(part) && videoSaverMedia) {
      videoSaverMedia.hidden = false;
      videoSaverMedia.src = part;
      const tab = Math.max(0.25, Number(settings.saverMediaSpeed) || 1);
      const frame = () => {
        try {
          videoSaverMedia.playbackRate = tab;
        } catch (err) {}
      };
      videoSaverMedia.onloadedmetadata = frame;
      videoSaverMedia.play().then(frame).catch(() => {});
    } else if (/\.(gif|webp)(\?|#|$)/i.test(part)) {
      playSaverStill(part);
    } else if (imgSaverMedia) {
      imgSaverMedia.hidden = false;
      imgSaverMedia.src = part;
    }
    return;
  }
  if (color) {
    color.style.display = "block";
  }
  setupHomeFx(veilSaver, {
    force: true,
    style: orbs === "custom" ? "orbs" : orbs,
    saverColors: true
  });
}
function showSaver() {
  if (saverWaitMs() <= 0 || saverVisible) {
    return;
  }
  if (document.body.classList.contains("gate-lock") || document.body.classList.contains("booting")) {
    return;
  }
  const veilSaver = document.getElementById("veilSaver");
  if (!veilSaver) {
    return;
  }
  if (saverHideTimer) {
    clearTimeout(saverHideTimer);
    saverHideTimer = null;
  }
  saverVisible = true;
  veilSaver.classList.add("on");
  requestAnimationFrame(renderSaverVisual);
}
function finishSaverHide() {
  const veilSaver = document.getElementById("veilSaver");
  if (!veilSaver || saverVisible) {
    return;
  }
  stopHomeFx(veilSaver);
  stopSaverFrames();
  const videoSaverMedia = veilSaver.querySelector("video.saver-media");
  if (videoSaverMedia) {
    try {
      videoSaverMedia.pause();
    } catch (err) {}
    videoSaverMedia.removeAttribute("src");
    videoSaverMedia.hidden = true;
  }
}
function hideSaver() {
  const veilSaver = document.getElementById("veilSaver");
  const ok = saverVisible || veilSaver && veilSaver.classList.contains("on");
  saverVisible = false;
  if (veilSaver) {
    veilSaver.classList.remove("on");
  }
  if (saverHideTimer) {
    clearTimeout(saverHideTimer);
  }
  if (ok) {
    saverHideTimer = setTimeout(finishSaverHide, 700);
  } else {
    finishSaverHide();
  }
  armSaver();
}
function armSaver() {
  if (saverTimer) {
    clearTimeout(saverTimer);
  }
  saverTimer = null;
  const ms = saverWaitMs();
  if (ms <= 0 || saverVisible) {
    return;
  }
  if (document.body.classList.contains("gate-lock")) {
    return;
  }
  saverTimer = setTimeout(showSaver, ms);
}
let saverBump = 0;
function noteSaverActivity() {
  if (saverVisible) {
    hideSaver();
    return;
  }
  const input = Date.now();
  if (input - saverBump < 800) {
    return;
  }
  saverBump = input;
  armSaver();
}
function syncSaverFields() {
  setSwitch(document.getElementById("saverEnabledSwitch"), !!settings.saverEnabled);
  const saverOpts = document.getElementById("saverOpts");
  if (saverOpts) {
    saverOpts.classList.toggle("enabled", !!settings.saverEnabled);
  }
  const saverDelay2 = document.getElementById("saverDelay");
  if (saverDelay2 && document.activeElement !== saverDelay2) {
    saverDelay2.value = settings.saverDelay || "";
  }
  const saverStyle = document.getElementById("saverStyle");
  const nodes = ["orbs", "stars", "constellation", "rain", "custom"];
  if (saverStyle) {
    saverStyle.value = nodes.includes(settings.saverStyle) ? settings.saverStyle : "orbs";
  }
  const saverUrl = document.getElementById("saverUrl");
  if (saverUrl && document.activeElement !== saverUrl) {
    saverUrl.value = settings.saverUrl || "";
  }
  const piece = settings.saverStyle === "custom";
  const chunk = piece && isTimedMedia(settings.saverUrl || "");
  const saverUrlRow = document.getElementById("saverUrlRow");
  const saverColorRows = document.getElementById("saverColorRows");
  const saverTuneRows = document.getElementById("saverTuneRows");
  const saverMediaSpeedRow = document.getElementById("saverMediaSpeedRow");
  if (saverUrlRow) {
    saverUrlRow.style.display = piece ? "" : "none";
  }
  if (saverColorRows) {
    saverColorRows.style.display = piece ? "none" : "";
  }
  if (saverTuneRows) {
    saverTuneRows.style.display = piece ? "none" : "";
  }
  if (saverMediaSpeedRow) {
    saverMediaSpeedRow.style.display = chunk ? "" : "none";
  }
  const payload = (value, extra, other, detail) => {
    const now = document.getElementById(value);
    const left = document.getElementById(extra);
    if (now && document.activeElement !== now) {
      now.value = String(other);
    }
    if (left) {
      left.textContent = detail ? Number(other).toFixed(detail) + "x" : String(other);
    }
  };
  payload("saverSpeed", "saverSpeedVal", settings.saverSpeed || 1, 2);
  payload("saverCount", "saverCountVal", settings.saverCount || 18, 0);
  payload("saverSize", "saverSizeVal", settings.saverSize || 1, 2);
  payload("saverMediaSpeed", "saverMediaSpeedVal", settings.saverMediaSpeed || 1, 2);
  const saverColorA = document.getElementById("saverColorA");
  const saverColorB = document.getElementById("saverColorB");
  if (saverColorA && document.activeElement !== saverColorA) {
    saverColorA.value = safeColorValue(settings.saverColorA, "#7aa2ff");
  }
  if (saverColorB && document.activeElement !== saverColorB) {
    saverColorB.value = safeColorValue(settings.saverColorB, "#b88cff");
  }
}
function commitSaverDelay() {
  const saverDelay2 = document.getElementById("saverDelay");
  if (!saverDelay2) {
    return;
  }
  const current = saverDelay2.value.trim();
  if (!current) {
    settings.saverDelay = "";
    settings.saverMinutes = 0;
    save();
    armSaver();
    return;
  }
  if (!parseVeilDuration(current)) {
    if (document.activeElement !== saverDelay2) {
      saverDelay2.value = settings.saverDelay || "";
    }
    return;
  }
  settings.saverDelay = current;
  settings.saverMinutes = 0;
  save();
  armSaver();
}
function profileAvatarSrc() {
  if (profile && profile.avatar) {
    return profile.avatar;
  } else {
    return IMG + "profileplaceholder.png";
  }
}
function paintProfilePreview() {
  const profilePreview = document.getElementById("profilePreview");
  if (!profilePreview) {
    return;
  }
  profilePreview.src = profileAvatarSrc();
  profilePreview.classList.toggle("is-ph", !profile || !profile.avatar);
}
function lockVeil() {
  closeMenu();
  if (!profile.password) {
    alert("Set a password on first-run sign up before locking.");
    return;
  }
  if (settings.lockUnload) {
    const box = confirm("Lock and unload open pages? Unsaved page state may be lost.");
    if (!box) {
      return;
    }
    tabs.forEach(value => {
      if (value.engineFrame) {
        try {
          const short = value.engineFrame.element || value.engineFrame.frame;
          if (short && short.remove) {
            short.remove();
          }
        } catch {}
        value.engineFrame = null;
      }
    });
  }
  const lockOverlay = document.querySelector(".lock-overlay");
  if (lockOverlay) {
    lockOverlay.remove();
  }
  const old = document.createElement("div");
  old.className = "lock-overlay";
  const {
    time: copy,
    date: base
  } = formatWelcomeClock(new Date());
  old.innerHTML = "<div class=\"lock-screen\"><div class=\"lock-avatar-frame\"><img class=\"lock-avatar" + (profile && profile.avatar ? "" : " is-ph") + "\" alt=\"\" src=\"" + escapeHTML(profileAvatarSrc()) + "\"></div><div class=\"lock-name\">" + escapeHTML(profile.name || "guest") + "</div><div class=\"lock-clock\" id=\"lockClock\">" + escapeHTML(copy) + "" + escapeHTML(base) + "";
  document.body.appendChild(old);
  const full = () => {
    const flag = formatWelcomeClock(new Date());
    const lockClock = old.querySelector("#lockClock");
    const lockDate = old.querySelector("#lockDate");
    if (lockClock) {
      lockClock.textContent = flag.time;
    }
    if (lockDate) {
      lockDate.textContent = flag.date;
    }
  };
  old._clock = setInterval(full, 1000);
  const short2 = () => {
    if (old._clock) {
      clearInterval(old._clock);
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };
  const line2 = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  if (line2) {
    line2.call(document.documentElement).catch(() => {});
  }
  const lockPass = old.querySelector("#lockPass");
  const lockErr = old.querySelector("#lockErr");
  lockPass.focus();
  const code = () => {
    if (lockPass.value === profile.password) {
      short2();
      old.remove();
      if (settings.lockUnload) {
        const item = getActiveTab();
        if (item && !item.newTab && item.url) {
          const line = document.querySelector(".page[data-page-id=\"" + item.id + "\"]");
          if (line && !item.engineFrame) {
            line.innerHTML = "";
            const req = document.createElement("div");
            req.style.cssText = "width:100%;height:100%";
            line.appendChild(req);
            createEngineFrame(item, req);
          }
        }
      }
      return;
    }
    lockErr.textContent = "Wrong password.";
    lockPass.value = "";
    lockPass.focus();
  };
  old.querySelector("#lockGo").onclick = code;
  lockPass.addEventListener("keydown", value => {
    if (value.key === "Enter") {
      code();
    }
  });
}
function highlightTheme() {
  try {
    if (!settings.transport || settings.transport !== "epoxy" && settings.transport !== "libcurl") {
      settings.transport = "epoxy";
    }
    document.querySelectorAll("[data-theme]").forEach(value => value.classList.toggle("active", value.dataset.theme === settings.theme));
    const customThemeCard = document.getElementById("customThemeCard");
    if (customThemeCard) {
      customThemeCard.classList.toggle("active", settings.theme === "custom");
    }
    const customColorCard = document.getElementById("customColorCard");
    if (customColorCard) {
      customColorCard.classList.toggle("open", settings.theme === "custom" || customColorCard.classList.contains("force-open"));
    }
    const transportEpoxy = document.getElementById("transportEpoxy");
    const transportLibcurl = document.getElementById("transportLibcurl");
    if (transportEpoxy) {
      transportEpoxy.classList.toggle("active", settings.transport !== "libcurl");
    }
    if (transportLibcurl) {
      transportLibcurl.classList.toggle("active", settings.transport === "libcurl");
    }
    const launchModeSelect2 = document.getElementById("launchModeSelect");
    if (launchModeSelect2) {
      launchModeSelect2.value = settings.launchMode === "auto" ? "auto" : "manual";
    }
    setSwitch(document.getElementById("adblockSwitch"), settings.adBlocker !== false);
    setSwitch(document.getElementById("animEnabledSwitch"), !!settings.animEnabled);
    setSwitch(document.getElementById("lockUnloadSwitch"), !!settings.lockUnload);
    setSwitch(document.getElementById("closeOriginSwitch"), !!settings.closeOriginOnBlank);
    setSwitch(document.getElementById("confirmLeaveSwitch"), !!settings.confirmLeave);
    setSwitch(document.getElementById("time24Switch"), settings.timeFormat === "24");
    const animOpts = document.getElementById("animOpts");
    if (animOpts) {
      animOpts.classList.toggle("enabled", !!settings.animEnabled);
    }
    const maxLoadedTabs = document.getElementById("maxLoadedTabs");
    const maxLoadedTabsVal = document.getElementById("maxLoadedTabsVal");
    if (maxLoadedTabs) {
      maxLoadedTabs.value = String(maxLoaded());
      if (maxLoadedTabsVal) {
        maxLoadedTabsVal.textContent = String(maxLoaded());
      }
    }
    const searchEngineSelect2 = document.getElementById("searchEngineSelect");
    if (searchEngineSelect2) {
      if (!SEARCH_ENGINES[settings.searchEngine]) {
        settings.searchEngine = "google";
      }
      searchEngineSelect2.value = settings.searchEngine || "google";
    }
    const animStyle2 = document.getElementById("animStyle");
    if (animStyle2) {
      animStyle2.value = settings.animStyle || "orbs";
    }
    const animSpeed2 = document.getElementById("animSpeed");
    const animSpeedVal = document.getElementById("animSpeedVal");
    if (animSpeed2) {
      animSpeed2.value = String(settings.animSpeed || 1);
      if (animSpeedVal) {
        animSpeedVal.textContent = Number(settings.animSpeed || 1).toFixed(2) + "x";
      }
    }
    const animColorA = document.getElementById("animColorA");
    const animColorB = document.getElementById("animColorB");
    if (animColorA) {
      animColorA.value = safeColorValue(settings.animColorA, "#7aa2ff");
    }
    if (animColorB) {
      animColorB.value = safeColorValue(settings.animColorB, "#b88cff");
    }
    const animCount2 = document.getElementById("animCount");
    const animCountVal = document.getElementById("animCountVal");
    if (animCount2) {
      animCount2.value = String(settings.animCount || 18);
      if (animCountVal) {
        animCountVal.textContent = String(settings.animCount || 18);
      }
    }
    const animSize2 = document.getElementById("animSize");
    const animSizeVal = document.getElementById("animSizeVal");
    if (animSize2) {
      animSize2.value = String(settings.animSize || 1);
      if (animSizeVal) {
        animSizeVal.textContent = Number(settings.animSize || 1).toFixed(2) + "x";
      }
    }
    const wrap = ["orbs", "stars", "constellation", "rain", "custom"];
    if (animStyle2) {
      animStyle2.value = wrap.includes(settings.animStyle) ? settings.animStyle : "orbs";
    }
    const page = settings.animStyle === "custom";
    const tab = page && isTimedMedia(settings.backgroundUrl || "");
    const animUrlRow = document.getElementById("animUrlRow");
    const animTuneRows = document.getElementById("animTuneRows");
    const animColorRows = document.getElementById("animColorRows");
    const animMediaSpeedRow = document.getElementById("animMediaSpeedRow");
    if (animUrlRow) {
      animUrlRow.style.display = page ? "" : "none";
    }
    if (animTuneRows) {
      animTuneRows.style.display = page ? "none" : "";
    }
    if (animColorRows) {
      animColorRows.style.display = page ? "none" : "";
    }
    if (animMediaSpeedRow) {
      animMediaSpeedRow.style.display = tab ? "" : "none";
    }
    const backgroundUrl = document.getElementById("backgroundUrl");
    if (backgroundUrl && document.activeElement !== backgroundUrl) {
      backgroundUrl.value = settings.backgroundUrl || "";
    }
    const animMediaSpeed = document.getElementById("animMediaSpeed");
    const animMediaSpeedVal = document.getElementById("animMediaSpeedVal");
    if (animMediaSpeed && document.activeElement !== animMediaSpeed) {
      animMediaSpeed.value = String(settings.animMediaSpeed || 1);
    }
    if (animMediaSpeedVal) {
      animMediaSpeedVal.textContent = Number(settings.animMediaSpeed || 1).toFixed(2) + "x";
    }
    syncSaverFields();
    paintProfilePreview();
  } catch (err) {
    console.warn("highlightTheme", err);
  }
}
function pushAdblockToSW() {
  const hash = settings.adBlocker !== false;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "veil-adblock",
        enabled: hash
      });
    }
  } catch {}
}
function applyTheme(value) {
  if (!THEMES[value]) {
    return;
  }
  const secret = {
    transport: settings.transport,
    wispId: settings.wispId,
    wispCustom: settings.wispCustom,
    launchMode: settings.launchMode,
    backgroundUrl: settings.backgroundUrl,
    adBlocker: settings.adBlocker,
    maxLoadedTabs: settings.maxLoadedTabs,
    searchEngine: settings.searchEngine,
    lockUnload: settings.lockUnload,
    confirmLeave: settings.confirmLeave,
    animEnabled: settings.animEnabled,
    animStyle: settings.animStyle,
    animSpeed: settings.animSpeed,
    animColorA: settings.animColorA,
    animColorB: settings.animColorB,
    animCount: settings.animCount,
    animSize: settings.animSize,
    animMediaSpeed: settings.animMediaSpeed,
    customServers: settings.customServers,
    timeFormat: settings.timeFormat,
    saverMinutes: settings.saverMinutes,
    saverDelay: settings.saverDelay,
    saverEnabled: settings.saverEnabled,
    saverStyle: settings.saverStyle,
    saverUrl: settings.saverUrl,
    saverColorA: settings.saverColorA,
    saverColorB: settings.saverColorB,
    saverSpeed: settings.saverSpeed,
    saverCount: settings.saverCount,
    saverSize: settings.saverSize,
    saverMediaSpeed: settings.saverMediaSpeed,
    customOutline: settings.customOutline,
    colorMode: settings.colorMode,
    customPalette: settings.customPalette
  };
  settings = Object.assign({}, settings, THEMES[value], secret, {
    theme: value
  });
  const customColorCard = document.getElementById("customColorCard");
  if (customColorCard) {
    customColorCard.classList.remove("open", "force-open");
  }
  applyCSSVariables();
  save();
  highlightTheme();
  loadColorInputs();
  applyNewTabBackground();
}
function applyCustomColors() {
  const colorBg = document.getElementById("colorBg");
  const colorPanel = document.getElementById("colorPanel");
  const colorAccent = document.getElementById("colorAccent");
  const colorText = document.getElementById("colorText");
  const colorOutline = document.getElementById("colorOutline");
  const image = colorBg && colorBg.value || settings.bg || "#101010";
  const canvas = colorPanel && colorPanel.value || image;
  const ctx = colorAccent && colorAccent.value || "#ffffff";
  const width = colorText && colorText.value || "#f2f2f2";
  const height = colorOutline && colorOutline.value || "";
  settings.bg = image;
  settings.panel = canvas;
  settings.accent = ctx;
  settings.text = width;
  settings.customOutline = /^#[0-9a-fA-F]{6}$/.test(height) ? height : "";
  settings.theme = "custom";
  deriveCustomSurfaces();
  settings.customPalette = {
    bg: settings.bg,
    panel: settings.panel,
    accent: settings.accent,
    text: settings.text,
    outline: settings.customOutline || settings.border || ""
  };
  applyCSSVariables();
  save();
  highlightTheme();
  loadColorInputs();
}
function applyBackground() {
  const backgroundUrl = document.getElementById("backgroundUrl");
  if (backgroundUrl) {
    settings.backgroundUrl = backgroundUrl.value.trim();
  }
  save();
  highlightTheme();
  applyNewTabBackground();
}
function applyCloakPreset(value) {
  const speed = resolveCloakPreset(value);
  if (!speed) {
    return;
  }
  cloak = {
    title: speed.title,
    icon: speed.icon
  };
  document.title = cloak.title;
  const favicon = document.getElementById("favicon");
  if (favicon) {
    favicon.href = cloak.icon;
  }
  syncAboutBlankChrome();
  loadCloakInputs();
  save();
}
function applyCloak() {
  cloak.title = document.getElementById("cloakTitle").value.trim() || "Veil";
  cloak.icon = document.getElementById("cloakIcon").value.trim() || FAVI;
  document.title = cloak.title;
  document.getElementById("favicon").href = cloak.icon;
  syncAboutBlankChrome();
  save();
}
function resetSettings() {
  settings = Object.assign({}, DEFAULT_SETTINGS);
  panic = Object.assign({}, DEFAULT_PANIC);
  cloak = {
    title: "Veil",
    icon: FAVI
  };
  document.title = "Veil";
  document.getElementById("favicon").href = FAVI;
  applyCSSVariables();
  save();
  renderChrome();
  applyNewTabBackground();
}
async function clearLocalData() {
  const colorB = confirm("Clear all Veil cookies, local storage, and cache for this site?\n\nYou will be signed out.");
  if (!colorB) {
    return;
  }
  try {
    if (window.VeilAccess && typeof window.VeilAccess.signOut === "function") {
      window.VeilAccess.signOut();
    }
  } catch (err) {}
  try {
    const flag = [];
    for (let choice = 0; choice < localStorage.length; choice++) {
      const record = localStorage.key(choice);
      if (record && (record.indexOf("veil") === 0 || record.indexOf("veil_") === 0)) {
        flag.push(record);
      }
    }
    flag.forEach(value => localStorage.removeItem(value));
  } catch (err) {}
  try {
    const part = document.cookie.split(";");
    part.forEach(value => {
      const other = value.split("=")[0].trim();
      if (!other) {
        return;
      }
      if (other.indexOf("veil") !== -1 || other.indexOf("veil_") === 0) {
        document.cookie = other + "=; path=/; max-age=0; SameSite=Lax";
        document.cookie = other + "=; path=" + (typeof BASE !== "undefined" && BASE ? BASE + "/" : "/") + "; max-age=0; SameSite=Lax";
      }
    });
  } catch (err) {}
  try {
    if (caches && caches.keys) {
      const result = await caches.keys();
      await Promise.all(result.map(value => caches.delete(value)));
    }
  } catch (err) {}
  try {
    if (navigator.serviceWorker) {
      const ok = await navigator.serviceWorker.getRegistrations();
      await Promise.all(ok.map(value => value.unregister()));
    }
  } catch (err) {}
  location.reload();
}
async function setTransport(value) {
  settings.transport = value === "libcurl" ? "libcurl" : "epoxy";
  save();
  highlightTheme();
  const engineStatus = document.getElementById("engineStatus");
  const libcurl = settings.transport === "libcurl" ? "Libcurl" : "Epoxy";
  paintEngineStatus(libcurl);
  try {
    await applyMuxTransport();
    paintEngineStatus();
  } catch (err) {
    console.warn(err);
    if (engineStatus) {
      engineStatus.textContent = "Engine switch failed - try the other one";
    }
  }
}
function isTypingTarget(value) {
  if (!value) {
    return false;
  }
  const panic2 = (value.tagName || "").toLowerCase();
  return panic2 === "input" || panic2 === "textarea" || panic2 === "select" || value.isContentEditable;
}
document.getElementById("bindPanic").onclick = () => {
  bindingPanic = true;
  document.getElementById("panicKey").value = "Press any key...";
  document.getElementById("panicKey").focus();
};
document.getElementById("unbindPanic").onclick = () => {
  panic = {
    key: "",
    code: "",
    url: document.getElementById("panicUrl").value.trim() || DEFAULT_PANIC.url
  };
  save();
  loadPanicInputs();
};
document.addEventListener("keydown", value => {
  if (bindingPanic) {
    value.preventDefault();
    value.stopPropagation();
    bindingPanic = false;
    if (value.key === "Escape") {
      loadPanicInputs();
      return;
    }
    panic.key = value.key.length === 1 ? value.key.toUpperCase() : value.key;
    panic.code = value.code;
    panic.url = document.getElementById("panicUrl").value.trim() || DEFAULT_PANIC.url;
    save();
    loadPanicInputs();
    return;
  }
  if (!panic.code) {
    return;
  }
  if (isTypingTarget(value.target)) {
    return;
  }
  if (value.code === panic.code || value.key === panic.key || panic.key && value.key.toUpperCase() === panic.key) {
    value.preventDefault();
    location.replace(panic.url || DEFAULT_PANIC.url);
  }
}, true);
function isInsideAboutBlank() {
  try {
    if (sessionStorage.getItem("veil_in_ab") === "1") {
      return true;
    }
  } catch {}
  try {
    if (new URLSearchParams(location.search).get("ab") === "1") {
      return true;
    }
  } catch {}
  try {
    if (window.parent && window.parent !== window) {
      try {
        if (String(window.parent.location.href || "").startsWith("about:")) {
          return true;
        }
      } catch {}
    }
  } catch {}
  return false;
}
function markAboutBlankSession() {
  try {
    if (new URLSearchParams(location.search).get("ab") === "1") {
      sessionStorage.setItem("veil_in_ab", "1");
    }
  } catch {}
}
function toggleEruda() {
  closeMenu();
  const bookmark = getActiveTab();
  if (!bookmark || bookmark.newTab || bookmark.isGames || bookmark.isAdmin) {
    return;
  }
  const historyItem = bookmark.engineFrame;
  if (!historyItem) {
    alert("Open a site first.");
    return;
  }
  const game = (historyItem.element || historyItem.frame || historyItem).contentWindow;
  if (!game) {
    alert("Page not ready yet.");
    return;
  }
  try {
    if (game.eruda) {
      game.eruda.show();
      return;
    }
    const label = game.document.createElement("script");
    label.src = "https://cdn.jsdelivr.net/npm/eruda";
    label.onload = () => {
      try {
        game.eruda.init();
        game.eruda.show();
      } catch (err) {
        console.warn(err);
      }
    };
    game.document.documentElement.appendChild(label);
  } catch (err) {
    console.warn(err);
    alert("DevTools unavailable for this page.");
  }
}
function updateDevtoolsMenuState() {
  const menuDevtools = document.getElementById("menuDevtools");
  const menuFullscreen = document.getElementById("menuFullscreen");
  const message = getActiveTab();
  const friend = !message || !!message.newTab || !!message.isGames || !!message.isAdmin;
  const group = !message || !!message.newTab || !!message.isGames;
  if (menuDevtools) {
    menuDevtools.classList.toggle("disabled", friend);
    menuDevtools.disabled = friend;
    menuDevtools.setAttribute("aria-disabled", friend ? "true" : "false");
  }
  if (menuFullscreen) {
    menuFullscreen.classList.toggle("disabled", group);
    menuFullscreen.disabled = group;
    menuFullscreen.setAttribute("aria-disabled", group ? "true" : "false");
  }
}
function syncAboutBlankChrome() {
  const veil = cloak && cloak.title || "Veil";
  const invite = absFaviconUrl(cloak && cloak.icon || FAVI);
  try {
    document.title = veil;
    const favicon = document.getElementById("favicon");
    if (favicon) {
      if (typeof paintBrowserBadge === "function") {
        try { paintBrowserBadge(typeof chatUnreadTotal === "function" && chatUnreadTotal() > 0); }
        catch (err) { favicon.href = invite; }
      } else {
        favicon.href = invite;
      }
    }
  } catch {}
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "veil-chrome",
        title: veil,
        icon: invite
      }, "*");
    }
  } catch {}
  try {
    if (window.top && window.top !== window) {
      window.top.postMessage({
        type: "veil-chrome",
        title: veil,
        icon: invite
      }, "*");
    }
  } catch {}
}
function absFaviconUrl(value) {
  let session = value || FAVI;
  try {
    if (session.startsWith("data:") || /^https?:\/\//i.test(session)) {
      return session;
    }
    if (session.startsWith("//")) {
      return location.protocol + session;
    }
    if (session.startsWith("/")) {
      return location.origin + session;
    }
    return location.origin + REPO_PATH + String(session).replace(/^\.\//, "");
  } catch {
    return location.origin + REPO_PATH + "image/favi.png";
  }
}
function cloakNow() {
  const veil = cloak && cloak.title || document.title || "Veil";
  const gate = absFaviconUrl(cloak && cloak.icon || FAVI);
  return {
    title: veil,
    icon: gate
  };
}
function escCloak(value2) {
  return String(value2 || "").replace(/[&<>"]/g, function (value) {
    if (value === "&") {
      return "&amp;";
    }
    if (value === "<") {
      return "&lt;";
    }
    if (value === ">") {
      return "&gt;";
    }
    return "&quot;";
  });
}
function cloakHead() {
  const value = cloakNow();
  return "<title>" + escCloak(value.title) + "</title><link rel=\"icon\" href=\"" + escCloak(value.icon) + "\"><script>window.addEventListener('message',function(ev){var data=ev.data||{};if(!data||data.type!=='veil-chrome')return;if(data.title)document.title=String(data.title);if(data.icon){var link=document.querySelector('link[rel=\"icon\"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}link.href=String(data.icon);}});</script>";
}
function pushCloak(value) {
  if (!value) {
    return;
  }
  const other = cloakNow();
  try {
    value.postMessage({
      type: "veil-chrome",
      title: other.title,
      icon: other.icon
    }, "*");
  } catch (err) {}
}
function watchCloak(value) {
  let source = 0;
  const target = setInterval(() => {
    source += 1;
    pushCloak(value);
    if (source > 16) {
      clearInterval(target);
    }
  }, 250);
}
let skipLeaveWarning = false;
function maybeCloseOrigin() {
  if (!settings || !settings.closeOriginOnBlank) {
    return;
  }
  skipLeaveWarning = true;
  try {
    window.onbeforeunload = null;
  } catch (err) {}
  try {
    location.replace("about:blank");
  } catch (err2) {
    try {
      document.open();
      document.write("<!DOCTYPE html><html><head><title></title></head><body></body></html>");
      document.close();
    } catch (err) {}
  }
}
function openAboutBlank(value2, extra) {
  if (isInsideAboutBlank()) {
    console.info("[veil] already inside about:blank - skip");
    return;
  }
  const kind = location.href.split("#")[0];
  const mode = kind.replace(/"/g, "%22");
  const force = "<!DOCTYPE html><html><head>" + cloakHead() + "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;margin:0;padding:0;display:block;background:#000}</style></head><body><iframe src=\"" + mode + "\"></iframe></body></html>";
  let immediate;
  if (value2 === "window") {
    immediate = window.open("", "", "width=1100,height=700,resizable=yes,scrollbars=yes");
  } else {
    immediate = window.open("about:blank");
  }
  if (!immediate) {
    alert("Popup blocked - allow popups for this site.");
    return;
  }
  const locked = value => {
    try {
      immediate.document.open();
      immediate.document.write(value);
      immediate.document.close();
      pushCloak(immediate);
      watchCloak(immediate);
      maybeCloseOrigin();
    } catch (err) {
      console.error(err);
      alert("Could not write about:blank shell.");
    }
  };
  locked(force);
}
function openLaunchModal() {
  closeMenu();
  const show = document.createElement("div");
  show.className = "modal-overlay";
  show.innerHTML = "<div class=\"modal-box\"><h2>How would you like to launch?</h2><p>Opening the tab in about:blank is an experimental option and will close if you reload it in any way. Other than that, it should work fine.</p><select id=\"launchKind\" class=\"text-input\"><option value=\"tab\">New about:blank tab</option><option value=\"window\">New about:blank window</option></select><select id=\"launchMethod\" class=\"text-input\"><option value=\"1\"" + ((settings && settings.launchEmbed) === "2" ? "" : " selected") + ">Method 1</option><option value=\"2\"" + ((settings && settings.launchEmbed) === "2" ? " selected" : "") + ">Method 2</option></select><div class=\"modal-actions\"><button class=\"modal-cancel\" type=\"button\">Cancel</button><button class=\"modal-go\" type=\"button\">Launch</button></div></div>";
  document.body.appendChild(show);
  show.querySelector(".modal-cancel").onclick = () => show.remove();
  show.onclick = value => {
    if (value.target === show) {
      show.remove();
    }
  };
  show.querySelector(".modal-go").onclick = () => {
    const ev = show.querySelector("#launchKind").value;
    const handler = show.querySelector("#launchMethod").value === "2" ? "2" : "1";
    settings.launchEmbed = handler;
    try {
      save();
    } catch (err) {}
    show.remove();
    openAboutBlank(ev === "window" ? "window" : "tab", handler);
  };
}
function on(value, extra) {
  const response = document.getElementById(value);
  if (response) {
    response.onclick = extra;
  }
}
on("backBtn", goBack);
on("forwardBtn", goForward);
on("refreshBtn", reload);
on("homeBtn", goHome);
on("settingsOpenBtn", () => openPanel("settingsPanel"));
on("bookmarkBtn", toggleBookmark);
document.getElementById("address").addEventListener("keydown", value => {
  if (value.key === "Enter") {
    value.preventDefault();
    navigate(value.target.value);
  }
});
const ABLY_KEY = "PwdaGQ.kBtNLA:ovkftNAocDZmr4pFWEWIsPA4td0MZP8MRrlG6yRaakY";
const CHAT_PUBLIC = "veil-chat:public";
let chatAbly = null;
let chatUnreads = {};
let chatLog = {};
let accountData = null;
let gamesDataReady = false;
let chatPushTimer = null;
let chatPushGen = 0;
let chatSyncing = null;
const CHAT_LOG_KEY = "veil_chat_log";
const CHAT_OWNER_KEY = "veil_chat_owner";
function accountEmail() {
  try {
    const meta = window.VeilAccess && window.VeilAccess.getMeta && window.VeilAccess.getMeta();
    return String(meta && meta.email || "").trim().toLowerCase();
  } catch (err) {
    return "";
  }
}
function accountToken() {
  try {
    return window.VeilAccess && window.VeilAccess.getToken ? window.VeilAccess.getToken() : "";
  } catch (err) {
    return "";
  }
}
function workerBase() {
  return (localStorage.getItem("veil_worker_url") || "https://veil-access.retropixel404.workers.dev").replace(/\/$/, "");
}
function chatOwnerMatches() {
  const email = accountEmail();
  let owner = "";
  try {
    owner = localStorage.getItem(CHAT_OWNER_KEY) || "";
  } catch (err) {}
  if (!email || !owner) {
    return true;
  }
  return owner === email;
}
function loadChatLogCache() {
  if (!chatOwnerMatches()) {
    chatLog = {};
    return;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_LOG_KEY) || "null");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      chatLog = raw;
    }
  } catch (err) {}
}
loadChatLogCache();
function slimChatMessage(value) {
  const face = String(value && value.pfp || "");
  return {
    uid: String(value && value.uid || ""),
    name: String(value && value.name || "").slice(0, 24),
    pfp: face.indexOf("data:") === 0 ? "" : face.slice(0, 400),
    text: String(value && value.text || "").slice(0, 1000),
    ts: Number(value && (value.ts || value.at)) || Date.now(),
    email: String(value && value.email || "")
  };
}
function writeChatCache(profile) {
  const email = accountEmail();
  try {
    if (email) {
      localStorage.setItem(CHAT_OWNER_KEY, email);
    }
    if (profile) {
      localStorage.setItem("veil_chat_profile", JSON.stringify(profile));
    }
    localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatLog));
  } catch (err) {}
}
function chatBundleFromState(profile) {
  const history = {};
  Object.keys(chatLog || {}).forEach(key => {
    const rows = Array.isArray(chatLog[key]) ? chatLog[key].slice(-200) : [];
    history[key] = rows.map(slimChatMessage);
  });
  return {
    username: profile.username || "",
    pfp: profile.pfp || "",
    notifyDot: localStorage.getItem("veil_msg_dots") === "1",
    adminMode: !!profile.adminMode,
    uid: profile.uid || "",
    friends: profile.friends || [],
    groups: profile.groups || [],
    pendingIn: profile.pendingIn || [],
    pendingOut: profile.pendingOut || [],
    invites: profile.invites || [],
    history: history
  };
}
function applyChatBundle(chat) {
  if (!chat || typeof chat !== "object" || !chat.uid) {
    return;
  }
  const profile = {
    username: chat.username || "",
    pfp: chat.pfp || "",
    notifyDot: !!chat.notifyDot,
    adminMode: !!chat.adminMode,
    uid: chat.uid,
    friends: Array.isArray(chat.friends) ? chat.friends : [],
    groups: Array.isArray(chat.groups) ? chat.groups : [],
    pendingIn: Array.isArray(chat.pendingIn) ? chat.pendingIn : [],
    pendingOut: Array.isArray(chat.pendingOut) ? chat.pendingOut : [],
    invites: Array.isArray(chat.invites) ? chat.invites : []
  };
  try {
    localStorage.setItem("veil_msg_dots", profile.notifyDot ? "1" : "0");
  } catch (err) {}
  chatLog = {};
  const history = chat.history && typeof chat.history === "object" ? chat.history : {};
  Object.keys(history).forEach(key => {
    if (Array.isArray(history[key])) {
      chatLog[key] = history[key].slice(-200).map(slimChatMessage);
    }
  });
  writeChatCache(profile);
}
async function fetchAccountData() {
  const token = accountToken();
  if (!token) {
    return null;
  }
  const res = await fetch(workerBase() + "/api/user/data", {
    method: "GET",
    headers: {
      authorization: "Bearer " + token
    }
  });
  const body = await res.json().catch(() => null);
  if (!body || !body.ok || !body.data || typeof body.data !== "object") {
    return null;
  }
  accountData = body.data;
  return body.data;
}
async function postAccountData(data) {
  const token = accountToken();
  if (!token) {
    return;
  }
  accountData = data;
  await fetch(workerBase() + "/api/user/data", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      token: token,
      data: data
    })
  });
}
async function pushChatAccountNow() {
  const gen = ++chatPushGen;
  const token = accountToken();
  if (!token) {
    return;
  }
  const profile = chatProfile();
  if (!profile.uid) {
    return;
  }
  let data = accountData;
  if (!data) {
    try {
      data = await fetchAccountData();
    } catch (err) {
      data = null;
    }
  }
  if (gen !== chatPushGen) {
    return;
  }
  if (!data || typeof data !== "object") {
    data = {};
  }
  const next = Object.assign({}, data, {
    chat: chatBundleFromState(profile)
  });
  if (gamesDataReady) {
    next.favorites = gamesUserData.favorites || [];
    next.recent = gamesUserData.recent || [];
    next.notes = gamesUserData.notes || {};
  }
  await postAccountData(next);
}
function scheduleChatPush() {
  if (chatPushTimer) {
    clearTimeout(chatPushTimer);
  }
  chatPushTimer = setTimeout(function () {
    pushChatAccountNow().catch(function () {});
  }, 500);
}
async function syncChatFromAccount() {
  if (chatSyncing) {
    return chatSyncing;
  }
  chatSyncing = (async () => {
    const email = accountEmail();
    const token = accountToken();
    if (!token) {
      return;
    }
    const data = await fetchAccountData();
    if (!data) {
      return;
    }
    const remote = data.chat;
    const sameOwner = chatOwnerMatches();
    if (remote && remote.uid) {
      let prev = "";
      try {
        prev = (JSON.parse(localStorage.getItem("veil_chat_profile") || "null") || {}).uid || "";
      } catch (err) {}
      applyChatBundle(remote);
      if (prev && prev !== remote.uid && chatAbly) {
        try {
          chatAbly.close();
        } catch (err) {}
        chatAbly = null;
        bootChatLink();
      }
      try {
        fillChatSettings();
      } catch (err) {}
      refreshChatIfOpen();
      return;
    }
    if (!sameOwner) {
      try {
        localStorage.removeItem("veil_chat_profile");
        localStorage.removeItem(CHAT_LOG_KEY);
      } catch (err) {}
      chatLog = {};
      if (email) {
        localStorage.setItem(CHAT_OWNER_KEY, email);
      }
    }
    const profile = chatProfile();
    if (email) {
      try {
        localStorage.setItem(CHAT_OWNER_KEY, email);
      } catch (err) {}
    }
    if (profile.uid) {
      await pushChatAccountNow();
    }
    try {
      fillChatSettings();
    } catch (err) {}
    refreshChatIfOpen();
  })().finally(() => {
    chatSyncing = null;
  });
  return chatSyncing;
}
window.addEventListener("veil-session-meta", function () {
  syncChatFromAccount().catch(function () {});
});
let chatRoom = "public";
let chatLastSend = 0;
let chatBooting = null;
function chatProfile() {
  const clientId = {
    username: "",
    pfp: "",
    notifyDot: false,
    adminMode: false,
    uid: "",
    friends: [],
    groups: [],
    pendingIn: [],
    pendingOut: [],
    invites: []
  };
  if (chatOwnerMatches()) {
    try {
      const ok = JSON.parse(localStorage.getItem("veil_chat_profile") || "null");
      if (ok && typeof ok === "object") {
        Object.assign(clientId, ok);
      }
    } catch (err) {}
  }
  ["friends", "groups", "pendingIn", "pendingOut", "invites"].forEach(value => {
    if (!Array.isArray(clientId[value])) {
      clientId[value] = [];
    }
  });
  let dots = false;
  try {
    dots = localStorage.getItem("veil_msg_dots") === "1";
  } catch (err) {}
  clientId.notifyDot = dots;
  if (!clientId.uid) {
    clientId.uid = Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem("veil_chat_profile", JSON.stringify(clientId));
      const email = accountEmail();
      if (email) {
        localStorage.setItem(CHAT_OWNER_KEY, email);
      }
    } catch (err) {}
  }
  return clientId;
}
function saveChatProfile(value) {
  try {
    localStorage.setItem("veil_chat_profile", JSON.stringify(value));
    const email = accountEmail();
    if (email) {
      localStorage.setItem(CHAT_OWNER_KEY, email);
    }
  } catch (err) {}
  scheduleChatPush();
}
function chatAdminEmails() {
  try {
    const ms = JSON.parse(localStorage.getItem("veil_chat_admins") || "[]");
    if (Array.isArray(ms)) {
      return ms.map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
    } else {
      return [];
    }
  } catch (err) {
    return [];
  }
}
function myChatEmail() {
  try {
    const input = window.VeilAccess && window.VeilAccess.getMeta && window.VeilAccess.getMeta();
    if (input && input.email) {
      return String(input.email).trim().toLowerCase();
    } else {
      return "";
    }
  } catch (err) {
    return "";
  }
}
function isChatAdmin() {
  const body = myChatEmail();
  return !!body && chatAdminEmails().indexOf(body) !== -1;
}
function dmChannel(value, extra) {
  return "veil-chat:dm:" + [String(value || ""), String(extra || "")].sort().join("--");
}
function groupChannel(value) {
  return "veil-chat:g:" + String(value || "");
}
function inboxChannel(value) {
  return "veil-chat:in:" + String(value || "");
}
function currentChatChannel() {
  const isErr = chatProfile();
  if (chatRoom === "public") {
    return CHAT_PUBLIC;
  }
  if (String(chatRoom).indexOf("dm:") === 0) {
    return dmChannel(isErr.uid, chatRoom.slice(3));
  }
  if (String(chatRoom).indexOf("g:") === 0) {
    return groupChannel(chatRoom.slice(2));
  }
  return CHAT_PUBLIC;
}
function chatUnreadTotal() {
  if (chatProfile().notifyDot === false) {
    return 0;
  }
  let name2 = 0;
  Object.keys(chatUnreads).forEach(value => {
    name2 += chatUnreads[value] || 0;
  });
  return name2;
}
function paintBrowserBadge(value) {
  const favicon = document.getElementById("favicon");
  if (!favicon) {
    return;
  }
  const icon = typeof cloak !== "undefined" && cloak && cloak.icon ? cloak.icon : FAVI;
  if (!value) {
    favicon.href = icon;
    return;
  }
  const image = new Image();
  image.onload = () => {
    try {
      const source = document.createElement("canvas");
      source.width = 64;
      source.height = 64;
      const target = source.getContext("2d");
      target.drawImage(image, 0, 0, 64, 64);
      target.beginPath();
      target.arc(50, 50, 11, 0, Math.PI * 2);
      target.fillStyle = "#111";
      target.fill();
      target.beginPath();
      target.arc(50, 50, 8, 0, Math.PI * 2);
      target.fillStyle = "#ff4d4f";
      target.fill();
      favicon.href = source.toDataURL("image/png");
    } catch (err) {
      favicon.href = icon;
    }
  };
  image.onerror = () => {
    favicon.href = icon;
  };
  image.src = icon;
}
function paintChatAlerts() {
  const url = chatUnreadTotal() > 0;
  document.querySelectorAll("[data-chat-alert]").forEach(value => value.classList.toggle("on", url));
  paintBrowserBadge(url);
}
function chatToast(value, extra) {
  if (!value) {
    return;
  }
  let veilToasts = document.getElementById("veilToasts");
  if (!veilToasts) {
    veilToasts = document.createElement("div");
    veilToasts.id = "veilToasts";
    document.body.appendChild(veilToasts);
  }
  const list = document.createElement("div");
  list.className = "veil-toast " + (extra || "ok");
  list.textContent = value;
  veilToasts.appendChild(list);
  requestAnimationFrame(() => list.classList.add("show"));
  setTimeout(() => {
    list.classList.remove("show");
    setTimeout(() => list.remove(), 240);
  }, 2600);
}
const chatFaces = {};
function noteChatPerson(value2, extra, other) {
  if (!value2) {
    return;
  }
  if (other) {
    chatFaces[value2] = other;
  }
  const found = chatProfile();
  const next = found.friends.find(value => value.uid === value2);
  let prev = false;
  if (next) {
    if (extra && next.name !== extra) {
      next.name = extra;
      prev = true;
    }
    if (other && next.pfp !== other) {
      next.pfp = other;
      prev = true;
    }
  }
  if (prev) {
    saveChatProfile(found);
  }
}
function faceFor(value, extra) {
  return chatFaces[value] || extra || IMG + "profileplaceholder.png";
}
function presenceMembers(value3) {
  return new Promise(value2 => {
    if (!value3 || !value3.presence) {
      value2([]);
      return;
    }
    let bits = false;
    const amount = value => {
      if (bits) {
        return;
      }
      bits = true;
      value2(Array.isArray(value) ? value : []);
    };
    try {
      const reason = value3.presence.get((value, extra) => amount(value ? [] : extra));
      if (reason && typeof reason.then === "function") {
        reason.then(amount).catch(() => amount([]));
      }
    } catch (err) {
      amount([]);
    }
  });
}
function rememberChatMessage(value, extra) {
  if (!chatLog[value]) {
    chatLog[value] = [];
  }
  const row = slimChatMessage(extra || {});
  const list = chatLog[value];
  const dup = list.some(item => item.uid === row.uid && item.text === row.text && item.ts && item.ts === row.ts);
  if (!dup) {
    list.push(row);
  }
  if (list.length > 200) {
    chatLog[value] = list.slice(-200);
  }
  try {
    localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatLog));
  } catch (err) {}
  scheduleChatPush();
  noteChatPerson(extra && extra.uid, extra && extra.name, extra && extra.pfp);
}
function onChatMessage(value, extra) {
  const src = extra && extra.data || {};
  if (!src || typeof src.text !== "string") {
    return;
  }
  rememberChatMessage(value, src);
  const dest = chatProfile();
  const host = src.uid === dest.uid;
  const query = !!document.querySelector(".chat-app") && currentChatChannel() === value;
  if (!host && !query && dest.notifyDot !== false) {
    chatUnreads[value] = (chatUnreads[value] || 0) + 1;
    paintChatAlerts();
    try {
      renderTabs();
    } catch (err) {}
  }
  if (query) {
    chatUnreads[value] = 0;
    paintChatLog();
    paintChatAlerts();
  }
}
function watchChatChannel(value2) {
  if (!chatAbly || !value2) {
    return;
  }
  const req = chatAbly.channels.get(value2);
  if (req.__veilWatch) {
    return;
  }
  req.__veilWatch = true;
  req.subscribe("msg", value => onChatMessage(value2, value));
}
function refreshChatIfOpen() {
  const chatRoot = document.getElementById("chatRoot");
  if (chatRoot && chatRoot.querySelector(".chat-app")) {
    renderChatPage(chatRoot);
  }
}
function onChatInbox(value2) {
  if (!value2 || !value2.type) {
    return;
  }
  const count = chatProfile();
  const index = String(value2.from || "");
  if (!index || index === count.uid) {
    return;
  }
  if (value2.type === "friend-request") {
    if (count.friends.some(value => value.uid === index)) {
      return;
    }
    if (!count.pendingIn.some(value => value.uid === index)) {
      count.pendingIn.push({
        uid: index,
        name: value2.name || index,
        pfp: value2.pfp || ""
      });
      saveChatProfile(count);
      chatToast(value2.name + " sent a friend request", "wait");
      chatUnreads.inbox = (chatUnreads.inbox || 0) + 1;
      paintChatAlerts();
      refreshChatIfOpen();
    }
  } else if (value2.type === "friend-accept") {
    count.pendingOut = count.pendingOut.filter(value => value.uid !== index);
    if (!count.friends.some(value => value.uid === index)) {
      count.friends.push({
        uid: index,
        name: value2.name || index,
        pfp: value2.pfp || ""
      });
    }
    saveChatProfile(count);
    if (chatAbly) {
      watchChatChannel(dmChannel(count.uid, index));
    }
    chatToast((value2.name || "They") + " accepted your request", "ok");
    refreshChatIfOpen();
  } else if (value2.type === "friend-decline") {
    count.pendingOut = count.pendingOut.filter(value => value.uid !== index);
    saveChatProfile(count);
    chatToast((value2.name || "They") + " declined your request", "bad");
    refreshChatIfOpen();
  } else if (value2.type === "unfriend") {
    count.friends = count.friends.filter(value => value.uid !== index);
    saveChatProfile(count);
    chatToast("You were unfriended", "bad");
    if (chatRoom === "dm:" + index) {
      chatRoom = "public";
    }
    refreshChatIfOpen();
  } else if (value2.type === "group-invite") {
    if (count.groups.some(value => value.id === value2.groupId)) {
      return;
    }
    if (!count.invites.some(value => value.id === value2.groupId)) {
      count.invites.push({
        id: value2.groupId,
        name: value2.groupName || "Group",
        fromName: value2.name || "Someone"
      });
      saveChatProfile(count);
      chatToast((value2.name || "Someone") + " invited you to " + (value2.groupName || "a group"), "wait");
      chatUnreads.inbox = (chatUnreads.inbox || 0) + 1;
      paintChatAlerts();
      refreshChatIfOpen();
    }
  }
}
async function publishInbox(value, extra) {
  if (!chatAbly) {
    await bootChatLink();
  }
  if (!chatAbly) {
    throw new Error("offline");
  }
  await chatAbly.channels.get(inboxChannel(value)).publish("event", extra);
}
async function pushChatPresence() {
  if (!chatAbly) {
    return;
  }
  const root = chatProfile();
  const wrap = chatAbly.channels.get("veil-chat:dir");
  const page = {
    name: root.username,
    pfp: root.pfp || ""
  };
  try {
    const output = wrap.presence.enter(page);
    if (output && output.then) {
      await output;
    }
  } catch (err2) {
    try {
      const amount = wrap.presence.update(page);
      if (amount && amount.then) {
        await amount;
      }
    } catch (err) {}
  }
}
async function bootChatLink() {
  const tab = chatProfile();
  if (!tab.username || chatAbly || chatBooting) {
    return chatBooting;
  }
  chatBooting = (async () => {
    try {
      if (!window.Ably) {
        await loadScript("https://cdn.ably.com/lib/ably.min-2.js");
      }
      if (!window.Ably) {
        return;
      }
      chatAbly = new Ably.Realtime({
        key: ABLY_KEY,
        clientId: tab.uid
      });
      watchChatChannel(CHAT_PUBLIC);
      tab.friends.forEach(value => watchChatChannel(dmChannel(tab.uid, value.uid)));
      tab.groups.forEach(value => watchChatChannel(groupChannel(value.id)));
      const nodes = chatAbly.channels.get(inboxChannel(tab.uid));
      nodes.subscribe("event", value => onChatInbox(value && value.data));
      const match = chatAbly.channels.get("veil-chat:dir");
      match.presence.subscribe(value => {
        const child = value && value.data;
        noteChatPerson(value && value.clientId, child && child.name, child && child.pfp);
      });
      await pushChatPresence();
    } catch (err) {
      chatAbly = null;
    } finally {
      chatBooting = null;
    }
  })();
  return chatBooting;
}
function closeChatCard() {
  const chatProfileCard = document.getElementById("chatProfileCard");
  if (chatProfileCard) {
    chatProfileCard.remove();
  }
}
function openChatCard(value2, extra) {
  closeChatCard();
  if (!extra || !extra.uid) {
    return;
  }
  const color = chatProfile();
  const hex = isChatAdmin() && color.adminMode;
  const now = color.friends.some(value => value.uid === extra.uid);
  const left = color.pendingOut.some(value => value.uid === extra.uid);
  const flag = color.pendingIn.some(value => value.uid === extra.uid);
  const part = extra.uid === color.uid;
  const child = document.createElement("div");
  child.id = "chatProfileCard";
  child.className = "chat-card";
  const label = document.createElement("img");
  label.src = faceFor(extra.uid, extra.pfp);
  label.alt = "";
  const record = document.createElement("h3");
  record.textContent = extra.name || "Someone";
  child.appendChild(label);
  child.appendChild(record);
  if (hex && extra.email) {
    const ev = document.createElement("p");
    ev.textContent = extra.email;
    child.appendChild(ev);
  }
  if (!part) {
    const handler = document.createElement("button");
    handler.type = "button";
    handler.className = now ? "secondary-btn" : "primary-btn";
    if (now) {
      handler.textContent = "Unfriend";
    } else if (left) {
      handler.textContent = "Waiting";
    } else if (flag) {
      handler.textContent = "Accept";
    } else {
      handler.textContent = "Add Friend";
    }
    if (left) {
      handler.disabled = true;
    }
    handler.onclick = () => {
      if (now) {
        unfriendChat(extra);
      } else if (flag) {
        acceptFriend(extra.uid);
      } else {
        sendFriendRequest(extra);
      }
      closeChatCard();
    };
    child.appendChild(handler);
  }
  document.body.appendChild(child);
  const result = value2.getBoundingClientRect();
  const ok = Math.min(result.left, window.innerWidth - 256);
  const ms = Math.min(result.bottom + 8, window.innerHeight - 220);
  child.style.left = Math.max(8, ok) + "px";
  child.style.top = Math.max(8, ms) + "px";
  setTimeout(() => {
    const fields = value => {
      if (!child.contains(value.target)) {
        closeChatCard();
        document.removeEventListener("mousedown", fields);
      }
    };
    document.addEventListener("mousedown", fields);
  }, 0);
}
async function sendFriendRequest(value2) {
  const output = chatProfile();
  const ev = String(value2.uid || "").trim().toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(ev)) {
    chatToast("That person could not be found", "bad");
    return;
  }
  if (ev === output.uid) {
    chatToast("That is you", "bad");
    return;
  }
  if (output.friends.some(value => value.uid === ev)) {
    chatToast("Already friends", "wait");
    return;
  }
  if (output.pendingOut.some(value => value.uid === ev)) {
    chatToast("Waiting for them to answer", "wait");
    return;
  }
  try {
    await publishInbox(ev, {
      type: "friend-request",
      from: output.uid,
      name: output.username,
      pfp: output.pfp || ""
    });
    output.pendingOut.push({
      uid: ev,
      name: value2.name || ev
    });
    saveChatProfile(output);
    chatToast("Friend request sent", "ok");
    refreshChatIfOpen();
  } catch (err) {
    chatToast("Could not send that request", "bad");
  }
}
async function acceptFriend(value2) {
  const nodes = chatProfile();
  const match = nodes.pendingIn.find(value => value.uid === value2);
  if (!match) {
    return;
  }
  nodes.pendingIn = nodes.pendingIn.filter(value => value.uid !== value2);
  if (!nodes.friends.some(value => value.uid === value2)) {
    nodes.friends.push(match);
  }
  saveChatProfile(nodes);
  if (chatAbly) {
    watchChatChannel(dmChannel(nodes.uid, value2));
  }
  try {
    await publishInbox(value2, {
      type: "friend-accept",
      from: nodes.uid,
      name: nodes.username,
      pfp: nodes.pfp || ""
    });
  } catch (err) {}
  chatToast("Friend request accepted", "ok");
  refreshChatIfOpen();
}
async function declineFriend(value2) {
  const chunk = chatProfile();
  const bits = chunk.pendingIn.find(value => value.uid === value2);
  chunk.pendingIn = chunk.pendingIn.filter(value => value.uid !== value2);
  saveChatProfile(chunk);
  try {
    await publishInbox(value2, {
      type: "friend-decline",
      from: chunk.uid,
      name: chunk.username
    });
  } catch (err) {}
  chatToast("Friend request declined", "bad");
  refreshChatIfOpen();
  return bits;
}
async function unfriendChat(value2) {
  const delay = chatProfile();
  delay.friends = delay.friends.filter(value => value.uid !== value2.uid);
  saveChatProfile(delay);
  try {
    await publishInbox(value2.uid, {
      type: "unfriend",
      from: delay.uid,
      name: delay.username
    });
  } catch (err) {}
  if (chatRoom === "dm:" + value2.uid) {
    chatRoom = "public";
  }
  chatToast("Friend removed", "bad");
  refreshChatIfOpen();
}
async function inviteFriendToGroup(value2) {
  const payload = chatProfile();
  if (String(chatRoom).indexOf("g:") !== 0) {
    return;
  }
  const fields = chatRoom.slice(2);
  const choice = payload.groups.find(value => value.id === fields);
  if (!choice) {
    return;
  }
  try {
    await publishInbox(value2.uid, {
      type: "group-invite",
      from: payload.uid,
      name: payload.username,
      groupId: fields,
      groupName: choice.name
    });
    chatToast("Invite sent", "ok");
  } catch (err) {
    chatToast("Could not send that invite", "bad");
  }
}
function acceptGroupInvite(value2) {
  const current = chatProfile();
  const saved = current.invites.find(value => value.id === value2);
  if (!saved) {
    return;
  }
  current.invites = current.invites.filter(value => value.id !== value2);
  if (!current.groups.some(value => value.id === value2)) {
    current.groups.push({
      id: saved.id,
      name: saved.name
    });
  }
  saveChatProfile(current);
  if (chatAbly) {
    watchChatChannel(groupChannel(value2));
  }
  chatRoom = "g:" + value2;
  chatToast("Joined " + saved.name, "ok");
  refreshChatIfOpen();
}
function declineGroupInvite(value2) {
  const old = chatProfile();
  old.invites = old.invites.filter(value => value.id !== value2);
  saveChatProfile(old);
  chatToast("Invite declined", "bad");
  refreshChatIfOpen();
}
function paintChatLog() {
  const chatLog2 = document.getElementById("chatLog");
  if (!chatLog2) {
    return;
  }
  const base = chatProfile();
  const full = chatLog[currentChatChannel()] || [];
  chatLog2.innerHTML = "";
  full.forEach(value => {
    const letter = document.createElement("div");
    letter.className = "chat-line";
    const code = document.createElement("img");
    code.className = "chat-ava";
    code.alt = "";
    code.src = faceFor(value.uid, value.pfp);
    const hash = document.createElement("div");
    hash.className = "chat-body";
    const sign = document.createElement("button");
    sign.type = "button";
    sign.className = "chat-who";
    sign.textContent = value.name || "Someone";
    sign.onclick = () => openChatCard(sign, value);
    const secret = document.createElement("div");
    secret.className = "chat-text";
    secret.textContent = String(value.text || "").slice(0, 1000);
    hash.appendChild(sign);
    hash.appendChild(secret);
    letter.appendChild(code);
    letter.appendChild(hash);
    chatLog2.appendChild(letter);
  });
  chatLog2.scrollTop = chatLog2.scrollHeight;
}
function chatRoomTitle() {
  const short = chatProfile();
  if (chatRoom === "public") {
    return "Public";
  }
  if (String(chatRoom).indexOf("dm:") === 0) {
    const nodes = chatRoom.slice(3);
    const match = short.friends.find(value => value.uid === nodes);
    if (match) {
      return match.name || nodes;
    } else {
      return nodes;
    }
  }
  if (String(chatRoom).indexOf("g:") === 0) {
    const piece = short.groups.find(value => value.id === chatRoom.slice(2));
    if (piece) {
      return piece.name;
    } else {
      return "Group";
    }
  }
  return "Chat";
}
function friendFaceHTML(value) {
  const word = value.pfp || chatFaces[value.uid] || IMG + "profileplaceholder.png";
  return "<img class=\"chat-avatar\" src=\"" + escapeHTML(word) + "\" alt=\"\">";
}
function renderChatPage(value3) {
  if (!value3) {
    return;
  }
  closeChatCard();
  const code = chatProfile();
  if (!code.username) {
    value3.innerHTML = "<div class=\"chat-setup\"><div class=\"chat-setup-card\"><h2>Choose a username</h2><p>This is the name people see in chat. You can change it later in Settings, then Chat, then Profile.</p><input class=\"text-input\" id=\"chatSetupName\" maxlength=\"24\" placeholder=\"Username\" autocomplete=\"off\"><button type=\"button\" class=\"primary-btn\" id=\"chatSetupGo\">Continue</button></div></div>";
    const chatSetupGo = value3.querySelector("#chatSetupGo");
    const chatSetupName = value3.querySelector("#chatSetupName");
    const amount = () => {
      const immediate = String(chatSetupName && chatSetupName.value || "").trim().slice(0, 24);
      if (immediate.length < 2) {
        chatToast("Use at least 2 characters", "bad");
        return;
      }
      code.username = immediate;
      saveChatProfile(code);
      bootChatLink();
      renderChatPage(value3);
    };
    if (chatSetupGo) {
      chatSetupGo.onclick = amount;
    }
    if (chatSetupName) {
      chatSetupName.addEventListener("keydown", value => {
        if (value.key === "Enter") {
          amount();
        }
      });
    }
    return;
  }
  chatUnreads.inbox = 0;
  const hash = isChatAdmin();
  const sign = String(chatRoom).indexOf("g:") === 0;
  const secret = code.pendingIn.map(value => "<div class=\"chat-req\">" + friendFaceHTML(value) + "<span>" + escapeHTML(value.name || value.uid) + "</span><span class=\"chat-req-actions\"><button type=\"button\" data-accept=\"" + escapeHTML(value.uid) + "\">Accept</button><button type=\"button\" data-decline=\"" + escapeHTML(value.uid) + "\">Decline</button></span></div>").join("");
  const addr = code.invites.map(value => "<div class=\"chat-req\"><span>" + escapeHTML(value.name) + "</span><span class=\"chat-req-actions\"><button type=\"button\" data-join=\"" + escapeHTML(value.id) + "\">Join</button><button type=\"button\" data-skip=\"" + escapeHTML(value.id) + "\">Decline</button></span></div>").join("");
  const port = code.friends.map(value => "<button type=\"button\" class=\"chat-room" + (chatRoom === "dm:" + value.uid ? " on" : "") + "\" data-open=\"dm:" + escapeHTML(value.uid) + "\">" + friendFaceHTML(value) + "<span>" + escapeHTML(value.name || value.uid) + "</span></button>").join("");
  const link = code.groups.map(value => "<button type=\"button\" class=\"chat-room" + (chatRoom === "g:" + value.id ? " on" : "") + "\" data-open=\"g:" + escapeHTML(value.id) + "\"><span>" + escapeHTML(value.name) + "</span></button>").join("");
  const href = sign ? code.friends.map(value => "<button type=\"button\" class=\"chat-hit\" data-invite=\"" + escapeHTML(value.uid) + "\">" + friendFaceHTML(value) + "<span>" + escapeHTML(value.name || value.uid) + "</span></button>").join("") : "";
  value3.innerHTML = "<div class=\"chat-app\"><aside class=\"chat-side\"><button type=\"button\" class=\"chat-room" + (chatRoom === "public" ? " on" : "") + "\" data-open=\"public\"><img class=\"chat-glyph\" src=\"" + IMG + "globe.svg\" alt=\"\"><span>Public</span></button>" + (secret || addr ? "<div class=\"chat-label\"><span>Requests</span></div>" + secret + addr : "") + "<div class=\"chat-label\"><span>Friends</span><button type=\"button\" class=\"chat-mini\" id=\"chatAddFriend\" title=\"Add friend\"><img src=\"" + IMG + "friendadd.svg\" alt=\"\"></button></div><div class=\"chat-add\" id=\"chatFriendBox\" hidden><input class=\"text-input\" id=\"chatUserSearch\" maxlength=\"24\" placeholder=\"Search username\" autocomplete=\"off\"><div class=\"chat-hits\" id=\"chatSearchHits\"></div><input class=\"text-input\" id=\"chatFriendCode\" maxlength=\"16\" placeholder=\"Or friend code\" autocomplete=\"off\"><button type=\"button\" class=\"secondary-btn\" id=\"chatFriendGo\">Send request</button></div>" + port + "<div class=\"chat-label\"><span>Groups</span><button type=\"button\" class=\"chat-mini\" id=\"chatAddGroup\" title=\"New group\"><img src=\"" + IMG + "plus.svg\" alt=\"\"></button></div><div class=\"chat-add\" id=\"chatGroupBox\" hidden><input class=\"text-input\" id=\"chatGroupName\" maxlength=\"24\" placeholder=\"Group name\"><button type=\"button\" class=\"secondary-btn\" id=\"chatGroupGo\">Create</button></div>" + link + "<div class=\"chat-code\">Your code<br><b>" + escapeHTML(code.uid) + "</b></div></aside><section class=\"chat-main\"><header class=\"chat-head\"><h2>" + escapeHTML(chatRoomTitle()) + "</h2><span class=\"spacer\"></span>" + (sign ? "<button type=\"button\" class=\"secondary-btn\" id=\"chatInviteBtn\" style=\"width:auto;margin:0;height:32px;padding:0 12px\">Invite</button>" : "") + (hash ? "<span class=\"chat-admin-label\">Admin mode</span><button type=\"button\" class=\"switch" + (code.adminMode ? " on" : "") + "\" id=\"chatAdminToggle\" role=\"switch\" aria-checked=\"" + (code.adminMode ? "true" : "false") + "\"></button>" : "") + "</header>" + (sign ? "<div class=\"chat-add\" id=\"chatInviteBox\" hidden style=\"padding:8px 16px\">" + (href || "<span class=\"chat-code\">Add a friend before inviting.</span>") + "</div>" : "") + "<div class=\"chat-log\" id=\"chatLog\"></div><form class=\"chat-compose\" id=\"chatForm\"><input class=\"text-input\" id=\"chatText\" maxlength=\"1000\" placeholder=\"Message\" autocomplete=\"off\"><button type=\"submit\" class=\"primary-btn\">Send</button></form></section></div>";
  chatUnreads[currentChatChannel()] = 0;
  paintChatAlerts();
  paintChatLog();
  value3.querySelectorAll("[data-open]").forEach(value => {
    value.onclick = () => {
      chatRoom = value.getAttribute("data-open");
      renderChatPage(value3);
    };
  });
  value3.querySelectorAll("[data-accept]").forEach(value => {
    value.onclick = () => acceptFriend(value.getAttribute("data-accept"));
  });
  value3.querySelectorAll("[data-decline]").forEach(value => {
    value.onclick = () => declineFriend(value.getAttribute("data-decline"));
  });
  value3.querySelectorAll("[data-join]").forEach(value => {
    value.onclick = () => acceptGroupInvite(value.getAttribute("data-join"));
  });
  value3.querySelectorAll("[data-skip]").forEach(value => {
    value.onclick = () => declineGroupInvite(value.getAttribute("data-skip"));
  });
  value3.querySelectorAll("[data-invite]").forEach(value2 => {
    value2.onclick = () => {
      const timer = value2.getAttribute("data-invite");
      const box = code.friends.find(value => value.uid === timer);
      if (box) {
        inviteFriendToGroup(box);
      }
    };
  });
  const chatAddFriend = value3.querySelector("#chatAddFriend");
  const chatFriendBox = value3.querySelector("#chatFriendBox");
  if (chatAddFriend && chatFriendBox) {
    chatAddFriend.onclick = () => {
      chatFriendBox.hidden = !chatFriendBox.hidden;
    };
  }
  const chatUserSearch = value3.querySelector("#chatUserSearch");
  if (chatUserSearch) {
    chatUserSearch.addEventListener("input", () => searchChatNames(chatUserSearch.value, value3.querySelector("#chatSearchHits")));
  }
  const chatFriendGo = value3.querySelector("#chatFriendGo");
  if (chatFriendGo) {
    chatFriendGo.onclick = () => {
      const response = String(value3.querySelector("#chatFriendCode").value || "").trim().toLowerCase();
      sendFriendRequest({
        uid: response,
        name: response
      });
    };
  }
  const chatAddGroup = value3.querySelector("#chatAddGroup");
  const chatGroupBox = value3.querySelector("#chatGroupBox");
  if (chatAddGroup && chatGroupBox) {
    chatAddGroup.onclick = () => {
      chatGroupBox.hidden = !chatGroupBox.hidden;
    };
  }
  const chatGroupGo = value3.querySelector("#chatGroupGo");
  if (chatGroupGo) {
    chatGroupGo.onclick = () => {
      const clientId = String(value3.querySelector("#chatGroupName").value || "").trim().slice(0, 24);
      if (clientId.length < 2) {
        chatToast("Name the group", "bad");
        return;
      }
      const path = Math.random().toString(36).slice(2, 8);
      code.groups.push({
        id: path,
        name: clientId
      });
      saveChatProfile(code);
      if (chatAbly) {
        watchChatChannel(groupChannel(path));
      }
      chatRoom = "g:" + path;
      chatToast("Group created", "ok");
      renderChatPage(value3);
    };
  }
  const chatInviteBtn = value3.querySelector("#chatInviteBtn");
  const chatInviteBox = value3.querySelector("#chatInviteBox");
  if (chatInviteBtn && chatInviteBox) {
    chatInviteBtn.onclick = () => {
      chatInviteBox.hidden = !chatInviteBox.hidden;
    };
  }
  const chatAdminToggle = value3.querySelector("#chatAdminToggle");
  if (chatAdminToggle) {
    chatAdminToggle.onclick = () => {
      code.adminMode = !code.adminMode;
      saveChatProfile(code);
      renderChatPage(value3);
    };
  }
  const chatForm = value3.querySelector("#chatForm");
  if (chatForm) {
    chatForm.onsubmit = value => {
      value.preventDefault();
      sendChatText(value3.querySelector("#chatText"));
    };
  }
}
async function searchChatNames(value2, extra) {
  if (!extra) {
    return;
  }
  const setting = String(value2 || "").trim().toLowerCase();
  extra.innerHTML = "";
  if (setting.length < 2) {
    return;
  }
  if (!chatAbly) {
    await bootChatLink();
  }
  if (!chatAbly) {
    chatToast("Chat is not connected yet", "bad");
    return;
  }
  const profile2 = await presenceMembers(chatAbly.channels.get("veil-chat:dir"));
  const cloak2 = chatProfile().uid;
  const panic2 = profile2.filter(value => {
    const bits = String(value.data && value.data.name || "").toLowerCase();
    return value.clientId && value.clientId !== cloak2 && bits.indexOf(setting) !== -1;
  }).slice(0, 6);
  if (!panic2.length) {
    extra.innerHTML = "<div class=\"chat-code\">No one online with that name.</div>";
    return;
  }
  panic2.forEach(value => {
    const canvas = value.data || {};
    const ctx = document.createElement("button");
    ctx.type = "button";
    ctx.className = "chat-hit";
    ctx.innerHTML = friendFaceHTML({
      uid: value.clientId,
      pfp: canvas.pfp || ""
    }) + "<span>" + escapeHTML(canvas.name || value.clientId) + "</span>";
    ctx.onclick = () => sendFriendRequest({
      uid: value.clientId,
      name: canvas.name || value.clientId,
      pfp: canvas.pfp || ""
    });
    extra.appendChild(ctx);
  });
}
async function sendChatText(value) {
  const historyItem = String(value && value.value || "");
  if (historyItem.trim().length > 1000) {
    chatToast("That message is over 1000 characters", "bad");
    return;
  }
  const game = historyItem.trim().slice(0, 1000);
  if (!game) {
    return;
  }
  const room = 5000 - (Date.now() - chatLastSend);
  if (room > 0) {
    chatToast("Wait " + Math.ceil(room / 1000) + " seconds", "bad");
    return;
  }
  if (!chatAbly) {
    await bootChatLink();
  }
  if (!chatAbly) {
    chatToast("Chat is not connected yet", "bad");
    return;
  }
  const channel = chatProfile();
  const message = currentChatChannel();
  watchChatChannel(message);
  const sentAt = Date.now();
  const payload = {
    name: channel.username,
    text: game,
    uid: channel.uid,
    email: myChatEmail(),
    pfp: channel.pfp || "",
    ts: sentAt
  };
  try {
    await chatAbly.channels.get(message).publish("msg", payload);
    rememberChatMessage(message, payload);
    try {
      paintChatLog();
    } catch (err) {}
    chatLastSend = Date.now();
    if (value) {
      value.value = "";
    }
  } catch (err) {
    chatToast("Could not send that message", "bad");
  }
}
function openChatPage() {
  closePanels();
  closeMenu();
  let friend = tabs.find(value => value.isChat);
  if (!friend) {
    if (tabs.length >= MAX_TABS) {
      alert("Too many tabs");
      return;
    }
    friend = {
      id: uid(),
      title: "Chat",
      url: "veil://chat",
      history: ["veil://chat"],
      historyIndex: 0,
      newTab: false,
      isChat: true,
      isGames: false,
      isAdmin: false,
      engineFrame: null,
      favicon: IMG + "chat.svg",
      animOpen: true,
      lastActive: Date.now()
    };
    tabs.push(friend);
  }
  friend.title = "Chat";
  friend.url = "veil://chat";
  friend.favicon = IMG + "chat.svg";
  friend.isChat = true;
  friend.lastActive = Date.now();
  activeTabId = friend.id;
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }
  let pending = viewport.querySelector(".page[data-page-id=\"" + friend.id + "\"]");
  if (!pending) {
    pending = document.createElement("section");
    pending.className = "page";
    pending.dataset.pageId = friend.id;
    viewport.appendChild(pending);
  }
  pending.innerHTML = "<div class=\"chat-page\" id=\"chatRoot\"></div>";
  showActiveOnly();
  renderChrome();
  renderChatPage(pending.querySelector("#chatRoot"));
  bootChatLink();
}
function fillChatSettings() {
  const invite = chatProfile();
  const chatUsername = document.getElementById("chatUsername");
  const chatFriendCodeView = document.getElementById("chatFriendCodeView");
  const chatPfpPreview = document.getElementById("chatPfpPreview");
  if (chatUsername && document.activeElement !== chatUsername) {
    chatUsername.value = invite.username || "";
  }
  if (chatFriendCodeView) {
    chatFriendCodeView.textContent = invite.uid || "";
  }
  if (chatPfpPreview) {
    chatPfpPreview.src = invite.pfp || IMG + "profileplaceholder.png";
    chatPfpPreview.classList.toggle("is-ph", !invite.pfp);
  }
  setSwitch(document.getElementById("chatNotifySwitch"), invite.notifyDot !== false);
  const chatAdminRow = document.getElementById("chatAdminRow");
  if (chatAdminRow) {
    chatAdminRow.hidden = !isChatAdmin();
  }
  setSwitch(document.getElementById("chatAdminSwitch"), !!invite.adminMode && isChatAdmin());
}
on("menuBtn", value => {
  value.stopPropagation();
  updateDevtoolsMenuState();
  document.getElementById("mainMenu")?.classList.toggle("open");
});
on("menuRename", () => {
  closeMenu();
  renameCurrentTab();
});
on("menuLock", () => lockVeil());
on("menuHistory", () => {
  openHistory();
});
on("menuBookmarks", () => {
  closeMenu();
  openPanel("bookmarksPanel");
});
on("menuDevtools", () => toggleEruda());
on("menuFullscreen", () => {
  closeMenu();
  togglePageFullscreen();
});
function togglePageFullscreen() {
  try {
    const stamp = getActiveTab();
    if (stamp && (stamp.isGames || stamp.newTab)) {
      return;
    }
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const height = document.exitFullscreen || document.webkitExitFullscreen;
      if (height) {
        height.call(document);
      }
      return;
    }
    let payload = null;
    try {
      if (stamp && stamp.engineFrame) {
        payload = stamp.engineFrame.element || stamp.engineFrame.frame || stamp.engineFrame;
      }
    } catch (err) {}
    if (!payload || !payload.requestFullscreen && !payload.webkitRequestFullscreen) {
      payload = document.querySelector("#pages .page-wrap.active iframe, .page-wrap.active iframe, #pages iframe") || document.documentElement;
    }
    const fields = payload.requestFullscreen || payload.webkitRequestFullscreen;
    if (fields) {
      fields.call(payload);
    }
  } catch (err) {
    console.warn("Fullscreen failed", err);
  }
}
const launchNowBtn = document.getElementById("launchNowBtn");
if (launchNowBtn) {
  launchNowBtn.onclick = () => openLaunchModal();
}
const searchEngineSelect = document.getElementById("searchEngineSelect");
if (searchEngineSelect) {
  searchEngineSelect.addEventListener("change", () => {
    const google = searchEngineSelect.value || "google";
    settings.searchEngine = SEARCH_ENGINES[google] ? google : "google";
    save();
  });
}
on("adblockSwitch", () => {
  settings.adBlocker = settings.adBlocker === false;
  save();
  highlightTheme();
  pushAdblockToSW();
});
const launchModeSelect = document.getElementById("launchModeSelect");
if (launchModeSelect) {
  launchModeSelect.addEventListener("change", () => {
    settings.launchMode = launchModeSelect.value === "auto" ? "auto" : "manual";
    save();
  });
}
on("animEnabledSwitch", () => {
  if (!COOKIE.consent) {
    settings.animEnabled = false;
    highlightTheme();
    refreshHomeFxAll();
    return;
  }
  settings.animEnabled = !settings.animEnabled;
  save();
  highlightTheme();
  refreshHomeFxAll();
});
on("lockUnloadSwitch", () => {
  settings.lockUnload = !settings.lockUnload;
  save();
  highlightTheme();
});
on("closeOriginSwitch", () => {
  settings.closeOriginOnBlank = !settings.closeOriginOnBlank;
  save();
  highlightTheme();
});
on("confirmLeaveSwitch", () => {
  settings.confirmLeave = !settings.confirmLeave;
  save();
  highlightTheme();
});
on("time24Switch", () => {
  settings.timeFormat = settings.timeFormat === "24" ? "12" : "24";
  save();
  highlightTheme();
  startWelcomeClock();
});
document.querySelectorAll("[data-settings-tab]").forEach(value2 => {
  value2.addEventListener("click", () => {
    const token = value2.getAttribute("data-settings-tab");
    document.querySelectorAll("[data-settings-tab]").forEach(value => {
      value.classList.toggle("active", value === value2);
    });
    document.querySelectorAll("[data-settings-page]").forEach(value => {
      value.classList.toggle("active", value.getAttribute("data-settings-page") === token);
    });
  });
});
const animStyle = document.getElementById("animStyle");
if (animStyle) {
  animStyle.addEventListener("change", () => {
    settings.animStyle = animStyle.value || "orbs";
    save();
    highlightTheme();
    refreshHomeFxAll();
  });
}
on("saverEnabledSwitch", () => {
  settings.saverEnabled = !settings.saverEnabled;
  save();
  highlightTheme();
  if (!settings.saverEnabled && saverVisible) {
    hideSaver();
  } else {
    armSaver();
  }
});
const saverDelay = document.getElementById("saverDelay");
if (saverDelay) {
  saverDelay.addEventListener("input", commitSaverDelay);
  saverDelay.addEventListener("blur", commitSaverDelay);
  saverDelay.addEventListener("keydown", value => {
    if (value.key === "Enter") {
      value.preventDefault();
      commitSaverDelay();
    }
  });
}
const saverStyleEl = document.getElementById("saverStyle");
if (saverStyleEl) {
  saverStyleEl.addEventListener("change", () => {
    settings.saverStyle = saverStyleEl.value || "orbs";
    save();
    syncSaverFields();
    if (saverVisible) {
      renderSaverVisual();
    }
  });
}
let saverUrlTimer = null;
const saverUrlEl = document.getElementById("saverUrl");
if (saverUrlEl) {
  saverUrlEl.addEventListener("input", () => {
    settings.saverUrl = saverUrlEl.value.trim();
    save();
    if (saverUrlTimer) {
      clearTimeout(saverUrlTimer);
    }
    saverUrlTimer = setTimeout(() => {
      syncSaverFields();
      if (saverVisible && settings.saverStyle === "custom") {
        renderSaverVisual();
      }
    }, 400);
  });
}
["saverColorA", "saverColorB"].forEach(value => {
  const current = document.getElementById(value);
  if (!current) {
    return;
  }
  current.addEventListener("input", () => {
    settings[value] = current.value;
    save();
    if (saverVisible && settings.saverStyle !== "custom") {
      renderSaverVisual();
    }
  });
});
function bindSaverRange(value, extra, other, detail) {
  const detail2 = document.getElementById(value);
  if (!detail2) {
    return;
  }
  const source = () => {
    let speed = Number(detail2.value);
    if (!Number.isFinite(speed)) {
      speed = 1;
    }
    if (extra === "saverCount") {
      speed = Math.max(4, Math.min(80, Math.round(speed)));
    }
    settings[extra] = speed;
    const colorA = document.getElementById(value + "Val");
    if (colorA) {
      colorA.textContent = other ? speed.toFixed(other) + "x" : String(Math.round(speed));
    }
  };
  detail2.addEventListener("input", source);
  detail2.addEventListener("change", () => {
    source();
    save();
    if (!saverVisible) {
      return;
    }
    if (extra === "saverMediaSpeed") {
      const veilSaverVideoSaverMedia = document.querySelector("#veilSaver video.saver-media");
      if (veilSaverVideoSaverMedia && !veilSaverVideoSaverMedia.hidden) {
        try {
          veilSaverVideoSaverMedia.playbackRate = settings.saverMediaSpeed;
        } catch (err) {}
      } else {
        renderSaverVisual();
      }
      return;
    }
    if (detail) {
      renderSaverVisual();
    }
  });
}
bindSaverRange("saverSpeed", "saverSpeed", 2, true);
bindSaverRange("saverCount", "saverCount", 0, true);
bindSaverRange("saverSize", "saverSize", 2, true);
bindSaverRange("saverMediaSpeed", "saverMediaSpeed", 2, false);
["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(value => {
  window.addEventListener(value, noteSaverActivity, {
    passive: true,
    capture: true
  });
});
setInterval(() => {
  if (!saverTimer && !saverVisible) {
    armSaver();
  }
}, 5000);
const animSpeed = document.getElementById("animSpeed");
if (animSpeed) {
  animSpeed.addEventListener("input", () => {
    settings.animSpeed = Number(animSpeed.value) || 1;
    const animSpeedVal = document.getElementById("animSpeedVal");
    if (animSpeedVal) {
      animSpeedVal.textContent = Number(settings.animSpeed).toFixed(2) + "x";
    }
  });
  animSpeed.addEventListener("change", () => {
    settings.animSpeed = Number(animSpeed.value) || 1;
    save();
    refreshHomeFxAll();
  });
}
const animCount = document.getElementById("animCount");
if (animCount) {
  animCount.addEventListener("input", () => {
    settings.animCount = Number(animCount.value) || 18;
    const animCountVal = document.getElementById("animCountVal");
    if (animCountVal) {
      animCountVal.textContent = String(settings.animCount);
    }
  });
  animCount.addEventListener("change", () => {
    settings.animCount = Math.max(4, Math.min(80, Number(animCount.value) || 18));
    save();
    refreshHomeFxAll();
  });
}
const animSize = document.getElementById("animSize");
if (animSize) {
  animSize.addEventListener("input", () => {
    settings.animSize = Number(animSize.value) || 1;
    const animSizeVal = document.getElementById("animSizeVal");
    if (animSizeVal) {
      animSizeVal.textContent = Number(settings.animSize).toFixed(2) + "x";
    }
  });
  animSize.addEventListener("change", () => {
    settings.animSize = Number(animSize.value) || 1;
    save();
    refreshHomeFxAll();
  });
}
["animColorA", "animColorB"].forEach(value => {
  const old = document.getElementById(value);
  if (!old) {
    return;
  }
  old.addEventListener("input", () => {
    settings[value] = old.value;
    refreshHomeFxAll();
  });
  old.addEventListener("change", () => {
    settings[value] = old.value;
    save();
    refreshHomeFxAll();
  });
});
const maxRange = document.getElementById("maxLoadedTabs");
if (maxRange) {
  maxRange.addEventListener("input", () => {
    settings.maxLoadedTabs = Number(maxRange.value) || 8;
    const maxLoadedTabsVal = document.getElementById("maxLoadedTabsVal");
    if (maxLoadedTabsVal) {
      maxLoadedTabsVal.textContent = String(settings.maxLoadedTabs);
    }
  });
  maxRange.addEventListener("change", () => {
    settings.maxLoadedTabs = Math.min(20, Math.max(1, Number(maxRange.value) || 8));
    save();
    highlightTheme();
    showActiveOnly();
  });
}
on("saveUsername", () => {
  const copy = (document.getElementById("newUsername")?.value || "").trim();
  const usernameMsg = document.getElementById("usernameMsg");
  const full = (value, extra) => {
    if (usernameMsg) {
      usernameMsg.textContent = value;
      usernameMsg.style.color = extra ? "var(--danger)" : "var(--muted)";
    }
  };
  if (!copy) {
    full("Enter a display name.", true);
    return;
  }
  profile.name = copy;
  saveProfile();
  document.querySelectorAll(".welcome-line").forEach(value => {
    value.textContent = "Welcome to Veil, " + copy + ".";
  });
  const newUsername = document.getElementById("newUsername");
  if (newUsername) {
    newUsername.value = "";
  }
  startWelcomeClock();
  full("Display name updated.", false);
});
document.getElementById("profileFile")?.addEventListener("change", value => {
  const word = value.target.files && value.target.files[0];
  if (!word) {
    return;
  }
  if (!/^image\//.test(word.type || "")) {
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = () => {
    const name2 = String(fileReader.result || "");
    const image2 = new Image();
    image2.onload = () => {
      const link = 256;
      const href = Math.min(1, link / Math.max(image2.width || 1, image2.height || 1));
      const file = Math.max(1, Math.round((image2.width || 1) * href));
      const blob = Math.max(1, Math.round((image2.height || 1) * href));
      const image = document.createElement("canvas");
      image.width = file;
      image.height = blob;
      image.getContext("2d").drawImage(image2, 0, 0, file, blob);
      profile.avatar = image.toDataURL("image/jpeg", 0.82);
      saveProfile();
      paintProfilePreview();
    };
    image2.onerror = () => {
      profile.avatar = name2;
      saveProfile();
      paintProfilePreview();
    };
    image2.src = name2;
  };
  fileReader.readAsDataURL(word);
});
on("profileClear", () => {
  profile.avatar = "";
  saveProfile();
  const profileFile = document.getElementById("profileFile");
  if (profileFile) {
    profileFile.value = "";
  }
  paintProfilePreview();
});
on("savePassword", () => {
  const hash = document.getElementById("curPassword")?.value || "";
  const sign = document.getElementById("newPassword")?.value || "";
  const secret = document.getElementById("newPassword2")?.value || "";
  const passwordMsg = document.getElementById("passwordMsg");
  const port = (value, extra) => {
    if (passwordMsg) {
      passwordMsg.textContent = value;
      passwordMsg.style.color = extra ? "var(--danger)" : "var(--muted)";
    }
  };
  if (!profile.password) {
    port("No password set yet. Use sign-up first.", true);
    return;
  }
  if (hash !== profile.password) {
    port("Current password is incorrect.", true);
    return;
  }
  if (sign.length < 4) {
    port("Password must be at least 4 characters.", true);
    return;
  }
  if (sign !== secret) {
    port("New passwords do not match.", true);
    return;
  }
  profile.password = sign;
  saveProfile();
  ["curPassword", "newPassword", "newPassword2"].forEach(value => {
    const el = document.getElementById(value);
    if (el) {
      el.value = "";
    }
  });
  port("Password updated.", false);
});
on("backdrop", closePanels);
document.querySelectorAll("[data-close-panel]").forEach(value => {
  value.onclick = closePanels;
});
document.querySelectorAll("[data-theme]").forEach(value => {
  value.onclick = () => applyTheme(value.dataset.theme);
});
function applySavedCustomTheme() {
  const target = settings.customPalette;
  if (target && target.bg) {
    settings.bg = target.bg;
    settings.panel = target.panel || target.bg;
    settings.accent = target.accent || "#ffffff";
    settings.text = target.text || "#f2f2f2";
    settings.customOutline = target.outline || "";
  }
  settings.theme = "custom";
  deriveCustomSurfaces();
  if (!settings.customPalette) {
    settings.customPalette = {
      bg: settings.bg,
      panel: settings.panel,
      accent: settings.accent,
      text: settings.text,
      outline: settings.customOutline || settings.border || ""
    };
  }
  applyCSSVariables();
  save();
  highlightTheme();
  loadColorInputs();
}
on("customThemeCard", () => {
  const customColorCard = document.getElementById("customColorCard");
  const blob = settings.theme === "custom";
  applySavedCustomTheme();
  if (!customColorCard) {
    return;
  }
  if (blob) {
    customColorCard.classList.toggle("open");
    customColorCard.classList.toggle("force-open", customColorCard.classList.contains("open"));
  } else {
    customColorCard.classList.add("open", "force-open");
  }
});
on("applyColors", applyCustomColors);
on("transportEpoxy", () => setTransport("epoxy"));
on("transportLibcurl", () => setTransport("libcurl"));
on("applyBackground", applyBackground);
let bgUrlTimer = null;
const backgroundUrlEl = document.getElementById("backgroundUrl");
if (backgroundUrlEl) {
  backgroundUrlEl.addEventListener("input", () => {
    settings.backgroundUrl = backgroundUrlEl.value.trim();
    save();
    if (bgUrlTimer) {
      clearTimeout(bgUrlTimer);
    }
    bgUrlTimer = setTimeout(() => {
      highlightTheme();
      applyNewTabBackground();
    }, 350);
  });
}
const animMediaSpeedEl = document.getElementById("animMediaSpeed");
if (animMediaSpeedEl) {
  const paintMedia = () => {
    let cloak2 = Number(animMediaSpeedEl.value);
    if (!Number.isFinite(cloak2)) {
      cloak2 = 1;
    }
    cloak2 = Math.max(0.25, Math.min(3, cloak2));
    settings.animMediaSpeed = cloak2;
    const animMediaSpeedVal = document.getElementById("animMediaSpeedVal");
    if (animMediaSpeedVal) {
      animMediaSpeedVal.textContent = cloak2.toFixed(2) + "x";
    }
  };
  animMediaSpeedEl.addEventListener("input", () => {
    paintMedia();
    document.querySelectorAll(".newtab-page video.newtab-media").forEach(value => {
      try {
        value.playbackRate = settings.animMediaSpeed;
      } catch (err) {}
    });
  });
  animMediaSpeedEl.addEventListener("change", () => {
    paintMedia();
    save();
    document.querySelectorAll(".newtab-page video.newtab-media").forEach(value => {
      try {
        value.playbackRate = settings.animMediaSpeed;
      } catch (err) {}
    });
  });
}
on("applyCloak", applyCloak);
on("resetSettings", resetSettings);
on("clearLocalData", () => {
  clearLocalData();
});
document.getElementById("clearHistory")?.addEventListener("click", async () => {
  const image = await veilConfirm("Clear history", "Are you sure you want to clear all history?");
  if (!image) {
    return;
  }
  visitHistory = [];
  save();
  renderHistory();
});
document.addEventListener("click", value => {
  if (value.target.closest("#historyPanel") || value.target.closest("#menuHistory")) {
    return;
  }
  if (document.getElementById("historyPanel")?.classList.contains("open")) {
    closeHistory();
  }
});
const cloakPresetSelect = document.getElementById("cloakPresetSelect");
if (cloakPresetSelect) {
  cloakPresetSelect.addEventListener("change", () => {
    const bookmark = cloakPresetSelect.value;
    if (!bookmark) {
      return;
    }
    applyCloakPreset(bookmark);
  });
}
document.querySelectorAll("[data-cloak]").forEach(value => {
  value.onclick = () => applyCloakPreset(value.dataset.cloak);
});
document.addEventListener("click", value => {
  if (!value.target.closest("#mainMenu") && !value.target.closest("#menuBtn")) {
    closeMenu();
  }
});
document.addEventListener("keydown", value => {
  const size = value.ctrlKey || value.metaKey;
  if (size && value.key.toLowerCase() === "l") {
    value.preventDefault();
    document.getElementById("address").focus();
    document.getElementById("address").select();
  }
  if (size && value.key.toLowerCase() === "t") {
    value.preventDefault();
    createTab(true);
  }
  if (size && value.key.toLowerCase() === "w") {
    value.preventDefault();
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }
  if (size && value.key.toLowerCase() === "d") {
    value.preventDefault();
    toggleBookmark();
  }
  if (value.altKey && value.key === "ArrowLeft") {
    value.preventDefault();
    goBack();
  }
  if (value.altKey && value.key === "ArrowRight") {
    value.preventDefault();
    goForward();
  }
  if (size && value.key.toLowerCase() === "r") {
    value.preventDefault();
    reload();
  }
});
window.addEventListener("beforeunload", value => {
  try {
    if (COOKIE.consent) {
      save();
    }
  } catch (err) {}
  if (settings && settings.confirmLeave && !skipLeaveWarning) {
    value.preventDefault();
    value.returnValue = "";
    return "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    reconnectTransport();
  }
});
function hasProfileName() {
  try {
    loadProfile();
  } catch (err) {}
  return !!profile && !!String(profile.name || "").trim();
}
function showCookieConsent() {
  return new Promise(value => {
    let game = null;
    try {
      game = localStorage.getItem("veil_cookie_consent");
    } catch (err) {}
    if (!game) {
      try {
        game = COOKIE.get("veil_cookie_consent");
      } catch (err) {}
    }
    if (game === "yes") {
      COOKIE.consent = true;
      loadSavedData();
      value(true);
      return;
    }
    if (game === "no") {
      COOKIE.consent = false;
      value(false);
      return;
    }
    try {
      const veilCookieOverlay = document.getElementById("veilCookieOverlay");
      if (veilCookieOverlay) {
        veilCookieOverlay.remove();
      }
    } catch (err) {}
    const room = document.createElement("div");
    room.id = "veilCookieOverlay";
    room.className = "cookie-overlay";
    room.style.cssText = "z-index:100001;display:flex";
    room.innerHTML = "<div class=\"cookie-box\"><h2>Allow cookies?</h2><p>Veil uses cookies to save your theme, bookmarks, cloak, and settings on this device.</p><div class=\"cookie-buttons\"><button class=\"cookie-no\" id=\"cookieNo\" type=\"button\">No</button><button class=\"cookie-yes\" id=\"cookieYes\" type=\"button\">Yes</button></div></div>";
    document.body.appendChild(room);
    document.getElementById("cookieYes").onclick = () => {
      COOKIE.consent = true;
      try {
        localStorage.setItem("veil_cookie_consent", "yes");
      } catch (err) {}
      COOKIE.set("veil_cookie_consent", "yes");
      loadSavedData();
      save();
      room.remove();
      applyCSSVariables();
      document.title = cloak.title || "Veil";
      syncAboutBlankChrome();
      const favicon = document.getElementById("favicon");
      if (favicon) {
        favicon.href = cloak.icon || FAVI;
      }
      value(true);
    };
    document.getElementById("cookieNo").onclick = () => {
      COOKIE.consent = false;
      try {
        localStorage.setItem("veil_cookie_consent", "no");
      } catch (err) {}
      room.remove();
      value(false);
    };
  });
}
function showSignup() {
  return new Promise(value3 => {
    if (hasProfileName()) {
      value3(false);
      return;
    }
    try {
      document.querySelectorAll(".signup-overlay").forEach(value => value.remove());
    } catch (err) {}
    const message = document.createElement("div");
    message.className = "signup-overlay";
    message.style.cssText = "z-index:100002;display:flex";
    message.innerHTML = "<div class=\"signup-card\"><h2>Welcome to Veil</h2><p class=\"signup-sub\">Choose what we should call you, and a password for this device. Nothing leaves your browser until server auth is added.</p><label>Display name</label><input id=\"signupName\" maxlength=\"32\" placeholder=\"e.g. Alex\" autocomplete=\"nickname\"><label>Password</label><input id=\"signupPass\" type=\"password\" maxlength=\"64\" placeholder=\"At least 4 characters\" autocomplete=\"new-password\"><div class=\"signup-err\" id=\"signupErr\"></div><button class=\"signup-go\" type=\"button\" id=\"signupGo\">Continue</button></div>";
    document.body.appendChild(message);
    const signupName = message.querySelector("#signupName");
    const signupPass = message.querySelector("#signupPass");
    const signupErr = message.querySelector("#signupErr");
    try {
      signupName.focus();
    } catch (err) {}
    const invite = () => {
      const style = signupName.value.trim();
      const opts = signupPass.value;
      if (style.length < 1) {
        signupErr.textContent = "Enter a name.";
        return;
      }
      if (opts.length < 4) {
        signupErr.textContent = "Password must be at least 4 characters.";
        return;
      }
      profile = {
        name: style,
        password: opts
      };
      saveProfile();
      message.remove();
      document.querySelectorAll(".page").forEach(value2 => {
        const count = value2.dataset.pageId;
        const index = tabs.find(value => value.id === count);
        if (index && index.newTab) {
          value2.innerHTML = homepageHTML(count);
          wireHome(value2, index);
        }
      });
      value3(true);
    };
    message.querySelector("#signupGo").onclick = invite;
    signupPass.addEventListener("keydown", value => {
      if (value.key === "Enter") {
        invite();
      }
    });
    signupName.addEventListener("keydown", value => {
      if (value.key === "Enter") {
        signupPass.focus();
      }
    });
  });
}
function forceHomeTab() {
  tabs = (tabs || []).filter(Boolean);
  const reason = tabs.filter(value => value.isAdmin);
  const note = tabs.filter(value => value.isGames);
  const kind = tabs.filter(value => !value.isAdmin && !value.isGames && !value.isChat && value.url && !value.newTab && value.url !== "veil://games" && value.url !== "veil://chat");
  let mode = tabs.find(value => !value.isAdmin && !value.isGames && value.newTab && !value.url) || tabs.find(value => !value.isAdmin && !value.isGames) || null;
  if (!mode) {
    const speed = {
      id: uid(),
      title: "New Tab",
      url: "",
      history: [],
      historyIndex: -1,
      newTab: true,
      engineFrame: null,
      favicon: FAVI,
      animOpen: true,
      lastActive: Date.now(),
      isAdmin: false,
      isGames: false
    };
    mode = speed;
  } else {
    mode.newTab = true;
    mode.url = "";
    mode.title = "New Tab";
    mode.favicon = FAVI;
    mode.engineFrame = null;
    mode.isAdmin = false;
    mode.isGames = false;
  }
  tabs = [mode].concat(kind.filter(value => value.id !== mode.id)).concat(reason.filter(value => value.id !== mode.id));
  try {
    sessionStorage.removeItem("veil_active_special");
  } catch (err) {}
  activeTabId = mode.id;
  mode.lastActive = Date.now();
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return mode;
  }
  const set = new Set(tabs.map(value => value.id));
  viewport.querySelectorAll(".page").forEach(value => {
    const overlay = value.dataset.pageId;
    if (overlay && !set.has(overlay)) {
      value.remove();
    }
  });
  let locked = viewport.querySelector(".page[data-page-id=\"" + mode.id + "\"]");
  if (!locked) {
    locked = document.createElement("section");
    locked.className = "page";
    locked.dataset.pageId = mode.id;
    viewport.appendChild(locked);
  }
  try {
    locked.innerHTML = homepageHTML(mode.id);
    wireHome(locked, mode);
  } catch (err2) {
    console.error("home render", err2);
    try {
      locked.innerHTML = homepageHTML(mode.id);
      wireHome(locked, mode);
    } catch (err) {}
  }
  locked.classList.add("active");
  locked.style.display = "block";
  viewport.querySelectorAll(".page").forEach(value => {
    if (value !== locked) {
      value.classList.remove("active");
      value.style.display = "none";
    }
  });
  return mode;
}
function formatAccessLeft(value) {
  if (!value) {
    return "—";
  }
  if (value.infinite) {
    return "Unlimited";
  }
  if (value.expires) {
    const colorA = Number(value.expires) - Date.now();
    if (colorA <= 0) {
      return "Expired";
    }
    const colorB = Math.floor(colorA / 1000);
    const themeName = Math.floor(colorB / 86400);
    const setting = Math.floor(colorB % 86400 / 3600);
    const profile2 = Math.floor(colorB % 3600 / 60);
    const cloak2 = colorB % 60;
    const panic2 = [];
    if (themeName) {
      panic2.push(themeName + "d");
    }
    if (setting) {
      panic2.push(setting + "h");
    }
    if (profile2) {
      panic2.push(profile2 + "m");
    }
    if (!themeName && !setting) {
      panic2.push(cloak2 + "s");
    } else if (cloak2 && panic2.length < 2) {
      panic2.push(cloak2 + "s");
    }
    return panic2.join(" ") || "0s";
  }
  return value.timeLeft || "—";
}
function detectOSName() {
  const email = navigator.userAgent || "";
  let password = "";
  try {
    password = navigator.userAgentData && navigator.userAgentData.platform || navigator.platform || "";
  } catch (err) {}
  if (/CrOS|Chromebook|Chrome OS/i.test(email) || /Chrome OS/i.test(password)) {
    return "ChromeOS";
  }
  if (/Win/i.test(password) || /Windows/i.test(email)) {
    return "WindowsOS";
  }
  if (/Mac/i.test(password) || /Macintosh|Mac OS/i.test(email)) {
    return "MacOS";
  }
  if (/Linux|X11/i.test(password) || /Linux/i.test(email)) {
    return "LinuxOS";
  }
  return "";
}
function batteryStep(value) {
  const clientId = Math.max(0, Math.min(100, Number(value) * 100));
  return Math.max(0, Math.min(100, Math.round(clientId / 5) * 5));
}
function batteryIcon(value, extra) {
  const charging = extra ? "charging" : "normal";
  const user = (extra ? "batteryCharge" : "battery") + value + ".svg";
  return IMG + "battery/" + charging + "/" + user;
}
let batteryManager = null;
let batteryKnown = false;
function isNoBattery(value) {
  if (!value || typeof value.level !== "number") {
    return true;
  }
  return value.charging === true && value.level >= 0.995 && value.chargingTime === 0 && !isFinite(value.dischargingTime);
}
function paintBattery() {
  const msg = document.querySelectorAll(".time-battery");
  if (!msg.length) {
    return;
  }
  if (!batteryKnown) {
    msg.forEach(value => {
      value.hidden = true;
    });
    return;
  }
  const isErr = batteryManager && typeof batteryManager.level === "number";
  const name2 = isErr ? batteryManager.level : 1;
  const maxAge = isErr ? !!batteryManager.charging : true;
  const key = batteryStep(name2);
  const id = batteryIcon(key, maxAge);
  const url = Math.max(0, Math.min(100, Math.round(Number(name2) * 100)));
  msg.forEach(value => {
    const img = value.querySelector("img");
    const timeBatteryPct = value.querySelector(".time-battery-pct");
    if (img && img.getAttribute("src") !== id) {
      img.src = id;
    }
    if (timeBatteryPct) {
      timeBatteryPct.hidden = false;
      timeBatteryPct.textContent = url + "%";
    }
    value.hidden = false;
  });
}
function startBattery() {
  if (batteryKnown) {
    return;
  }
  if (!navigator.getBattery) {
    batteryKnown = true;
    batteryManager = null;
    paintBattery();
    return;
  }
  navigator.getBattery().then(value => {
    batteryManager = value;
    batteryKnown = true;
    const found = () => paintBattery();
    found();
    value.addEventListener("levelchange", found);
    value.addEventListener("chargingchange", found);
    value.addEventListener("chargingtimechange", found);
    value.addEventListener("dischargingtimechange", found);
  }).catch(() => {
    batteryKnown = true;
    batteryManager = null;
    paintBattery();
  });
}
function updateAccessTimeBar() {
  const el = document.querySelectorAll(".time-bar");
  if (!el.length) {
    return;
  }
  const node = window.VeilAccess && window.VeilAccess.getMeta && window.VeilAccess.getMeta() || null;
  const err = "Time Remaining: " + formatAccessLeft(node);
  const list = detectOSName();
  el.forEach(value => {
    let timeLeft = value.querySelector(".time-left");
    if (!timeLeft || !value.querySelector(".time-batt")) {
      value.textContent = "";
      const next = document.createElement("div");
      next.className = "time-dev";
      next.textContent = "Site under development. Bugs may occur.";
      const prev = document.createElement("div");
      prev.className = "time-cluster";
      const timer = document.createElement("span");
      timer.className = "time-batt";
      const box = document.createElement("span");
      box.className = "time-battery";
      box.hidden = true;
      box.innerHTML = "<img alt=\"\" width=\"18\" height=\"18\"><span class=\"time-battery-pct\"></span>";
      timer.appendChild(box);
      timeLeft = document.createElement("span");
      timeLeft.className = "time-left";
      const btn = document.createElement("span");
      btn.className = "time-os";
      prev.appendChild(timer);
      prev.appendChild(timeLeft);
      prev.appendChild(btn);
      value.appendChild(next);
      value.appendChild(prev);
    }
    timeLeft.textContent = err;
    const timeOs = value.querySelector(".time-os");
    if (timeOs) {
      timeOs.textContent = list;
    }
  });
  paintBattery();
}
setInterval(updateAccessTimeBar, 1000);
window.addEventListener("veil-session-meta", updateAccessTimeBar);
window.addEventListener("veil-access-ok", updateAccessTimeBar);
window.addEventListener("veil-access-revoked", function () {
  try {
    document.body.classList.add("gate-lock");
    const browser = document.getElementById("browser") || document.getElementById("app");
    if (browser) {
      browser.style.display = "none";
    }
  } catch (err) {}
});
let __veilBootStarted = false;
async function bootVeilApp() {
  if (__veilBootStarted) {
    return;
  }
  __veilBootStarted = true;
  try {
    document.body.classList.remove("gate-lock");
    const browser = document.getElementById("browser") || document.getElementById("app");
    if (browser) {
      browser.style.display = "";
    }
    const accessGate = document.getElementById("accessGate");
    if (accessGate) {
      accessGate.style.display = "none";
    }
    const accessBlocked = document.getElementById("accessBlocked");
    if (accessBlocked) {
      accessBlocked.style.display = "none";
    }
  } catch (err) {}
  loadProfile();
  let item = null;
  try {
    item = localStorage.getItem("veil_cookie_consent");
  } catch (err) {}
  if (!item) {
    try {
      item = COOKIE.get("veil_cookie_consent");
    } catch (err) {}
  }
  if (item === "yes") {
    COOKIE.consent = true;
    loadSavedData();
  }
  try {
    await syncChatFromAccount();
  } catch (err) {}
  if (!cloak.icon) {
    cloak.icon = FAVI;
  }
  cloak.title = cloak.title || "Veil";
  cloak.icon = cloak.icon || FAVI;
  applyCSSVariables();
  document.title = cloak.title;
  try {
    const favicon = document.getElementById("favicon");
    if (favicon) {
      favicon.href = cloak.icon;
    }
  } catch (err) {}
  markAboutBlankSession();
  syncAboutBlankChrome();
  try {
    await showCookieConsent();
  } catch (err) {
    console.warn("cookie consent", err);
  }
  try {
    await showSignup();
  } catch (err) {
    console.warn("signup", err);
  }
  try {
    forceHomeTab();
    const channel = new URLSearchParams(location.search).get("open");
    if (channel) {
      const kind = unwrapProxyUrl(channel) || channel;
      try {
        history.replaceState(null, "", location.pathname);
      } catch (err) {}
      if (/^https?:\/\//i.test(kind)) {
        navigate(kind);
      }
    }
  } catch (err2) {
    console.error("forceHomeTab", err2);
    try {
      createTab(true);
    } catch (err) {}
  }
  showActiveOnly();
  renderChrome();
  startWelcomeClock();
  try {
    startLivePings();
  } catch (err) {}
  try {
    armSaver();
  } catch (err) {}
  try {
    startBattery();
  } catch (err) {}
  try {
    paintEngineStatus();
  } catch (err) {}
  initEngine().then(() => {
    try {
      pushAdblockToSW();
    } catch (err) {}
  }).catch(() => {});
  setTimeout(syncAboutBlankChrome, 100);
  setTimeout(syncAboutBlankChrome, 600);
  if (settings.theme === "custom") {
    const message = settings.customPalette;
    if (message && message.bg) {
      settings.bg = message.bg;
      settings.panel = message.panel || message.bg;
      settings.accent = message.accent || "#ffffff";
      settings.text = message.text || "#f2f2f2";
      settings.customOutline = message.outline || settings.customOutline || "";
    }
    deriveCustomSurfaces();
  } else if (settings.theme && THEMES[settings.theme]) {
    Object.assign(settings, THEMES[settings.theme], {
      theme: settings.theme,
      transport: settings.transport,
      wispId: settings.wispId,
      launchMode: settings.launchMode,
      backgroundUrl: settings.backgroundUrl,
      adBlocker: settings.adBlocker,
      maxLoadedTabs: settings.maxLoadedTabs,
      searchEngine: settings.searchEngine,
      lockUnload: settings.lockUnload,
      animEnabled: settings.animEnabled,
      animStyle: settings.animStyle,
      animSpeed: settings.animSpeed,
      animCount: settings.animCount,
      animSize: settings.animSize,
      animMediaSpeed: settings.animMediaSpeed,
      animColorA: settings.animColorA,
      animColorB: settings.animColorB,
      customServers: settings.customServers,
      timeFormat: settings.timeFormat,
      saverMinutes: settings.saverMinutes,
      saverDelay: settings.saverDelay,
      saverEnabled: settings.saverEnabled,
      saverStyle: settings.saverStyle,
      saverUrl: settings.saverUrl,
      saverColorA: settings.saverColorA,
      saverColorB: settings.saverColorB,
      saverSpeed: settings.saverSpeed,
      saverCount: settings.saverCount,
      saverSize: settings.saverSize,
      saverMediaSpeed: settings.saverMediaSpeed,
      customOutline: settings.customOutline,
      colorMode: settings.colorMode,
      customPalette: settings.customPalette
    });
  } else {
    settings.theme = "matte";
    Object.assign(settings, THEMES.matte, {
      theme: "matte"
    });
  }
  applyCSSVariables();
  try {
    highlightTheme();
  } catch (err) {}
  setTimeout(function () {
    try {
      const viewport = document.getElementById("viewport");
      const newtabPage = viewport && viewport.querySelector(".newtab-page");
      const opts = tabs.filter(value => !value.isAdmin && value.newTab && !value.url);
      if (!tabs.length || !newtabPage) {
        forceHomeTab();
      } else if (opts.length > 1) {
        forceHomeTab();
      }
      showActiveOnly();
      renderChrome();
      try {
        bootChatLink();
      } catch (err) {}
      try {
        paintChatAlerts();
      } catch (err) {}
      if (settings.launchMode === "auto" && !isInsideAboutBlank()) {
        openAboutBlank("tab");
      }
    } catch (err) {}
  }, 200);
}
(function waitForAccess() {
  function startApp() {
    bootVeilApp().catch(function (value) {
      console.error("bootVeilApp failed", value);
      try {
        forceHomeTab();
        renderChrome();
      } catch (err) {}
    });
  }
  if (window.__VEIL_ACCESS_OK) {
    startApp();
    return;
  }
  window.addEventListener("veil-access-ok", function onAccessOk() {
    window.removeEventListener("veil-access-ok", onAccessOk);
    startApp();
  });
})();
on("chatNotifySwitch", () => {
  const el = document.getElementById("chatNotifySwitch");
  if (el && el.__veilDots) {
    return;
  }
  const group = chatProfile();
  group.notifyDot = group.notifyDot === false;
  saveChatProfile(group);
  try {
    localStorage.setItem("veil_msg_dots", group.notifyDot ? "1" : "0");
  } catch (err) {}
  setSwitch(el, group.notifyDot !== false);
  paintChatAlerts();
});
on("chatAdminSwitch", () => {
  if (!isChatAdmin()) {
    return;
  }
  const pending = chatProfile();
  pending.adminMode = !pending.adminMode;
  saveChatProfile(pending);
  setSwitch(document.getElementById("chatAdminSwitch"), !!pending.adminMode);
  const chatRoot = document.getElementById("chatRoot");
  if (chatRoot) {
    renderChatPage(chatRoot);
  }
});
on("saveChatUsername", () => {
  const admin = chatProfile();
  const session = String(document.getElementById("chatUsername")?.value || "").trim().slice(0, 24);
  const chatUsernameMsg = document.getElementById("chatUsernameMsg");
  if (session.length < 2) {
    if (chatUsernameMsg) {
      chatUsernameMsg.textContent = "Use at least 2 characters.";
    }
    return;
  }
  admin.username = session;
  saveChatProfile(admin);
  if (chatUsernameMsg) {
    chatUsernameMsg.textContent = "Username saved.";
  }
  bootChatLink();
  try {
    pushChatPresence();
  } catch (err) {}
  const chatRoot = document.getElementById("chatRoot");
  if (chatRoot) {
    renderChatPage(chatRoot);
  }
});
on("chatPfpFile", () => {});
document.getElementById("chatPfpFile")?.addEventListener("change", value2 => {
  const value3 = value2.target.files && value2.target.files[0];
  if (!value3) {
    return;
  }
  shrinkChatPhoto(value3).then(value => {
    const res = chatProfile();
    res.pfp = value;
    saveChatProfile(res);
    fillChatSettings();
    pushChatPresence();
  }).catch(() => chatToast("Could not use that picture", "bad"));
});
function shrinkChatPhoto(value2) {
  return new Promise((value, extra) => {
    const fileReader = new FileReader();
    fileReader.onerror = () => extra();
    fileReader.onload = () => {
      const image = new Image();
      image.onerror = () => extra();
      image.onload = () => {
        const entry = document.createElement("canvas");
        const meta = 64;
        entry.width = meta;
        entry.height = meta;
        const root = entry.getContext("2d");
        const wrap = Math.max(meta / image.width, meta / image.height);
        const page = image.width * wrap;
        const tab = image.height * wrap;
        root.drawImage(image, (meta - page) / 2, (meta - tab) / 2, page, tab);
        value(entry.toDataURL("image/jpeg", 0.72));
      };
      image.src = String(fileReader.result || "");
    };
    fileReader.readAsDataURL(value2);
  });
}
on("chatPfpClear", () => {
  const extra = chatProfile();
  extra.pfp = "";
  saveChatProfile(extra);
  fillChatSettings();
});
on("signOutBtn", () => {
  closePanels();
  closeMenu();
  if (window.VeilAccess && typeof window.VeilAccess.signOut === "function") {
    window.VeilAccess.signOut();
  } else {
    try {
      localStorage.removeItem("veil_access_token");
      document.cookie = "veil_access_token=; path=/; max-age=0; SameSite=Lax";
    } catch (err) {}
    location.reload();
  }
});
const GAMES_CATS = ["Sports", "Adventure", "Sandbox", "Casual", "Idle", "Racing", "Arcade", "FNF", "Emulators"];
let gamesCatalog = [];
let gamesUserData = {
  favorites: [],
  recent: [],
  notes: {}
};
let gamesPopularTimer = null;
let gamesPageActive = false;
let gamesRenderRoot = null;
function gameSlug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);
}
function gameId(value) {
  return value.id || gameSlug(value.name) || value.url || value.name;
}
function resolveGameAsset(value) {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return REPO_PATH + String(value).replace(/^\//, "");
}
function smallThumb(value) {
  const timer = gameSlug(value.name);
  if (value.image && /games\/small/i.test(value.image)) {
    return resolveGameAsset(value.image);
  }
  return resolveGameAsset("image/games/small/" + timer + ".png");
}
function largeThumb(value) {
  const btn = gameSlug(value.name);
  if (value.imageLarge) {
    return resolveGameAsset(value.imageLarge);
  }
  if (value.image && /games\/large/i.test(value.image)) {
    return resolveGameAsset(value.image);
  }
  return resolveGameAsset("image/games/large/" + btn + ".png");
}
function gamePreviewVideo(value) {
  if (!value) {
    return "";
  }
  if (value.video) {
    return resolveGameAsset(value.video);
  }
  if (value.preview) {
    return resolveGameAsset(value.preview);
  }
  return resolveGameAsset("image/games/preview/" + gameSlug(value.name) + ".mp4");
}
function gamePlayUrl(value) {
  return resolveGameAsset(value.url || value.path || "");
}
function maturityLabel(value) {
  return value.maturity || value.rating || value.maturityRating || "NR";
}
async function loadGameCatalog() {
  try {
    const other = await fetch(REPO_PATH + "game-data.html", {
      cache: "no-store"
    });
    const detail = await other.text();
    const source = detail.match(/<script[^>]*id=["']veil-game-data["'][^>]*>([\s\S]*?)<\/script>/i) || detail.match(/<script[^>]*id=["'][^"']*game-data["'][^>]*>([\s\S]*?)<\/script>/i);
    if (source) {
      const locked = JSON.parse(source[1].trim());
      gamesCatalog = Array.isArray(locked.games) ? locked.games : [];
    }
  } catch (err) {
    console.warn("game-data load", err);
  }
  if (!gamesCatalog.length) {
    gamesCatalog = [{
      name: "Retrobowl",
      image: "image/games/small/retrobowl.png",
      imageLarge: "image/games/large/retrobowl.png",
      url: "assets/retrobowl/retrobowl.html",
      category: "Sports",
      description: "A retro-style football game.",
      controls: "Mouse or touch to manage your team.",
      howToPlay: "Build your roster and win the season.",
      sideNotes: "Placeholder until full game-data is deployed.",
      maturity: "E",
      difficulty: "3"
    }];
  }
  return gamesCatalog;
}
async function loadGamesUserData() {
  const opts = accountToken();
  if (opts) {
    try {
      const password = await fetchAccountData();
      if (password) {
        gamesUserData = {
          favorites: password.favorites || [],
          recent: password.recent || [],
          notes: password.notes || {}
        };
        gamesDataReady = true;
        if (password.chat && password.chat.uid) {
          applyChatBundle(password.chat);
        }
        return gamesUserData;
      }
    } catch (err) {
      console.warn("prefs load", err);
    }
  }
  try {
    const target = localStorage.getItem("veil_games_data");
    if (target) {
      gamesUserData = {
        ...gamesUserData,
        ...JSON.parse(target)
      };
    }
  } catch (err) {}
  return gamesUserData;
}
async function saveGamesUserData() {
  try {
    localStorage.setItem("veil_games_data", JSON.stringify(gamesUserData));
  } catch (err) {}
  const src = accountToken();
  if (!src) {
    return;
  }
  try {
    const current = accountData && typeof accountData === "object" ? accountData : {};
    const next = Object.assign({}, current, {
      favorites: gamesUserData.favorites || [],
      recent: gamesUserData.recent || [],
      notes: gamesUserData.notes || {}
    });
    const profile = chatProfile();
    if (profile && profile.uid) {
      next.chat = chatBundleFromState(profile);
    } else if (current.chat) {
      next.chat = current.chat;
    }
    gamesDataReady = true;
    await postAccountData(next);
  } catch (err) {
    console.warn("prefs save", err);
  }
}
function shuffle(value) {
  const host = value.slice();
  for (let btn = host.length - 1; btn > 0; btn--) {
    const note = Math.floor(Math.random() * (btn + 1));
    const kind = host[btn];
    host[btn] = host[note];
    host[note] = kind;
  }
  return host;
}
function isFavorite(value) {
  return (gamesUserData.favorites || []).indexOf(value) !== -1;
}
function toggleFavorite(value) {
  const set = new Set(gamesUserData.favorites || []);
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  gamesUserData.favorites = Array.from(set);
  saveGamesUserData();
  if (gamesRenderRoot && gamesRenderRoot.isConnected) {
    try {
      paintGamesLists(gamesRenderRoot);
    } catch (err) {}
  }
}
function pushRecent(value2) {
  let row = (gamesUserData.recent || []).filter(value => value !== value2);
  row.unshift(value2);
  gamesUserData.recent = row.slice(0, 10);
  saveGamesUserData();
  if (gamesRenderRoot && gamesRenderRoot.isConnected) {
    try {
      paintGamesLists(gamesRenderRoot);
    } catch (err) {}
  }
}
function openGamesPage() {
  closePanels();
  closeMenu();
  try {
    closeHistory();
  } catch (err) {}
  let count = tabs.find(value => value.isGames);
  if (!count) {
    if (tabs.length >= MAX_TABS) {
      alert("Too many tabs");
      return;
    }
    count = {
      id: uid(),
      title: "Games",
      url: "veil://games",
      history: ["veil://games"],
      historyIndex: 0,
      newTab: false,
      isGames: true,
      isAdmin: false,
      engineFrame: null,
      favicon: IMG + "games.svg",
      animOpen: true,
      lastActive: Date.now()
    };
    tabs.push(count);
  } else {
    count.title = "Games";
    count.url = "veil://games";
    count.favicon = IMG + "games.svg";
    count.isGames = true;
    count.lastActive = Date.now();
  }
  activeTabId = count.id;
  gamesPageActive = true;
  try {
    sessionStorage.setItem("veil_active_special", "games");
  } catch (err) {}
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }
  let entry = viewport.querySelector(".page[data-page-id=\"" + count.id + "\"]");
  if (!entry) {
    entry = document.createElement("section");
    entry.className = "page";
    entry.dataset.pageId = count.id;
    viewport.appendChild(entry);
  }
  entry.innerHTML = "<div class=\"games-page\" id=\"gamesRoot\"></div>";
  showActiveOnly();
  renderChrome();
  updateGamesChromeLocks();
  renderGamesPage(entry.querySelector("#gamesRoot"));
}
function updateGamesChromeLocks() {
  const meta = getActiveTab();
  const root = !!meta && !!meta.isGames;
  gamesPageActive = root;
  const menuFullscreen = document.getElementById("menuFullscreen");
  const menuDevtools = document.getElementById("menuDevtools");
  const tab = !!meta && (!!meta.newTab || !!meta.isGames) || !meta;
  if (menuFullscreen) {
    menuFullscreen.classList.toggle("disabled", tab);
    menuFullscreen.disabled = tab;
    menuFullscreen.setAttribute("aria-disabled", tab ? "true" : "false");
  }
  if (menuDevtools) {
    const mode = root || !!meta && (!!meta.newTab || !!meta.isAdmin);
    menuDevtools.classList.toggle("disabled", mode);
    menuDevtools.disabled = mode;
    menuDevtools.setAttribute("aria-disabled", mode ? "true" : "false");
  }
}
function tileHTML(value) {
  const icon = gameId(value);
  const title = isFavorite(icon);
  return "<div class=\"game-tile" + (title ? " fav" : "") + "\" data-play=\"" + escapeHTML(icon) + "\"><div class=\"thumb\"><img src=\"" + escapeHTML(smallThumb(value)) + "\" alt=\"\" onerror=\"this.style.opacity=.25\"><div class=\"tile-tools\"><button type=\"button\" class=\"tile-tool" + (title ? " on" : "") + "\" data-fav=\"" + escapeHTML(icon) + "\" title=\"Favorite\" aria-label=\"Favorite\"><img src=\"" + IMG + "star.svg\" alt=\"\"></button><button type=\"button\" class=\"tile-tool\" data-info=\"" + escapeHTML(icon) + "\" title=\"Info\" aria-label=\"Info\"><img src=\"" + IMG + "info.svg\" alt=\"\"></button></div></div><div class=\"meta\"><div class=\"name\">" + escapeHTML(value.name) + "</div><div class=\"cat\">" + escapeHTML(value.category || "") + "</div></div></div>";
}
function byIds(value2) {
  const hex = {};
  gamesCatalog.forEach(value => {
    hex[gameId(value)] = value;
  });
  return (value2 || []).map(value => hex[value]).filter(Boolean);
}
function paintGamesLists(value2, extra, other) {
  if (!value2) {
    return;
  }
  extra = extra || value2._gamesState || {
    activeCat: "all",
    query: ""
  };
  value2._gamesState = extra;
  let part = gamesCatalog.slice();
  if (extra.activeCat !== "all") {
    part = part.filter(value => String(value.category || "").toLowerCase() === extra.activeCat.toLowerCase());
  }
  if (extra.query) {
    const force = extra.query.toLowerCase();
    part = part.filter(value => String(value.name || "").toLowerCase().indexOf(force) !== -1 || String(value.category || "").toLowerCase().indexOf(force) !== -1);
  }
  part = shuffle(part);
  const gamesAllRow = value2.querySelector("#gamesAllRow");
  const label = byIds(gamesUserData.favorites || []);
  const gamesFavSection = value2.querySelector("#gamesFavSection");
  const gamesFavRow = value2.querySelector("#gamesFavRow");
  const ok = byIds(gamesUserData.recent || []);
  const gamesRecentSection = value2.querySelector("#gamesRecentSection");
  const gamesRecentRow = value2.querySelector("#gamesRecentRow");
  function paintGameRows() {
    if (gamesAllRow) {
      gamesAllRow.innerHTML = part.length ? part.map(tileHTML).join("") : "<div class=\"games-empty\">No games match.</div>";
    }
    if (gamesFavSection && gamesFavRow) {
      const body = extra.activeCat === "all" && !extra.query && label.length;
      if (body) {
        gamesFavSection.style.display = "";
        gamesFavRow.innerHTML = label.map(tileHTML).join("");
      } else {
        gamesFavSection.style.display = "none";
      }
    }
    if (gamesRecentSection && gamesRecentRow) {
      const token = extra.activeCat === "all" && !extra.query && ok.length;
      if (token) {
        gamesRecentSection.style.display = "";
        gamesRecentRow.innerHTML = ok.map(tileHTML).join("");
      } else {
        gamesRecentSection.style.display = "none";
      }
    }
  }
  if (other && gamesAllRow) {
    const immediate = [gamesAllRow, gamesFavRow, gamesRecentRow].filter(Boolean);
    immediate.forEach(value => {
      value.classList.remove("filtering-done");
      value.classList.add("filtering");
    });
    window.setTimeout(() => {
      paintGameRows();
      immediate.forEach(value => {
        value.classList.remove("filtering");
        value.offsetWidth;
        value.classList.add("filtering-done");
      });
    }, 160);
  } else {
    paintGameRows();
  }
}
async function renderGamesPage(value3) {
  if (!value3) {
    return;
  }
  gamesRenderRoot = value3;
  await loadGameCatalog();
  await loadGamesUserData();
  const handler = ["cookieclicker", "minecraft", "escaperoad", "retrobowl", "basketrandom"];
  const nodes = {};
  gamesCatalog.forEach(value => {
    nodes[gameSlug(value.name)] = value;
  });
  const match = handler.map(value => nodes[value]).filter(Boolean);
  value3.innerHTML = '<div class="games-hero" id="gamesHero">' + match.map((value, extra) => {
    const password = gameId(value);
    const response = String(value.description || "").slice(0, 180);
    return '<div class="games-hero-slide' + (extra === 0 ? " active" : "") + '" data-video="' + escapeHTML(gamePreviewVideo(value)) + '">' + '<div class="games-hero-bg"><img src="' + escapeHTML(largeThumb(value)) + '" alt="" onerror="this.style.opacity=.15">' + '<video class="games-hero-video" muted playsinline preload="none"></video></div>' + '<div class="games-hero-shade"></div>' + '<div class="games-hero-content">' + '<h1 class="games-hero-title">' + escapeHTML(value.name) + '</h1>' + '<div class="games-hero-tags">' + '<span class="games-tag">' + escapeHTML(maturityLabel(value)) + '</span>' + (value.category ? '<span class="games-tag">' + escapeHTML(value.category) + '</span>' : "") + (value.difficulty ? '<span class="games-tag">Difficulty ' + escapeHTML(String(value.difficulty)) + '/10</span>' : "") + '</div>' + '<p class="games-hero-desc">' + escapeHTML(response) + (response.length >= 180 ? "…" : "") + '</p>' + '<div class="games-hero-actions">' + '<button type="button" class="games-play-btn" data-play="' + escapeHTML(password) + '">Play</button>' + '<button type="button" class="games-more-btn" data-info="' + escapeHTML(password) + '">See more</button>' + '</div></div></div>';
  }).join("") + '<div class="games-hero-dots" id="gamesHeroDots">' + match.map((value, extra) => '<button type="button" class="games-dot' + (extra === 0 ? " active" : "") + '" data-dot="' + extra + '"></button>').join("") + '</div></div>' + '<div class="games-inner">' + '<div class="games-header">' + '<div class="games-search-wrap"><span class="gs-icon"></span>' + '<input class="games-search" id="gamesSearch" type="search" placeholder="Search games..." autocomplete="off"></div>' + '<div class="games-cats" id="gamesCats">' + '<button type="button" class="games-cat active" data-cat="all">All</button>' + GAMES_CATS.map(value => '<button type="button" class="games-cat" data-cat="' + escapeHTML(value) + '">' + escapeHTML(value) + '</button>').join("") + '</div></div>' + '<div class="games-section" id="gamesFavSection" style="display:none"><h3>Favorites</h3><div class="games-row" id="gamesFavRow"></div></div>' + '<div class="games-section" id="gamesRecentSection" style="display:none"><h3>Recently played</h3><div class="games-row" id="gamesRecentRow"></div></div>' + '<div class="games-section"><h3>All games</h3><div class="games-row" id="gamesAllRow"></div></div>' + '</div>';
  const piece = {
    activeCat: "all",
    query: ""
  };
  value3._gamesState = piece;
  paintGamesLists(value3, piece);
  let chunk = 0;
  let bits = false;
  const amount = () => value3.querySelectorAll(".games-hero-slide");
  const delay = () => value3.querySelectorAll(".games-dot");
  function stopHeroVideo() {
    amount().forEach(value => {
      value.classList.remove("playing");
      const video = value.querySelector("video");
      if (!video) {
        return;
      }
      try {
        video.pause();
      } catch (err) {}
      video.removeAttribute("src");
      try {
        video.load();
      } catch (err) {}
    });
  }
  function showHeroSlide(value2) {
    const show = amount();
    const email = delay();
    if (!show.length) {
      return;
    }
    chunk = (value2 % show.length + show.length) % show.length;
    show.forEach((value, extra) => value.classList.toggle("active", extra === chunk));
    email.forEach((value, extra) => value.classList.toggle("active", extra === chunk));
  }
  function startHeroTimer() {
    if (gamesPopularTimer) {
      clearInterval(gamesPopularTimer);
    }
    gamesPopularTimer = setInterval(() => {
      if (!value3.isConnected) {
        clearInterval(gamesPopularTimer);
        return;
      }
      if (bits) {
        return;
      }
      showHeroSlide(chunk + 1);
    }, 5000);
  }
  function playHeroVideo() {
    const password = amount();
    const response = password[chunk];
    if (!response) {
      return;
    }
    stopHeroVideo();
    response.classList.add("active");
    const video = response.querySelector("video");
    const path = response.getAttribute("data-video") || "";
    if (!video || !path) {
      return;
    }
    fetch(path, {
      method: "HEAD"
    }).then(value => {
      if (!bits || !value.ok || !response.isConnected) {
        return;
      }
      if (amount()[chunk] !== response) {
        return;
      }
      video.src = path;
      video.onended = () => {
        if (!bits || !value3.isConnected) {
          return;
        }
        showHeroSlide(chunk + 1);
        playHeroVideo();
      };
      video.onerror = () => {
        response.classList.remove("playing");
      };
      const count = video.play();
      if (count && count.then) {
        count.then(() => {
          if (bits) {
            response.classList.add("playing");
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }
  startHeroTimer();
  const gamesHero = value3.querySelector("#gamesHero");
  if (gamesHero) {
    gamesHero.addEventListener("mouseenter", () => {
      bits = true;
      playHeroVideo();
    });
    gamesHero.addEventListener("mouseleave", () => {
      bits = false;
      stopHeroVideo();
    });
  }
  value3.querySelector("#gamesHeroDots")?.addEventListener("click", value => {
    const msg = value.target.closest("[data-dot]");
    if (!msg) {
      return;
    }
    showHeroSlide(parseInt(msg.getAttribute("data-dot"), 10) || 0);
  });
  value3.querySelector("#gamesSearch")?.addEventListener("input", value => {
    piece.query = value.target.value.trim();
    paintGamesLists(value3, piece, true);
  });
  value3.querySelectorAll(".games-cat").forEach(value2 => {
    value2.onclick = () => {
      value3.querySelectorAll(".games-cat").forEach(value => value.classList.remove("active"));
      value2.classList.add("active");
      piece.activeCat = value2.getAttribute("data-cat") || "all";
      paintGamesLists(value3, piece, true);
    };
  });
  value3.addEventListener("click", value2 => {
    const key = value2.target.closest("[data-fav]");
    if (key) {
      value2.preventDefault();
      value2.stopPropagation();
      const row = key.getAttribute("data-fav");
      toggleFavorite(row);
      const count = isFavorite(row);
      value3.querySelectorAll(".game-tile").forEach(value => {
        if (value.getAttribute("data-play") !== row) {
          return;
        }
        value.classList.toggle("fav", count);
        const ratio = value.querySelector("[data-fav]");
        if (ratio) {
          ratio.classList.toggle("on", count);
        }
      });
      const index2 = byIds(gamesUserData.favorites || []);
      const gamesFavSection = value3.querySelector("#gamesFavSection");
      const gamesFavRow = value3.querySelector("#gamesFavRow");
      if (gamesFavSection && gamesFavRow) {
        const index = piece.activeCat === "all" && !piece.query && index2.length;
        if (index) {
          gamesFavSection.style.display = "";
          gamesFavRow.innerHTML = index2.map(tileHTML).join("");
        } else {
          gamesFavSection.style.display = "none";
        }
      }
      return;
    }
    const id = value2.target.closest("[data-info]");
    if (id) {
      const root = id.getAttribute("data-info");
      const wrap = gamesCatalog.find(value => gameId(value) === root);
      if (wrap) {
        value2.preventDefault();
        value2.stopPropagation();
        showGameInfo(wrap);
        return;
      }
    }
    const url = value2.target.closest(".games-play-btn[data-play], .game-tile[data-play]");
    if (url) {
      const page = url.getAttribute("data-play");
      const tab = gamesCatalog.find(value => gameId(value) === page);
      if (tab) {
        openGamePlayer(tab);
      }
    }
  });
}
function openGamePlayer(value2) {
  const saved = gameId(value2);
  pushRecent(saved);
  const fresh = maturityLabel(value2);
  const old = value2.difficulty || "—";
  const copy = "<span class=\"gpt-name\" title=\"" + escapeHTML(value2.name) + "\">" + escapeHTML(value2.name) + "</span><span class=\"gpt-sep\">·</span><span class=\"gpt-mat\" title=\"Content rating\">" + escapeHTML(String(fresh)) + "</span><span class=\"gpt-diff\">Difficulty <b>" + escapeHTML(String(old)) + "</b>/10</span>";
  document.querySelector(".game-player-overlay")?.remove();
  const base = document.createElement("div");
  base.className = "game-player-overlay";
  const full = IMG + "notepad.svg";
  base.innerHTML = '<div class="game-player" id="gamePlayer">' + '<div class="game-player-main">' + '<div class="game-player-bar">' + '<button type="button" class="game-player-btn gp-close" data-gp="close" title="Close"><img src="' + IMG + 'exit.svg" alt=""></button>' + '<div class="game-player-title">' + copy + '</div>' + '<button type="button" class="game-player-btn" data-gp="info" title="Info"><img src="' + IMG + 'info.svg" alt=""></button>' + '<button type="button" class="game-player-btn" data-gp="notes" title="Notes"><img src="' + full + '" alt="" onerror="this.onerror=null;this.src=\'' + IMG + 'pencil.svg\'"></button>' + '<button type="button" class="game-player-btn" data-gp="star" title="Favorite"><img src="' + IMG + 'star.svg" alt=""></button>' + '<button type="button" class="game-player-btn" data-gp="fs" title="Fullscreen"><img src="' + IMG + 'zoom.svg" alt=""></button>' + '<button type="button" class="game-player-btn" data-gp="reload" title="Reload"><img src="' + IMG + 'refresh.svg" alt=""></button>' + '</div>' + '<div class="game-player-frame"><iframe id="gameFrame" src="' + escapeHTML(gamePlayUrl(value2)) + '" allow="gamepad *; autoplay *; fullscreen *"></iframe></div>' + '</div>' + '<div class="game-notes" id="gameNotesPanel">' + '<div class="game-notes-header"><span>Notes</span>' + '<button type="button" class="game-player-btn" data-gp="notes-close" title="Close notes"><img src="' + IMG + 'exit.svg" alt=""></button></div>' + '<div class="game-notes-tabs" id="gameNoteTabs"></div>' + '<div class="game-notes-editor">' + '<label class="game-note-label" for="gameNoteTitle">Title</label>' + '<input type="text" class="game-note-title" id="gameNoteTitle" maxlength="60" placeholder="Note title">' + '<label class="game-note-label" for="gameNoteBody">Note</label>' + '<textarea id="gameNoteBody" placeholder="Write a note…"></textarea>' + '</div></div></div>';
  document.body.appendChild(base);
  const gamePlayer = base.querySelector("#gamePlayer");
  const gameFrame = base.querySelector("#gameFrame");
  function paintStar(value) {
    if (!value) {
      return;
    }
    const token = isFavorite(saved);
    value.classList.toggle("star-on", token);
    const img = value.querySelector("img");
    if (img) {
      if (token) {
        img.style.filter = "invert(79%) sepia(61%) saturate(600%) hue-rotate(5deg)";
      } else {
        img.style.filter = "invert(1)";
      }
      img.style.opacity = "1";
    }
  }
  paintStar(base.querySelector("[data-gp=\"star\"]"));
  if (!gamesUserData.notes[saved]) {
    gamesUserData.notes[saved] = [];
  }
  let letter = gamesUserData.notes[saved];
  if (!letter.length) {
    letter.push({
      id: uid(),
      title: "Note 1",
      body: ""
    });
  }
  let code = 0;
  function saveActiveNote() {
    const gameNoteTitle = base.querySelector("#gameNoteTitle");
    const gameNoteBody = base.querySelector("#gameNoteBody");
    if (letter[code]) {
      letter[code].title = (gameNoteTitle.value || "Note").slice(0, 60);
      letter[code].body = gameNoteBody.value || "";
    }
    gamesUserData.notes[saved] = letter;
    saveGamesUserData();
    const note = letter[code] ? letter[code].title || "Note" : "Note";
    const gameNoteTabActive = base.querySelector(".game-note-tab.active .game-note-tab-title");
    if (gameNoteTabActive) {
      gameNoteTabActive.textContent = note;
    }
    const gameNoteMenu = base.querySelector("#gameNoteMenu");
    if (gameNoteMenu && gameNoteMenu.options[code]) {
      gameNoteMenu.options[code].textContent = note;
    }
  }
  function renderNoteTabs() {
    const gameNoteTabs = base.querySelector("#gameNoteTabs");
    const id = gamePlayer.classList.contains("notes-open");
    const url = "<button type=\"button\" class=\"game-note-add\" data-note-add title=\"New note\" aria-label=\"New note\"><img src=\"" + IMG + "plus.svg\" alt=\"\"></button>";
    const el = letter.map((value, extra) => "<button type=\"button\" class=\"game-note-tab" + (extra === code ? " active" : "") + "\" data-note=\"" + extra + "\"><span class=\"game-note-tab-title\">" + escapeHTML(value.title || "Note") + "</span>" + (extra === code ? "<span class=\"game-note-x\" data-note-x=\"" + extra + "\" title=\"Close note\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></span>" : "") + "</button>").join("");
    gameNoteTabs.classList.remove("is-menu");
    gameNoteTabs.innerHTML = el + url;
    const node = letter[code] || {
      title: "",
      body: ""
    };
    base.querySelector("#gameNoteTitle").value = node.title || "";
    base.querySelector("#gameNoteBody").value = node.body || "";
    if (!id || letter.length < 2) {
      return;
    }
    requestAnimationFrame(() => {
      if (!gameNoteTabs.isConnected || !gamePlayer.classList.contains("notes-open")) {
        return;
      }
      const frame = gameNoteTabs.clientWidth;
      if (frame < 160) {
        return;
      }
      let icon = 0;
      gameNoteTabs.querySelectorAll(":scope > *").forEach(value => {
        icon += value.offsetWidth + 6;
      });
      if (icon <= frame) {
        return;
      }
      gameNoteTabs.classList.add("is-menu");
      const title = letter.map((value, extra) => "<option value=\"" + extra + "\"" + (extra === code ? " selected" : "") + ">" + escapeHTML(value.title || "Note " + (extra + 1)) + "</option>").join("");
      gameNoteTabs.innerHTML = "<select class=\"game-note-menu\" id=\"gameNoteMenu\" aria-label=\"Notes\">" + title + "</select><span class=\"game-note-x\" data-note-x=\"" + code + "\" title=\"Close note\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></span>" + url;
    });
  }
  renderNoteTabs();
  base.querySelector("#gameNoteTabs").onclick = value => {
    const node = value.target.closest("[data-note-x]");
    if (node) {
      value.preventDefault();
      value.stopPropagation();
      saveActiveNote();
      const color = parseInt(node.getAttribute("data-note-x"), 10) || 0;
      if (letter.length <= 1) {
        letter[0] = {
          id: uid(),
          title: "Note 1",
          body: ""
        };
        code = 0;
      } else {
        letter.splice(color, 1);
        if (code >= letter.length) {
          code = letter.length - 1;
        } else if (color < code) {
          code -= 1;
        }
      }
      gamesUserData.notes[saved] = letter;
      saveGamesUserData();
      renderNoteTabs();
      return;
    }
    if (value.target.closest("[data-note-add]")) {
      saveActiveNote();
      letter.push({
        id: uid(),
        title: "Note " + (letter.length + 1),
        body: ""
      });
      code = letter.length - 1;
      gamesUserData.notes[saved] = letter;
      saveGamesUserData();
      renderNoteTabs();
      return;
    }
    const err = value.target.closest("[data-note]");
    if (!err) {
      return;
    }
    saveActiveNote();
    code = parseInt(err.getAttribute("data-note"), 10) || 0;
    renderNoteTabs();
  };
  base.querySelector("#gameNoteTabs").addEventListener("change", value => {
    if (!value.target || value.target.id !== "gameNoteMenu") {
      return;
    }
    saveActiveNote();
    code = parseInt(value.target.value, 10) || 0;
    renderNoteTabs();
  });
  base.querySelector("#gameNoteTitle").addEventListener("input", saveActiveNote);
  base.querySelector("#gameNoteBody").addEventListener("input", saveActiveNote);
  base.querySelector(".game-player-bar").onclick = value => {
    const text = value.target.closest("[data-gp]");
    if (!text) {
      return;
    }
    const raw = text.getAttribute("data-gp");
    if (raw === "close") {
      saveActiveNote();
      base.remove();
      return;
    }
    if (raw === "reload") {
      gameFrame.src = gameFrame.src;
      return;
    }
    if (raw === "fs") {
      const hex = gameFrame.requestFullscreen || gameFrame.webkitRequestFullscreen;
      if (hex) {
        hex.call(gameFrame);
      }
      return;
    }
    if (raw === "star") {
      toggleFavorite(saved);
      paintStar(text);
      return;
    }
    if (raw === "notes") {
      gamePlayer.classList.add("notes-open");
      setTimeout(renderNoteTabs, 220);
      return;
    }
    if (raw === "info") {
      showGameInfo(value2);
    }
  };
  base.querySelector("[data-gp=\"notes-close\"]").onclick = () => {
    saveActiveNote();
    gamePlayer.classList.remove("notes-open");
  };
}
function showGameInfo(value2) {
  document.querySelector(".modal-overlay.game-info-modal")?.remove();
  const addr = document.createElement("div");
  addr.className = "modal-overlay game-info-modal";
  const port = [{
    key: "description",
    label: "Description",
    body: value2.description
  }, {
    key: "controls",
    label: "Controls",
    body: value2.controls
  }, {
    key: "howToPlay",
    label: "How to play",
    body: value2.howToPlay
  }, {
    key: "sideNotes",
    label: "Side notes",
    body: value2.sideNotes
  }];
  const link = maturityLabel(value2);
  const href = value2.difficulty || "—";
  const file = gameId(value2);
  addr.innerHTML = "<div class=\"modal-box info-modal game-info-box\" role=\"dialog\" aria-modal=\"true\"><div class=\"game-info-hero\"><img src=\"" + escapeHTML(largeThumb(value2) || smallThumb(value2)) + "\" alt=\"\" onerror=\"this.style.opacity=.2\"><div class=\"game-info-hero-shade\"></div><button type=\"button\" class=\"game-player-btn game-info-x\" data-info-x title=\"Close\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></button><div class=\"game-info-hero-copy\"><h2>" + escapeHTML(value2.name) + "</h2><div class=\"game-info-meta\"><span>" + escapeHTML(String(link)) + "</span>" + (value2.category ? "<span>" + escapeHTML(value2.category) + "</span>" : "") + "<span>Difficulty " + escapeHTML(String(href)) + "/10</span></div></div></div><div class=\"game-info-sections\">" + port.map(value => "<section class=\"game-info-sec\"><h3>" + escapeHTML(value.label) + "</h3><p>" + escapeHTML(value.body || "Not listed.") + "</p></section>").join("") + "</div><div class=\"game-info-foot\"><button type=\"button\" class=\"games-play-btn\" data-play=\"" + escapeHTML(file) + "\">Play</button></div></div>";
  document.body.appendChild(addr);
  const blob = () => addr.remove();
  addr.querySelector("[data-info-x]").onclick = blob;
  addr.onclick = value => {
    if (value.target === addr) {
      blob();
    }
  };
  addr.querySelector("[data-play]").onclick = () => {
    blob();
    openGamePlayer(value2);
  };
}
on("openAdminPanel", () => {
  closePanels();
  closeMenu();
  try {
    closeHistory();
  } catch {}
  const err = location.pathname.replace(/\/?index\.html$/i, "/").replace(/\/?$/, "/");
  const list = location.origin + err + "admin/index.html";
  let item = tabs.find(value => value.isAdmin);
  if (!item) {
    if (tabs.length >= MAX_TABS) {
      alert("Too many tabs");
      return;
    }
    item = {
      id: uid(),
      title: "Admin Panel",
      url: "veil://admin",
      history: [],
      historyIndex: -1,
      newTab: false,
      isAdmin: true,
      engineFrame: null,
      favicon: FAVI,
      animOpen: true,
      lastActive: Date.now()
    };
    tabs.push(item);
  } else {
    item.url = "veil://admin";
    item.title = "Admin Panel";
    item.favicon = FAVI;
    item.lastActive = Date.now();
  }
  activeTabId = item.id;
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }
  let raw = viewport.querySelector(".page[data-page-id=\"" + item.id + "\"]");
  if (!raw) {
    raw = document.createElement("section");
    raw.className = "page";
    raw.dataset.pageId = item.id;
    viewport.appendChild(raw);
  }
  raw.innerHTML = "";
  const found = document.createElement("iframe");
  found.className = "engine-frame";
  found.setAttribute("title", "Admin Panel");
  found.style.cssText = "width:100%;height:100%;border:0;background:#101010";
  found.src = list;
  raw.appendChild(found);
  item.engineFrame = {
    frame: found,
    element: found
  };
  found.addEventListener("load", function () {
    item.url = "veil://admin";
    item.isAdmin = true;
    renderToolbar();
  });
  showActiveOnly();
  renderChrome();
});
setTimeout(function () {
  if (typeof navigate !== "function" || typeof save !== "function") {
    return;
  }
  var next = String(navigate);
  var prev = String(save);
  setInterval(function () {
    if (String(navigate) !== next || String(save) !== prev) {
      if (window.__veilKill) {
        window.__veilKill();
      }
    }
  }, 2000);
}, 2500);
