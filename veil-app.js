'use strict';
try { if (typeof window.__veilBind === "function") window.__veilBind(); } catch (err) {}


(function () {
  var invite = Element.prototype.remove;
  Element.prototype.remove = function () {
    var saved = this;
    if (saved && saved.classList && saved.isConnected && !saved.classList.contains("closing") && (saved.classList.contains("modal-overlay") || saved.classList.contains("cookie-overlay") || saved.classList.contains("signup-overlay") || saved.classList.contains("game-player-overlay"))) {
      saved.classList.add("closing");
      var box = saved.querySelector(".modal-box, .signup-card, .game-player") || saved;
      box.style.animation = "none";
      saved.style.animation = "none";
      var finish = function () {
        try { invite.call(saved); } catch (err) {}
      };
      if (typeof springClose === "function") {
        springClose(box, finish);
        try {
          if (window.anime && window.anime.animate) {
            window.anime.animate(saved, { opacity: [1, 0], duration: 320, ease: "outCubic" });
          }
        } catch (err) {}
      } else setTimeout(finish, 200);
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
  all: BASE + "/scramjet/scramjet.all.js?v=11",
  sync: BASE + "/scramjet/scramjet.sync.js",
  wasm: BASE + "/scramjet/scramjet.wasm.wasm"
};
const BAREMUX_SCRIPT = BASE + "/baremux/index.js?v=6";
const BAREMUX_WORKER = BASE + "/baremux/worker.js?v=7";
const EPOXY_MODULE = BASE + "/epoxy/index.mjs";
const LIBCURL_MODULE = BASE + "/libcurl/indexmjs.mjs?v=3";
const DEFAULT_WISP = "wss://serv-1-va.onrender.com/";
const SW_URL = BASE + "/sw.js?v=21";
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
let bareWorker = null;
function bareWorkerInstance() {
  if (bareWorker) return bareWorker;
  bareWorker = new Worker(BAREMUX_WORKER);
  bareWorker.onerror = (err) => {
    console.warn("[veil] connection worker", (err && err.message) || err);
  };
  bareWorker.onmessage = (event) => {
    const data = event && event.data;
    if (!data || data.type !== "veil-mux-rebuilt") return;
    if (!data.switched || !data.wisp || typeof settings === "undefined" || !settings) return;
    const strip = value => String(value || "").replace(/\/+$/, "");
    const hit = allWispServers().find(value => value && strip(value.url) === strip(data.wisp));
    if (hit && hit.id !== settings.wispId) {
      settings.wispId = hit.id;
      try { save(); } catch (err) {}
      try { paintEngineStatus(); } catch (err) {}
      try { fillWispSelect(); } catch (err) {}
    }
  };
  return bareWorker;
}
// The connection worker outlives page refreshes inside tabs, so its Wisp socket can die under it
// (device sleep, network change, server spin-down). Tell it when the page wakes so it reconnects
// before the next request instead of failing with MuxTaskEnded.
(function watchMuxWake() {
  let hiddenAt = document.hidden ? Date.now() : 0;
  const wake = (reason, hiddenMs) => {
    if (!bareWorker) return;
    try { bareWorker.postMessage({ type: "veil-mux-wake", reason: reason, hiddenMs: hiddenMs || 0 }); } catch (err) {}
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    const gap = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    wake("visible", gap);
  });
  window.addEventListener("online", () => wake("online", 0));
  document.addEventListener("resume", () => wake("resume", 60000));
  window.addEventListener("pageshow", event => { if (event.persisted) wake("pageshow", 60000); });
})();
function wispFallbacks(primary) {
  const strip = value => String(value || "").replace(/\/+$/, "");
  const out = [];
  try {
    allWispServers().forEach(value => {
      const url = value && normalizeWispUrl(value.url);
      if (url && strip(url) !== strip(primary) && out.indexOf(url) === -1) out.push(url);
    });
  } catch (err) {}
  return out.slice(0, 4);
}
function mintBarePort() {
  const channel = new MessageChannel();
  bareWorkerInstance().postMessage({ port: channel.port1 }, [channel.port1]);
  try { channel.port2.start(); } catch (err) {}
  return channel.port2;
}
function exposeBarePort() {
  if (window.__veilBarePort || !("serviceWorker" in navigator)) return;
  window.__veilBarePort = true;
  try { bareWorkerInstance(); } catch (err) {}
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "getPort" || !data.port) return;
    try { event.stopImmediatePropagation(); } catch (err) {}
    try {
      const port = mintBarePort();
      data.port.postMessage(port, [port]);
    } catch (err) {
      console.warn("[veil] bare port", err);
    }
  });
}
window.__veilMintBarePort = mintBarePort;
exposeBarePort();
function tellWorkerMuxReady() {
  const note = { type: "veil-mux-ready" };
  try {
    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(note);
  } catch (err) {}
  navigator.serviceWorker.ready.then((reg) => {
    try { if (reg.active) reg.active.postMessage(note); } catch (err) {}
  }).catch(() => {});
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => tellWorkerMuxReady());
}
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
function setBootLine(value) {
  try {
    const bootSub = document.getElementById("bootSub");
    if (bootSub && value) bootSub.textContent = value;
  } catch (err) {}
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
const SCRAMJET_STORES = ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"];
async function ensureScramjetDB() {
  const openReady = () => new Promise((resolve) => {
    const open = indexedDB.open("$scramjet", 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      SCRAMJET_STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => resolve(null);
  });
  let db = await openReady();
  if (!db) return;
  const ready = SCRAMJET_STORES.every(name => db.objectStoreNames.contains(name));
  db.close();
  if (ready) return;
  await new Promise((resolve) => {
    const del = indexedDB.deleteDatabase("$scramjet");
    const done = () => resolve();
    del.onsuccess = del.onerror = del.onblocked = done;
    setTimeout(done, 1500);
  });
  db = await openReady();
  if (db) db.close();
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
        console.warn("[veil] proxy skipped on about: page");
        engineReady = false;
        if (engineStatus) engineStatus.textContent = "Proxy needs a normal tab.";
        return;
      }
      paintEngineStatus();
      setBootLine("Loading connection…");
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
      setBootLine("Starting proxy…");
      exposeBarePort();
      if (!muxConnection) muxConnection = new BareMux.BareMuxConnection(mintBarePort());
      await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
        updateViaCache: "none"
      });
      await navigator.serviceWorker.ready;
      tellWorkerMuxReady();
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
          captureErrors: false,
          strictRewrites: true,
          rewriterLogs: false
        }
      });
      try {
        await engineController.init();
      } catch (err) {
        if (String(err.message || err).includes("object stores") || String(err.message || err).includes("IDBDatabase")) {
          console.warn("IDB error, force-clear and retry");
          await new Promise(resolve => {
            const del = indexedDB.deleteDatabase("$scramjet");
            const done = () => resolve();
            del.onsuccess = del.onerror = del.onblocked = done;
            setTimeout(done, 1500);
          });
          await ensureScramjetDB();
          await engineController.init();
        } else {
          throw err;
        }
      }
      try { await pushScramjetConfig(); } catch (err) {}
      paintEngineStatus();
      setBootLine("Connecting server…");
      await applyMuxTransport();
      engineReady = true;
      paintEngineStatus();
      try { pushAdblockToSW(); } catch (err) {}
    } catch (err) {
      console.error(err);
      engineReady = false;
      if (engineStatus) {
        engineStatus.textContent = err && err.message || String(err);
      }
    }
  })();
  return engineInitPromise;
}
// Music's last resort (veilos.js): the same stream link, but served through the Scramjet service
// worker over the BareMux transport, so it plays even when the host is blocked on this network.
// Synchronous on purpose: the player swaps src without waiting, keeping the click's activation.
window.veilProxyMedia = function (url) {
  if (!engineReady || !engineController) {
    try { initEngine(); } catch (err) {}
    return "";
  }
  try {
    const out = engineController.encodeUrl(url);
    if (out) return new URL(String(out), location.href).href;
  } catch (err) {}
  return location.origin + SCRAMJET_PREFIX + encodeURIComponent(url);
};
async function applyMuxTransport() {
  const wisp = currentWisp();
  const entry = transportModule();
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!muxConnection || attempt > 0) {
        muxConnection = new BareMux.BareMuxConnection(mintBarePort());
      }
      const port = muxConnection && muxConnection.port;
      if (port && typeof port.start === "function") {
        try { port.start(); } catch (err) {}
      }
      await muxConnection.setTransport(entry, [{ wisp: wisp, websocket: wisp, veilFallbacks: wispFallbacks(wisp) }]);
      return entry;
    } catch (err) {
      lastErr = err;
      muxConnection = null;
    }
  }
  throw lastErr || new Error("Connection worker did not respond.");
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
  maxLoadedTabs: 2,
  searchEngine: "google",
  wispId: "va1",
  customServers: [],
  lockUnload: false,
  lockKey: "",
  lockCode: "",
  sleepLock: "",
  confirmLeave: false,
  gameDockFs: false,
  animEnabled: false,
  animStyle: "orbs",
  animSpeed: 1,
  animCount: 18,
  animSize: 1,
  animMediaSpeed: 1,
  animColorA: "#ffffff",
  animColorB: "#e6e6e6",
  brAnimEnabled: false,
  brAnimStyle: "orbs",
  brBackgroundUrl: "",
  brAnimSpeed: 1,
  brAnimCount: 18,
  brAnimSize: 1,
  brAnimMediaSpeed: 1,
  brAnimColorA: "#ffffff",
  brAnimColorB: "#e6e6e6",
  timeFormat: "12",
  transportMigratedV2: true,
  transportMigratedV3: false,
  saverMinutes: 0,
  saverDelay: "",
  saverEnabled: false,
  saverStyle: "orbs",
  saverUrl: "",
  saverColorA: "#ffffff",
  saverColorB: "#e6e6e6",
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
let bindingLock = false;
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
    return "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(extra);
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
  ["animStyle", "brAnimStyle", "saverStyle"].forEach(key => {
    if (["ripples", "drift", "rain", "waves", "pulse"].includes(settings[key])) settings[key] = "sakura";
  });
  const wallOk = ["orbs", "stars", "constellation", "sakura", "snow", "fall", "custom"];
  if (!wallOk.includes(settings.saverStyle)) {
    settings.saverStyle = "orbs";
  }
  if (!wallOk.includes(settings.animStyle)) {
    settings.animStyle = "orbs";
  }
  if (!wallOk.includes(settings.brAnimStyle)) {
    settings.brAnimStyle = "orbs";
  }
  if (typeof settings.brBackgroundUrl !== "string") {
    settings.brBackgroundUrl = "";
  }
  if (settings.brAnimEnabled == null) settings.brAnimEnabled = false;
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
  if (typeof settings.sleepLock === "number") {
    settings.sleepLock = ["", "15s", "30s", "1m", "5m", "15m"][settings.sleepLock] || "";
  }
  if (typeof settings.sleepLock !== "string") settings.sleepLock = "";
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
    settings.saverColorA = "#ffffff";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(settings.saverColorB || "")) {
    settings.saverColorB = "#e6e6e6";
  }
  ["animColorA", "animColorB", "brAnimColorA", "brAnimColorB", "saverColorA", "saverColorB"].forEach(key => {
    const hex = String(settings[key] || "").toLowerCase();
    if (hex === "#7aa2ff" || hex === "#b88cff") settings[key] = key.endsWith("B") ? "#e6e6e6" : "#ffffff";
  });
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
  if (!settings.transportMigratedV3) {
    settings.transport = "libcurl";
    settings.transportMigratedV3 = true;
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
      tidyStoredTitles();
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
        const msg = Math.max(0.25, Math.min(3, Number(value2.dataset.fxSpeed || settings.animMediaSpeed) || 1));
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
  let session = admin ? (settings.backgroundUrl || "").trim() : "";
  if (session.indexOf("veil-file:") === 0) {
    session = (typeof window.veilOSFileUrl === "function" && window.veilOSFileUrl(session.slice("veil-file:".length))) || "";
  }
  const workerUrl = Math.max(0.25, Math.min(3, Number(settings.animMediaSpeed) || 1));
  document.querySelectorAll(".dash-wall").forEach(value2 => {
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
  document.querySelectorAll(".newtab-page").forEach(value2 => {
    const on = !!settings.brAnimEnabled && settings.brAnimStyle === "custom";
    let url = on ? (settings.brBackgroundUrl || "").trim() : "";
    if (url.indexOf("veil-file:") === 0) {
      url = (typeof window.veilOSFileUrl === "function" && window.veilOSFileUrl(url.slice("veil-file:".length))) || "";
    }
    stopHomeFrames(value2);
    value2.querySelectorAll(".newtab-media, .newtab-media-img, .newtab-raster").forEach(value => value.remove());
    value2.style.backgroundImage = "none";
    if (!url) return;
    value2.dataset.fxSpeed = String(settings.brAnimMediaSpeed || 1);
    if (isVideoUrl(url)) {
      const file = document.createElement("video");
      file.className = "newtab-media";
      file.src = url;
      file.autoplay = true;
      file.loop = true;
      file.muted = true;
      file.playsInline = true;
      file.setAttribute("playsinline", "");
      const rate = () => {
        try { file.playbackRate = Math.max(0.25, Math.min(3, Number(settings.brAnimMediaSpeed) || 1)); } catch (err) {}
      };
      file.addEventListener("loadedmetadata", rate);
      file.addEventListener("play", rate);
      value2.insertBefore(file, value2.firstChild);
      file.play().then(rate).catch(() => {});
    } else if (/\.(gif|webp)(\?|#|$)/i.test(url)) {
      playHomeAnimated(value2, url);
    } else {
      const color = document.createElement("img");
      color.className = "newtab-media-img";
      color.src = url;
      color.alt = "";
      value2.insertBefore(color, value2.firstChild);
    }
  });
  try {
    if (typeof window.veilOSPaintWall === "function") window.veilOSPaintWall();
  } catch (err) {}
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
function openInNewVeilTab(value) {
  const target = normalizeUrl(value);
  if (!target) return;
  createTab(true);
  return navigate(target);
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
function junkTitle(title) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  return !text || /^(loading|scramjet|about:blank|new tab|undefined|null)$/i.test(text);
}
function hostLabel(url) {
  try {
    const host = new URL(url, location.href).hostname.replace(/^www\./, "");
    return host || String(url || "");
  } catch (err) {
    return String(url || "");
  }
}
function prettyTitle(title, url) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (!junkTitle(text) && text !== url) return text.slice(0, 180);
  return hostLabel(url) || "Page";
}
function tidyStoredTitles() {
  let changed = false;
  (visitHistory || []).forEach(item => {
    if (!item) return;
    const next = prettyTitle(item.title, item.url);
    if (item.title !== next) {
      item.title = next;
      changed = true;
    }
  });
  (bookmarks || []).forEach(item => {
    if (!item) return;
    const next = prettyTitle(item.title, item.url);
    if (item.title !== next) {
      item.title = next;
      changed = true;
    }
  });
  if (changed) {
    try { save(); } catch (err) {}
  }
}
function markScramjetError(href) {
  let tab = null;
  try { tab = tabForFault(href); } catch (err) {}
  if (!tab && typeof getActiveTab === "function") tab = getActiveTab();
  if (!tab || tab.newTab) return;
  tab.title = "Error";
  const item = (visitHistory || []).find(value => value && value.url === tab.url);
  if (item) item.title = hostLabel(tab.url) || item.title;
  try { save(); } catch (err) {}
  try { renderTabs(); } catch (err) {}
  try { renderHistory(); } catch (err) {}
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
  if (/^scramjet$/i.test(clientId)) {
    value.title = "Error";
    const locked = visitHistory.find(item => item.url === value.url);
    if (locked) locked.title = hostLabel(value.url) || locked.title;
    try { save(); } catch (err) {}
    renderTabs();
    return true;
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
              openInNewVeilTab(unwrapProxyUrl(extra) || extra);
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
function sorryQueryOf(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)google\.[a-z.]+$/i.test(u.hostname) || u.pathname.indexOf("/sorry") !== 0) return null;
    let q = "";
    try { q = new URL(u.searchParams.get("continue") || "").searchParams.get("q") || ""; } catch (err) {}
    return { q: q };
  } catch (err) {
    return null;
  }
}
function veilSorryWatch(tab, url) {
  if (!tab) return;
  const page = document.querySelector(".page[data-page-id=\"" + tab.id + "\"]");
  if (!page) return;
  const old = page.querySelector(".veil-sorry-bar");
  const hit = sorryQueryOf(url);
  if (!hit) {
    if (old) old.remove();
    return;
  }
  if (old || tab.__sorryDismissed === url) return;
  const bar = document.createElement("div");
  bar.className = "veil-sorry-bar";
  bar.setAttribute("role", "status");
  bar.innerHTML = "<p><b>Google wants to check you're not a robot.</b>Google often blocks proxy traffic, so this check may not finish here. You can search somewhere else instead.</p><div class=\"veil-sorry-acts\"><button type=\"button\" class=\"primary\" data-sorry=\"duckduckgo\">Search DuckDuckGo</button><button type=\"button\" data-sorry=\"bing\">Bing</button><button type=\"button\" data-sorry-x aria-label=\"Dismiss\">✕</button></div>";
  bar.addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    if (btn.hasAttribute("data-sorry-x")) {
      tab.__sorryDismissed = url;
      springClose(bar, () => bar.remove());
      return;
    }
    const engine = SEARCH_ENGINES[btn.getAttribute("data-sorry")];
    if (!engine) return;
    bar.remove();
    activeTabId = tab.id;
    const dest = hit.q ? engine.prefix + encodeURIComponent(hit.q) : engine.prefix.replace(/[?&][^?&]*=$/, "").replace(/\/search$/, "/");
    navigate(dest);
  });
  page.appendChild(bar);
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
    try { veilSorryWatch(value2, setting); } catch (err) {}
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
      hookFrameMenu(raw);
      armFrameErrorWatch(raw, value2);
      try {
        const doc = raw.contentDocument;
        const text = doc && doc.body ? doc.body.innerText : "";
        const recovering = doc && doc.querySelector("meta[name=\"veil-recover\"]");
        if (looksLikeMuxDump(text) && healMuxDump(value2, doc)) {
        } else if (looksLikeHyperDump(text)) {
          wipeHyperDump(doc);
          try { markScramjetError(value2.url); } catch (err) {}
          onTransportFault(value2.url);
        } else if (recovering) {
          onTransportFault(value2.url);
        } else if (!recovering && text && text.trim().length > 24) {
          clearTransportFault(value2.url);
        }
      } catch (err) {}
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
async function openProxyFrame(container, url) {
  if (!container) return null;
  try {
    url = unwrapProxyUrl(url) || url;
  } catch (err) {}
  if (!engineReady) {
    try { await initEngine(); } catch (err) {}
  }
  if (!engineReady || !engineController || typeof engineController.createFrame !== "function") {
    container.innerHTML = "<div class=\"vos-app-wait\">Browser engine unavailable.</div>";
    return null;
  }
  const frame = engineController.createFrame();
  const el = frame && (frame.element || frame.frame || frame);
  if (!el || !el.style) {
    container.innerHTML = "<div class=\"vos-app-wait\">Could not open this app.</div>";
    return null;
  }
  if (el.classList) el.classList.add("engine-frame");
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.border = "0";
  el.style.display = "block";
  el.style.background = "#fff";
  try {
    el.setAttribute("allow", "fullscreen *; clipboard-read *; clipboard-write *; autoplay *; encrypted-media *; picture-in-picture *; payment *");
    el.setAttribute("referrerpolicy", "no-referrer");
  } catch (err) {}
  container.innerHTML = "";
  container.appendChild(el);
  try { trapFrameExternalOpens(null, el); } catch (err) {}
  if (typeof frame.go === "function") await frame.go(url);
  else if (typeof frame.navigate === "function") await frame.navigate(url);
  else if (el instanceof HTMLIFrameElement) el.src = SCRAMJET_PREFIX + encodeURIComponent(url);
  return frame;
}
window.openProxyFrame = openProxyFrame;
async function flipTransport() {
  settings.transport = settings.transport === "libcurl" ? "epoxy" : "libcurl";
  try {
    save();
  } catch (err) {}
  await reconnectTransport();
  return settings.transport;
}
function looksLikeHyperDump(text) {
  const value = String(text || "");
  return /Hyper client|hyper_util::client/i.test(value) && /PROTOCOL_ERROR|http2 error/i.test(value);
}
function looksLikeMuxDump(text) {
  const value = String(text || "");
  return value.length < 20000 && /MuxTaskEnded|Multiplexor task ended/i.test(value);
}
// Last resort if a dead-Wisp error page still got through: rebuild the transport and reload the tab
// once. The timestamp guard keeps a server that really is down from looping.
function healMuxDump(tab, doc) {
  if (!tab || !tab.url || !tab.engineFrame) return false;
  const now = Date.now();
  if (now - (tab.__veilMuxHealAt || 0) < 20000) return false;
  tab.__veilMuxHealAt = now;
  wipeHyperDump(doc);
  try { showPageLoader(tab); } catch (err) {}
  const frame = tab.engineFrame;
  reconnectTransport().then(() => {
    if (tab.engineFrame !== frame) return;
    if (typeof frame.go === "function") return frame.go(tab.url);
    if (typeof frame.navigate === "function") return frame.navigate(tab.url);
  }).catch(err => console.warn("[veil] mux heal", err));
  return true;
}
function rotateWisp() {
  const list = allWispServers();
  if (!list.length) return;
  let idx = list.findIndex(value => value.id === settings.wispId);
  if (idx < 0) idx = 0;
  const next = list[(idx + 1) % list.length];
  if (next && next.id && next.id !== settings.wispId) settings.wispId = next.id;
}
const transportFaults = new Map();
const faultCooldown = new Map();
const faultGaveUp = new Set();
function clearTransportFault(url) {
  const key = unwrapProxyUrl(url) || url || "";
  if (key) {
    transportFaults.delete(key);
    faultCooldown.delete(key);
    faultGaveUp.delete(key);
  }
  transportFaults.delete("transport");
  faultGaveUp.delete("transport");
}
function wipeHyperDump(doc) {
  try {
    if (doc && doc.body) doc.body.replaceChildren();
    if (doc) doc.title = "";
  } catch (err) {}
}
function tabForFault(url) {
  const real = unwrapProxyUrl(url) || url || "";
  const encoded = real ? encodeURIComponent(real) : "";
  const list = typeof tabs !== "undefined" && tabs ? tabs : [];
  return list.find(value => {
    if (!value || !value.url || value.newTab) return false;
    if (real && value.url === real) return true;
    if (encoded && String(url || "").indexOf(encoded) !== -1) return true;
    if (real && String(url || "").indexOf(encodeURIComponent(value.url)) !== -1) return true;
    return false;
  }) || null;
}
function showSoftNavFail(tab) {
  if (!tab) return;
  tab.title = "Error";
  const item = (visitHistory || []).find(value => value && value.url === tab.url);
  if (item && junkTitle(item.title)) item.title = hostLabel(tab.url) || item.title;
  try { save(); } catch (err) {}
  try { renderTabs(); } catch (err) {}
  try { renderHistory(); } catch (err) {}
  finishPageLoader(tab);
  const frame = tab.engineFrame;
  const el = frame && (frame.element || frame.frame || frame);
  const host = el && el.parentElement;
  if (!host) return;
  tab.engineFrame = null;
  host.innerHTML = "<div class=\"engine-error\"><div class=\"engine-error-box\"><h2>Could not open this page</h2><p>The connection kept resetting. Retry to try the next route.</p><button type=\"button\" data-retry-nav>Retry</button></div></div>";
  const button = host.querySelector("[data-retry-nav]");
  if (button) {
    button.onclick = async () => {
      clearTransportFault(tab.url);
      host.innerHTML = "";
      await createEngineFrame(tab, host);
    };
  }
}
async function healTransportFault(url, reason) {
  const real = unwrapProxyUrl(url) || url || "";
  const key = real || String(url || "");
  if (!key || faultGaveUp.has("transport")) return;
  const count = (transportFaults.get("transport") || 0) + 1;
  transportFaults.set("transport", count);
  let tab = tabForFault(url);
  if (!tab && typeof getActiveTab === "function") {
    const active = getActiveTab();
    if (active && active.url && !active.newTab && !active.isGames && !active.isAdmin && !active.isChat) tab = active;
  }
  if (tab) {
    try {
      const el = tab.engineFrame && (tab.engineFrame.element || tab.engineFrame.frame || tab.engineFrame);
      if (el && el.contentDocument) wipeHyperDump(el.contentDocument);
    } catch (err) {}
    showPageLoader(tab);
  }
  if (count > 3) {
    faultGaveUp.add("transport");
    if (reason !== "blocked") showSoftNavFail(tab);
    return;
  }
  settings.transport = "libcurl";
  settings.transportMigratedV3 = true;
  if (reason === "blocked" || count > 1) rotateWisp();
  try { save(); } catch (err) {}
  try { await applyMuxTransport(); } catch (err) {
    console.warn("[veil] heal transport", err);
  }
  if (tab && tab.engineFrame && tab.url) {
    tab.__veilHyperRetryUrl = tab.url;
    const frame = tab.engineFrame;
    try {
      if (typeof frame.go === "function") await frame.go(tab.url);
      else if (typeof frame.navigate === "function") await frame.navigate(tab.url);
      return;
    } catch (err) {}
  }
  document.querySelectorAll("iframe.engine-frame").forEach(el => {
    let src = "";
    try { src = el.src || ""; } catch (err) { return; }
    if (!src || src === "about:blank") return;
    try { el.src = src; } catch (err) {}
  });
}
let lastTransportHeal = 0;
function onTransportFault() {}
async function goFrame(value2, extra) {
  const btn = value2.engineFrame;
  if (!btn || !extra) {
    return;
  }
  extra = unwrapProxyUrl(extra) || extra;
  value2.url = extra;
  value2.title = "Loading";
  showPageLoader(value2);
  try { renderTabs(); } catch (err) {}
  try {
    if (typeof btn.go === "function") await btn.go(extra);
    else if (typeof btn.navigate === "function") await btn.navigate(extra);
    else {
      const part = btn.element || btn.frame || btn;
      if (part instanceof HTMLIFrameElement) part.src = SCRAMJET_PREFIX + encodeURIComponent(extra);
    }
  } catch (err) {
    console.warn("[veil] navigation", err);
    finishPageLoader(value2);
  }
}
function scanHyperDumps(win, depth) {
  if (!win || depth > 5) return;
  let doc = null;
  try { doc = win.document; } catch (err) { return; }
  if (!doc || !doc.body) return;
  let marked = null;
  try { marked = doc.getElementById("errorTrace"); } catch (err) {}
  if ((doc.title === "Scramjet" || marked) && looksLikeHyperDump(marked && marked.value || doc.body.innerText || "")) {
    wipeHyperDump(doc);
    let href = "";
    try { href = win.location && win.location.href || ""; } catch (err) {}
    try { markScramjetError(href); } catch (err) {}
    onTransportFault(href);
    return;
  }
  let frames = [];
  try { frames = doc.querySelectorAll("iframe"); } catch (err) { frames = []; }
  frames.forEach(frame => {
    try { scanHyperDumps(frame.contentWindow, depth + 1); } catch (err) {}
  });
}
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", ev => {
    const data = ev && ev.data;
    if (data && data.type === "veil-transport-fault") onTransportFault(data.url, data.reason);
  });
}
function armFrameErrorWatch(raw, tab) {
  if (!raw || !tab) return;
  const attach = () => {
    try {
      const win = raw.contentWindow;
      if (!win || win.__veilErrWatch) return;
      win.__veilErrWatch = true;
      const take = msg => {
        if (looksLikeHyperDump(String(msg || "")) || /Hyper client|PROTOCOL_ERROR|http2 error/i.test(String(msg || ""))) {
          onTransportFault(tab && tab.url);
        }
      };
      win.addEventListener("error", ev => take(ev && (ev.message || ev.error)));
      win.addEventListener("unhandledrejection", ev => take(ev && ev.reason));
    } catch (err) {}
  };
  if (!raw.__veilErrHook) {
    raw.__veilErrHook = true;
    raw.addEventListener("load", attach);
  }
  attach();
  let n = 0;
  const timer = setInterval(() => {
    n += 1;
    attach();
    if (n > 40) clearInterval(timer);
  }, 500);
}
let tabJiggleId = "";
let tabMotionKind = "";
let veilShownPage = "";
// A damped spring that starts from rest (zero initial velocity), so motion eases in instead of
// leaping off the mark, then overshoots ~10% once and settles: x = 1 - e^-at (cos wt + a/w sin wt).
// Site-wide toasts: window.veilNotify({ kind: "success" | "error" | "info", title, text, timeout, id }).
// They spring in from the bottom-right with a little tilt, stack upward, pause while hovered, and
// leave with a small wind-up before sliding out; the rest of the stack springs into the gap.
// Passing the same `id` updates that toast in place (with a nudge) instead of stacking another.
// Returns { update(opts), close() }. Not wired into chat yet on purpose.
const veilNotifyMap = new Map();
function veilToastHost() {
  let host = document.getElementById("veilNotifyHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "veilNotifyHost";
    host.className = "veil-nt-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  // In fullscreen only the fullscreen element is drawn, so the toasts live inside it (games).
  try {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs && fs.tagName !== "IFRAME" && fs !== document.documentElement && fs !== document.body && host.parentNode !== fs && typeof veilFsMove === "function") veilFsMove(host, fs);
  } catch (err) {}
  return host;
}
function veilToastFlip(host, change) {
  const items = [...host.children];
  const before = new Map(items.map(el => [el, el.getBoundingClientRect().top]));
  change();
  const anime = window.anime;
  if (!anime || !anime.animate || motionOff()) return;
  [...host.children].forEach(el => {
    if (!before.has(el) || el._veilLeaving) return;
    const dy = before.get(el) - el.getBoundingClientRect().top;
    if (Math.abs(dy) < 1) return;
    try { anime.animate(el, { translateY: [dy, 0], ease: veilSpring(0.42, 620) }); } catch (err) {}
  });
}
function veilNotify(opts) {
  if (typeof opts === "string") opts = { text: opts };
  opts = opts || {};
  if (!document.body) return { update() {}, close() {} };
  const kind = /^(success|error|info|warn)$/.test(opts.kind || "") ? opts.kind : "info";
  const timeout = opts.timeout === 0 ? 0 : Math.max(1200, Number(opts.timeout) || (kind === "error" ? 6500 : 3800));
  const anime = window.anime;
  const existing = opts.id && veilNotifyMap.get(opts.id);
  if (existing && existing.el.isConnected && !existing.el._veilLeaving) {
    existing.update(opts);
    return existing;
  }
  const host = veilToastHost();
  const el = document.createElement("div");
  el.className = "veil-nt is-" + kind;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = '<span class="veil-nt-ico" aria-hidden="true"></span><div class="veil-nt-body"><b></b><span></span></div><button type="button" class="veil-nt-x" aria-label="Dismiss">&times;</button><i class="veil-nt-bar"></i>';
  const api = { el: el };
  let timer = 0;
  let left = timeout;
  let startedAt = 0;
  const bar = el.querySelector(".veil-nt-bar");
  const arm = () => {
    clearTimeout(timer);
    if (!left) return;
    startedAt = Date.now();
    timer = setTimeout(() => api.close(), left);
    bar.style.transition = "none";
    bar.style.transform = "scaleX(" + (left / (api.timeout || 1)) + ")";
    void bar.offsetWidth;
    bar.style.transition = "transform " + left + "ms linear";
    bar.style.transform = "scaleX(0)";
  };
  const fill = o => {
    const k = /^(success|error|info|warn)$/.test(o.kind || "") ? o.kind : kind;
    el.className = "veil-nt is-" + k;
    el.querySelector("b").textContent = o.title || (k === "success" ? "Success" : k === "error" ? "Something went wrong" : "Notice");
    el.querySelector(".veil-nt-body span").textContent = o.text || "";
    el.querySelector(".veil-nt-body span").hidden = !o.text;
    api.timeout = o.timeout === 0 ? 0 : Math.max(1200, Number(o.timeout) || (k === "error" ? 6500 : 3800));
  };
  api.update = o => {
    fill(Object.assign({ kind: kind }, o || {}));
    left = api.timeout;
    bar.hidden = !left;
    arm();
    if (anime && anime.animate && !motionOff()) {
      try { anime.animate(el, { scale: [0.96, 1], rotate: [-1.5, 0], ease: veilSpring(0.55, 620) }); } catch (err) {}
      try { anime.animate(el.querySelector(".veil-nt-ico"), { scale: [0.6, 1], rotate: [-25, 0], ease: veilSpring(0.55, 700) }); } catch (err) {}
    }
  };
  api.close = () => {
    if (el._veilLeaving) return;
    el._veilLeaving = true;
    clearTimeout(timer);
    if (opts.id && veilNotifyMap.get(opts.id) === api) veilNotifyMap.delete(opts.id);
    const gone = () => veilToastFlip(host, () => el.remove());
    if (!anime || !anime.animate || motionOff()) { gone(); return; }
    try {
      // Back-in ease: a small wind-up toward the screen, then out to the right.
      anime.animate(el, { translateX: [0, 440], opacity: [1, 0], rotate: [0, 4], duration: 460, ease: t => t * t * (2.6 * t - 1.6), onComplete: gone });
    } catch (err) { gone(); }
  };
  fill(Object.assign({ kind: kind }, opts));
  bar.hidden = !api.timeout;
  left = api.timeout;
  el.querySelector(".veil-nt-x").onclick = () => api.close();
  el.addEventListener("pointerenter", () => {
    if (!left || !startedAt) return;
    clearTimeout(timer);
    left = Math.max(800, left - (Date.now() - startedAt));
    const now = getComputedStyle(bar).transform;
    bar.style.transition = "none";
    bar.style.transform = now === "none" ? "scaleX(1)" : now;
  });
  el.addEventListener("pointerleave", () => { if (!el._veilLeaving) arm(); });
  veilToastFlip(host, () => host.appendChild(el));
  while (host.children.length > 5) {
    const old = [...host.children].find(n => !n._veilLeaving);
    if (!old || old === el) break;
    old._veilLeaving = true;
    old.remove();
  }
  if (opts.id) veilNotifyMap.set(opts.id, api);
  if (anime && anime.animate && !motionOff()) {
    try { anime.animate(el, { translateX: [380, 0], opacity: [0, 1], rotate: [5, 0], scale: [0.86, 1], ease: veilSpring(0.42, 820) }); } catch (err) {}
    try { anime.animate(el.querySelector(".veil-nt-ico"), { scale: [0.4, 1], rotate: [-40, 0], delay: 120, ease: veilSpring(0.55, 760) }); } catch (err) {}
  }
  arm();
  return api;
}
window.veilNotify = veilNotify;
function veilSoftJiggle(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const a = 6, w = 8.5;
  return 1 - Math.exp(-a * t) * (Math.cos(w * t) + (a / w) * Math.sin(w * t));
}
function veilSpring(bounce, duration) {
  const anime = window.anime;
  if (anime && anime.spring) return anime.spring({ bounce: bounce, duration: duration });
  return "outCubic";
}
function snapshotTabs(host) {
  const map = new Map();
  if (!host) return map;
  host.querySelectorAll(".tab").forEach(el => {
    const rect = el.getBoundingClientRect();
    map.set(el.dataset.tabId, { left: rect.left, width: rect.width });
    if (el.classList.contains("active")) map.set("__active", { left: rect.left, width: rect.width });
  });
  const plus = host.querySelector(".new-tab");
  if (plus) {
    const rect = plus.getBoundingClientRect();
    map.set("__plus", { left: rect.left, width: rect.width });
  }
  return map;
}
function desiredTabWidth(host, count) {
  if (!host) return 140;
  const plus = host.querySelector(".new-tab");
  const gap = parseFloat(getComputedStyle(host).columnGap) || 0;
  let plusW = 30;
  if (plus) {
    const box = getComputedStyle(plus);
    plusW = plus.offsetWidth + (parseFloat(box.marginLeft) || 0) + (parseFloat(box.marginRight) || 0);
  }
  const avail = host.clientWidth - plusW - gap * Math.max(0, count);
  const width = avail / Math.max(1, count);
  return Math.max(72, Math.min(180, width));
}
function clearTabBox(el) {
  if (!el) return;
  el.style.width = "";
  el.style.flex = "";
  el.style.overflow = "";
  el.style.minWidth = "";
  el.style.maxWidth = "";
  el.style.opacity = "";
  el.style.marginRight = "";
}
function freezeTabFace(el) {
  const face = el && el.querySelector(".tab-face");
  if (!face) return;
  const width = face.getBoundingClientRect().width;
  face.style.flex = "0 0 " + width + "px";
  face.style.width = width + "px";
  face.style.minWidth = width + "px";
  face.style.maxWidth = width + "px";
}
function clearTabFace(el) {
  const face = el && el.querySelector(".tab-face");
  if (!face) return;
  face.style.flex = "";
  face.style.width = "";
  face.style.minWidth = "";
  face.style.maxWidth = "";
}
function syncTabPill(host, from) {
  const active = host && host.querySelector(".tab.active");
  if (!host || !active) return;
  let pill = host.querySelector(".tab-pill");
  if (!pill) {
    pill = document.createElement("span");
    pill.className = "tab-pill";
    host.insertBefore(pill, host.firstChild);
  }
  host.classList.add("has-pill");
  if (host._pillMotion && host._pillMotion.cancel) {
    try { host._pillMotion.cancel(); } catch (err) {}
    host._pillMotion = null;
  }
  const hostRect = host.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  const left = rect.left - hostRect.left + host.scrollLeft;
  pill.style.transform = "none";
  pill.style.scale = "1";
  pill.style.transformOrigin = "left center";
  const anime = window.anime;
  if (from && anime && anime.animate && !motionOff()) {
    pill.style.left = from.left - hostRect.left + host.scrollLeft + "px";
    pill.style.width = from.width + "px";
    try {
      host._pillMotion = anime.animate(pill, {
        left: left,
        width: rect.width,
        duration: 520,
        ease: veilSpring(0.32, 560)
      });
    } catch (err) {
      pill.style.left = left + "px";
      pill.style.width = rect.width + "px";
    }
    return;
  }
  pill.style.left = left + "px";
  pill.style.width = rect.width + "px";
}
function slideStrip(host, before) {
  const anime = window.anime;
  if (!host || !before || !anime || !anime.animate || motionOff()) return;
  const nodes = Array.from(host.querySelectorAll(".tab:not(.tab-ghost)"));
  const plus = host.querySelector(".new-tab");
  if (plus) nodes.push(plus);
  nodes.forEach(el => {
    const key = el.classList.contains("new-tab") ? "__plus" : el.dataset.tabId;
    const prev = before.get(key);
    if (!prev) return;
    const dx = prev.left - el.getBoundingClientRect().left;
    if (Math.abs(dx) < 0.5) return;
    el.style.transform = "translateX(" + dx + "px)";
    try {
      anime.animate(el, { translateX: [dx, 0], ease: veilSpring(0.38, 540) });
    } catch (err) {}
  });
}
function runTabStripMotion(host, before) {
  const anime = window.anime;
  if (!host || !anime || !anime.animate || motionOff()) {
    syncTabPill(host, null);
    return;
  }
  slideStrip(host, before);
  host.querySelectorAll(".tab.opening, .tab.active").forEach(el => {
    if (before.get(el.dataset.tabId)) return;
    try {
      anime.animate(el, { opacity: [0, 1], scale: [0.9, 1], ease: veilSpring(0.46, 560) });
    } catch (err) {}
  });
  syncTabPill(host, before.get("__active"));
}
function renderTabs() {
  const tabs2 = document.getElementById("tabs");
  const before = snapshotTabs(tabs2);
  const kind = tabMotionKind;
  const existing = Array.from(tabs2.querySelectorAll(".tab:not(.tab-ghost)"));
  const same = existing.length === tabs.length && existing.every((el, index) => el.dataset.tabId === tabs[index].id);
  if (same && kind !== "open") {
    existing.forEach(el => {
      const tab = tabs.find(item => item.id === el.dataset.tabId);
      el.classList.toggle("active", el.dataset.tabId === activeTabId);
      const title = el.querySelector(".tab-title");
      if (tab && title && title.textContent !== (tab.title || "")) title.textContent = tab.title || "";
      const img = el.querySelector(".tab-icon img");
      if (tab && img && tab.favicon && img.getAttribute("src") !== tab.favicon) img.src = tab.favicon;
    });
    if (!window.__veilHoldPill) {
      if (kind === "switch") {
        syncTabPill(tabs2, before.get("__active"));
        const active = tabs2.querySelector(".tab.active");
        const anime = window.anime;
        if (active && anime && anime.animate && !motionOff()) {
          try {
            active.style.transformOrigin = "center";
            anime.animate(active, { scale: [0.94, 1], ease: veilSpring(0.5, 600) });
          } catch (err) {}
        }
      } else {
        syncTabPill(tabs2, null);
      }
    }
    tabMotionKind = "";
    tabJiggleId = "";
    try { paintChatAlerts(); } catch (err) {}
    return;
  }
  const src = tabs.map(value => "<div class=\"tab " + (value.id === activeTabId ? "active " : "") + (value.animOpen ? "opening" : "") + "\" data-tab-id=\"" + value.id + "\"><div class=\"tab-face\"><div class=\"tab-icon\"><img src=\"" + escapeHTML(value.favicon || FAVI) + "\" alt=\"\">" + (value.isChat ? "<span class=\"chat-alert\" data-chat-alert></span>" : "") + "</div><div class=\"tab-title\">" + escapeHTML(value.title) + "</div><button class=\"tab-close\" data-close=\"" + value.id + "\" aria-label=\"Close\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></button></div></div>").join("");
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
  if (kind === "open") {
    requestAnimationFrame(() => {
      tabs2.scrollLeft = tabs2.scrollWidth;
    });
    runTabStripMotion(tabs2, before);
  } else {
    syncTabPill(tabs2, null);
  }
  tabMotionKind = "";
  tabJiggleId = "";
  try {
    paintChatAlerts();
  } catch (err) {}
}
function formatWelcomeClock(value2) {
  const query = value => String(value).padStart(2, "0");
  const res = query(value2.getMinutes());
  const req = query(value2.getSeconds());
  const row = settings && settings.timeFormat === "24";
  let count;
  let ampm = "";
  if (row) {
    count = query(value2.getHours()) + ":" + res + ":" + req;
  } else {
    let token = value2.getHours();
    ampm = token >= 12 ? "PM" : "AM";
    token = token % 12;
    if (token === 0) {
      token = 12;
    }
    count = token + ":" + res + ":" + req;
  }
  let date = "";
  try {
    date = value2.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch (err) {
    date = query(value2.getMonth() + 1) + "/" + query(value2.getDate()) + "/" + value2.getFullYear();
  }
  return {
    time: count,
    ampm: ampm,
    date: date
  };
}
function welcomeHTML() {
  const guest = profile && profile.name ? profile.name : "guest";
  const {
    time: entry,
    ampm: ampm,
    date: meta
  } = formatWelcomeClock(new Date());
  return "<div class=\"welcome-bar\"><div class=\"welcome-line\">Welcome to Veil, " + escapeHTML(guest) + "</div><div class=\"welcome-time\">It is <span data-welcome-time>" + escapeHTML(entry) + "</span><span data-welcome-ampm>" + escapeHTML(ampm ? " " + ampm : "") + "</span> on <span data-welcome-date>" + escapeHTML(meta) + "</span></div></div>";
}
function startWelcomeClock() {
  if (welcomeClockTimer) {
    clearInterval(welcomeClockTimer);
  }
  const root = () => {
    const {
      time: game,
      ampm: ampm,
      date: room
    } = formatWelcomeClock(new Date());
    document.querySelectorAll("[data-welcome-time]").forEach(value => {
      value.textContent = game;
    });
    document.querySelectorAll("[data-welcome-ampm]").forEach(value => {
      value.textContent = ampm ? " " + ampm : "";
    });
    document.querySelectorAll("[data-welcome-date]").forEach(value => {
      value.textContent = room;
    });
    const dashName = document.getElementById("dashName");
    if (dashName) {
      const guest = profile && profile.name ? profile.name : "guest";
      if (dashName.textContent !== guest) dashName.textContent = guest;
    }
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
  return '<div class="newtab-page" style="--timebar-h:0px"><canvas class="home-fx" data-home-fx></canvas><div class="newtab-overlay"><div class="newtab-stage"><div class="newtab-center"><div class="veil-mark"><img src="' + FAVI + '" alt="Veil"></div><div class="newtab-title">Veil</div><div class="search-row"><div class="search-box" style="width:100%"><span class="home-search-icon"></span><input class="newtab-search" data-page="' + value + '" placeholder="Search or enter a site..." autocomplete="off" spellcheck="false"></div></div><div class="quick-links"><button class="quick-link" type="button" title="X" data-url="https://x.com">' + imgIcon("x.svg") + '</button><button class="quick-link" type="button" title="Discord" data-url="https://discord.com/">' + imgIcon("discord.svg") + '</button><button class="quick-link" type="button" title="Reddit" data-url="https://www.reddit.com/">' + imgIcon("reddit.svg") + '</button><button class="quick-link" type="button" title="GeForce NOW" data-url="https://play.geforcenow.com/mall">' + imgIcon("nvidia.svg") + '</button></div><div class="quick-links row2"><button class="quick-link quick-exit" type="button" data-dash-exit title="Exit to dashboard">Exit</button></div></div></div></div></div>';
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
    body: "Shown in Options and on the lock screen. Veil does not ask for this when you create an account. If you skip it, the default picture is used."
  },
  time24: {
    title: "24-hour time",
    body: "Shows the dashboard clock as 24-hour time instead of AM/PM."
  },
  animations: {
    title: "Live wallpaper",
    body: "The same controls, kept separate. Opened from the dashboard, this is the dashboard wallpaper. Opened from the browser, this is the new-tab wallpaper."
  },
  browserbg: {
    title: "Browser wallpaper",
    body: "Moving background on the browser new tab. It does not change the dashboard."
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
  lockveil: {
    title: "Lock Veil",
    body: "Locks Veil behind your password. Bind a key the same way as the panic key. Sleep lock uses the same time format as the screen saver: 30s, 5m, 1h, or 1h;30m. Leave it blank or type off and Veil will not lock when the computer sleeps."
  },
  gamedockfs: {
    title: "Music widget in fullscreen games",
    body: "When a game is in fullscreen, keeps the music mini widget available over it (hover the line at the top to open it). Off by default. Notifications always show in fullscreen."
  },
  confirmleave: {
    title: "Close Prevention",
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
  refresh: {
    title: "Refresh Veil",
    body: "Reloads Veil completely. This works in a normal tab and inside about:blank."
  },
  username: {
    title: "Change username",
    body: "Name shown on the dashboard welcome on this device."
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
    title: "Clear local data",
    body: "Clears Veil’s saved settings, history, bookmarks, and cookies on this device, then signs you out. Does not delete your account."
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
  setupHomeFx(value3, { browser: true });
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
  value3.querySelectorAll("[data-dash-exit]").forEach(value2 => {
    value2.addEventListener("click", value => {
      value.preventDefault();
      showDash();
    });
  });
  const launchOptionsBtn = value3.querySelector("#launchOptionsBtn");
  if (launchOptionsBtn) {
    launchOptionsBtn.onclick = () => openLaunchModal();
  }
  value3.querySelectorAll("[data-open-desktop]").forEach(value2 => {
    value2.onclick = () => openDesktop();
  });
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
  const veilPageFade = veilShownPage && veilShownPage !== activeTabId;
  veilShownPage = activeTabId;
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
    const wasOn = session.classList.contains("active") || session.style.display === "block";
    session.classList.toggle("active", workerUrl);
    if (workerUrl) {
      session.style.display = "block";
      session.style.pointerEvents = "";
      if (veilPageFade && window.anime && window.anime.animate && !motionOff()) {
        try {
          if (!veilSpringIn(session, "settle", { bounce: 0.4, force: true })) window.anime.animate(session, { opacity: [0, 1], duration: 280, ease: "outCubic" });
        } catch (err) {
          session.style.opacity = "";
        }
      } else {
        session.style.opacity = "";
      }
    } else if (veilPageFade && wasOn && window.anime && window.anime.animate && !motionOff()) {
      session.classList.remove("active");
      session.style.display = "block";
      session.style.pointerEvents = "none";
      const hide = () => {
        if (session.dataset.pageId === String(activeTabId)) return;
        session.style.display = "none";
        session.style.opacity = "";
        session.style.pointerEvents = "";
      };
      try {
        window.anime.animate(session, { opacity: [1, 0], duration: 240, ease: "outCubic" });
      } catch (err) {}
      setTimeout(hide, 250);
    } else {
      session.style.display = "none";
      session.style.opacity = "";
    }
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
  tabMotionKind = "switch";
  tabJiggleId = value;
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
  try {
    updateDevtoolsMenuState();
  } catch (err) {}
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
  pushVisitHistory(href, prettyTitle("", href));
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
      title: prettyTitle(extra, maxAge),
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
    const title = prettyTitle(value2.title, value2.url);
    const fav = document.createElement("img");
    fav.className = "history-fav";
    fav.alt = "";
    fav.src = faviconFor(value2.url);
    const copy = document.createElement("span");
    copy.className = "history-copy";
    const name = document.createElement("b");
    name.textContent = title;
    const url = document.createElement("small");
    url.textContent = value2.url || "";
    copy.appendChild(name);
    copy.appendChild(url);
    show.appendChild(fav);
    show.appendChild(copy);
    show.title = value2.url || "";
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
  tabMotionKind = "open";
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
    tabMotionKind = "";
    renderChrome();
  };
  const host = document.getElementById("tabs");
  const anime = window.anime;
  const liveTabs = host ? Array.from(host.querySelectorAll(".tab:not(.tab-ghost)")) : [];
  if (historyItem && host && liveTabs.length <= 1) {
    if (anime && anime.animate && !motionOff()) {
      try { anime.animate(historyItem, { opacity: [1, 0], scale: [1, 0.9], ease: veilSpring(0.42, 380) }); } catch (err) {}
    }
    setTimeout(game, anime && anime.animate && !motionOff() ? 320 : 0);
    return;
  }
  if (historyItem && host && anime && anime.animate && !motionOff()) {
    const before = snapshotTabs(host);
    const nodes = liveTabs;
    const closeIndex = nodes.indexOf(historyItem);
    let keep = host.querySelector(".tab.active:not(.tab-ghost)");
    if (!keep || keep === historyItem) keep = nodes[closeIndex + 1] || nodes[closeIndex - 1] || null;
    if (historyItem.classList.contains("active")) {
      historyItem.classList.remove("active");
      if (keep) keep.classList.add("active");
    }
    const hostRect = host.getBoundingClientRect();
    const box = historyItem.getBoundingClientRect();
    historyItem.classList.add("tab-ghost");
    historyItem.style.left = box.left - hostRect.left + host.scrollLeft + "px";
    historyItem.style.top = "4px";
    historyItem.style.width = box.width + "px";
    historyItem.style.height = "32px";
    historyItem.style.margin = "0";
    try {
      anime.animate(historyItem, { opacity: [1, 0], scale: [1, 0.96], ease: veilSpring(0.28, 380) });
    } catch (err) {}
    setTimeout(() => { try { historyItem.remove(); } catch (err) {} }, 400);
    window.__veilHoldPill = true;
    syncTabPill(host, before.get("__active"));
    slideStrip(host, before);
    game();
    window.__veilHoldPill = false;
    return;
  }
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
      title: prettyTitle(session.title, session.url),
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
  bookmarkList.innerHTML = bookmarks.map(value => "<div class=\"bookmark-row\"><img class=\"bookmark-fav\" alt=\"\" src=\"" + escapeHTML(faviconFor(value.url)) + "\"><div class=\"bookmark-main\" data-open-bookmark=\"" + escapeHTML(value.url) + "\"><div class=\"bookmark-title\">" + escapeHTML(prettyTitle(value.title, value.url)) + "</div><div class=\"bookmark-url\">" + escapeHTML(value.url) + "</div></div><button class=\"bookmark-delete\" data-delete-bookmark=\"" + escapeHTML(value.id) + "\" type=\"button\" aria-label=\"Remove\" title=\"Remove\"><img src=\"" + IMG + "exit.svg\" alt=\"\"></button></div>").join("");
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
  if (value === "settingsPanel" && document.body.classList.contains("veil-os") && typeof window.veilOSOpenApp === "function") {
    closeMenu();
    window.veilOSOpenApp("settings");
    return;
  }
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
      fillDesktopSettings();
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
  const openPanels = Array.prototype.slice.call(document.querySelectorAll(".panel.open"));
  const backdrop = document.getElementById("backdrop");
  const finish = () => {
    if (backdrop) backdrop.classList.remove("open");
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel) {
      settingsPanel.style.transition = "none";
      settingsPanel.style.visibility = "hidden";
    }
    document.querySelectorAll(".panel").forEach(value => {
      value.classList.remove("open");
      value.style.opacity = "";
      value.style.scale = "";
      value.style.transform = "";
    });
    if (settingsPanel) {
      settingsPanel.classList.remove("is-browser-scope", "is-page", "open");
      if (document.body.dataset.veilView === "options") {
        setVeilView(settingsReturn === "browser" ? "browser" : "dash");
      }
    }
  };
  if (!openPanels.length) {
    finish();
    return;
  }
  let left = openPanels.length;
  openPanels.forEach(panel => {
    springClose(panel, () => {
      if (--left === 0) finish();
    });
  });
  if (backdrop && backdrop.classList.contains("open")) {
    springClose(backdrop, () => {
      backdrop.style.opacity = "";
      backdrop.style.scale = "";
    });
  }
}
let menuGen = 0;
function closeMenu() {
  const menu = document.getElementById("mainMenu");
  if (!menu) return;
  const gen = ++menuGen;
  const finish = () => {
    if (gen !== menuGen) return;
    menu.classList.remove("open", "is-placed");
    menu.style.left = "";
    menu.style.top = "";
    menu.style.right = "";
    menu.style.opacity = "";
    menu.style.scale = "";
    menu.style.transform = "";
    window.__veilMenuImage = null;
    window.__veilMenuMedia = null;
    window.__veilMenuAt = 0;
    const saveMedia = document.getElementById("menuSaveMedia");
    if (saveMedia) saveMedia.classList.remove("is-on");
  };
  if (menu.classList.contains("open")) springClose(menu, finish);
  else finish();
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
      backgroundUrl.value = wpGet("backgroundUrl") || "";
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
    if (panicKey) panicKey.textContent = panic.key ? panic.key : "Not bound";
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
function pauseHomeFx(value) {
  const key = homeFxLoops.get(value);
  if (!key) return;
  if (key.raf) cancelAnimationFrame(key.raf);
  key.raf = 0;
  key.paused = true;
}
function resumeHomeFx(value) {
  const key = homeFxLoops.get(value);
  if (!key || !key.draw) return false;
  if (key.raf) return true;
  key.paused = false;
  key.raf = requestAnimationFrame(key.draw);
  return true;
}
function stopHomeFx(value) {
  const key = homeFxLoops.get(value);
  if (key && key.raf) {
    cancelAnimationFrame(key.raf);
  }
  if (key && key.ro) {
    key.ro.disconnect();
  }
  if (key && key.leaves) {
    key.leaves.forEach(leaf => {
      try { if (leaf.fall && leaf.fall.cancel) leaf.fall.cancel(); } catch (err) {}
      try { if (leaf.swayAnim && leaf.swayAnim.cancel) leaf.swayAnim.cancel(); } catch (err) {}
    });
  }
  homeFxLoops.delete(value);
}
function setupHomeFx(value3, extra2) {
  const el = !!extra2 && !!extra2.force;
  const useBrowser = !!(extra2 && extra2.browser);
  const fxEnabled = extra2 && extra2.saverColors ? true : useBrowser ? !!settings.brAnimEnabled : !!settings.animEnabled;
  const fxStyle = (extra2 && extra2.style) || (extra2 && extra2.saverColors ? settings.saverStyle : useBrowser ? settings.brAnimStyle : settings.animStyle) || "orbs";
  const fxSpeed = extra2 && extra2.saverColors ? settings.saverSpeed : useBrowser ? settings.brAnimSpeed : settings.animSpeed;
  const fxSize = extra2 && extra2.saverColors ? settings.saverSize : useBrowser ? settings.brAnimSize : settings.animSize;
  const fxCount = extra2 && extra2.saverColors ? settings.saverCount : useBrowser ? settings.brAnimCount : settings.animCount;
  const fxColorA = extra2 && extra2.saverColors ? settings.saverColorA : useBrowser ? settings.brAnimColorA : settings.animColorA;
  const fxColorB = extra2 && extra2.saverColors ? settings.saverColorB : useBrowser ? settings.brAnimColorB : settings.animColorB;
  stopHomeFx(value3);
  const node2 = value3.querySelector("[data-home-fx]");
  if (!node2) {
    return;
  }
  if (!el && fxStyle === "custom") {
    node2.style.display = "none";
    return;
  }
  if (!el && (!fxEnabled || !COOKIE.consent)) {
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
    if (btn.width < 8 || btn.height < 8) return;
    const w = Math.max(1, Math.floor(btn.width * (window.devicePixelRatio || 1)));
    const h = Math.max(1, Math.floor(btn.height * (window.devicePixelRatio || 1)));
    if (node2.width === w && node2.height === h) return;
    node2.width = w;
    node2.height = h;
    node2.style.width = btn.width + "px";
    node2.style.height = btn.height + "px";
  };
  item2();
  let orbs = fxStyle;
  if (orbs === "waves" || orbs === "pulse" || orbs === "rain" || orbs === "ripples" || orbs === "drift") orbs = "sakura";
  const raw = Math.max(0.25, Math.min(2.5, Number(fxSpeed) || 1));
  const found2 = Math.max(0.4, Math.min(2.5, Number(fxSize) || 1));
  let next2 = Number(fxCount);
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
  list2.leaves = [];
  if (orbs === "sakura" || orbs === "snow" || orbs === "fall") {
    const leafCount = orbs === "snow" ? Math.max(10, Math.min(26, Math.round(next2))) : Math.max(8, Math.min(16, Math.round(next2 * 0.7)));
    const pace = Math.max(0.35, raw);
    const now = performance.now();
    for (let i = 0; i < leafCount; i++) {
      const dur = (14000 + Math.random() * 7000) / pace;
      list2.leaves.push({
        born: now - Math.random() * dur,
        dur: dur,
        baseX: Math.random(),
        swayAmp: orbs === "snow" ? 0.015 + Math.random() * 0.02 : 0.03 + Math.random() * 0.035,
        swayDur: 3600 + Math.random() * 2200,
        rot0: Math.random() * Math.PI * 2,
        spin: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.2),
        s: orbs === "snow" ? 0.004 + Math.random() * 0.005 : 0.011 + Math.random() * 0.01,
        tone: i % 2
      });
    }
  } else if (false && orbs === "rain") {
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
    if (value === "a") return fxColorA || "#ffffff";
    return fxColorB || "#e6e6e6";
  }
  const box = () => {
    if (!el && !fxEnabled) {
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
    if (orbs === "sakura" || orbs === "snow" || orbs === "fall") {
      const now = performance.now();
      (list2.leaves || []).forEach(leaf => {
        const style = leaf.tone ? meta : entry;
        const p = ((now - leaf.born) % leaf.dur) / leaf.dur;
        const sway = Math.sin(now / leaf.swayDur * Math.PI * 2) * leaf.swayAmp;
        const x = (leaf.baseX + sway) * row;
        const y = (-0.06 + p * 1.18) * count;
        const len = Math.max(3, leaf.s * Math.min(row, count) * found2);
        const rot = leaf.rot0 + p * leaf.spin;
        err2.save();
        err2.translate(x, y);
        err2.rotate(rot);
        err2.fillStyle = "rgba(" + style.r + "," + style.g + "," + style.b + ",0.92)";
        err2.beginPath();
        if (orbs === "snow") {
          err2.arc(0, 0, len * 0.55, 0, Math.PI * 2);
        } else if (orbs === "fall") {
          err2.moveTo(0, -len);
          err2.bezierCurveTo(len * 0.8, -len * 0.1, len * 0.45, len * 0.55, 0, len * 0.95);
          err2.bezierCurveTo(-len * 0.45, len * 0.55, -len * 0.8, -len * 0.1, 0, -len);
        } else {
          err2.moveTo(0, -len * 0.8);
          err2.bezierCurveTo(len, -len * 0.25, len * 0.75, len * 0.4, 0, len * 0.65);
          err2.bezierCurveTo(-len * 0.75, len * 0.4, -len, -len * 0.25, 0, -len * 0.8);
        }
        err2.fill();
        err2.restore();
      });
      list2.raf = requestAnimationFrame(box);
      return;
    }
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
  list2.draw = box;
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
  const dashWall = document.getElementById("dashWall");
  if (dashWall && document.body.dataset.veilView === "dash") {
    setupHomeFx(dashWall);
  } else if (dashWall) {
    stopHomeFx(dashWall);
  }
  document.querySelectorAll(".page").forEach(value2 => {
    const wrap = value2.dataset.pageId;
    const page = tabs.find(value => value.id === wrap);
    if (page && page.newTab) {
      setupHomeFx(value2, { browser: true });
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
  const nodes = ["orbs", "stars", "constellation", "sakura", "snow", "fall", "custom"];
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
    saverColorA.value = safeColorValue(settings.saverColorA, "#ffffff");
  }
  if (saverColorB && document.activeElement !== saverColorB) {
    saverColorB.value = safeColorValue(settings.saverColorB, "#e6e6e6");
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
  const newUsername = document.getElementById("newUsername");
  if (newUsername && document.activeElement !== newUsername && !newUsername.value) {
    newUsername.value = (profile && profile.name) || "";
  }
  const profilePreview = document.getElementById("profilePreview");
  if (!profilePreview) {
    return;
  }
  profilePreview.src = profileAvatarSrc();
  profilePreview.classList.toggle("is-ph", !profile || !profile.avatar);
}
function lockVeil(resume, opts) {
  const quiet = !!(opts && opts.quiet);
  closeMenu();
  if (document.querySelector(".lock-overlay")) return;
  if (!profile.password) {
    try { localStorage.removeItem("veil_page_locked"); } catch (err) {}
    if (!resume && !quiet) alert("Set a password on first-run sign up before locking.");
    return;
  }
  if (!resume && settings.lockUnload && !quiet) {
    const box = confirm("Lock and unload open pages? Unsaved page state may be lost.");
    if (!box) {
      return;
    }
  }
  if (!resume && settings.lockUnload) {
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
  try { localStorage.setItem("veil_page_locked", "1"); } catch (err) {}
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
  old.innerHTML = "<div class=\"lock-screen\"><div class=\"lock-clock\" id=\"lockClock\">" + escapeHTML(copy) + "</div><div class=\"lock-date\" id=\"lockDate\">" + escapeHTML(base) + "</div><div class=\"lock-avatar-frame\"><img class=\"lock-avatar" + (profile && profile.avatar ? "" : " is-ph") + "\" alt=\"\" src=\"" + escapeHTML(profileAvatarSrc()) + "\"></div><div class=\"lock-name\">" + escapeHTML(profile.name || "guest") + "</div><div class=\"lock-err\" id=\"lockErr\"></div><input id=\"lockPass\" type=\"password\" placeholder=\"Password\" autocomplete=\"current-password\"><button type=\"button\" class=\"lock-go\" id=\"lockGo\">Unlock</button></div>";
  document.body.appendChild(old);
  old.style.opacity = "0";
  const card = old.querySelector(".lock-screen");
  if (card) card.style.opacity = "0";
  if (window.anime && window.anime.animate && !motionOff()) {
    try {
      window.anime.animate(old, { opacity: [0, 1], duration: 360, ease: "outCubic" });
      if (card && window.anime.spring) {
        window.anime.animate(card, {
          opacity: [0, 1],
          scale: [0.9, 1],
          ease: window.anime.spring({ bounce: 0.46, duration: 560 })
        });
      }
    } catch (err) {
      old.style.opacity = "";
      if (card) card.style.opacity = "";
    }
  } else {
    old.style.opacity = "";
    if (card) card.style.opacity = "";
  }
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
    if (old._clock) clearInterval(old._clock);
  };
  const lockPass = old.querySelector("#lockPass");
  const lockErr = old.querySelector("#lockErr");
  lockPass.focus();
  const code = () => {
    if (lockPass.value === profile.password) {
      try { localStorage.removeItem("veil_page_locked"); } catch (err) {}
      short2();
      const gone = () => { try { old.remove(); } catch (err) {} };
      if (window.anime && window.anime.animate && !motionOff()) {
        try { window.anime.animate(old, { opacity: [1, 0], duration: 280, ease: "outCubic" }); } catch (err) {}
        setTimeout(gone, 300);
      } else gone();
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
let wallpaperScope = "home";
function wpKey(name) {
  if (wallpaperScope !== "browser") return name;
  const map = {
    animEnabled: "brAnimEnabled",
    animStyle: "brAnimStyle",
    animSpeed: "brAnimSpeed",
    animCount: "brAnimCount",
    animSize: "brAnimSize",
    animColorA: "brAnimColorA",
    animColorB: "brAnimColorB",
    animMediaSpeed: "brAnimMediaSpeed",
    backgroundUrl: "brBackgroundUrl"
  };
  return map[name] || name;
}
function wpGet(name) {
  return settings[wpKey(name)];
}
function wpSet(name, value) {
  settings[wpKey(name)] = value;
}
function highlightTheme() {
  try {
    if (!settings.transport || settings.transport !== "epoxy" && settings.transport !== "libcurl") {
      settings.transport = "libcurl";
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
    setSwitch(document.getElementById("animEnabledSwitch"), !!wpGet("animEnabled"));
    setSwitch(document.getElementById("lockUnloadSwitch"), !!settings.lockUnload);
    const sleepField = document.getElementById("sleepLockDelay");
    if (sleepField && document.activeElement !== sleepField) sleepField.value = settings.sleepLock || "";
    const lockKeyInput = document.getElementById("lockKey");
    if (lockKeyInput && !bindingLock) lockKeyInput.textContent = settings.lockKey ? settings.lockKey : "Not bound";
    setSwitch(document.getElementById("closeOriginSwitch"), !!settings.closeOriginOnBlank);
    setSwitch(document.getElementById("confirmLeaveSwitch"), !!settings.confirmLeave);
    setSwitch(document.getElementById("gameDockFsSwitch"), !!settings.gameDockFs);
    setSwitch(document.getElementById("time24Switch"), settings.timeFormat === "24");
    const animOpts = document.getElementById("animOpts");
    if (animOpts) {
      animOpts.classList.toggle("enabled", !!wpGet("animEnabled"));
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
      animStyle2.value = wpGet("animStyle") || "orbs";
    }
    const animSpeed2 = document.getElementById("animSpeed");
    const animSpeedVal = document.getElementById("animSpeedVal");
    if (animSpeed2) {
      animSpeed2.value = String(wpGet("animSpeed") || 1);
      if (animSpeedVal) {
        animSpeedVal.textContent = Number(wpGet("animSpeed") || 1).toFixed(2) + "x";
      }
    }
    const animColorA = document.getElementById("animColorA");
    const animColorB = document.getElementById("animColorB");
    if (animColorA) {
      animColorA.value = safeColorValue(wpGet("animColorA"), "#ffffff");
    }
    if (animColorB) {
      animColorB.value = safeColorValue(wpGet("animColorB"), "#e6e6e6");
    }
    const animCount2 = document.getElementById("animCount");
    const animCountVal = document.getElementById("animCountVal");
    if (animCount2) {
      animCount2.value = String(wpGet("animCount") || 18);
      if (animCountVal) {
        animCountVal.textContent = String(wpGet("animCount") || 18);
      }
    }
    const animSize2 = document.getElementById("animSize");
    const animSizeVal = document.getElementById("animSizeVal");
    if (animSize2) {
      animSize2.value = String(wpGet("animSize") || 1);
      if (animSizeVal) {
        animSizeVal.textContent = Number(wpGet("animSize") || 1).toFixed(2) + "x";
      }
    }
    const wrap = ["orbs", "stars", "constellation", "sakura", "snow", "fall", "custom"];
    if (animStyle2) {
      animStyle2.value = wrap.includes(wpGet("animStyle")) ? wpGet("animStyle") : "orbs";
    }
    const page = wpGet("animStyle") === "custom";
    const tab = page && isTimedMedia(wpGet("backgroundUrl") || "");
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
      backgroundUrl.value = wpGet("backgroundUrl") || "";
    }
    const animMediaSpeed = document.getElementById("animMediaSpeed");
    const animMediaSpeedVal = document.getElementById("animMediaSpeedVal");
    if (animMediaSpeed && document.activeElement !== animMediaSpeed) {
      animMediaSpeed.value = String(wpGet("animMediaSpeed") || 1);
    }
    if (animMediaSpeedVal) {
      animMediaSpeedVal.textContent = Number(wpGet("animMediaSpeed") || 1).toFixed(2) + "x";
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
    gameDockFs: settings.gameDockFs,
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
    wpSet("backgroundUrl", backgroundUrl.value.trim());
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
  if (!confirm("Factory reset theme, wallpaper, proxy, and all other browser settings to defaults?\n\nThis cannot be undone.")) return;
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
  const chip = document.getElementById("panicKey");
  if (chip) chip.textContent = "Press a key...";
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
const SLEEP_LABELS = ["Off", "15s", "30s", "1m", "5m", "15m"];
function sleepWaitMs() {
  return parseVeilDuration(settings.sleepLock);
}
let sleepHiddenAt = 0;
function noteSleepAway() {
  if (!sleepHiddenAt) sleepHiddenAt = Date.now();
}
function noteSleepBack() {
  const step = sleepWaitMs();
  const start = sleepHiddenAt;
  sleepHiddenAt = 0;
  if (!step || !start) return;
  if (Date.now() - start >= step) lockVeil(false, { quiet: true });
}
function armSleepLock() {
  if (window.__veilSleep) return;
  window.__veilSleep = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) noteSleepAway();
    else noteSleepBack();
  });
  window.addEventListener("pagehide", noteSleepAway);
  window.addEventListener("pageshow", noteSleepBack);
  document.addEventListener("freeze", noteSleepAway);
  document.addEventListener("resume", noteSleepBack);
}
try { armSleepLock(); } catch (err) {}
const bindLock = document.getElementById("bindLock");
const unbindLock = document.getElementById("unbindLock");
const sleepLockInput = document.getElementById("sleepLockDelay");
const lockNowBtn = document.getElementById("lockNowBtn");
if (bindLock) bindLock.onclick = () => {
  bindingLock = true;
  const field = document.getElementById("lockKey");
  if (field) field.textContent = "Press a key...";
};
if (unbindLock) unbindLock.onclick = () => {
  settings.lockKey = "";
  settings.lockCode = "";
  save();
  highlightTheme();
};
if (lockNowBtn) lockNowBtn.onclick = () => lockVeil();
if (sleepLockInput) {
  const commitSleep = () => {
    const raw = sleepLockInput.value.trim();
    settings.sleepLock = parseVeilDuration(raw) > 0 ? raw : "";
    if (document.activeElement !== sleepLockInput) sleepLockInput.value = settings.sleepLock;
    save();
  };
  sleepLockInput.addEventListener("change", commitSleep);
  sleepLockInput.addEventListener("blur", commitSleep);
}
document.addEventListener("keydown", value => {
  if (bindingLock) {
    value.preventDefault();
    value.stopPropagation();
    bindingLock = false;
    if (value.key === "Escape") {
      highlightTheme();
      return;
    }
    settings.lockKey = value.key.length === 1 ? value.key.toUpperCase() : value.key;
    settings.lockCode = value.code;
    save();
    highlightTheme();
    return;
  }
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
  if (!isTypingTarget(value.target) && settings.lockCode && (value.code === settings.lockCode || value.key === settings.lockKey)) {
    value.preventDefault();
    lockVeil();
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
  if (!bookmark || bookmark.newTab || bookmark.isGames || bookmark.isAdmin || bookmark.isChat) {
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
  const chat = !!(message && message.isChat);
  const friend = !message || !!message.newTab || !!message.isGames || !!message.isAdmin || chat;
  const group = !message || !!message.newTab || !!message.isGames;
  if (menuDevtools) {
    menuDevtools.classList.remove("is-faded");
    menuDevtools.classList.toggle("disabled", friend);
    menuDevtools.disabled = friend;
    menuDevtools.setAttribute("aria-disabled", friend ? "true" : "false");
    menuDevtools.removeAttribute("aria-hidden");
  }
  if (menuFullscreen) {
    menuFullscreen.classList.toggle("disabled", group);
    menuFullscreen.disabled = group;
    menuFullscreen.setAttribute("aria-disabled", group ? "true" : "false");
  }
  const menuInstall = document.getElementById("menuInstall");
  if (menuInstall) {
    const desktop = document.body.classList.contains("veil-os");
    const blocked = !desktop || !message || !!message.newTab || !!message.isGames || !!message.isAdmin || chat || !message.url || /^veil:/i.test(message.url);
    const builtin = !!(message && message.url && isBundledSite(message.url));
    menuInstall.classList.toggle("disabled", blocked || builtin);
    menuInstall.classList.toggle("is-builtin", builtin);
    menuInstall.disabled = blocked || builtin;
    menuInstall.setAttribute("aria-disabled", blocked || builtin ? "true" : "false");
  }
  const menuSaveImage = document.getElementById("menuSaveImage");
  if (menuSaveImage) {
    const desktop = document.body.classList.contains("veil-os");
    const blocked = !desktop || !message || !!message.newTab || !!message.isGames || !!message.isAdmin || chat || !message.url || /^veil:/i.test(message.url);
    menuSaveImage.classList.toggle("disabled", blocked);
    menuSaveImage.disabled = blocked;
    menuSaveImage.setAttribute("aria-disabled", blocked ? "true" : "false");
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
const cloakIconData = {};
function warmCloakIcons() {
  const icons = {};
  try {
    Object.keys(CLOAK_PRESETS).forEach(key => {
      const icon = CLOAK_PRESETS[key] && CLOAK_PRESETS[key].icon;
      if (icon) icons[icon] = true;
    });
  } catch (err) {}
  icons[FAVI] = true;
  Object.keys(icons).forEach(icon => {
    fetch(icon).then(res => res.ok ? res.blob() : null).then(blob => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        if (url.indexOf("data:") === 0) {
          cloakIconData[icon] = url;
          cloakIconData[absFaviconUrl(icon)] = url;
        }
      };
      reader.readAsDataURL(blob);
    }).catch(() => {});
  });
}
try { warmCloakIcons(); } catch (err) {}
function cloakNow() {
  const veil = cloak && cloak.title || document.title || "Veil";
  const raw = cloak && cloak.icon || FAVI;
  const gate = cloakIconData[raw] || absFaviconUrl(raw);
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
  return "<title>" + escCloak(value.title) + "</title><link rel=\"icon\" type=\"image/png\" href=\"" + escCloak(value.icon) + "\"><script>window.addEventListener('message',function(ev){var data=ev.data||{};if(!data||data.type!=='veil-chrome')return;if(data.title)document.title=String(data.title);if(data.icon){var old=document.querySelectorAll('link[rel*=\"icon\"]');for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);var link=document.createElement('link');link.rel='icon';link.type='image/png';link.href=String(data.icon);document.head.appendChild(link);}});</script>";
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
  const force = "<!DOCTYPE html><html><head>" + cloakHead() + "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#14090b}iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:none;margin:0;padding:0;display:block;background:#14090b}</style></head><body><iframe src=\"" + mode + "\" referrerpolicy=\"no-referrer\"></iframe><script>try{window.name=\"veil-cloak\";}catch(e){}</script></body></html>";
  let immediate;
  try {
    immediate = window.open("about:blank", "_blank");
  } catch (err) {
    immediate = null;
  }
  if (!immediate) {
    alert("Popup blocked - allow popups for this site.");
    return;
  }
  try {
    immediate.document.open();
    immediate.document.write(force);
    immediate.document.close();
    try { immediate.name = "veil-cloak"; } catch (err) {}
    pushCloak(immediate);
    watchCloak(immediate);
    setTimeout(maybeCloseOrigin, 400);
  } catch (err) {
    console.error(err);
    try {
      immediate.location.href = kind;
    } catch (err2) {
      alert("Could not open the page. Allow popups, then try again.");
    }
  }
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
on("veilRefreshBtn", refreshVeil);
on("backBtn", goBack);
on("forwardBtn", goForward);
on("refreshBtn", reload);
on("homeBtn", () => goHome());
on("settingsOpenBtn", () => openBrowserSettings());
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
function isBundledSite(url) {
  let host = "";
  try {
    host = new URL(unwrapProxyUrl(url) || url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (err) {
    return false;
  }
  const roots = ["youtube.com", "youtu.be", "music.youtube.com", "geforcenow.com", "discord.com", "discordapp.com", "tiktok.com", "x.com", "twitter.com"];
  return roots.some(root => host === root || host.endsWith("." + root));
}
function workerBase() {
  const auth = localStorage.getItem("veil_auth_worker_url");
  return (auth || "https://veil-access.retropixel404.workers.dev").replace(/\/$/, "");
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
  if (typeof window.veilMusicAccountSlice === "function") {
    const musicSlice = window.veilMusicAccountSlice();
    if (musicSlice) next.music = musicSlice;
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
      fillDesktopSettings();
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
      fillDesktopSettings();
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
    value3.innerHTML = "<div class=\"chat-setup\"><div class=\"chat-setup-card\"><h2>Choose a username</h2><p>This is the name people see in chat. You can change it later in Options, then Chat, then Profile.</p><input class=\"text-input\" id=\"chatSetupName\" maxlength=\"24\" placeholder=\"Username\" autocomplete=\"off\"><button type=\"button\" class=\"primary-btn\" id=\"chatSetupGo\">Continue</button></div></div>";
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
    const chatHost = value3.parentElement;
    if (chatHost && chatHost.dataset.chatEnter === "1") {
      chatHost.dataset.chatEnter = "";
      playStageIntro(value3, ".chat-setup-card");
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
  const chatHost = value3.parentElement;
  if (chatHost && chatHost.dataset.chatEnter === "1") {
    chatHost.dataset.chatEnter = "";
    playStageIntro(value3, ".chat-app, .chat-setup-card");
  }
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
  if (document.body.classList.contains("veil-os") && typeof window.veilOSOpenApp === "function") {
    closeMenu();
    window.veilOSOpenApp("chat");
    return;
  }
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
  const adminPanelRow = document.getElementById("adminPanelRow");
  if (adminPanelRow) adminPanelRow.hidden = !isChatAdmin();
}
on("menuBtn", value => {
  value.stopPropagation();
  const menu = document.getElementById("mainMenu");
  if (menu && menu.classList.contains("open")) {
    closeMenu();
    return;
  }
  window.__veilMenuImage = null;
  window.__veilMenuMedia = null;
  window.__veilMenuAt = Date.now();
  updateDevtoolsMenuState();
  syncSaveMedia(null);
  if (!menu) return;
  menuGen++;
  if (menu._veilMotion && menu._veilMotion.cancel) {
    try { menu._veilMotion.cancel(); } catch (err) {}
    menu._veilMotion = null;
  }
  menu.classList.remove("is-placed");
  menu.style.left = "";
  menu.style.right = "";
  const chrome = document.querySelector(".chrome");
  const below = chrome ? chrome.getBoundingClientRect().bottom : 88;
  menu.style.top = Math.round(below + 8) + "px";
  menu.style.opacity = "0";
  menu.style.scale = "1";
  menu.style.transform = "none";
  menu.style.visibility = "hidden";
  menu.classList.add("open");
  const rect = menu.getBoundingClientRect();
  menu.classList.remove("open");
  menu.style.visibility = "";
  presentMenu(menu, rect.left, rect.top, "top right");
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
on("menuInstall", () => {
  closeMenu();
  if (!document.body.classList.contains("veil-os") || typeof window.veilOSInstall !== "function") {
    return;
  }
  const tab = getActiveTab();
  if (!tab || tab.newTab || tabUrlLocked(tab) || !tab.url || /^veil:/i.test(tab.url)) {
    return;
  }
  let title = String(tab.title || "").trim();
  if (!title || title === "Loading" || title === "New Tab") {
    try {
      title = new URL(tab.url).hostname.replace(/^www\./, "");
    } catch (err) {
      title = "App";
    }
  }
  let icon = tab.favicon || "";
  if (!icon || icon === FAVI || /\/favi\.png(?:\?|$)/.test(icon)) {
    icon = faviconFor(tab.url);
  }
  window.veilOSInstall({
    title: title,
    url: tab.url,
    icon: icon
  });
});
function imageNameFromUrl(url, title) {
  let name = String(title || "").trim();
  if (!name || name === "Loading" || name === "New Tab") {
    try { name = decodeURIComponent(new URL(url).pathname.split("/").pop() || ""); }
    catch (err) { name = ""; }
  }
  return name || "Image";
}
function isDirectImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(String(url || ""));
}
async function blobFromImageEl(img) {
  try {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  } catch (err) {
    return null;
  }
}
function directMediaKind(url) {
  const clean = String(url || "").split("?")[0].split("#")[0].toLowerCase();
  if (/\.(mp3|wav|ogg|oga|m4a|aac|flac|weba)$/.test(clean)) return "audio";
  if (/\.(mp4|webm|ogv|mov|m4v)$/.test(clean)) return "video";
  return "";
}
function climbMedia(node) {
  let el = node && node.nodeType === 1 ? node : node && node.parentElement;
  let guard = 0;
  while (el && guard < 24) {
    guard += 1;
    const tag = el.tagName;
    if (tag === "VIDEO" || tag === "AUDIO") return el;
    if (tag === "SOURCE") {
      const parent = el.parentElement;
      if (parent && (parent.tagName === "VIDEO" || parent.tagName === "AUDIO")) return parent;
    }
    if (el.parentElement) el = el.parentElement;
    else if (el.parentNode && el.parentNode.host) el = el.parentNode.host;
    else {
      const root = el.getRootNode && el.getRootNode();
      if (root && root.host && root.host !== el) el = root.host;
      else break;
    }
  }
  return null;
}
function packMedia(el) {
  if (!el) return null;
  let src = "";
  try { src = el.currentSrc || el.src || ""; } catch (err) {}
  if (!src && el.querySelectorAll) {
    try {
      const sources = el.querySelectorAll("source");
      for (let i = 0; i < sources.length; i++) {
        if (sources[i].src) { src = sources[i].src; break; }
      }
    } catch (err) {}
  }
  if (!src && el.getAttribute) src = el.getAttribute("src") || "";
  const kind = el.tagName === "AUDIO" ? "audio" : "video";
  return { el: el, src: src, kind: kind };
}
function collectMedia(root, out, depth) {
  if (!root || !root.querySelectorAll || depth > 6 || out.length > 40) return;
  let list;
  try { list = root.querySelectorAll("video, audio"); } catch (err) { return; }
  for (let i = 0; i < list.length; i++) out.push(list[i]);
  let all;
  try { all = root.querySelectorAll("*"); } catch (err) { return; }
  for (let j = 0; j < all.length; j++) {
    if (all[j].shadowRoot) collectMedia(all[j].shadowRoot, out, depth + 1);
  }
}
function hitMedia(list, x, y) {
  let best = null;
  let bestArea = Infinity;
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    let box;
    try { box = el.getBoundingClientRect(); } catch (err) { continue; }
    if (box.width < 8 || box.height < 8) continue;
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
      const area = box.width * box.height;
      if (area < bestArea) { best = el; bestArea = area; }
    }
  }
  return packMedia(best);
}
function mediaFromHost(node) {
  let el = node && node.nodeType === 1 ? node : node && node.parentElement;
  let guard = 0;
  while (el && guard < 8) {
    guard += 1;
    const tag = String(el.tagName || "").toLowerCase();
    const src = el.getAttribute ? (el.getAttribute("src") || "") : "";
    const packed = el.getAttribute ? (el.getAttribute("packaged-media-json") || "") : "";
    const player = /player|video|audio/.test(tag);
    const linked = /v\.redd\.it|googlevideo|videoplayback|\.mp4|\.webm|\.m3u8|\.mp3/i.test(src);
    if ((player || packed || linked) && tag !== "img" && tag !== "source" && tag !== "video" && tag !== "audio") {
      return { el: el, src: src, kind: /audio/.test(tag) && !/video/.test(tag) ? "audio" : "video" };
    }
    if (el.parentElement) el = el.parentElement;
    else if (el.parentNode && el.parentNode.host) el = el.parentNode.host;
    else break;
  }
  return null;
}
function mediaFromNode(node) {
  return packMedia(climbMedia(node));
}
function mediaAtPoint(doc, x, y, node, event) {
  let path = [];
  try { path = event && event.composedPath ? event.composedPath() : []; } catch (err) { path = []; }
  for (let i = 0; i < path.length; i++) {
    const fromPath = mediaFromNode(path[i]);
    if (fromPath) return fromPath;
  }
  const direct = mediaFromNode(node);
  if (direct) return direct;
  if (doc && doc.querySelectorAll) {
    const found = [];
    collectMedia(doc, found, 0);
    const hit = hitMedia(found, x, y);
    if (hit) return hit;
  }
  for (let i = 0; i < path.length; i++) {
    const host = mediaFromHost(path[i]);
    if (host) return host;
  }
  return mediaFromHost(node);
}
function mediaOnPage() {
  const tab = getActiveTab();
  let doc = null;
  try {
    const el = tab && tab.engineFrame && (tab.engineFrame.element || tab.engineFrame.frame || tab.engineFrame);
    doc = el && el.contentDocument;
  } catch (err) {}
  if (!doc) return null;
  const nodes = [];
  collectMedia(doc, nodes, 0);
  let best = null;
  let bestArea = 0;
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    let box;
    try { box = el.getBoundingClientRect(); } catch (err) { continue; }
    const area = Math.max(0, box.width) * Math.max(0, box.height);
    if (!best || area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  if (!best) return null;
  return packMedia(best);
}
function mediaKindOf(url, mime, fallback) {
  const type = String(mime || "").toLowerCase();
  if (type.indexOf("audio/") === 0) return "audio";
  if (type.indexOf("video/") === 0) return "video";
  const real = unwrapProxyUrl(url) || url || "";
  const kind = directMediaKind(real);
  if (kind) return kind;
  const raw = String(url || "") + " " + String(real || "");
  if (/[?&]mime=audio(%2F|\/)/i.test(raw)) return "audio";
  if (/[?&]mime=video(%2F|\/)/i.test(raw) || /googlevideo\.com\/videoplayback/i.test(raw)) return "video";
  return fallback || "";
}
function harvestMediaUrls(el, add) {
  let node = el;
  let hops = 0;
  while (node && hops < 8) {
    hops += 1;
    if (node.getAttributeNames) {
      const names = node.getAttributeNames();
      for (let i = 0; i < names.length; i++) {
        const val = node.getAttribute(names[i]) || "";
        if (!val) continue;
        if (/^https?:/i.test(val)) add(val);
        const found = val.match(/https?:\\?\/\\?\/[^"'\s\\<>]+/g);
        if (found) {
          for (let j = 0; j < found.length; j++) add(found[j].replace(/\\\//g, "/"));
        }
      }
    }
    if (node.parentElement) node = node.parentElement;
    else if (node.parentNode && node.parentNode.host) node = node.parentNode.host;
    else {
      const root = node.getRootNode && node.getRootNode();
      node = root && root.host && root.host !== node ? root.host : null;
    }
  }
}
function expandMediaUrls(urls) {
  const out = urls.slice();
  urls.forEach(url => {
    const real = unwrapProxyUrl(url) || url;
    const match = String(real).match(/https?:\/\/v\.redd\.it\/([A-Za-z0-9]+)/i);
    if (!match) return;
    ["DASH_720.mp4", "DASH_480.mp4", "DASH_360.mp4", "DASH_1080.mp4", "DASH_240.mp4", "CMAF_720.mp4", "CMAF_480.mp4"].forEach(file => {
      const next = "https://v.redd.it/" + match[1] + "/" + file;
      if (out.indexOf(next) === -1) out.push(next);
      const alt = next + "?source=fallback";
      if (out.indexOf(alt) === -1) out.push(alt);
    });
  });
  return out;
}
function mediaUrlRank(url) {
  const value = String(url || "");
  if (/DASH_\d+\.mp4|CMAF_\d+\.mp4/i.test(value)) return 50;
  if (/\.(mp4|webm|ogv|mov|m4v|mp3|m4a|aac|wav|ogg|flac)(\?|#|$)/i.test(value)) return 40;
  if (/videoplayback/i.test(value) && /mime=video/i.test(value)) return 36;
  if (/googlevideo\.com\/videoplayback/i.test(value)) return 30;
  if (/\.m3u8(\?|#|$)/i.test(value)) return 4;
  if (/^blob:/i.test(value)) return 1;
  if (/^https?:/i.test(value)) return 16;
  return 8;
}
function mediaUrlList(picked) {
  const urls = [];
  function add(url) {
    const value = String(url || "").trim();
    if (!value || value === "about:blank" || urls.indexOf(value) !== -1) return;
    urls.push(value);
  }
  if (picked && picked.src) add(picked.src);
  const el = picked && picked.el;
  if (el) {
    try { add(el.currentSrc); } catch (err) {}
    try { add(el.src); } catch (err) {}
    try {
      const sources = el.querySelectorAll ? el.querySelectorAll("source") : [];
      for (let i = 0; i < sources.length; i++) add(sources[i].src);
    } catch (err) {}
    harvestMediaUrls(el, add);
    try {
      const view = el.ownerDocument && el.ownerDocument.defaultView;
      const entries = view && view.performance && view.performance.getEntriesByType("resource") || [];
      for (let i = entries.length - 1; i >= 0 && urls.length < 24; i--) {
        const name = entries[i].name || "";
        if (mediaKindOf(name, "", "") || /v\.redd\.it|googlevideo\.com\/videoplayback|\.m3u8/i.test(name)) add(name);
      }
    } catch (err) {}
  }
  return expandMediaUrls(urls);
}
async function fetchMediaBlob(url, frameEl) {
  const real = unwrapProxyUrl(url) || url || "";
  const tries = [];
  if (frameEl && /^blob:/i.test(url)) {
    try {
      const view = frameEl.ownerDocument && frameEl.ownerDocument.defaultView;
      if (view && view.fetch) {
        const res = await view.fetch(url);
        const blob = await res.blob();
        const type = String(blob && blob.type || "").toLowerCase();
        if (blob && blob.size > 1024 && blob.size < 100 * 1024 * 1024 && type.indexOf("text/") !== 0) return blob;
      }
    } catch (err) {}
  }
  if (url && url !== real) tries.push(url);
  if (/^https?:/i.test(real)) tries.push(SCRAMJET_PREFIX + encodeURIComponent(real));
  if (/^https?:/i.test(url)) tries.push(url);
  for (let i = 0; i < tries.length; i++) {
    try {
      const res = await fetch(tries[i]);
      if (!res.ok) continue;
      const len = Number(res.headers.get("content-length") || 0);
      if (len > 100 * 1024 * 1024) continue;
      const blob = await res.blob();
      const type = String(blob && blob.type || "").toLowerCase();
      if (!blob || blob.size < 1024 || blob.size > 100 * 1024 * 1024) continue;
      if (type.indexOf("text/") === 0 || type.indexOf("image/") === 0 || type.indexOf("application/json") === 0 || type.indexOf("application/xhtml") === 0 || /mpegurl|dash\+xml|application\/xml/.test(type)) continue;
      return blob;
    } catch (err) {}
  }
  return null;
}
function syncSaveMedia(media) {
  const btn = document.getElementById("menuSaveMedia");
  if (!btn) return;
  const desktop = document.body.classList.contains("veil-os");
  const tab = getActiveTab();
  let picked = media || mediaOnPage() || null;
  if (!picked) {
    const kind = directMediaKind(tab && tab.url);
    if (kind) picked = { src: tab.url, kind: kind };
  }
  const show = !!(desktop && picked && picked.kind);
  btn.classList.toggle("is-on", show);
  const label = btn.querySelector("[data-label]");
  if (label && picked) label.textContent = picked.kind === "audio" ? "Save audio" : "Save video";
  const icon = btn.querySelector("img");
  if (icon && picked) icon.src = IMG + (picked.kind === "audio" ? "audio.svg" : "video.svg");
  window.__veilMenuMedia = show ? picked : null;
}
on("menuSaveMedia", async () => {
  const picked = window.__veilMenuMedia || null;
  closeMenu();
  if (!document.body.classList.contains("veil-os") || typeof window.veilOSAddMedia !== "function" || !picked) return;
  const tab = getActiveTab();
  const urls = mediaUrlList(picked).filter(url => !/^blob:/i.test(url));
  if (tab && tab.url && directMediaKind(tab.url)) urls.push(tab.url);
  urls.sort((a, b) => mediaUrlRank(b) - mediaUrlRank(a));
  let blob = null;
  let used = "";
  for (let i = 0; i < urls.length; i++) {
    if (/\.m3u8(\?|#|$)/i.test(urls[i])) continue;
    blob = await fetchMediaBlob(urls[i], picked.el);
    if (blob) { used = urls[i]; break; }
  }
  if (!blob) {
    alert("Couldn't save that file. Open a direct audio or video link, or drop the file on the desktop.");
    return;
  }
  const kind = mediaKindOf(used, blob.type, picked.kind);
  if (kind !== "audio" && kind !== "video") {
    alert("That file isn't a supported audio or video format.");
    return;
  }
  const real = unwrapProxyUrl(used) || used;
  let name = imageNameFromUrl(real, (picked.el && picked.el.title) || (tab && tab.title) || (kind === "audio" ? "Audio" : "Video"));
  if (/^videoplayback$/i.test(String(name).replace(/\.[a-z0-9]{1,8}$/i, ""))) name = (tab && tab.title) || (kind === "audio" ? "Audio" : "Video");
  await window.veilOSAddMedia({ blob: blob, name: name, mime: blob.type || "", kind: kind });
});
on("menuSaveImage", async () => {
  const picked = window.__veilMenuImage || null;
  closeMenu();
  if (!document.body.classList.contains("veil-os") || typeof window.veilOSAddImage !== "function") return;
  const tab = getActiveTab();
  if (!picked && (!tab || tab.newTab || tabUrlLocked(tab) || !tab.url || /^veil:/i.test(tab.url))) return;
  const name = imageNameFromUrl(tab && tab.url, tab && tab.title);
  if (picked) {
    const saved = await savePickedImage(picked, picked.alt || name);
    if (saved) return;
  }
  if (!tab || !tab.url) {
    alert("No image to save on this page. Open an image, or drop one onto the desktop.");
    return;
  }
  if (isDirectImageUrl(tab.url)) {
    try {
      const res = await fetch(tab.url);
      const blob = await res.blob();
      if (blob && (!blob.type || blob.type.indexOf("image/") === 0)) {
        await window.veilOSAddImage({ blob, name });
        return;
      }
    } catch (err) {}
    await window.veilOSAddImage({ remote: tab.url, name });
    return;
  }
  let doc = null;
  try {
    const el = tab.engineFrame && (tab.engineFrame.element || tab.engineFrame.frame || tab.engineFrame);
    doc = el && el.contentDocument;
  } catch (err) {}
  const imgs = doc ? Array.prototype.slice.call(doc.images || []) : [];
  imgs.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
  const img = imgs.find(item => (item.naturalWidth || item.width) >= 32 && (item.naturalHeight || item.height) >= 32);
  if (img && await savePickedImage({ el: img, src: img.currentSrc || img.src || "", alt: img.alt || "" }, img.alt || name)) return;
  alert("No image to save on this page. Open an image, or drop one onto the desktop.");
});
function imageFromNode(node) {
  const el = node && node.nodeType === 1 ? node : node && node.parentElement;
  if (!el || !el.closest) return null;
  const img = el.closest("img");
  if (!img) return null;
  const src = img.currentSrc || img.src || "";
  if (!src) return null;
  return { el: img, src: src, alt: img.alt || "" };
}
function pointFromFrame(frameEl, x, y) {
  let el = frameEl;
  while (el) {
    const box = el.getBoundingClientRect();
    x += box.left;
    y += box.top;
    const view = el.ownerDocument && el.ownerDocument.defaultView;
    const parent = view && view.parent;
    if (!parent || parent === view) break;
    el = view.frameElement;
  }
  return { x: x, y: y };
}
function hookFrameMenu(frameEl) {
  if (!frameEl) return;
  let doc = null;
  try { doc = frameEl.contentDocument; } catch (err) { return; }
  if (!doc || doc.__veilCtx) return;
  doc.__veilCtx = true;
  doc.addEventListener("contextmenu", event => {
    const target = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    if (target && target.closest && target.closest("input, textarea, select, [contenteditable='true']")) return;
    const menu = document.getElementById("mainMenu");
    if (menu && menu.classList.contains("open")) {
      closeMenu();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const spot = pointFromFrame(frameEl, event.clientX, event.clientY);
    openBrowserMenuAt(spot.x, spot.y, imageFromNode(target), mediaAtPoint(doc, event.clientX, event.clientY, target, event));
  }, true);
  const dismiss = () => {
    try { closeMenu(); } catch (err) {}
    try { window.dispatchEvent(new CustomEvent("veil-dismiss-popups")); } catch (err) {}
  };
  doc.addEventListener("pointerdown", event => {
    if (event.button === 2) return;
    dismiss();
  }, true);
  doc.addEventListener("scroll", dismiss, true);
  doc.addEventListener("keydown", event => {
    if (event.key === "Escape") dismiss();
  }, true);
  const scan = records => {
    try {
      const nodes = [];
      if (!records) {
        Array.prototype.forEach.call(doc.querySelectorAll("iframe"), node => nodes.push(node));
      } else {
        Array.prototype.forEach.call(records, record => {
          Array.prototype.forEach.call(record.addedNodes || [], node => {
            if (!node || node.nodeType !== 1) return;
            if (node.tagName === "IFRAME") nodes.push(node);
            if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll("iframe"), child => nodes.push(child));
          });
        });
      }
      nodes.forEach(child => {
        const bind = () => hookFrameMenu(child);
        if (!child.__veilCtxLoad) {
          child.__veilCtxLoad = true;
          child.addEventListener("load", bind);
        }
        bind();
      });
    } catch (err) {}
  };
  scan();
  try {
    new MutationObserver(scan).observe(doc.documentElement || doc, { childList: true, subtree: true });
  } catch (err) {}
}
function presentMenu(menu, left, top, origin) {
  if (!menu) return;
  menuGen++;
  if (menu._veilMotion && menu._veilMotion.cancel) {
    try { menu._veilMotion.cancel(); } catch (err) {}
    menu._veilMotion = null;
  }
  menu.classList.add("is-placed");
  menu.style.right = "auto";
  menu.style.transform = "none";
  menu.style.transformOrigin = origin || "top left";
  menu.style.left = Math.max(8, left) + "px";
  menu.style.top = Math.max(8, top) + "px";
  menu.style.opacity = "0";
  menu.style.scale = "1";
  menu.style.visibility = "hidden";
  menu.classList.add("open");
  const rect = menu.getBoundingClientRect();
  let l = left;
  let t = top;
  if (rect.right > window.innerWidth - 8) l -= rect.right - window.innerWidth + 8;
  if (rect.bottom > window.innerHeight - 8) t -= rect.bottom - window.innerHeight + 8;
  if (rect.left < 8) l += 8 - rect.left;
  if (rect.top < 8) t += 8 - rect.top;
  menu.style.left = Math.max(8, l) + "px";
  menu.style.top = Math.max(8, t) + "px";
  menu.style.visibility = "visible";
  if (window.anime && window.anime.animate && window.anime.spring && !motionOff()) {
    try {
      menu._veilMotion = window.anime.animate(menu, {
        opacity: [0, 1],
        scale: [0.9, 1],
        ease: window.anime.spring({ bounce: 0.42, duration: 520 })
      });
    } catch (err) {
      menu.style.opacity = "1";
    }
  } else {
    menu.style.opacity = "1";
  }
}
function openBrowserMenuAt(x, y, image, media) {
  const menu = document.getElementById("mainMenu");
  if (!menu) return;
  window.__veilMenuImage = image || null;
  window.__veilMenuAt = Date.now();
  updateDevtoolsMenuState();
  syncSaveMedia(media || null);
  const saveBtn = document.getElementById("menuSaveImage");
  if (saveBtn && image && document.body.classList.contains("veil-os")) {
    saveBtn.classList.remove("disabled");
    saveBtn.disabled = false;
    saveBtn.setAttribute("aria-disabled", "false");
  }
  const desktop = document.body.classList.contains("veil-os");
  const host = document.getElementById("browser");
  const box = desktop && host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  presentMenu(menu, x - (desktop ? box.left : 0), y - (desktop ? box.top : 0), "top left");
}
async function savePickedImage(img, name) {
  if (!img || typeof window.veilOSAddImage !== "function") return false;
  const label = String(name || img.alt || "Image").trim() || "Image";
  if (img.el) {
    const blob = await blobFromImageEl(img.el);
    if (blob) {
      await window.veilOSAddImage({ blob: blob, name: label });
      return true;
    }
  }
  const src = img.src || "";
  if (!src) return false;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    if (blob && (!blob.type || blob.type.indexOf("image/") === 0)) {
      await window.veilOSAddImage({ blob: blob, name: label });
      return true;
    }
  } catch (err) {}
  if (/^https?:/i.test(src)) {
    await window.veilOSAddImage({ remote: src, name: label });
    return true;
  }
  return false;
}
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
function openDesktop() {
  if (document.body.classList.contains("veil-os") || window.__veilOsBooting) {
    return;
  }
  window.__veilOsBooting = true;
  try { closeMenu(); } catch (err) {}
  try { closePanels(); } catch (err) {}
  try {
    const wall = document.getElementById("dashWall");
    if (wall) {
      stopHomeFx(wall);
      wall.querySelectorAll("video").forEach(video => video.pause());
    }
    const stage = document.getElementById("veilStage");
    if (stage) stage.querySelectorAll("video").forEach(video => video.pause());
  } catch (err) {}
  const bootStyle = document.createElement("style");
  bootStyle.id = "veilOsBootStyle";
  bootStyle.textContent = "#veilOsBoot{position:fixed;inset:0;z-index:250000;display:flex;flex-direction:column;background:#0a0a0a;color:#f2f2f2;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;transition:opacity .45s ease}" + "#veilOsBoot.done{opacity:0;pointer-events:none}" + ".vosb-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#121212 0%,#0a0a0a 62%)}" + ".vosb-mark{width:76px;height:76px;border-radius:18px;background:#121212;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center}" + ".vosb-mark img{width:42px;height:42px;object-fit:contain;display:block}" + ".vosb-name{margin-top:18px;font-size:40px;font-weight:600;letter-spacing:-.045em;line-height:1;color:#f3f3f3}" + ".vosb-bar{width:228px;height:12px;margin-top:26px;background:#141414;border:1px solid #2e2e2e;border-radius:2px;overflow:hidden;position:relative}" + ".vosb-bar i{position:absolute;top:1px;bottom:1px;left:0;width:38%;background:#f2f2f2;border-radius:1px;animation:vosbSlide 1.25s cubic-bezier(.45,0,.2,1) infinite}" + "@keyframes vosbSlide{0%{transform:translateX(-110%)}100%{transform:translateX(340%)}}" + ".vosb-dev{margin-top:12px;font-size:11px;font-weight:650;letter-spacing:.04em;color:#8d8d8d;padding:4px 10px;border:1px solid #2a2a2a;border-radius:999px}" + ".vosb-status{margin-top:14px;min-height:16px;font-size:12px;letter-spacing:.01em;color:#8d8d8d}" + ".vosb-foot{flex:0 0 48px;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-top:1px solid #161616;color:#6a6a6a;font-size:12px}";
  document.head.appendChild(bootStyle);
  const boot = document.createElement("div");
  boot.id = "veilOsBoot";
  boot.setAttribute("role", "status");
  boot.innerHTML = "<div class=\"vosb-main\"><div class=\"vosb-mark\"><img src=\"" + FAVI + "\" alt=\"\"></div><div class=\"vosb-name\">veilOS</div><div class=\"vosb-bar\" aria-hidden=\"true\"><i></i></div><div class=\"vosb-dev\">Under Development</div><div class=\"vosb-status\" data-boot-status>Starting veilOS</div></div><div class=\"vosb-foot\"><span>Veil</span><span>veilOS</span></div>";
  document.body.appendChild(boot);
  let cssReady = false;
  let jsReady = false;
  const tryStart = () => {
    if (!cssReady || !jsReady) {
      return;
    }
    try {
      if (typeof window.startVeilOS === "function") {
        window.startVeilOS(boot);
        return;
      }
    } catch (err) {
      console.warn("[veil] veilOS", err);
    }
    window.__veilOsBooting = false;
    const status = boot.querySelector("[data-boot-status]");
    if (status) {
      status.textContent = "Could not start veilOS.";
    }
  };
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = BASE + "/veilos.css?v=97";
  link.onload = () => {
    cssReady = true;
    tryStart();
  };
  link.onerror = () => {
    cssReady = true;
    tryStart();
  };
  if (!document.querySelector('link[href*="veilos.css"]')) document.head.appendChild(link);
  else { cssReady = true; tryStart(); }
  const script = document.createElement("script");
  script.src = BASE + "/veilos.js?v=103";
  script.onload = () => {
    jsReady = true;
    tryStart();
  };
  script.onerror = () => {
    window.__veilOsBooting = false;
    const status = boot.querySelector("[data-boot-status]");
    if (status) {
      status.textContent = "Could not load veilOS.";
    }
  };
  if (!document.querySelector('script[src*="veilos.js"]')) document.body.appendChild(script);
  else { jsReady = true; tryStart(); }
  setTimeout(() => {
    if (!cssReady) {
      cssReady = true;
      tryStart();
    }
  }, 2500);
}
const launchNowBtn = document.getElementById("launchNowBtn");
if (launchNowBtn) {
  launchNowBtn.onclick = () => openLaunchModal();
}
const openDesktopBtn = document.getElementById("openDesktopBtn");
if (openDesktopBtn) {
  openDesktopBtn.onclick = () => openDesktop();
}
const dashDesktop = document.getElementById("dashDesktop");
if (dashDesktop) dashDesktop.onclick = () => openDesktop();
const dashLaunch = document.getElementById("dashLaunch");
if (dashLaunch) dashLaunch.onclick = () => openLaunchModal();
const dashLock = document.getElementById("dashLock");
if (dashLock) dashLock.onclick = () => lockVeil();
const optionsBack = document.getElementById("optionsBack");
if (optionsBack) optionsBack.onclick = () => leaveSettings();
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
    wpSet("animEnabled", false);
    highlightTheme();
    refreshHomeFxAll();
    return;
  }
  wpSet("animEnabled", !wpGet("animEnabled"));
  save();
  highlightTheme();
  refreshHomeFxAll();
});
on("brAnimEnabledSwitch", () => {
  if (!COOKIE.consent) {
    settings.brAnimEnabled = false;
    highlightTheme();
    refreshHomeFxAll();
    return;
  }
  settings.brAnimEnabled = !settings.brAnimEnabled;
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
on("gameDockFsSwitch", () => {
  settings.gameDockFs = !settings.gameDockFs;
  save();
  highlightTheme();
  // Apply right away if a game is fullscreen now.
  try { if (window.veilFsSync) window.veilFsSync(); } catch (err) {}
});
on("time24Switch", () => {
  settings.timeFormat = settings.timeFormat === "24" ? "12" : "24";
  save();
  highlightTheme();
  startWelcomeClock();
});
function fillDesktopSettings() {
  setSwitch(document.getElementById("osBatterySwitch"), !settings || settings.osBatteryPct !== false);
  const sound = document.getElementById("osTimerSound");
  if (sound && document.activeElement !== sound) sound.value = (settings && settings.osTimerSound) || "chime";
}
on("osBatterySwitch", () => {
  settings.osBatteryPct = settings.osBatteryPct === false;
  setSwitch(document.getElementById("osBatterySwitch"), settings.osBatteryPct !== false);
  save();
  try { if (window.veilOSPaintBattery) window.veilOSPaintBattery(); } catch (err) {}
});
on("osWallPick", () => {
  const input = document.getElementById("osWallFile");
  if (input) input.click();
});
on("osWallReset", () => {
  if (window.veilOSResetWall) window.veilOSResetWall();
});
const osWallFile = document.getElementById("osWallFile");
if (osWallFile) {
  osWallFile.addEventListener("change", () => {
    const file = osWallFile.files && osWallFile.files[0];
    osWallFile.value = "";
    if (!file || String(file.type || "").indexOf("image/") !== 0) return;
    if (window.veilOSSetWall) window.veilOSSetWall(file);
  });
}
const osTimerSound = document.getElementById("osTimerSound");
if (osTimerSound) {
  osTimerSound.addEventListener("change", () => {
    settings.osTimerSound = osTimerSound.value || "chime";
    save();
  });
}
document.querySelectorAll("[data-settings-tab]").forEach(value2 => {
  value2.addEventListener("click", () => {
    const token = value2.getAttribute("data-settings-tab");
    document.querySelectorAll("[data-settings-tab]").forEach(value => {
      value.classList.toggle("active", value === value2);
    });
    document.querySelectorAll("[data-settings-page]").forEach(value => {
      value.classList.toggle("active", value.getAttribute("data-settings-page") === token);
    });
    moveSettingsPill(true);
    if (token === "desktop") fillDesktopSettings();
  });
});
const WALL_COLORS = {
  orbs: ["#ffffff", "#e6e6e6"],
  stars: ["#ffffff", "#e6e6e6"],
  constellation: ["#ffffff", "#e6e6e6"],
  sakura: ["#f7b7c8", "#e889a8"],
  snow: ["#ffffff", "#f4f7fb"],
  fall: ["#e07a2f", "#f0c14a"]
};
function applyWallPalette(style, which) {
  const pair = WALL_COLORS[style];
  if (!pair) return;
  if (which === "saver") {
    settings.saverColorA = pair[0];
    settings.saverColorB = pair[1];
    return;
  }
  wpSet("animColorA", pair[0]);
  wpSet("animColorB", pair[1]);
}
const animStyle = document.getElementById("animStyle");
if (animStyle) {
  animStyle.addEventListener("change", () => {
    wpSet("animStyle", animStyle.value || "orbs");
    applyWallPalette(animStyle.value || "orbs");
    save();
    highlightTheme();
    refreshHomeFxAll();
  });
}
const brAnimStyle = document.getElementById("brAnimStyle");
if (brAnimStyle) {
  brAnimStyle.addEventListener("change", () => {
    settings.brAnimStyle = brAnimStyle.value || "orbs";
    applyWallPalette(settings.brAnimStyle);
    save();
    highlightTheme();
    refreshHomeFxAll();
  });
}
const brBackgroundUrl = document.getElementById("brBackgroundUrl");
if (brBackgroundUrl) {
  brBackgroundUrl.addEventListener("change", () => {
    settings.brBackgroundUrl = brBackgroundUrl.value.trim();
    save();
    highlightTheme();
    refreshHomeFxAll();
  });
}
["brAnimColorA", "brAnimColorB"].forEach(id => {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () => {
    settings[id] = input.value;
    save();
    refreshHomeFxAll();
  });
});
function bindBrRange(id, key, digits) {
  const input = document.getElementById(id);
  if (!input) return;
  const label = document.getElementById(id + "Val");
  const paint = () => {
    const n = Number(input.value);
    settings[key] = Number.isFinite(n) ? n : settings[key];
    if (label) label.textContent = digits ? Number(settings[key]).toFixed(digits) + "x" : String(Math.round(Number(settings[key])));
  };
  input.addEventListener("input", paint);
  input.addEventListener("change", () => {
    paint();
    save();
    refreshHomeFxAll();
  });
}
bindBrRange("brAnimSpeed", "brAnimSpeed", 2);
bindBrRange("brAnimCount", "brAnimCount", 0);
bindBrRange("brAnimSize", "brAnimSize", 2);
bindBrRange("brAnimMediaSpeed", "brAnimMediaSpeed", 2);
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
    applyWallPalette(settings.saverStyle, "saver");
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
    wpSet("animSpeed", Number(animSpeed.value) || 1);
    const animSpeedVal = document.getElementById("animSpeedVal");
    if (animSpeedVal) {
      animSpeedVal.textContent = Number(wpGet("animSpeed")).toFixed(2) + "x";
    }
  });
  animSpeed.addEventListener("change", () => {
    wpSet("animSpeed", Number(animSpeed.value) || 1);
    save();
    refreshHomeFxAll();
  });
}
const animCount = document.getElementById("animCount");
if (animCount) {
  animCount.addEventListener("input", () => {
    wpSet("animCount", Number(animCount.value) || 18);
    const animCountVal = document.getElementById("animCountVal");
    if (animCountVal) {
      animCountVal.textContent = String(wpGet("animCount"));
    }
  });
  animCount.addEventListener("change", () => {
    wpSet("animCount", Math.max(4, Math.min(80, Number(animCount.value) || 18)));
    save();
    refreshHomeFxAll();
  });
}
const animSize = document.getElementById("animSize");
if (animSize) {
  animSize.addEventListener("input", () => {
    wpSet("animSize", Number(animSize.value) || 1);
    const animSizeVal = document.getElementById("animSizeVal");
    if (animSizeVal) {
      animSizeVal.textContent = Number(wpGet("animSize")).toFixed(2) + "x";
    }
  });
  animSize.addEventListener("change", () => {
    wpSet("animSize", Number(animSize.value) || 1);
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
    wpSet(value, old.value);
    refreshHomeFxAll();
  });
  old.addEventListener("change", () => {
    wpSet(value, old.value);
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
    wpSet("backgroundUrl", backgroundUrlEl.value.trim());
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
    wpSet("animMediaSpeed", cloak2);
    const animMediaSpeedVal = document.getElementById("animMediaSpeedVal");
    if (animMediaSpeedVal) {
      animMediaSpeedVal.textContent = cloak2.toFixed(2) + "x";
    }
  };
  animMediaSpeedEl.addEventListener("input", () => {
    paintMedia();
    document.querySelectorAll(wallpaperScope === "browser" ? ".newtab-page video.newtab-media" : ".dash-wall video.newtab-media").forEach(value => {
      try {
        value.playbackRate = Number(wpGet("animMediaSpeed")) || 1;
      } catch (err) {}
    });
  });
  animMediaSpeedEl.addEventListener("change", () => {
    paintMedia();
    save();
    document.querySelectorAll(wallpaperScope === "browser" ? ".newtab-page video.newtab-media" : ".dash-wall video.newtab-media").forEach(value => {
      try {
        value.playbackRate = Number(wpGet("animMediaSpeed")) || 1;
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
window.addEventListener("blur", () => {
  const menu = document.getElementById("mainMenu");
  if (menu && menu.classList.contains("open")) closeMenu();
  try { window.dispatchEvent(new CustomEvent("veil-dismiss-popups")); } catch (err) {}
});
function refreshVeil() {
  try { skipLeaveWarning = true; } catch (err) {}
  try { window.onbeforeunload = null; } catch (err) {}
  try {
    if (window.parent && window.parent !== window) {
      let parentHref = "";
      try { parentHref = String(window.parent.location.href || ""); } catch (err) { parentHref = "about:"; }
      if (parentHref.indexOf("about:") === 0) {
        location.reload();
        return;
      }
    }
  } catch (err) {}
  try {
    if (String(location.protocol) === "about:" || String(location.href).indexOf("about:") === 0) {
      const frame = document.querySelector("iframe");
      if (frame) {
        frame.src = frame.src;
        return;
      }
    }
  } catch (err) {}
  location.reload();
}
document.addEventListener("click", value => {
  if (window.__veilMenuAt && Date.now() - window.__veilMenuAt < 400) return;
  if (!value.target.closest("#mainMenu") && !value.target.closest("#menuBtn")) {
    closeMenu();
  }
});
document.addEventListener("contextmenu", value => {
  const browser = document.getElementById("browser");
  const target = value.target && value.target.nodeType === 1 ? value.target : value.target && value.target.parentElement;
  const inOs = document.body.classList.contains("veil-os");
  if (!inOs && document.body.dataset.veilView !== "browser") return;
  if (!browser || !target || !target.closest || !browser.contains(target)) return;
  if (target.closest("input, textarea, select, [contenteditable='true'], #mainMenu, .panel, .modal-overlay")) return;
  const menu = document.getElementById("mainMenu");
  if (menu && menu.classList.contains("open")) {
    closeMenu();
    return;
  }
  value.preventDefault();
  value.stopPropagation();
  openBrowserMenuAt(value.clientX, value.clientY, null, mediaAtPoint(document, value.clientX, value.clientY, target, value) || mediaOnPage());
}, true);
document.addEventListener("keydown", value => {
  if (value.key === "Escape") {
    const menu = document.getElementById("mainMenu");
    if (menu && menu.classList.contains("open")) {
      closeMenu();
      value.preventDefault();
    }
  }
  if (document.querySelector(".lock-overlay")) {
    if (value.ctrlKey || value.metaKey || value.altKey || value.key === "F5") value.preventDefault();
    return;
  }
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
// Re-setting the transport drops every request in flight (a captcha check, a song stream), so only
// do it after the tab has been hidden long enough for the wisp socket to have gone stale.
let veilHiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    veilHiddenAt = Date.now();
    return;
  }
  if (veilHiddenAt && Date.now() - veilHiddenAt > 5 * 60 * 1000) reconnectTransport();
  veilHiddenAt = 0;
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
    if (!timeLeft || !value.querySelector(".time-batt") || !value.querySelector(".time-sep")) {
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
      const dotBatt = document.createElement("span");
      dotBatt.className = "time-sep time-sep-batt";
      dotBatt.setAttribute("aria-hidden", "true");
      dotBatt.textContent = "·";
      timeLeft = document.createElement("span");
      timeLeft.className = "time-left";
      const dotOs = document.createElement("span");
      dotOs.className = "time-sep time-sep-os";
      dotOs.setAttribute("aria-hidden", "true");
      dotOs.textContent = "·";
      const btn = document.createElement("span");
      btn.className = "time-os";
      prev.appendChild(timer);
      prev.appendChild(dotBatt);
      prev.appendChild(timeLeft);
      prev.appendChild(dotOs);
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
  paintDashStatus();
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
function paintDashStatus() {
  const left = document.querySelector("[data-dash-left]");
  const os = document.querySelector("[data-dash-os]");
  if (left || os) {
    const node = window.VeilAccess && window.VeilAccess.getMeta && window.VeilAccess.getMeta() || null;
    if (left) {
      const raw = formatAccessLeft(node);
      left.textContent = raw === "Unlimited" || raw === "—" || raw === "Expired" ? raw : raw + " left";
    }
    if (os) os.textContent = detectOSName();
  }
}
let animeLoad = null;
let dashIntroPlayed = false;
function ensureAnime() {
  if (window.anime && window.anime.animate) return Promise.resolve(window.anime);
  if (animeLoad) return animeLoad;
  const existing = document.querySelector('script[src*="anime.min.js"]');
  if (existing && !window.anime) {
    animeLoad = new Promise(resolve => {
      const done = () => resolve(window.anime && window.anime.animate ? window.anime : null);
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      setTimeout(done, 4000);
    });
    return animeLoad;
  }
  animeLoad = new Promise(resolve => {
    const script = document.createElement("script");
    script.src = REPO_PATH + "anime.min.js?v=95";
    script.async = true;
    script.onload = () => resolve(window.anime || null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
  return animeLoad;
}
function motionOff() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    return false;
  }
}
function springClose(el, done) {
  const finish = () => { try { if (done) done(); } catch (err) {} };
  const anime = window.anime;
  if (el && el._veilMotion && el._veilMotion.cancel) {
    try { el._veilMotion.cancel(); } catch (err) {}
    el._veilMotion = null;
  }
  if (!el || motionOff() || !anime || !anime.animate || !anime.spring) {
    finish();
    return;
  }
  try {
    const job = anime.animate(el, {
      opacity: [1, 0],
      scale: [1, 0.94],
      ease: anime.spring({ bounce: 0.28, duration: 320 })
    });
    el._veilMotion = job;
    let settled = false;
    const end = () => {
      if (settled) return;
      settled = true;
      if (el._veilMotion === job) el._veilMotion = null;
      finish();
    };
    if (job && typeof job.then === "function") job.then(end);
    setTimeout(end, 380);
  } catch (err) {
    finish();
  }
}
function fadeIn(el) {
  if (!el || motionOff() || !window.anime || !window.anime.animate) return;
  try {
    const job = window.anime.animate(el, {
      opacity: [0, 1],
      duration: 220,
      ease: "outCubic"
    });
    const clear = () => { el.style.opacity = ""; };
    if (job && typeof job.then === "function") job.then(clear);
    setTimeout(clear, 420);
  } catch (err) {}
}
// The browser tab strip (v=87 / 82d8463) is the motion model for the rest of Veil. Its numbers are
// copied here (the tab code itself is left untouched) so panes, sections and lists move the same way:
// enter = fade + grow from 0.9, exit = fade + shrink to 0.96 while out of flow, reflow = FLIP slide,
// switch = small 0.94 pop on the newly selected item, indicator = sliding pill.
const VEIL_TAB_MOTION = {
  enter: { bounce: 0.46, duration: 560 },
  exit: { bounce: 0.28, duration: 380 },
  slide: { bounce: 0.38, duration: 540 },
  select: { bounce: 0.5, duration: 600 },
  pill: { bounce: 0.32, duration: 560 }
};
const VEIL_TAB_FEEL = VEIL_TAB_MOTION.enter;
function veilTabSpring(kind) {
  const feel = VEIL_TAB_MOTION[kind] || VEIL_TAB_MOTION.enter;
  return veilSpring(feel.bounce, feel.duration);
}
function veilMotionOk() {
  const anime = window.anime;
  return !!(anime && anime.animate && anime.spring && !motionOff());
}
function veilClearMotion(el, keepTransition) {
  if (!el || !el.style) return;
  const prev = el.__veilPrev || {};
  el.__veilPrev = null;
  el.style.opacity = prev.opacity || "";
  // A row the pointer is growing keeps its hover scale instead of snapping back to 1.
  el.style.transform = prev.transform || (el._veilScale && el._veilScale !== 1 ? "scale(" + el._veilScale + ")" : "");
  el.style.scale = prev.scale || "";
  el.style.translate = prev.translate || "";
  el.style.removeProperty("--veil-in-x");
  el.style.removeProperty("--veil-in-y");
  el.style.removeProperty("--veil-in-s");
  if (!keepTransition && el.__veilTransition != null) {
    el.style.transition = el.__veilTransition;
    el.__veilTransition = null;
  }
}
const VEIL_KINDS = {
  pop: { opacity: [0, 1], scale: [0.9, 1] },
  rise: { opacity: [0, 1], translateY: [14, 0], scale: [0.97, 1] },
  settle: { opacity: [0, 1], scale: [0.985, 1] },
  drop: { opacity: [0, 1], translateY: [-8, 0], scale: [0.94, 1] },
  lift: { opacity: [0, 1], translateY: [24, 0] },
  side: { opacity: [0, 1], translateX: [18, 0] },
  // List rows: no scale, so a hover grow that starts mid-reveal never fights it.
  row: { opacity: [0, 1], translateY: [12, 0] },
  nudge: { scale: [0.96, 1] }
};
function veilSpringIn(el, kind, opts) {
  if (!el || !el.isConnected || !veilMotionOk()) return null;
  opts = opts || {};
  const now = performance.now();
  if (!opts.force && el.__veilInAt && now - el.__veilInAt < 260) return null;
  el.__veilInAt = now;
  const anime = window.anime;
  if (el._veilIn && el._veilIn.cancel) {
    try { el._veilIn.cancel(); } catch (err) {}
  }
  // Inline transforms written by our own springs (a reveal still running, a hover grow, a FLIP)
  // are not the element's own: remembering or building on them parked panels and rows part-way
  // (Options slid in to 18px and stayed there, then jumped back when the safety net cleared it).
  const motionMade = v => !!v && !/%/.test(v) && /^\s*((translate[XYZ]?|scale[XYZ]?|rotate[XYZ]?)\([^)]*\)\s*)+$/.test(v);
  const ownInline = { transform: motionMade(el.style.transform) || /var\(--veil-in-/.test(el.style.transform) ? "" : el.style.transform, scale: el._veilIn ? "" : el.style.scale, translate: el._veilIn ? "" : el.style.translate };
  if (!el.__veilPrev) el.__veilPrev = { opacity: el.style.opacity === "0" ? "" : el.style.opacity, transform: ownInline.transform, scale: ownInline.scale, translate: ownInline.translate };
  if (el.__veilTransition == null) {
    el.__veilTransition = el.style.transition || "";
    const keep = opts.keep || "";
    el.style.transition = keep || "none";
  }
  const base = VEIL_KINDS[kind] || VEIL_KINDS.pop;
  let spec = Object.assign({}, base);
  // An element positioned with its own transform (translate(-50%,-50%) centring etc.) must not have
  // that transform replaced mid-spring, or it jumps off-centre and snaps back. Those elements get
  // the spring through CSS variables appended after their own transform instead.
  let own = "";
  let ownT = "";
  const liveInline = { transform: el.style.transform, scale: el.style.scale, translate: el.style.translate };
  try {
    // Measure with only the element's own transform in place.
    el.style.transform = el.__veilPrev.transform || "";
    el.style.scale = el.__veilPrev.scale || "";
    el.style.translate = el.__veilPrev.translate || "";
    const cs = getComputedStyle(el);
    if (cs.transform && cs.transform !== "none") { own = "standalone"; ownT = el.__veilPrev.transform || cs.transform; }
    else if ((cs.translate && cs.translate !== "none") || (cs.scale && cs.scale !== "none")) own = "transform";
  } catch (err) {}
  if (own !== "standalone") {
    el.style.transform = liveInline.transform;
    el.style.scale = liveInline.scale;
    el.style.translate = liveInline.translate;
  }
  if (own === "standalone") {
    spec = {};
    if (base.opacity) spec.opacity = base.opacity;
    const x = base.translateX || [0, 0];
    const y = base.translateY || [0, 0];
    const sc = base.scale || [1, 1];
    spec["--veil-in-x"] = x;
    spec["--veil-in-y"] = y;
    spec["--veil-in-s"] = sc;
    el.style.setProperty("--veil-in-x", String(x[0]));
    el.style.setProperty("--veil-in-y", String(y[0]));
    el.style.setProperty("--veil-in-s", String(sc[0]));
    // Append the spring after the element's own transform so it moves and scales around where it
    // already sits (standalone translate/scale would apply before it and pull centred boxes aside).
    el.style.transform = (ownT && ownT !== "none" ? ownT + " " : "") + "translate(calc(var(--veil-in-x) * 1px), calc(var(--veil-in-y) * 1px)) scale(var(--veil-in-s))";
  }
  spec.ease = veilSpring(opts.bounce == null ? VEIL_TAB_FEEL.bounce : opts.bounce, opts.duration || VEIL_TAB_FEEL.duration);
  if (opts.delay) spec.delay = opts.delay;
  let job = null;
  try {
    job = anime.animate(el, spec);
  } catch (err) {
    veilClearMotion(el);
    return null;
  }
  el._veilIn = job;
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    if (el._veilIn !== job) return;
    el._veilIn = null;
    try { if (job && job.cancel) job.cancel(); } catch (err) {}
    veilClearMotion(el);
  };
  if (job && typeof job.then === "function") job.then(end);
  // Springs settle a little after their nominal duration; this is only a safety net.
  setTimeout(end, (opts.duration || VEIL_TAB_FEEL.duration) * 2.5 + (opts.delay || 0) + 400);
  return job;
}
function veilStaggerIn(nodes, kind, opts) {
  if (!veilMotionOk()) return;
  opts = opts || {};
  // Animate every painted node. Cutting the list at max left the tail at full opacity, so
  // the last game card (and anything past the cap) showed up before the staggered entrance.
  const list = Array.prototype.filter.call(nodes || [], el => el && el.getClientRects && el.getClientRects().length);
  const cap = opts.max || 14;
  list.forEach((el, index) => {
    const steps = index < cap ? index : cap - 1;
    veilSpringIn(el, kind, Object.assign({}, opts, { delay: (opts.base || 0) + steps * (opts.step || 32), force: true }));
  });
}
function veilSnapshot(nodes) {
  const map = new Map();
  Array.prototype.forEach.call(nodes || [], el => { if (el && el.getBoundingClientRect) map.set(el, el.getBoundingClientRect()); });
  return map;
}
// FLIP: after a list changed, slide the items that moved from where they were, like tabs do.
function veilFlip(before) {
  if (!before || !veilMotionOk()) return;
  before.forEach((rect, el) => {
    if (!el.isConnected) return;
    const now = el.getBoundingClientRect();
    const dx = rect.left - now.left;
    const dy = rect.top - now.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    if (el._veilFlip && el._veilFlip.cancel) { try { el._veilFlip.cancel(); } catch (err) {} }
    try {
      el._veilFlip = window.anime.animate(el, { translateX: [dx, 0], translateY: [dy, 0], ease: veilTabSpring("slide"), onComplete: () => { el._veilFlip = null; el.style.transform = ""; } });
    } catch (err) {}
  });
}
// Remove an element the way a tab closes: lift it out of flow, fade and shrink, let the rest slide.
function veilTabExit(el, done, siblings) {
  if (!el || !el.isConnected) { if (done) done(); return; }
  if (!veilMotionOk()) { el.remove(); if (done) done(); return; }
  const before = veilSnapshot(siblings || (el.parentNode ? Array.prototype.filter.call(el.parentNode.children, n => n !== el) : []));
  const parent = el.offsetParent || el.parentNode;
  const box = el.getBoundingClientRect();
  const pr = parent && parent.getBoundingClientRect ? parent.getBoundingClientRect() : { left: 0, top: 0 };
  el.style.position = "absolute";
  el.style.left = box.left - pr.left + (parent && parent.scrollLeft || 0) + "px";
  el.style.top = box.top - pr.top + (parent && parent.scrollTop || 0) + "px";
  el.style.width = box.width + "px";
  el.style.height = box.height + "px";
  el.style.margin = "0";
  el.style.pointerEvents = "none";
  try { window.anime.animate(el, { opacity: [1, 0], scale: [1, 0.96], ease: veilTabSpring("exit") }); } catch (err) {}
  veilFlip(before);
  setTimeout(() => { try { el.remove(); } catch (err) {} if (done) done(); }, VEIL_TAB_MOTION.exit.duration + 20);
}
function veilTabSelect(el) {
  if (!el || !veilMotionOk()) return;
  if (el._veilSelect && el._veilSelect.cancel) { try { el._veilSelect.cancel(); } catch (err) {} }
  try { el._veilSelect = window.anime.animate(el, { scale: [0.94, 1], ease: veilTabSpring("select") }); } catch (err) {}
}
window.veilMotion = { tab: VEIL_TAB_MOTION, tabSpring: veilTabSpring, flip: veilFlip, snapshot: veilSnapshot, exit: veilTabExit, select: veilTabSelect, ok: veilMotionOk, spring: veilSpring, in: veilSpringIn, stagger: veilStaggerIn, clear: veilClearMotion, feel: VEIL_TAB_FEEL };
const VEIL_AUTO_ADD = [
  [".modal-overlay > .modal-box, .cookie-overlay > .modal-box, .cookie-overlay > .cookie-box, .signup-overlay > .signup-card, .game-player-overlay > .game-player", "pop"],
  [".chat-card", "drop"],
  [".vos-mu-pop", "drop"],
  [".page-loader-card", "pop"],
  [".sp-pop", "drop"],
  [".engine-error-box", "pop"],
  [".veil-sorry-bar", "drop"],
];
const VEIL_AUTO_ON = [
  [".settings-page.active", "rise", el => el.classList.contains("active")],
  [".vos-startmenu.is-open", "rise", el => el.classList.contains("is-open")],
  [".vos-ctx:not([hidden])", "drop", el => !el.hidden],
  [".vos-store-detail:not([hidden])", "rise", el => !el.hidden],
  [".veil-toast.show", "rise", el => el.classList.contains("show")],
  [".chat-add:not([hidden])", "rise", el => !el.hidden]
];
function veilAutoMotion() {
  if (window.__veilAutoMotion || typeof MutationObserver !== "function") return;
  window.__veilAutoMotion = true;
  const root = document.documentElement;
  const sync = () => { root.classList.toggle("veil-spring", veilMotionOk()); };
  sync();
  try {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.addEventListener) mq.addEventListener("change", sync);
  } catch (err) {}
  ensureAnime().then(sync);
  const inTabs = el => !!(el.closest && el.closest("#tabs, .tabs"));
  const visit = node => {
    if (!node || node.nodeType !== 1 || inTabs(node)) return;
    VEIL_AUTO_ADD.forEach(([sel, kind]) => {
      if (node.matches && node.matches(sel)) veilSpringIn(node, kind);
      if (node.querySelectorAll && node.childElementCount) node.querySelectorAll(sel).forEach(el => veilSpringIn(el, kind));
    });
    VEIL_AUTO_ON.forEach(([sel, kind]) => {
      if (node.matches && node.matches(sel)) veilSpringIn(node, kind);
    });
  };
  const obs = new MutationObserver(list => {
    if (!veilMotionOk()) return;
    for (let i = 0; i < list.length; i++) {
      const rec = list[i];
      if (rec.type === "childList") {
        for (let j = 0; j < rec.addedNodes.length; j++) visit(rec.addedNodes[j]);
        continue;
      }
      const el = rec.target;
      if (!el || inTabs(el)) continue;
      for (let k = 0; k < VEIL_AUTO_ON.length; k++) {
        const [sel, kind, on] = VEIL_AUTO_ON[k];
        const was = rec.oldValue || "";
        if (!el.matches(sel) || !on(el)) continue;
        if (rec.attributeName === "class") {
          const token = sel.split(".").pop().split(/[:\[]/)[0];
          if ((" " + was + " ").indexOf(" " + token + " ") !== -1) continue;
        }
        veilSpringIn(el, kind);
      }
      if (rec.attributeName === "class" && el.classList.contains("panel") && el.classList.contains("open") && !/\bopen\b/.test(rec.oldValue || "")) {
        const body = el.querySelector(".panel-body") || el;
        veilStaggerIn(body.children, "side", { base: 70, step: 28, max: 10 });
      }
      if (rec.attributeName === "class" && el.classList.contains("menu") && el.classList.contains("open") && !/\bopen\b/.test(rec.oldValue || "")) {
        veilStaggerIn(el.querySelectorAll(".menu-item"), "side", { base: 40, step: 18, max: 12, bounce: 0.4, duration: 480 });
      }
    }
  });
  obs.observe(document.body || root, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["class", "hidden"] });
  const pressSel = "button, [role=button], .vos-taskbtn, .vos-startitem";
  const nudgeOwn = ".dash-tile, .quick-link, .dash-ico, .stage-back, .preset, .tab, .new-tab";
  document.addEventListener("pointerdown", event => {
    if (!veilMotionOk() || event.button) return;
    const el = event.target && event.target.closest && event.target.closest(pressSel);
    if (!el || el.disabled || inTabs(el) || el.matches(nudgeOwn) || el.closest(nudgeOwn) || el._veilScale != null || el.closest(".sp-dock, .sp-lyric-frame, .sp-pop, .sp-song, .sp-topwrap")) return;
    if (el.offsetWidth > 360 || el.offsetHeight > 220) return;
    try {
      if (el._veilPress && el._veilPress.cancel) el._veilPress.cancel();
      el._veilPress = window.anime.animate(el, { "--veil-press": 0.95, ease: veilSpring(0.2, 220) });
    } catch (err) {}
    const release = () => {
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
      try {
        if (el._veilPress && el._veilPress.cancel) el._veilPress.cancel();
        el._veilPress = window.anime.animate(el, { "--veil-press": 1, ease: veilSpring(0.58, 620) });
      } catch (err) {}
    };
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
  }, { passive: true, capture: true });
}
if (document.body) veilAutoMotion();
else document.addEventListener("DOMContentLoaded", veilAutoMotion);
function playDashIntro() {
  if (dashIntroPlayed || motionOff()) {
    dashIntroPlayed = true;
    return;
  }
  const run = anime => {
    if (!anime || !anime.animate || dashIntroPlayed) return;
    dashIntroPlayed = true;
    try {
      anime.animate(".dash-tile", {
        opacity: [0, 1],
        scale: [0.9, 1],
        delay: anime.stagger(36),
        ease: anime.spring ? anime.spring({ bounce: 0.46, duration: 560 }) : "outCubic"
      });
      setTimeout(() => {
        document.querySelectorAll(".dash-tile").forEach(el => {
          el.style.opacity = "";
          el.style.transform = "";
          el.style.scale = "";
          el.style.translate = "";
        });
      }, 1100);
    } catch (err) {}
  };
  if (window.anime) run(window.anime);
  else ensureAnime().then(run);
}
if (!window.__veilNudge) {
  window.__veilNudge = true;
  const nudgeSel = ".dash-tile, .quick-link, .dash-ico, .stage-back, .preset";
  const springTo = (el, scale) => {
    const anime = window.anime;
    if (!el || el.disabled || motionOff() || !anime || !anime.animate || !anime.spring) return;
    try {
      anime.animate(el, {
        scale: scale,
        ease: anime.spring({ bounce: 0.32, duration: 460 })
      });
    } catch (err) {}
  };
  document.addEventListener("pointerover", event => {
    const el = event.target.closest(nudgeSel);
    if (!el || el.contains(event.relatedTarget)) return;
    springTo(el, 1.018);
  }, { passive: true });
  document.addEventListener("pointerout", event => {
    const el = event.target.closest(nudgeSel);
    if (!el || el.contains(event.relatedTarget)) return;
    springTo(el, 1);
  }, { passive: true });
  document.addEventListener("pointerdown", event => {
    const el = event.target.closest(nudgeSel);
    if (!el) return;
    springTo(el, 0.985);
  }, { passive: true });
  document.addEventListener("pointerup", event => {
    const el = event.target.closest(nudgeSel);
    if (!el) return;
    springTo(el, el.matches(":hover") ? 1.018 : 1);
  }, { passive: true });
}
function setVeilView(view) {
  document.body.dataset.veilView = view;
  const browser = document.getElementById("browser");
  const dash = document.getElementById("veilDash");
  const stage = document.getElementById("veilStage");
  if (browser && !document.body.classList.contains("veil-os")) browser.style.display = view === "browser" ? "flex" : "none";
  if (dash) dash.style.display = view === "dash" ? "flex" : "none";
  if (stage) stage.style.display = view === "entertainment" || view === "chat" || view === "admin" ? "flex" : "none";
  const wall = document.getElementById("dashWall");
  if (view === "dash") {
    try { paintDashStatus(); } catch (err) {}
    try { startWelcomeClock(); } catch (err) {}
    try {
      if (wall && !resumeHomeFx(wall)) {
        applyNewTabBackground();
        setupHomeFx(wall);
      }
    } catch (err) {}
    try {
      if (wall) wall.querySelectorAll("video").forEach(video => video.play().catch(() => {}));
    } catch (err) {}
    try { playDashIntro(); } catch (err) {}
  } else if (wall) {
    try { pauseHomeFx(wall); } catch (err) {}
    try { wall.querySelectorAll("video").forEach(video => video.pause()); } catch (err) {}
  }
  if (view !== "entertainment") {
    try {
      const stage = document.getElementById("veilStage");
      if (stage) stage.querySelectorAll("video").forEach(video => video.pause());
    } catch (err) {}
    try { if (window.__veilCloseVideo) window.__veilCloseVideo(true); } catch (err) {}
  }
  try { if (window.__veilSyncDock) window.__veilSyncDock(); } catch (err) {}
}
function quietSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;
  panel.style.transition = "none";
  panel.style.visibility = "hidden";
  panel.style.opacity = "";
  panel.style.transform = "";
  panel.style.scale = "";
  panel.classList.remove("open", "is-options", "is-browser-scope", "is-page");
}
function showDash() {
  const view = document.body.dataset.veilView || "";
  const cover = view === "browser" ? document.getElementById("browser")
    : view === "entertainment" || view === "chat" || view === "admin" ? document.getElementById("veilStage")
    : view === "options" ? document.getElementById("settingsPanel")
    : null;
  const go = () => {
    const stage = document.getElementById("veilStage");
    const browser = document.getElementById("browser");
    [stage, browser, cover].forEach(el => {
      if (!el) return;
      el.style.opacity = "";
      el.style.scale = "";
      el.style.transform = "";
      el.style.zIndex = "";
      el.style.position = "";
      el.style.inset = "";
    });
    try { closeMenu(); } catch (err) {}
    try { closeHistory(); } catch (err) {}
    quietSettingsPanel();
    document.querySelectorAll(".panel").forEach(value => value.classList.remove("open", "is-options", "is-browser-scope", "is-page"));
    const backdrop = document.getElementById("backdrop");
    if (backdrop) backdrop.classList.remove("open");
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel) {
      const title = settingsPanel.querySelector(".panel-head > span");
      if (title) title.textContent = "Options";
    }
    const dash = document.getElementById("veilDash");
    if (dash) dash.style.opacity = "";
    setVeilView("dash");
  };
  if (!cover || motionOff() || showDash.busy) {
    go();
    return;
  }
  showDash.busy = true;
  const dash = document.getElementById("veilDash");
  if (dash) {
    dash.style.display = "flex";
    dash.style.opacity = "0";
  }
  if (view === "browser") {
    cover.style.position = "fixed";
    cover.style.inset = "0";
    cover.style.zIndex = "40";
  }
  const anime = window.anime;
  if (anime && anime.animate) {
    try {
      anime.animate(cover, { opacity: [1, 0], duration: 280, ease: "outCubic" });
      if (dash) anime.animate(dash, { opacity: [0, 1], duration: 280, ease: "outCubic" });
    } catch (err) {}
  }
  setTimeout(() => {
    showDash.busy = false;
    go();
  }, 300);
}
function showBrowser() {
  setVeilView("browser");
  try { renderChrome(); } catch (err) {}
  requestAnimationFrame(() => {
    try {
      applyNewTabBackground();
      document.querySelectorAll(".page").forEach(page => {
        if (page.querySelector(".newtab-page")) {
          fitHomeScale(page);
          setupHomeFx(page, { browser: true });
        }
      });
    } catch (err) {}
  });
  fadeIn(document.getElementById("browser"));
}
function showEntPane(name) {
  const body = document.getElementById("stageBody");
  if (!body) return;
  const panes = Array.from(body.querySelectorAll(".ent-pane"));
  const next = body.querySelector('.ent-pane[data-pane="' + name + '"]');
  const prev = body.querySelector(".ent-pane.on");
  const order = ["games", "music", "drawing", "more"];
  const dir = order.indexOf(name) >= order.indexOf(prev && prev.getAttribute("data-pane")) ? 1 : -1;
  panes.forEach(pane => {
    const on = pane === next;
    pane.classList.toggle("on", on);
    if (!on && pane !== prev) {
      if (pane._veilPane && pane._veilPane.cancel) { try { pane._veilPane.cancel(); } catch (err) {} }
      pane._veilPane = null;
      pane.style.opacity = "";
      pane.style.transform = "";
      pane.style.translate = "";
      pane.style.visibility = "";
      pane.style.pointerEvents = "";
    }
  });
  const sw = document.getElementById("stageSwitch");
  if (sw) {
    sw.querySelectorAll("[data-ent]").forEach(btn => {
      btn.classList.toggle("on", btn.getAttribute("data-ent") === name);
    });
  }
  const anime = window.anime;
  const first = !showEntPane.seen;
  showEntPane.seen = true;
  if (!first && prev && next && prev !== next && anime && anime.animate && !motionOff()) {
    prev.classList.remove("on");
    next.classList.add("on");
    // Same pattern as switching browser tabs: the old pane leaves with the tab-close spring, the new
    // one arrives with the tab-open spring, and any switch still in flight is stopped first.
    [prev, next].forEach(pane => {
      if (pane._veilPane && pane._veilPane.cancel) { try { pane._veilPane.cancel(); } catch (err) {} }
      pane._veilPane = null;
    });
    clearTimeout(showEntPane.timer);
    prev.style.visibility = "visible";
    prev.style.pointerEvents = "none";
    next.style.visibility = "visible";
    try {
      prev._veilPane = anime.animate(prev, {
        opacity: [1, 0],
        translateX: [0, dir * -28],
        scale: [1, 0.96],
        ease: veilTabSpring("exit")
      });
      next._veilPane = anime.animate(next, {
        opacity: [0, 1],
        translateX: [dir * 42, 0],
        scale: [0.97, 1],
        ease: veilTabSpring("enter")
      });
    } catch (err) {}
    const btn = sw && sw.querySelector('[data-ent="' + name + '"]');
    if (btn) veilTabSelect(btn);
    showEntPane.timer = setTimeout(() => {
      [prev, next].forEach(pane => {
        if (pane._veilPane && pane._veilPane.cancel) { try { pane._veilPane.cancel(); } catch (err) {} }
        pane._veilPane = null;
        pane.style.opacity = "";
        pane.style.transform = "";
        pane.style.translate = "";
        pane.style.visibility = "";
        pane.style.pointerEvents = "";
      });
    }, VEIL_TAB_MOTION.enter.duration * 3);
  }
  if (name === "music" && next) mountEntMusic(next);
  if (name === "drawing" && next) mountEntDrawing(next);
  else if (name !== "music") {
    try { if (window.__veilCloseVideo) window.__veilCloseVideo(true); } catch (err) {}
  }
  try { if (window.__veilSyncDock) window.__veilSyncDock(); } catch (err) {}
  requestAnimationFrame(() => moveStagePill(name, !first));
}
function moveSettingsPill(animate) {
  const tabs = document.getElementById("settingsTabs");
  const pill = document.getElementById("settingsPill");
  if (!tabs || !pill) return;
  const btn = tabs.querySelector(".settings-tab.active");
  if (!btn || btn.offsetWidth < 2) return;
  const left = btn.getBoundingClientRect().left - tabs.getBoundingClientRect().left;
  const width = btn.getBoundingClientRect().width;
  const anime = window.anime;
  if (!animate || motionOff() || !anime || !anime.animate || !anime.spring) {
    pill.style.left = left + "px";
    pill.style.width = width + "px";
    return;
  }
  try {
    anime.animate(pill, {
      left: left,
      width: width,
      ease: anime.spring({ bounce: 0.32, duration: 480 })
    });
  } catch (err) {
    pill.style.left = left + "px";
    pill.style.width = width + "px";
  }
}
// Play / pause icon that morphs between the two shapes (anime.js v4 svg.morphTo). Both shapes are
// two four-point quads in the same order (the triangle is split down the middle), so the morph
// slides corners instead of resampling and stays crisp.
const VEIL_PP = {
  play: "M7.4 4.9 L12.9 8.3 L12.9 15.7 L7.4 19.1 Z M12.9 8.3 L18.8 12 L18.8 12 L12.9 15.7 Z",
  pause: "M6.4 5 L10.1 5 L10.1 19 L6.4 19 Z M13.9 5 L17.6 5 L17.6 19 L13.9 19 Z"
};
function veilPPIcon(playing) {
  return '<svg class="veil-pp" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + (playing ? VEIL_PP.pause : VEIL_PP.play) + '"></path></svg>';
}
function veilPPRef(kind) {
  let box = document.getElementById("veilPPRefs");
  if (!box) {
    box = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    box.id = "veilPPRefs";
    box.setAttribute("width", "0");
    box.setAttribute("height", "0");
    box.setAttribute("aria-hidden", "true");
    box.style.position = "absolute";
    box.style.pointerEvents = "none";
    box.innerHTML = '<path data-k="play" d="' + VEIL_PP.play + '"></path><path data-k="pause" d="' + VEIL_PP.pause + '"></path>';
    document.body.appendChild(box);
  }
  return box.querySelector('[data-k="' + kind + '"]');
}
// Play/pause morph. Both shapes are the same 8 points, so the morph is a straight per-point blend
// driven by one anime.js spring (0 -> 1, overshooting a touch for the jiggle). Every frame writes
// the real "d" attribute and the end state is always written exactly, so the icon can never be
// left on the wrong shape (round 5 used svg.morphTo, which left some browsers stuck on pause).
const VEIL_PP_NUM = {
  play: VEIL_PP.play.match(/-?[\d.]+/g).map(Number),
  pause: VEIL_PP.pause.match(/-?[\d.]+/g).map(Number)
};
function veilPPPath(nums) {
  let i = 0;
  return VEIL_PP.play.replace(/-?[\d.]+/g, () => (Math.round(nums[i++] * 1000) / 1000).toString());
}
function veilPPSet(btn, playing) {
  if (!btn) return;
  const want = playing ? "1" : "0";
  let svg = btn.querySelector("svg.veil-pp");
  if (!svg) {
    btn.innerHTML = veilPPIcon(playing);
    btn.dataset.pp = want;
    return;
  }
  const path = svg.querySelector("path");
  const target = playing ? VEIL_PP.pause : VEIL_PP.play;
  if (btn.dataset.pp === want && (path._veilMorph || path.getAttribute("d") === target)) return;
  btn.dataset.pp = want;
  const anime = window.anime;
  if (path._veilMorph && path._veilMorph.cancel) { try { path._veilMorph.cancel(); } catch (err) {} }
  path._veilMorph = null;
  if (motionOff() || !anime || !anime.animate) {
    path.setAttribute("d", target);
    return;
  }
  const from = (path.getAttribute("d") || "").match(/-?[\d.]+/g);
  const start = from && from.length === VEIL_PP_NUM.play.length ? from.map(Number) : (playing ? VEIL_PP_NUM.play : VEIL_PP_NUM.pause);
  const end = playing ? VEIL_PP_NUM.pause : VEIL_PP_NUM.play;
  const proxy = { t: 0 };
  try {
    const job = anime.animate(proxy, {
      t: 1,
      ease: veilSpring(0.34, 560),
      onUpdate: () => { path.setAttribute("d", veilPPPath(start.map((v, i) => v + (end[i] - v) * proxy.t))); },
      onComplete: () => { if (path._veilMorph === job) path._veilMorph = null; path.setAttribute("d", target); }
    });
    path._veilMorph = job;
    anime.animate(svg, { scale: [0.8, 1], rotate: [playing ? -90 : 90, 0], ease: veilSpring(0.46, 640) });
    setTimeout(() => { if (btn.dataset.pp === want && path._veilMorph === job) { path._veilMorph = null; path.setAttribute("d", target); } }, 1200);
  } catch (err) {
    path.setAttribute("d", target);
  }
}
window.veilPPSet = veilPPSet;
function syncRangeKnob(input, animate) {
  if (!input) return;
  const track = input.closest(".range-track");
  const knob = track && track.querySelector(".range-knob");
  if (!knob) return;
  const min = Number(input.min);
  const max = Number(input.max);
  const span = (Number.isFinite(max) ? max : 100) - (Number.isFinite(min) ? min : 0) || 1;
  const pct = ((Number(input.value) || 0) - (Number.isFinite(min) ? min : 0)) / span;
  const target = Math.max(0, Math.min(1, pct));
  if (track.classList.contains("range-smooth")) {
    // Player seek/volume: no spring at all. The knob and the fill both read --range-p, which follows
    // the pointer directly while dragging and eases briefly (CSS) for playback ticks and clicks.
    track.style.setProperty("--range-p", target.toFixed(4));
    return;
  }
  // The knob centre travels the same path as the native thumb (half a knob in from each end), the
  // spring is clamped to 0..1 so its bounce cannot carry it past an end, and the squash grows away
  // from the nearest end so the bigger frames of the jiggle stay inside the track too.
  const size = knob.offsetWidth || 18;
  const place = value => {
    const v = Math.max(0, Math.min(1, value));
    knob._veilPct = v;
    knob.style.left = "calc((100% - " + size + "px) * " + v.toFixed(4) + " + " + (size / 2) + "px)";
    knob.style.transformOrigin = (v * 100).toFixed(1) + "% 50%";
  };
  if (knob._veilKnob && knob._veilKnob.cancel) {
    try { knob._veilKnob.cancel(); } catch (err) {}
    knob._veilKnob = null;
  }
  const anime = window.anime;
  if (!animate || motionOff() || !anime || !anime.animate) {
    place(target);
    knob.style.transform = "translateY(-50%)";
    return;
  }
  try {
    const from = typeof knob._veilPct === "number" ? knob._veilPct : target;
    const state = { p: from };
    place(from);
    const move = anime.animate(state, {
      p: target,
      ease: veilSpring(0.62, 700),
      onUpdate: () => place(state.p)
    });
    const squash = anime.animate(knob, {
      translateY: "-50%",
      scale: [1.28, 0.9, 1.12, 1],
      ease: veilSpring(0.62, 700)
    });
    knob._veilKnob = { cancel() { try { move.cancel(); } catch (err) {} try { squash.cancel(); } catch (err) {} } };
  } catch (err) {
    place(target);
    knob.style.transform = "translateY(-50%)";
  }
}
function dressRangeInput(input) {
  if (!input) return;
  if (!input.closest(".range-track")) {
    const track = document.createElement("span");
    track.className = "range-track";
    if (input.classList.contains("sp-vol")) track.classList.add("sp-vol-track");
    if (input.classList.contains("sp-dock-vol")) {
      track.classList.add("sp-dock-vol");
      input.classList.remove("sp-dock-vol");
    }
    input.parentNode.insertBefore(track, input);
    track.appendChild(input);
    const knob = document.createElement("i");
    knob.className = "range-knob";
    track.appendChild(knob);
    // Every slider (Options too) is smooth like the player's: no spring, the knob tracks the
    // pointer directly and reaches both ends.
    {
      track.classList.add("range-smooth");
      const fill = document.createElement("i");
      fill.className = "range-fill";
      track.insertBefore(fill, input);
      const stop = () => {
        input.__veilDrag = false;
        track.classList.remove("is-drag");
        window.removeEventListener("pointerup", stop, true);
        window.removeEventListener("pointercancel", stop, true);
      };
      track.addEventListener("pointerdown", () => {
        input.__veilDrag = true;
        track.classList.add("is-drag");
        window.addEventListener("pointerup", stop, true);
        window.addEventListener("pointercancel", stop, true);
      });
    }
    if (!input.__veilRange) {
      input.__veilRange = true;
      input.addEventListener("input", () => syncRangeKnob(input, true));
    }
  }
  syncRangeKnob(input, false);
}
function dressRanges() {
  document.querySelectorAll("#settingsPanel input[type=range]").forEach(dressRangeInput);
}
try { dressRanges(); } catch (err) {}
function installVeilScrolls() {
  if (installVeilScrolls.ready || !document.body) return;
  installVeilScrolls.ready = true;
  const bars = new Map();
  function geom(el) {
    if (!el || !el.getBoundingClientRect || !el.isConnected) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return null;
    const maxY = el.scrollHeight - el.clientHeight;
    const maxX = el.scrollWidth - el.clientWidth;
    const vertical = maxY >= maxX;
    const max = vertical ? maxY : maxX;
    if (max < 12) return null;
    const track = Math.max(48, (vertical ? rect.height : rect.width) - 12);
    const thumb = Math.max(28, Math.min(56, Math.round(track * 0.22)));
    const travel = Math.max(1, track - thumb);
    const pos = ((vertical ? el.scrollTop : el.scrollLeft) / max) * travel;
    return { rect: rect, vertical: vertical, track: track, travel: travel, pos: pos, max: max, thumb: thumb };
  }
  function prune() {
    if (bars.size < 24) return;
    bars.forEach((bar, node) => {
      if (!node.isConnected || !bar.classList.contains("is-on")) {
        bar.remove();
        bars.delete(node);
      }
    });
  }
  function barFor(el) {
    let bar = bars.get(el);
    if (bar) return bar;
    prune();
    bar = document.createElement("div");
    bar.className = "veil-scroll";
    bar.innerHTML = '<i class="veil-scroll-track"></i><i class="veil-scroll-knob"></i>';
    bar._host = el;
    document.body.appendChild(bar);
    bars.set(el, bar);
    let drag = null;
    bar.addEventListener("pointerdown", event => {
      const host = bar._host;
      const g = geom(host);
      if (!host || !g) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { x: event.clientX, y: event.clientY, scroll: g.vertical ? host.scrollTop : host.scrollLeft, max: g.max, travel: g.travel, vertical: g.vertical };
      bar._drag = drag;
      try { bar.setPointerCapture(event.pointerId); } catch (err) {}
    });
    bar.addEventListener("pointermove", event => {
      const host = bar._host;
      if (!drag || !host) return;
      host.__veilQuiet = 1;
      const delta = drag.vertical ? event.clientY - drag.y : event.clientX - drag.x;
      const next = drag.scroll + (delta / drag.travel) * drag.max;
      if (drag.vertical) host.scrollTop = next;
      else host.scrollLeft = next;
      clearTimeout(host.__veilQuietTimer);
      host.__veilQuietTimer = setTimeout(() => { host.__veilQuiet = 0; }, 80);
      place(host, false);
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      bar._drag = null;
      if (bar._host) place(bar._host, true);
    };
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);
    return bar;
  }
  function place(el, settle) {
    if (!el || (el.closest && el.closest(".tabs"))) return;
    const g = geom(el);
    const bar = g ? barFor(el) : bars.get(el);
    if (!bar) return;
    if (!g || g.rect.bottom < 0 || g.rect.top > window.innerHeight) {
      bar.classList.remove("is-on");
      return;
    }
    const knob = bar.querySelector(".veil-scroll-knob");
    bar.classList.toggle("is-x", !g.vertical);
    bar.classList.add("is-on");
    if (knob._veilMotion && knob._veilMotion.cancel) {
      try { knob._veilMotion.cancel(); } catch (err) {}
      knob._veilMotion = null;
    }
    knob.style.transform = "none";
    if (g.vertical) {
      bar.style.left = Math.max(0, g.rect.right - 14) + "px";
      bar.style.top = (g.rect.top + 6) + "px";
      bar.style.width = "14px";
      bar.style.height = g.track + "px";
      knob.style.width = "4px";
      knob.style.height = g.thumb + "px";
      knob.style.left = "5px";
      knob.style.right = "auto";
      knob.style.top = g.pos + "px";
    } else {
      bar.style.top = Math.max(0, g.rect.bottom - 14) + "px";
      bar.style.left = (g.rect.left + 6) + "px";
      bar.style.height = "14px";
      bar.style.width = g.track + "px";
      knob.style.height = "4px";
      knob.style.width = g.thumb + "px";
      knob.style.top = "5px";
      knob.style.left = g.pos + "px";
    }
    clearTimeout(bar._hide);
    bar._hide = setTimeout(() => { if (!bar._drag) bar.classList.remove("is-on"); }, 800);
    if (!settle || motionOff() || !window.anime || !window.anime.animate) return;
    try {
      const vel = bar._vel || 0;
      // A small, quickly damped settle: a few px of follow-through and one soft rebound.
      let kick = Math.max(-8, Math.min(8, vel * 0.25));
      if (Math.abs(kick) < 4.5) kick = vel < 0 ? -4.5 : 4.5;
      if (knob._veilMotion && knob._veilMotion.cancel) { try { knob._veilMotion.cancel(); } catch (err) {} }
      // Ease out to the follow-through instead of jumping there (that jump was the "snap"), then
      // spring back with one soft rebound.
      const prop = g.vertical ? "translateY" : "translateX";
      const out = { duration: 170, ease: "inOutSine" };
      out[prop] = [0, kick];
      out.onComplete = () => {
        const back = { ease: veilSpring(0.4, 640) };
        back[prop] = 0;
        knob._veilMotion = window.anime.animate(knob, back);
      };
      knob._veilMotion = window.anime.animate(knob, out);
    } catch (err) {}
  }
  function follow(el) {
    if (!el || el.__veilQuiet) return;
    if (el.closest && el.closest(".tabs")) return;
    const bar = bars.get(el);
    const before = bar ? bar._pos || 0 : 0;
    place(el, false);
    const g = geom(el);
    const live = bars.get(el);
    if (g && live) {
      live._vel = g.pos - before;
      live._pos = g.pos;
    }
    clearTimeout(el.__veilSettle);
    el.__veilSettle = setTimeout(() => { if (el.isConnected) place(el, true); }, 90);
  }
  document.addEventListener("scroll", event => {
    const el = event.target;
    if (!el || el.nodeType !== 1) return;
    if (el.classList && el.classList.contains("veil-scroll")) return;
    follow(el);
  }, true);
}
try { installVeilScrolls(); } catch (err) {}
function moveStagePill(name, animate) {
  const sw = document.getElementById("stageSwitch");
  const pill = document.getElementById("stagePill");
  if (!sw || !pill || sw.hidden) return;
  const btn = sw.querySelector('[data-ent="' + name + '"]');
  if (!btn) return;
  const left = btn.offsetLeft;
  const width = btn.offsetWidth;
  const anime = window.anime;
  if (!animate || !width || motionOff() || !anime || !anime.animate || !anime.spring) {
    pill.style.left = left + "px";
    pill.style.width = width + "px";
    return;
  }
  try {
    anime.animate(pill, {
      left: left,
      width: width,
      ease: anime.spring({ bounce: 0.32, duration: 560 })
    });
  } catch (err) {
    pill.style.left = left + "px";
    pill.style.width = width + "px";
  }
}
function playStageIntro(root, selector) {
  if (!root || motionOff()) return;
  ensureAnime().then(anime => {
    if (!anime || !anime.animate || !root.isConnected) return;
    const nodes = root.querySelectorAll(selector);
    if (!nodes.length) return;
    try {
      const job = anime.animate(nodes, {
        opacity: [0, 1],
        delay: anime.stagger(42),
        duration: 380,
        ease: "outCubic"
      });
      const clear = () => {
        nodes.forEach(el => {
          el.style.opacity = "";
          el.style.transform = "";
          el.style.scale = "";
          el.style.translate = "";
        });
      };
      if (job && job.then) job.then(clear);
      setTimeout(clear, 800);
    } catch (err) {}
  });
}
function confirmDevArea(next) {
  const old = document.querySelector(".veil-devgate");
  if (old) old.remove();
  const nodes = document.createElement("div");
  nodes.className = "modal-overlay veil-devgate";
  nodes.innerHTML = "<div class=\"modal-box\" role=\"dialog\" aria-modal=\"true\"><h2>Veil</h2><p>This part of Veil is still under development, so bugs may occur. Continue?</p><div class=\"modal-actions\"><button type=\"button\" class=\"modal-cancel\" data-dev-return>Return</button><button type=\"button\" class=\"primary-btn\" data-dev-go>Continue</button></div></div>";
  document.body.appendChild(nodes);
  if (window.anime && window.anime.animate && !motionOff()) {
    try { window.anime.animate(nodes, { opacity: [0, 1], duration: 180, ease: "outCubic" }); } catch (err) {}
  }
  nodes.querySelector("[data-dev-return]").onclick = () => {
    nodes.remove();
    showDash();
  };
  nodes.querySelector("[data-dev-go]").onclick = () => {
    nodes.remove();
    next();
  };
}
function ensureVeilMusic() {
  if (window.VeilMusic) return Promise.resolve(window.VeilMusic);
  if (ensureVeilMusic.job) return ensureVeilMusic.job;
  ensureVeilMusic.job = new Promise(resolve => {
    let tries = 0;
    const done = () => {
      if (window.VeilMusic) {
        resolve(window.VeilMusic);
        return;
      }
      if (++tries > 160) {
        resolve(null);
        return;
      }
      setTimeout(done, 50);
    };
    if (!document.querySelector('script[src*="veilos.js"]')) {
      const script = document.createElement("script");
      script.src = BASE + "/veilos.js?v=103";
      script.onload = done;
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
      return;
    }
    done();
  });
  return ensureVeilMusic.job;
}
// Drawing tab: kreska.art's app, loaded through the Veil proxy (Scramjet) exactly like a browser
// tab, mounted the first time the tab is opened and kept alive afterwards so a drawing in
// progress survives switching tabs.
const VEIL_DRAW_URL = "https://kreska.art/app/";
function mountEntDrawing(pane) {
  const root = pane.querySelector("[data-draw]");
  if (!root || root.dataset.ready === "1") return;
  root.dataset.ready = "1";
  root.innerHTML = '<div class="ent-draw-frame" data-draw-frame></div><div class="ent-draw-wait" data-draw-wait><span class="sp-loader-dots"><i></i><i></i><i></i></span><b>Opening Kreska…</b><small>Loading through the Veil proxy</small></div>';
  const wait = root.querySelector("[data-draw-wait]");
  const anime = window.anime;
  let loop = null;
  if (!motionOff() && anime && anime.animate) {
    try {
      loop = anime.animate(wait.querySelectorAll(".sp-loader-dots i"), {
        translateY: [{ to: -9, duration: 300, ease: "outQuad" }, { to: 0, duration: 620, ease: veilSoftJiggle }],
        scaleY: [{ to: 1.12, duration: 300, ease: "outQuad" }, { to: 1, duration: 620, ease: veilSoftJiggle }],
        delay: anime.stagger ? anime.stagger(120) : 0,
        loop: true,
        loopDelay: 140
      });
      anime.animate(wait, { opacity: [0, 1], scale: [0.92, 1], ease: veilSpring(0.45, 620) });
    } catch (err) {}
  }
  const reveal = () => {
    if (!wait.isConnected || wait._gone) return;
    wait._gone = true;
    const done = () => { try { if (loop && loop.cancel) loop.cancel(); } catch (err) {} wait.remove(); };
    if (motionOff() || !anime || !anime.animate) { done(); return; }
    try {
      anime.animate(wait, { opacity: [1, 0], scale: [1, 1.06], duration: 320, ease: "outQuad", onComplete: done });
      const frameEl = root.querySelector("iframe");
      if (frameEl) anime.animate(frameEl, { opacity: [0, 1], scale: [0.97, 1], ease: veilSpring(0.4, 720) });
    } catch (err) { done(); }
  };
  openProxyFrame(root.querySelector("[data-draw-frame]"), VEIL_DRAW_URL).then(frame => {
    const el = root.querySelector("iframe");
    if (!frame || !el) {
      const msg = wait.querySelector("b");
      if (msg) msg.textContent = "Couldn't open Kreska.";
      root.dataset.ready = "";
      return;
    }
    el.addEventListener("load", () => setTimeout(reveal, 250));
    setTimeout(reveal, 12000);
  }).catch(err => {
    const msg = wait.querySelector("b");
    if (msg) msg.textContent = "Couldn't open Kreska: " + (err && err.message || err);
    root.dataset.ready = "";
  });
}
function mountEntMusic(pane) {
  if (!pane || pane.dataset.music === "1") return;
  pane.dataset.music = "1";
  pane.innerHTML = '<div class="sp"><div class="sp-main"><div class="sp-loading">Loading music…</div></div></div>';
  ensureVeilMusic().then(api => {
    if (!api || !pane.isConnected) {
      pane.innerHTML = '<div class="ent-empty"><strong>Music</strong><span>Could not load the player.</span></div>';
      pane.dataset.music = "";
      return;
    }
    try { api.boot(); } catch (err) {}
    buildEntMusic(pane, api);
  });
}
function buildEntMusic(pane, api) {
  const ui = { page: "home", albumId: "", folderId: "", artist: "", open: (() => { try { const saved = JSON.parse(localStorage.getItem("veil_music_folds") || "{}"); return saved && typeof saved === "object" ? saved : {}; } catch (err) { return {}; } })(), folding: {}, query: "", cover: "", animFold: "", foldDir: "", foldAt: {}, lines: [], line: -1, lyricFor: "", videoWasPlaying: false, explicit: {} };
  function iconCss(file) {
    return encodeURI(IMG + file).replace(/\(/g, "%28").replace(/\)/g, "%29");
  }
  function ico(file, cls) {
    return '<span class="sp-ico' + (cls ? " " + cls : "") + '" style="--ico:url(' + iconCss(file) + ')"></span>';
  }
  pane.innerHTML = '<div class="sp"><aside class="sp-side" data-side></aside><section class="sp-main" data-main></section><aside class="sp-now"><div class="sp-now-art is-empty"><img data-now-art alt="" hidden><span class="sp-now-empty" aria-hidden="true">' + ico("music_default.svg") + '<small>Nothing playing</small></span></div><div class="sp-now-meta"><b data-now-title>Nothing playing</b><button type="button" class="sp-artist" data-now-by data-artist></button></div><div class="sp-label">Queue</div><div class="sp-queue" data-queue></div></aside><footer class="sp-bar"><div class="sp-who"><span class="sp-art sp-ph">' + ico("music_default.svg") + '</span><div class="sp-who-text"><b data-title>Nothing playing</b><button type="button" class="sp-artist" data-by data-artist></button></div><div class="sp-who-acts"><button type="button" class="sp-ghost" data-bar-like aria-label="Like">' + ico("heart.svg") + '</button><button type="button" class="sp-ghost" data-bar-add aria-label="Add to album">' + ico("plus.svg") + '</button></div></div><div class="sp-transport"><div class="sp-btns"><div class="sp-acts-left"><button type="button" data-prev aria-label="Previous">' + ico("skip-back.svg") + '</button></div><button type="button" class="play" data-toggle aria-label="Play">' + veilPPIcon(false) + '</button><div class="sp-acts-right"><button type="button" data-next aria-label="Next">' + ico("skip-next.svg") + '</button></div></div><div class="sp-seek"><span data-cur>0:00</span><input data-seek type="range" min="0" max="1000" value="0" aria-label="Position"><span data-dur>0:00</span></div></div><div class="sp-extra"><button type="button" class="sp-ghost" data-lyrics-toggle aria-label="Lyrics">' + ico("lyrics.svg") + '</button><input class="sp-vol" data-vol type="range" min="0" max="100" value="100" aria-label="Volume"></div></footer></div>';
  const root = pane.querySelector(".sp");
  const side = root.querySelector("[data-side]");
  const main = root.querySelector("[data-main]");
  const videoPanel = root.querySelector("[data-video-panel]");
  if (videoPanel) {
    document.querySelectorAll("body > .sp-video").forEach(el => {
      if (el !== videoPanel) el.remove();
    });
    document.body.appendChild(videoPanel);
  }
  let lyricFrame = document.getElementById("spLyricFrame");
  if (!lyricFrame) {
    lyricFrame = document.createElement("div");
    lyricFrame.id = "spLyricFrame";
    lyricFrame.className = "sp-lyric-frame";
    lyricFrame.hidden = true;
    document.body.appendChild(lyricFrame);
  }
  lyricFrame.innerHTML = '<div class="sp-lyric-bg" data-lyric-bg></div><div class="sp-lyric-scrim"></div><button type="button" class="sp-x" data-lyric-close aria-label="Close">' + ico("exit.svg") + '</button><div class="sp-lyrics" data-lyrics><div class="sp-lyric-empty">Lyrics show up when a song is playing.</div></div><div class="sp-lyric-credit">Provided by Musixmatch</div>';
  const lyricBox = () => lyricFrame.querySelector("[data-lyrics]");
  const lib = () => api.lib() || { playlists: [], folders: [], liked: [] };
  const albumOf = id => (lib().playlists || []).find(item => item.id === id) || null;
  const folderOf = id => (lib().folders || []).find(item => item.id === id) || null;
  const art = (src, big) => {
    const url = prettySrc(src, !!big);
    if (!url) return '<span class="sp-art sp-ph" aria-hidden="true">' + ico("music_default.svg") + "</span>";
    const fallback = big ? prettySrc(src, false) : "";
    return '<img class="sp-art" draggable="false" src="' + escapeHTML(url) + '" alt=""' + (fallback && fallback !== url ? ' data-fb="' + escapeHTML(fallback) + '"' : "") + ">";
  };
  const spring = (el, from, to, bounce, duration) => {
    const anime = window.anime;
    if (!el || motionOff() || !anime || !anime.animate) return;
    try { anime.animate(el, { scale: [from, to], ease: veilSpring(bounce == null ? 0.16 : bounce, duration || 640) }); } catch (err) {}
  };
  // Everything currently grown by a hover; hoverSync() shrinks any of them the pointer has left
  // without a pointerout (re-render under the pointer, scroll, leaving the window).
  const grown = new Set();
  function glide(el, scale, soft) {
    const anime = window.anime;
    if (!el || motionOff() || !anime || !anime.animate) return;
    // One interruptible spring: stop the running one where it is (no revert, which snapped the
    // card back to 1 first and made press-and-hold then release glitch) and start the next from
    // the scale actually on screen.
    const live = (() => {
      const m = /scale\(\s*([\d.]+)/.exec(el.style.transform || "");
      return m ? Number(m[1]) : null;
    })();
    if (el._veilGlide) {
      try { if (el._veilGlide.cancel) el._veilGlide.cancel(); } catch (err) {}
      el._veilGlide = null;
    }
    // No anime.utils.remove here: it also killed the row's reveal / FLIP springs half way and left
    // rows parked part-way (shifted, scaled, faded). Animating scale again simply replaces the old
    // scale tween and leaves the other transform parts running.
    const from = live != null && isFinite(live) ? live : (el._veilScale || 1);
    if (scale > 1) grown.add(el); else if (scale === 1) grown.delete(el);
    try {
      const pressing = scale < 1 && scale < from;
      // soft: song cards. A slower, rounder press and a release that overshoots once, instead of
      // the quick button tap.
      const ease = soft
        ? (pressing ? veilSpring(0.28, 520) : veilSpring(scale >= from ? 0.5 : 0.38, 820))
        : (pressing ? veilSpring(0.2, 280) : veilSpring(scale >= from ? 0.42 : 0.3, 620));
      el._veilGlide = anime.animate(el, { scale: [from, scale], ease: ease });
      el._veilScale = scale;
    } catch (err) {}
  }
  const MARQ_SEL = ".sp-song .meta b, .sp-who-text > b, .sp-top-copy > b, .sp-q b, .sp-now-meta b, .sp-dock-meta b";
  const MARQ_HOST = ".sp-song, .sp-who, .sp-top, .sp-q, .sp-now-meta, .sp-dock-id";
  // Long titles scroll inside their own clipped box (with soft faded edges) while hovered and
  // glide back on leave; they never move outside it, so they can't slide over the cover art.
  function marqStart(b) {
    const anime = window.anime;
    if (!b || b._veilMarq || motionOff() || !anime || !anime.animate) return;
    const over = b.scrollWidth - b.clientWidth;
    if (over < 4) return;
    const text = b.textContent;
    b.textContent = "";
    const span = document.createElement("span");
    span.className = "sp-marq";
    span.textContent = text;
    b.appendChild(span);
    b.classList.add("is-marq");
    const dist = over + 18;
    const m = { span: span, text: text, job: anime.animate(span, { translateX: [0, -dist], duration: Math.max(1400, dist * 32), delay: 420, ease: "inOutSine" }) };
    // The left edge only fades once the text has started moving, so the first letter is crisp at rest.
    m.edge = setTimeout(() => { if (b._veilMarq === m) b.style.setProperty("--marq-l", "12px"); }, 420);
    b._veilMarq = m;
  }
  // Called before a title's text is replaced (a new song), so a running scroll never leaves its
  // span, mask or class behind on the next title.
  function marqReset(b) {
    const m = b && b._veilMarq;
    if (!m) return;
    try { if (m.job && m.job.cancel) m.job.cancel(); } catch (err) {}
    clearTimeout(m.edge);
    b._veilMarq = null;
    b.classList.remove("is-marq");
    b.style.removeProperty("--marq-l");
  }
  window.__veilMarqReset = marqReset;
  function setTitle(el, text) {
    if (!el) return;
    const m = el._veilMarq;
    if (m && m.text === text) return;
    if (!m && el.textContent === text) return;
    marqReset(el);
    el.textContent = text;
  }
  function marqStop(b) {
    const anime = window.anime;
    const m = b && b._veilMarq;
    if (!m) return;
    try { if (m.job && m.job.cancel) m.job.cancel(); } catch (err) {}
    clearTimeout(m.edge);
    const finish = () => {
      if (b._veilMarq !== m) return;
      b._veilMarq = null;
      b.classList.remove("is-marq");
      b.style.removeProperty("--marq-l");
      if (m.span.isConnected) b.textContent = m.text;
    };
    if (!m.span.isConnected || !anime || !anime.animate) { finish(); return; }
    try {
      m.job = anime.animate(m.span, { translateX: 0, duration: 520, ease: "outCubic", onComplete: finish });
    } catch (err) { finish(); }
  }
  document.addEventListener("pointerover", event => {
    const host = event.target && event.target.closest && event.target.closest(MARQ_HOST);
    if (!host || host.contains(event.relatedTarget)) return;
    const b = host.querySelector(MARQ_SEL);
    if (b) marqStart(b);
  });
  document.addEventListener("pointerout", event => {
    const host = event.target && event.target.closest && event.target.closest(MARQ_HOST);
    if (!host || host.contains(event.relatedTarget)) return;
    const b = host.querySelector(MARQ_SEL);
    if (b) marqStop(b);
  });
  function prettySrc(src, big) {
    const url = String(src || "");
    if (!/i\.ytimg\.com/.test(url)) return url;
    return url.replace(/\/[^/?#]+\.jpg(\?.*)?$/, big ? "/hq720.jpg" : "/mqdefault.jpg");
  }
  // Album search: the iTunes catalogue (CORS-open, reliable art and tracklists), with Deezer over
  // JSONP as the fallback. Album tracks are matched to YouTube only when they play (veilos.js).
  // iTunes answers 429 without CORS headers when it rate-limits, which shows up as red CORS errors.
  // After one failure stop asking it for 10 minutes (Deezer covers the gap) instead of spamming.
  function itunesFetch(url) {
    if (window.__veilItunesOff && Date.now() < window.__veilItunesOff) return Promise.reject(new Error("itunes cooling down"));
    return fetch(url).then(res => {
      if (res.status === 429 || res.status === 403) window.__veilItunesOff = Date.now() + 10 * 60 * 1000;
      return res;
    }, err => {
      window.__veilItunesOff = Date.now() + 10 * 60 * 1000;
      throw err;
    });
  }
  function bigArt(url, size) {
    return String(url || "").replace(/\/\d+x\d+bb\.(jpg|png)$/, "/" + size + "x" + size + "bb.jpg");
  }
  function deezerJsonp(path) {
    return new Promise(resolve => {
      const name = "__veilDzAlbum" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const tag = document.createElement("script");
      const done = data => {
        try { delete window[name]; } catch (err) { window[name] = undefined; }
        tag.remove();
        clearTimeout(timer);
        resolve(data || null);
      };
      const timer = setTimeout(() => done(null), 8000);
      window[name] = data => done(data);
      tag.onerror = () => done(null);
      tag.src = "https://api.deezer.com/" + path + (path.indexOf("?") === -1 ? "?" : "&") + "output=jsonp&callback=" + name;
      document.head.appendChild(tag);
    });
  }
  // Pages wait for their pictures: resolves once every URL has loaded or failed, or after `cap` ms.
  function preloadImgs(urls, cap) {
    const list = Array.from(new Set((urls || []).filter(Boolean))).slice(0, 24);
    if (!list.length) return Promise.resolve();
    return new Promise(resolve => {
      let left = list.length;
      let finished = false;
      const finish = () => { if (!finished) { finished = true; resolve(); } };
      const one = () => { left -= 1; if (left <= 0) finish(); };
      setTimeout(finish, cap || 5000);
      list.forEach(url => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { if (img.decode) img.decode().then(one, one); else one(); };
        img.onerror = one;
        img.src = url;
      });
    });
  }
  // Search results stay on the skeleton until the songs, the album search and the artist search
  // have all answered and the pictures at the top are in, then everything springs in together.
  const searchGate = { q: "", albums: true, artists: true, ready: true, prepping: false, timer: 0 };
  function gateStart(q) {
    clearTimeout(searchGate.timer);
    Object.assign(searchGate, { q: q, albums: !q, artists: !q, ready: !q, prepping: false });
    if (q) searchGate.timer = setTimeout(() => gateOpen(q), 12000);
  }
  function gateMark(q, key) {
    if (searchGate.q !== q) return;
    searchGate[key] = true;
    gateCheck();
  }
  function gateCheck() {
    const g = searchGate;
    if (g.ready || g.prepping || !g.q) return;
    const snap = api.snap();
    if (/^Searching/.test(snap.status || "") || !g.albums || !g.artists) return;
    g.prepping = true;
    const q = g.q;
    const urls = [];
    if (ui.artistTop && ui.artistsFor === q) urls.push(ui.artistTop.avatar);
    (ui.artists || []).slice(0, 6).forEach(item => urls.push(item.avatar));
    (ui.albumsFor === q ? ui.albums || [] : []).slice(0, 8).forEach(item => urls.push(prettySrc(item.cover, false)));
    (snap.results || []).slice(0, 8).forEach((track, i) => urls.push(track && track.thumb ? prettySrc(track.thumb, i === 0) : ""));
    preloadImgs(urls, 4000).then(() => gateOpen(q));
  }
  function gateOpen(q) {
    if (searchGate.q !== q || searchGate.ready) return;
    searchGate.ready = true;
    clearTimeout(searchGate.timer);
    if (ui.page === "home") full(false);
  }
  function searchAlbums(query) {
    const q = String(query || "").trim();
    ui.albumsFor = q;
    ui.albums = [];
    ui.albumsKey = q + ":0";
    if (!q) return;
    const viaItunes = () => itunesFetch("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "album", limit: "12" }).toString())
      .then(res => res.ok ? res.json() : null)
      .then(data => ((data && data.results) || []).filter(row => row.collectionId && row.collectionName).map(row => ({
        src: "am:" + row.collectionId,
        name: row.collectionName,
        artist: row.artistName || "",
        year: String(row.releaseDate || "").slice(0, 4),
        cover: bigArt(row.artworkUrl100, 600),
        count: row.trackCount || 0
      })))
      .catch(() => []);
    const viaDeezer = () => deezerJsonp("search/album?q=" + encodeURIComponent(q) + "&limit=12").then(data => ((data && data.data) || []).map(row => ({
      src: "dz:" + row.id,
      name: row.title,
      artist: row.artist && row.artist.name || "",
      year: "",
      cover: row.cover_xl || row.cover_big || row.cover_medium || "",
      count: row.nb_tracks || 0
    })));
    viaItunes().then(list => list.length ? list : viaDeezer()).then(list => {
      if (ui.albumsFor !== q) return;
      // Prefer real albums over one-track singles, and drop exact repeats (clean + explicit).
      const seen = {};
      ui.albums = list.filter(item => {
        const key = (item.name + "|" + item.artist).toLowerCase();
        if (seen[key]) return false;
        seen[key] = 1;
        return true;
      }).sort((a, b) => (b.count > 1) - (a.count > 1)).slice(0, 10);
      ui.albumsKey = q + ":" + ui.albums.length;
      if (ui.page === "home") full(false);
    }).catch(() => {}).then(() => gateMark(q, "albums"));
  }
  // Artists are searchable too: YouTube channels (via Invidious) whose name matches the query.
  // An exact name match takes the Top result slot (round picture, opens the artist page); other
  // close matches show in an "Artists" row.
  const artistNorm = v => {
    let key = String(v || "").toLowerCase().replace(/\s*-\s*topic$/, "").replace(/[^a-z0-9]+/g, "");
    for (let i = 0; i < 2; i++) key = key.replace(/(vevo|music|official|tv)$/, "").replace(/^official/, "");
    return key;
  };
  function searchArtists(query) {
    const q = String(query || "").trim();
    ui.artistsFor = q;
    ui.artists = [];
    ui.artistTop = null;
    ui.artistsKey = q + ":0";
    if (!q) return;
    ytApi("search?" + new URLSearchParams({ q: q, type: "channel" }).toString()).then(rows => {
      if (ui.artistsFor !== q) return;
      const want = artistNorm(q);
      const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const seen = {};
      const list = (rows || []).filter(row => row && row.type === "channel" && row.authorId && !/ - topic$/i.test(row.author || "")).map(row => ({
        name: String(row.author || "").trim(),
        id: row.authorId,
        avatar: ytBest(row.authorThumbnails, 176),
        subs: row.subCount || 0,
        verified: !!row.authorVerified
      })).filter(item => {
        const key = artistNorm(item.name);
        if (!key || seen[key]) return false;
        seen[key] = 1;
        if (/#/.test(item.name)) return false;
        const close = key === want || key.indexOf(want) >= 0 || want.indexOf(key) >= 0 || words.every(w => item.name.toLowerCase().indexOf(w) >= 0);
        return close && (item.verified || item.subs >= 1000000);
      });
      ui.artistTop = list.find(item => artistNorm(item.name) === want && item.subs >= 10000) || list.find(item => artistNorm(item.name) === want) || null;
      ui.artists = list.filter(item => item !== ui.artistTop).slice(0, 6);
      ui.artistsKey = q + ":" + list.length + ":" + (ui.artistTop ? ui.artistTop.id : "");
      if (ui.page === "home") full(false);
    }).catch(err => {
      try { console.warn("[Veil music] Artist search failed: " + (err && err.message || err)); } catch (e2) {}
    }).then(() => gateMark(q, "artists"));
  }
  function artistTopHit(item) {
    const pic = item.avatar ? '<img class="sp-top-pfp" src="' + escapeHTML(item.avatar) + '" alt="">' : '<span class="sp-top-pfp sp-ph">' + ico("music_default.svg") + "</span>";
    return '<div class="sp-top sp-top-artist" role="button" tabindex="0" data-open-artist="' + escapeHTML(item.name) + '">' + pic + '<span class="sp-top-copy"><b>' + escapeHTML(item.name) + '</b><small class="sp-sub"><span>Artist</span>' + (item.subs ? '<span class="sp-dot">•</span><span>' + compactCount(item.subs) + " subscribers</span>" : "") + "</small></span></div>";
  }
  function artistResults() {
    if (!(ui.artists || []).length || ui.artistsFor !== ui.query) return "";
    return '<div class="sp-label">Artists</div><div class="sp-grid sp-artists">' + ui.artists.map(item => '<button type="button" class="sp-card sp-artist-card" data-open-artist="' + escapeHTML(item.name) + '">' + (item.avatar ? '<img class="sp-art sp-round" src="' + escapeHTML(item.avatar) + '" alt="">' : '<span class="sp-art sp-ph sp-round">' + ico("music_default.svg") + "</span>") + "<b>" + escapeHTML(item.name) + "</b><small>" + (item.subs ? compactCount(item.subs) + " subscribers" : "Artist") + "</small></button>").join("") + "</div>";
  }
  function albumResults() {
    if (!(ui.albums || []).length || ui.albumsFor !== ui.query) return "";
    return '<div class="sp-label">Albums</div><div class="sp-grid sp-ralbums">' + ui.albums.map(item => '<div class="sp-cardwrap"><button type="button" class="sp-card" data-ralbum="' + escapeHTML(item.src) + '">' + art(item.cover) + '<b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML([item.year, item.artist].filter(Boolean).join(" • ")) + '</small></button><button type="button" class="sp-quick" data-ralbum-play="' + escapeHTML(item.src) + '" data-pp-ralbum="' + escapeHTML(item.src) + '" aria-label="Play album">' + veilPPIcon(ralbumPlaying(item.src)) + '</button></div>').join("") + '</div>';
  }
  function openRemoteAlbum(meta, autoplay) {
    ui.remote = { src: meta.src, name: meta.name, artist: meta.artist, year: meta.year, cover: meta.cover, tracks: [], status: "Loading songs…" };
    ui.page = "ralbum";
    full(true);
    const want = ui.remote;
    const id = meta.src.slice(3);
    const thumb = meta.cover ? bigArt(meta.cover, 300) : "";
    const viaItunes = () => itunesFetch("https://itunes.apple.com/lookup?" + new URLSearchParams({ id: id, entity: "song", limit: "200" }).toString())
      .then(res => res.ok ? res.json() : null)
      .then(data => ((data && data.results) || []).filter(row => row.wrapperType === "track" && row.trackId).sort((a, b) => ((a.discNumber || 1) - (b.discNumber || 1)) || ((a.trackNumber || 0) - (b.trackNumber || 0))).map(row => ({
        id: "am:" + row.trackId,
        title: row.trackName || "Untitled",
        author: row.artistName || meta.artist || "",
        seconds: Math.round((row.trackTimeMillis || 0) / 1000),
        thumb: thumb || bigArt(row.artworkUrl100, 300),
        explicit: row.trackExplicitness === "explicit",
        local: false
      })))
      .catch(() => []);
    const viaDeezer = () => deezerJsonp("album/" + encodeURIComponent(id)).then(data => (((data && data.tracks) || {}).data || []).map(row => ({
      id: "dz:" + row.id,
      title: row.title || "Untitled",
      author: row.artist && row.artist.name || meta.artist || "",
      seconds: Number(row.duration) || 0,
      thumb: meta.cover || "",
      explicit: !!row.explicit_lyrics,
      local: false
    })));
    const viaDeezerSearch = () => deezerJsonp("search/album?q=" + encodeURIComponent((meta.artist + " " + meta.name).trim()) + "&limit=5").then(data => {
      const hit = ((data && data.data) || []).find(row => String(row.title || "").toLowerCase() === String(meta.name || "").toLowerCase()) || ((data && data.data) || [])[0];
      if (!hit) return [];
      return deezerJsonp("album/" + hit.id).then(full => (((full && full.tracks) || {}).data || []).map(row => ({
        id: "dz:" + row.id, title: row.title || "Untitled", author: row.artist && row.artist.name || meta.artist || "",
        seconds: Number(row.duration) || 0, thumb: meta.cover || "", explicit: !!row.explicit_lyrics, local: false
      })));
    });
    const viaYouTube = () => ytApi("playlists/" + encodeURIComponent(id)).then(data => ((data && data.videos) || []).filter(row => row && row.videoId && row.lengthSeconds !== 0).map(row => ({
      id: String(row.videoId),
      title: ytSongTitle(row.title || "Untitled", meta.artist),
      author: String(row.author || meta.artist || "").replace(/ - Topic$/i, ""),
      seconds: Number(row.lengthSeconds) || 0,
      thumb: "https://i.ytimg.com/vi/" + row.videoId + "/mqdefault.jpg",
      local: false
    }))).catch(err => { console.warn("[Veil music] Couldn't load YouTube album " + id + ": " + (err && err.message || err)); return []; });
    (meta.src.indexOf("yt:") === 0 ? viaYouTube() : meta.src.indexOf("dz:") === 0 ? viaDeezer() : viaItunes().then(list => list.length ? list : viaDeezerSearch())).catch(() => []).then(tracks => {
      if (ui.remote !== want) return null;
      // Hold the skeleton until the cover and the first rows' art are in, then show it all at once.
      return preloadImgs([prettySrc(want.cover, true)].concat(tracks.slice(0, 12).map(t => t && t.thumb ? prettySrc(t.thumb, false) : "")), 5000).then(() => tracks);
    }).then(tracks => {
      if (!tracks || ui.remote !== want) return;
      want.tracks = tracks;
      want.status = tracks.length ? "" : "Couldn't load this album's songs.";
      if (ui.page === "ralbum") full(false);
      if (autoplay && tracks.length) {
        ui.playingFrom = "ralbum:" + meta.src;
        api.play(tracks, 0);
      }
    });
  }
  // Which "play" buttons are showing something that is playing right now.
  function albumPlaying(id) {
    const snap = api.snap();
    if (!snap.playing || !snap.track) return false;
    const item = albumOf(id);
    return !!(item && ui.playingFrom === "album:" + id && (item.tracks || []).some(t => t.id === snap.track.id));
  }
  function ralbumPlaying(src) {
    const snap = api.snap();
    return !!(snap.playing && snap.track && ui.playingFrom === "ralbum:" + src);
  }
  function syncPPButtons(snap) {
    root.querySelectorAll("[data-pp-track]").forEach(btn => {
      const on = !!(snap.playing && snap.track && snap.track.id === btn.getAttribute("data-pp-track"));
      veilPPSet(btn, on);
      btn.setAttribute("aria-label", on ? "Pause" : "Play");
    });
    const label = (btn, on) => {
      const text = btn.querySelector(".sp-pp-label");
      if (text && text.textContent !== (on ? "Pause" : "Play")) text.textContent = on ? "Pause" : "Play";
    };
    root.querySelectorAll("[data-pp-album]").forEach(btn => { const on = albumPlaying(btn.getAttribute("data-pp-album")); veilPPSet(btn, on); label(btn, on); });
    root.querySelectorAll("[data-pp-ralbum]").forEach(btn => { const on = ralbumPlaying(btn.getAttribute("data-pp-ralbum")); veilPPSet(btn, on); label(btn, on); });
    root.classList.toggle("is-playing", !!snap.playing);
  }
  // Find the album a YouTube song belongs to (Deezer first, iTunes as the fallback) and open it.
  function openTrackAlbum(track) {
    if (!track) return;
    const clean = lyricQueryOf(track);
    ui.remote = { src: "", name: clean.title || track.title || "Album", artist: clean.artist || track.author || "", year: "", cover: track.thumb || "", tracks: [], status: "Finding this song's album…" };
    ui.page = "ralbum";
    full(true);
    const want = ui.remote;
    const norm = v => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const viaDeezer = () => deezerJsonp("search?q=" + encodeURIComponent('artist:"' + clean.artist + '" track:"' + clean.title + '"') + "&limit=5").then(data => {
      const rows = (data && data.data) || [];
      const hit = rows.find(row => norm(row.title).indexOf(norm(clean.title)) === 0) || rows[0];
      return hit && hit.album ? { src: "dz:" + hit.album.id, name: hit.album.title, artist: hit.artist && hit.artist.name || clean.artist, year: "", cover: hit.album.cover_xl || hit.album.cover_big || "", count: 0 } : null;
    });
    const viaItunes = () => itunesFetch("https://itunes.apple.com/search?" + new URLSearchParams({ term: (clean.artist + " " + clean.title).trim(), entity: "song", limit: "5" }).toString())
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const row = ((data && data.results) || []).find(r => r.collectionId);
        return row ? { src: "am:" + row.collectionId, name: row.collectionName, artist: row.artistName || clean.artist, year: String(row.releaseDate || "").slice(0, 4), cover: bigArt(row.artworkUrl100, 600), count: row.trackCount || 0 } : null;
      }).catch(() => null);
    viaDeezer().then(hit => hit || viaItunes()).then(hit => {
      if (ui.remote !== want) return;
      if (!hit) {
        want.status = "Couldn't find an album for this song.";
        if (ui.page === "ralbum") full(false);
        return;
      }
      openRemoteAlbum(hit, false);
    });
  }
  // Like / add buttons: a soft pop with one rebound; liking also fills the heart (CSS swaps the
  // outline for the filled heart) and sends a faint ring out from it.
  function popBtn(btn, ring) {
    const anime = window.anime;
    if (!btn || motionOff() || !anime || !anime.animate) return;
    const icon = btn.querySelector(".sp-ico") || btn;
    try {
      if (btn._veilPop && btn._veilPop.cancel) btn._veilPop.cancel();
      // It eases down from where the heart is (no jump to a small size), then rises back on a
      // softer, longer, well-damped spring: still a clear jiggle, just not a snap.
      const dip = ring ? { scale: 0.8, rotate: -10 } : { scale: 0.86, rotate: -8 };
      const back = veilSpring(0.34, 980);
      btn._veilPop = anime.animate(icon, {
        scale: [{ to: dip.scale, duration: 190, ease: "outQuad" }, { to: 1, ease: back }],
        rotate: [{ to: dip.rotate, duration: 190, ease: "outQuad" }, { to: 0, ease: back }]
      });
    } catch (err) {}
    if (ring) {
      btn.classList.remove("is-ring");
      void btn.offsetWidth;
      btn.classList.add("is-ring");
      setTimeout(() => btn.classList.remove("is-ring"), 650);
    }
  }
  function popLike(id, liked) {
    // The rows re-render when the library changes, so find the fresh buttons on the next frame.
    requestAnimationFrame(() => {
      const nowTrack = api.snap().track;
      root.querySelectorAll("[data-like]").forEach(btn => { if (btn.getAttribute("data-like") === id) popBtn(btn, liked); });
      const bar = root.querySelector("[data-bar-like]");
      if (bar && nowTrack && nowTrack.id === id) popBtn(bar, liked);
    });
  }
  function trackById(id) {
    if (!id) return null;
    const snap = api.snap();
    const pools = [snap.results || [], snap.artistResults || [], (ui.artistYT && ui.artistYT.popular) || [], ((albumOf(ui.albumId) || {}).tracks) || [], (ui.remote && ui.remote.tracks) || [], lib().liked || []];
    if (snap.track) pools.push([snap.track]);
    for (let i = 0; i < pools.length; i++) {
      const hit = (pools[i] || []).find(item => item && item.id === id);
      if (hit) return hit;
    }
    return null;
  }
  function expMark(track) {
    if (track && track.explicit && track.id) ui.explicit[track.id] = true;
    const on = !!(track && (ui.explicit[track.id] === true || /\bexplicit\b/i.test(track.title || "")));
    return '<i class="sp-exp" data-exp="' + escapeHTML(track && track.id || "") + '"' + (on ? "" : " hidden") + "><b>E</b></i>";
  }
  function checkExplicit(track) {
    if (!track || track.local || !track.id || ui.explicit[track.id] != null) return;
    if (/\bexplicit\b/i.test(track.title || "")) {
      ui.explicit[track.id] = true;
      return;
    }
    ui.explicit[track.id] = false;
    const norm = value => String(value || "").toLowerCase().replace(/\s*[\(\[][^\)\]]*[\)\]]/g, "").replace(/\s*-\s*topic$/, "").replace(/[^a-z0-9]+/g, " ").trim();
    const wantT = norm(lyricQueryOf(track).title || track.title);
    const wantA = norm(lyricQueryOf(track).artist || track.author).split(" ")[0] || "";
    const match = (name, artist) => {
      const n = norm(name);
      const a = norm(artist);
      return !!wantT && (n === wantT || n.indexOf(wantT) === 0 || wantT.indexOf(n) === 0) && (!wantA || a.indexOf(wantA) !== -1);
    };
    const mark = () => {
      ui.explicit[track.id] = true;
      document.querySelectorAll("[data-exp]").forEach(el => {
        if (el.getAttribute("data-exp") === track.id) el.hidden = false;
      });
    };
    const term = ((lyricQueryOf(track).title || track.title || "") + " " + (lyricQueryOf(track).artist || track.author || "")).slice(0, 120);
    // Deezer carries the explicit-lyrics flag for far more songs than iTunes (Lil Darkie, SoundCloud
    // rap, etc.). It has no CORS headers, so it is read through JSONP; iTunes stays as the fallback.
    const viaItunes = () => {
      const query = new URLSearchParams({ term: term, entity: "song", limit: "8" });
      return itunesFetch("https://itunes.apple.com/search?" + query.toString()).then(res => res.ok ? res.json() : null).then(data => {
        const hit = (data && data.results || []).find(item => match(item.trackName, item.artistName));
        return hit ? hit.trackExplicitness === "explicit" : null;
      }).catch(() => null);
    };
    // Deezer allows ~50 calls per 5s per user; space them out and retry once on its quota error.
    const viaDeezer = (retry) => {
      const run = () => askDeezer().then(res => {
        if (res === "quota" && !retry) return new Promise(r => setTimeout(r, 5200)).then(() => viaDeezer(true));
        return res === "quota" ? null : res;
      });
      const prev = window.__veilDzQueue || Promise.resolve();
      const next = prev.then(() => new Promise(r => setTimeout(r, 140))).then(run);
      window.__veilDzQueue = next.catch(() => null);
      return next;
    };
    const askDeezer = () => new Promise(resolve => {
      const cb = "__veilDz" + Math.random().toString(36).slice(2);
      const tag = document.createElement("script");
      let done = false;
      const end = value => {
        if (done) return;
        done = true;
        try { delete window[cb]; } catch (err) { window[cb] = undefined; }
        tag.remove();
        resolve(value);
      };
      window[cb] = data => {
        if (data && data.error) { end("quota"); return; }
        const hit = (data && data.data || []).find(item => match(item.title_short || item.title, item.artist && item.artist.name));
        end(hit ? !!(hit.explicit_lyrics || hit.explicit_content_lyrics === 1) : null);
      };
      tag.onerror = () => end(null);
      setTimeout(() => end(null), 6000);
      tag.src = "https://api.deezer.com/search?" + new URLSearchParams({ q: term, limit: "8", output: "jsonp", callback: cb }).toString();
      document.head.appendChild(tag);
    });
    viaDeezer(false).then(yes => yes == null ? viaItunes() : yes).then(yes => {
      if (yes) mark();
    });
  }
  function scanExplicit(scope) {
    const nodes = (scope || root).querySelectorAll("[data-exp]");
    let n = 0;
    nodes.forEach(el => {
      if (n > 10) return;
      const id = el.getAttribute("data-exp");
      if (!id || ui.explicit[id] != null) return;
      n += 1;
      const track = trackById(id);
      if (track) checkExplicit(track);
    });
  }
  function renderLyrics(lines) {
    const box = lyricBox();
    if (!box) return;
    ui.lines = lines || [];
    ui.line = -1;
    ui.linePast = 0;
    box.__veilOnLine = null;
    if (!ui.lines.length) {
      box.innerHTML = '<div class="sp-lyric-empty">No lyrics for this song.</div>';
      return;
    }
    box.innerHTML = ui.lines.map((line, index) => '<p class="sp-line" data-i="' + index + '" data-t="' + line.t + '">' + escapeHTML(line.text || "…") + "</p>").join("");
  }
  function lyricQueryOf(track) {
    let title = String(track.title || "");
    let artist = String(track.author || "").replace(/\s*-\s*topic$/i, "").replace(/vevo$/i, "").replace(/\s*official$/i, "").trim();
    title = title.replace(/\s*[\(\[][^\)\]]*(official|video|audio|lyric|visuali[sz]er|remaster|hd|4k|explicit|clean|live|mv)[^\)\]]*[\)\]]/gi, "");
    title = title.replace(/\s*\|.*$/, "").replace(/\s+(ft\.?|feat\.?|featuring)\s.*$/i, "");
    const dash = title.split(/\s+[-–—]\s+/);
    if (dash.length >= 2) {
      const left = dash[0].trim();
      if (!artist || left.toLowerCase().indexOf(artist.toLowerCase()) !== -1 || artist.toLowerCase().indexOf(left.toLowerCase()) !== -1) {
        artist = artist || left;
        title = dash.slice(1).join(" - ");
      } else if (!artist) {
        artist = left;
        title = dash.slice(1).join(" - ");
      }
    }
    title = title.replace(/["“”]/g, "").trim() || String(track.title || "");
    return { title: title, artist: artist };
  }
  function loadLyrics(track) {
    const box = lyricBox();
    if (!box) return;
    if (!track || track.local) {
      ui.lyricFor = "";
      ui.lines = [];
      box.innerHTML = '<div class="sp-lyric-empty">Lyrics show up when a song is playing.</div>';
      return;
    }
    if (ui.lyricFor === track.id) return;
    ui.lyricFor = track.id;
    ui.lines = [];
    ui.line = -1;
    box.innerHTML = '<div class="sp-lyric-empty">Loading lyrics…</div>';
    const clean = lyricQueryOf(track);
    const query = new URLSearchParams({ track_name: clean.title, artist_name: clean.artist });
    if (track.seconds) query.set("duration", String(Math.round(track.seconds)));
    const getOne = url => fetch(url).then(res => res.ok ? res.json() : null).catch(() => null);
    const pick = rows => {
      if (!Array.isArray(rows) || !rows.length) return null;
      const near = row => !track.seconds || !row.duration || Math.abs(row.duration - track.seconds) < 8;
      return rows.find(row => row.syncedLyrics && near(row)) || rows.find(row => row.syncedLyrics) || rows.find(row => row.plainLyrics) || null;
    };
    // /api/get answers 404 (a red console line) whenever there's no exact match, so ask the search
    // endpoint, which always answers 200 with a list, first by title + artist, then free text.
    query.delete("duration");
    getOne("https://lrclib.net/api/search?" + query.toString()).then(pick).then(data => {
      if (data && (data.syncedLyrics || data.plainLyrics)) return data;
      const q = new URLSearchParams({ q: (clean.title + " " + clean.artist).trim() });
      return getOne("https://lrclib.net/api/search?" + q.toString()).then(pick);
    }).then(data => {
      if (ui.lyricFor !== track.id) return;
      let lines = [];
      const synced = data && data.syncedLyrics;
      if (synced) {
        synced.split(/\n/).forEach(row => {
          const match = row.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
          if (!match) return;
          const text = match[3].trim();
          if (!text) return;
          lines.push({ t: Number(match[1]) * 60 + Number(match[2]), text: text });
        });
      } else if (data && data.plainLyrics) {
        lines = data.plainLyrics.split(/\n/).map(text => ({ t: -1, text: text })).filter(line => line.text);
      }
      renderLyrics(lines);
    }).catch(() => {
      if (ui.lyricFor === track.id) renderLyrics([]);
    });
  }
  function tickLyrics(time) {
    const lines = ui.lines || [];
    if (!lines.length || lines[0].t < 0) return;
    let index = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].t <= time + 0.15) index = i;
    if (index === ui.line) return;
    ui.line = index;
    const box = lyricBox();
    if (!box) return;
    const nodes = box.querySelectorAll(".sp-line");
    const prev = box.__veilOnLine;
    // Only the two lines that change get touched: no sweep over every line, no inline styles left
    // behind, and the old spring is stopped before the new one starts so they never stack.
    if (prev && prev !== nodes[index]) {
      if (prev._veilLine && prev._veilLine.cancel) {
        try { prev._veilLine.cancel(); } catch (err) {}
      }
      prev._veilLine = null;
      prev.classList.remove("is-on");
      if (!motionOff() && window.anime && window.anime.animate) {
        try {
          prev._veilLine = window.anime.animate(prev, { scale: 1, translateY: 0, duration: 520, ease: "outQuad", onComplete: () => { prev._veilLine = null; prev.style.transform = ""; prev.style.willChange = ""; } });
        } catch (err) { prev.style.transform = ""; }
      } else {
        prev.style.transform = "";
        prev.style.willChange = "";
      }
    }
    for (let i = Math.max(0, Math.min(ui.linePast || 0, index)); i < nodes.length; i++) {
      const past = index >= 0 && i < index;
      if (nodes[i].classList.contains("is-past") !== past) nodes[i].classList.toggle("is-past", past);
      else if (!past && i > index) break;
    }
    ui.linePast = Math.max(0, index);
    const on = nodes[index];
    box.__veilOnLine = on || null;
    if (on) on.classList.add("is-on");
    if (on && !motionOff() && window.anime && window.anime.animate) {
      try {
        if (on._veilLine && on._veilLine.cancel) on._veilLine.cancel();
        on.style.willChange = "transform";
        // One spring per line change: it overshoots once and settles on its own, so it reads as a
        // single smooth bounce rather than four eased keyframes stitched together.
        // No jump: the line grows a touch from rest with the same soft, zero-velocity start as the
        // scroll, overshoots a hair and settles.
        on._veilLine = window.anime.animate(on, {
          scale: 1.035,
          duration: 1100,
          ease: veilSoftJiggle,
          onComplete: () => {
            on._veilLine = null;
            on.style.willChange = "";
          }
        });
      } catch (err) {}
    }
    if (!on) return;
    const anime = window.anime;
    const target = Math.max(0, on.offsetTop - box.clientHeight * 0.42);
    const write = y => {
      box.__veilQuiet = 1;
      box.scrollTop = y;
      clearTimeout(box.__veilQuietTimer);
      box.__veilQuietTimer = setTimeout(() => { box.__veilQuiet = 0; }, 90);
    };
    if (motionOff() || !anime || !anime.animate) {
      write(target);
      return;
    }
    const proxy = { y: box.scrollTop };
    if (box._lyricJob && box._lyricJob.cancel) {
      try { box._lyricJob.cancel(); } catch (err) {}
    }
    try {
      box._lyricJob = anime.animate(proxy, {
        y: target,
        duration: 1150,
        ease: veilSoftJiggle,
        onUpdate: () => { write(proxy.y); }
      });
    } catch (err) {
      write(target);
    }
  }
  function openAdd(anchor, track) {
    const old = document.querySelector(".sp-pop");
    if (old) old.remove();
    const pop = document.createElement("div");
    pop.className = "sp-pop";
    const albums = lib().playlists || [];
    pop.innerHTML = (albums.length ? albums.map(item => '<button type="button" data-to="' + escapeHTML(item.id) + '">' + escapeHTML(item.name || "Album") + "</button>").join("") : "") + '<button type="button" data-to="new">New album</button>';
    document.body.appendChild(pop);
    const box = anchor.getBoundingClientRect();
    const width = Math.max(180, pop.offsetWidth || 180);
    let left = Math.min(window.innerWidth - width - 8, Math.max(8, box.left + box.width / 2 - width / 2));
    let top = box.top - pop.offsetHeight - 8;
    if (top < 8) top = box.bottom + 8;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    veilSpringIn(pop, "drop", { force: true });
    const close = event2 => {
      if (pop.contains(event2.target)) return;
      pop.remove();
      document.removeEventListener("pointerdown", close, true);
    };
    setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
    pop.onclick = event2 => {
      const to = event2.target.closest("[data-to]");
      if (!to) return;
      const id = to.getAttribute("data-to");
      pop.remove();
      document.removeEventListener("pointerdown", close, true);
      if (id === "new") {
        ui.cover = track.thumb || "";
        askName("New album", "", true, name => {
          const madeId = api.createAlbum(name, ui.cover);
          api.addTrack(madeId, track);
          ui.cover = "";
          full(false);
        });
        return;
      }
      api.addTrack(id, track);
    };
  }
  const songsLabel = n => n + (n === 1 ? " song" : " songs");
  const inFolder = folderId => (lib().playlists || []).filter(item => (item.folderId || "") === (folderId || ""));
  const albumRow = item => '<div class="sp-row' + (ui.page === "album" && ui.albumId === item.id ? " on" : "") + '" draggable="true" data-kind="album" data-flip="a' + escapeHTML(item.id) + '" data-id="' + escapeHTML(item.id) + '" data-folder="' + escapeHTML(item.folderId || "") + '"><button type="button" data-open-album="' + escapeHTML(item.id) + '">' + art(item.cover) + '<span><b>' + escapeHTML(item.name || "Album") + '</b><small>' + songsLabel((item.tracks || []).length) + '</small></span></button></div>';
  const albumCard = item => '<div class="sp-cardwrap" draggable="true" data-kind="album" data-flip="a' + escapeHTML(item.id) + '" data-id="' + escapeHTML(item.id) + '" data-folder="' + escapeHTML(item.folderId || "") + '"><button type="button" class="sp-card" data-open-album="' + escapeHTML(item.id) + '">' + art(item.cover) + '<b>' + escapeHTML(item.name || "Album") + '</b><small>' + songsLabel((item.tracks || []).length) + '</small></button><button type="button" class="sp-quick" data-play-card="' + escapeHTML(item.id) + '" data-pp-album="' + escapeHTML(item.id) + '" aria-label="Play album">' + veilPPIcon(albumPlaying(item.id)) + '</button></div>';
  function subLine(track) {
    const author = track && track.author ? track.author : "";
    return '<small class="sp-sub">' + expMark(track) + "<span>Song</span>" + (author ? '<span class="sp-dot">•</span><span data-artist="' + escapeHTML(author) + '">' + escapeHTML(author) + "</span>" : "") + "</small>";
  }
  // Little 3-bar visualizer laid over the cover of the song that is playing (CSS shows it only on
  // the playing row and freezes it while paused).
  const artEq = (src, big) => '<span class="sp-artbox">' + art(src, big) + '<span class="sp-eq" aria-hidden="true"><i></i><i></i><i></i></span></span>';
  let nowId = "";
  function songRow(track, index, extra) {
    const on = nowId && nowId === track.id ? " is-on" : "";
    const drag = ui.page === "album" ? "true" : "false";
    const time = track.seconds ? api.clock(track.seconds) : "";
    return '<div class="sp-song' + on + '" draggable="' + drag + '" data-kind="track" data-flip="t' + escapeHTML(track.id) + '" data-track="' + escapeHTML(track.id) + '" data-index="' + index + '"><span class="n">' + (index + 1) + "</span>" + artEq(track.thumb) + '<button type="button" class="meta" data-play-index="' + index + '"><span><b>' + escapeHTML(track.title || "Untitled") + "</b>" + subLine(track) + "</span></button><span class=\"sp-time\">" + time + "</span>" + (extra || "") + "</div>";
  }
  function topHit(track) {
    // The card opens the song's album; only the round button plays / pauses it.
    const on = !!(nowId && nowId === track.id && api.snap().playing);
    return '<div class="sp-top' + (nowId && nowId === track.id ? " is-on" : "") + '" role="button" tabindex="0" data-top-open data-track="' + escapeHTML(track.id) + '">' + artEq(track.thumb, true) + '<span class="sp-top-copy"><b>' + escapeHTML(track.title || "Untitled") + "</b>" + subLine(track) + '</span><button type="button" class="sp-top-play" data-top-play data-pp-track="' + escapeHTML(track.id) + '" aria-label="' + (on ? "Pause" : "Play") + '">' + veilPPIcon(on) + "</button></div>";
  }
  function paintSide() {
    const data = lib();
    let html = '<button type="button" class="sp-nav sp-nav-home' + (ui.page === "home" ? " on" : "") + '" data-go="home">' + ico("home.svg") + '<span>Home</span></button><button type="button" class="sp-nav sp-nav-liked' + (ui.page === "liked" ? " on" : "") + '" data-go="liked">' + ico("heart.svg") + '<span>Liked songs</span></button><div class="sp-tools"><button type="button" class="sp-make" data-make aria-label="Create" title="Create" aria-haspopup="menu">' + ico("plus.svg") + '</button><div class="sp-make-menu" data-make-menu role="menu" hidden><button type="button" role="menuitem" data-new="album">' + ico("music_default.svg") + '<span>Album</span></button><button type="button" role="menuitem" data-new="folder">' + ico("folder.svg") + '<span>Folder</span></button></div></div><div class="sp-label">Library</div>';
    // A folder that is mid-fold keeps its live kids and chevron nodes through the repaint, so a
    // repaint that lands while it springs open or shut can't snap it to the other state.
    const live = {};
    side.querySelectorAll("[data-kids]").forEach(el => {
      const id = el.getAttribute("data-kids");
      if (ui.folding[id]) live[id] = { kids: el };
    });
    side.querySelectorAll("[data-fold]").forEach(el => {
      const id = el.getAttribute("data-fold");
      if (ui.folding[id]) (live[id] = live[id] || {}).chev = el.querySelector(".sp-chev");
    });
    (data.folders || []).forEach(item => {
      const open = ui.open[item.id] !== false;
      const closing = !open && (!!ui.folding[item.id] || (ui.animFold === item.id && ui.foldDir === "close"));
      const opening = open && ui.animFold === item.id;
      const shown = (open && !opening) || (closing && ui.animFold === item.id);
      const shut = !(open || closing);
      html += '<div class="sp-folder' + (shut ? " is-shut" : "") + '"><div class="sp-row' + (ui.page === "folder" && ui.folderId === item.id ? " on" : "") + '" draggable="true" data-kind="folder" data-flip="f' + escapeHTML(item.id) + '" data-id="' + escapeHTML(item.id) + '"><button type="button" class="sp-x sp-fold' + (shown ? " open" : "") + '" data-fold="' + escapeHTML(item.id) + '" aria-label="' + (open ? "Collapse" : "Expand") + '"><span class="sp-ico sp-chev" style="--ico:url(' + iconCss("expand.svg") + ");transform:rotate(" + (shown ? 90 : 0) + 'deg)"></span></button><button type="button" data-open-folder="' + escapeHTML(item.id) + '">' + art(item.cover) + '<span><b>' + escapeHTML(item.name || "Folder") + '</b><small>' + albumsInCount(item.id) + '</small></span></button></div>';
      if (open || closing) html += '<div class="sp-kids" data-kids="' + escapeHTML(item.id) + '">' + inFolder(item.id).map(albumRow).join("") + '</div>';
      html += '</div>';
    });
    html += inFolder("").map(albumRow).join("");
    if (!(data.playlists || []).length && !(data.folders || []).length) html += '<div class="sp-empty">No albums yet.</div>';
    side.innerHTML = html;
    Object.keys(live).forEach(id => {
      const keep = live[id];
      if (keep.kids) side.querySelectorAll("[data-kids]").forEach(el => { if (el.getAttribute("data-kids") === id && el !== keep.kids) el.replaceWith(keep.kids); });
      if (keep.chev) side.querySelectorAll("[data-fold]").forEach(el => {
        const chev = el.getAttribute("data-fold") === id && el.querySelector(".sp-chev");
        if (chev && chev !== keep.chev) chev.replaceWith(keep.chev);
      });
    });
  }
  function saveFolds() {
    try { localStorage.setItem("veil_music_folds", JSON.stringify(ui.open)); } catch (err) {}
  }
  // The single + in the library opens a small chooser (Album / Folder) that springs out of it.
  function toggleMakeMenu(menu, open) {
    const anime = window.anime;
    const btn = side.querySelector("[data-make]");
    if (menu._veilJob && menu._veilJob.cancel) { try { menu._veilJob.cancel(); } catch (err) {} }
    clearTimeout(menu._veilHide);
    if (btn) {
      btn.classList.toggle("on", !!open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (open) {
      menu.hidden = false;
      if (motionOff() || !anime || !anime.animate) return;
      try {
        menu._veilJob = anime.animate(menu, { opacity: [0, 1], translateY: [-8, 0], scale: [0.86, 1], ease: veilTabSpring("enter") });
        const items = Array.from(menu.children);
        if (anime.stagger) anime.animate(items, { opacity: [0, 1], translateX: [-8, 0], delay: anime.stagger(45, { start: 40 }), ease: veilSpring(0.36, 520) });
      } catch (err) {}
      if (btn && anime.animate) { try { anime.animate(btn.querySelector(".sp-ico") || btn, { rotate: [0, 45], ease: veilTabSpring("select") }); } catch (err) {} }
      return;
    }
    if (btn && !motionOff() && anime && anime.animate) { try { anime.animate(btn.querySelector(".sp-ico") || btn, { rotate: 0, ease: veilTabSpring("exit") }); } catch (err) {} }
    if (menu.hidden) return;
    if (motionOff() || !anime || !anime.animate) { menu.hidden = true; return; }
    try { menu._veilJob = anime.animate(menu, { opacity: 0, translateY: -6, scale: 0.92, ease: veilTabSpring("exit") }); } catch (err) {}
    menu._veilHide = setTimeout(() => {
      menu.hidden = true;
      menu.style.opacity = "";
      menu.style.transform = "";
    }, 220);
  }
  function albumsInCount(id) {
    return inFolder(id).length + (inFolder(id).length === 1 ? " album" : " albums");
  }
  // Loading skeletons: shimmer placeholders in the shape of what is coming, plus a springy
  // three-dot loader, so search results, album pages and artist pages never show half-rendered.
  const skelLoader = text => '<div class="sp-loader" data-loader><span class="sp-loader-dots"><i></i><i></i><i></i></span><span class="sp-loader-text">' + escapeHTML(text || "Loading…") + "</span></div>";
  const skelRows = n => Array.from({ length: n }, (_, i) => '<div class="sp-skel-row"><i class="sk sk-n"></i><i class="sk sk-art"></i><span class="sk-col"><i class="sk sk-line" style="width:' + (38 + (i * 17) % 34) + '%"></i><i class="sk sk-line sk-thin" style="width:' + (18 + (i * 11) % 16) + '%"></i></span><i class="sk sk-time"></i></div>').join("");
  const skelCards = n => '<div class="sp-grid sp-skel-cards">' + Array.from({ length: n }, () => '<div class="sp-skel-card"><i class="sk sk-cover"></i><i class="sk sk-line" style="width:72%"></i><i class="sk sk-line sk-thin" style="width:46%"></i></div>').join("") + "</div>";
  const skelTop = () => '<div class="sp-skel-top"><i class="sk sk-bigart"></i><span class="sk-col"><i class="sk sk-line sk-big" style="width:46%"></i><i class="sk sk-line sk-thin" style="width:24%"></i></span><i class="sk sk-play"></i></div>';
  const skelAlbumHero = () => '<div class="sp-skel-hero sp-skel-album"><i class="sk sk-cover-big"></i><span class="sk-col"><i class="sk sk-line sk-thin" style="width:52px"></i><i class="sk sk-line sk-big" style="width:260px"></i><i class="sk sk-line sk-thin" style="width:160px"></i><i class="sk sk-pill"></i></span></div>';
  const skelArtistHero = () => '<div class="sp-skel-hero"><i class="sk sk-pfp"></i><span class="sk-col"><i class="sk sk-line sk-thin" style="width:60px"></i><i class="sk sk-line sk-big" style="width:220px"></i><i class="sk sk-line sk-thin" style="width:140px"></i></span></div>';
  function startLoaders(scope) {
    const anime = window.anime;
    scope.querySelectorAll("[data-loader]").forEach(box => {
      if (box._veilLoop || motionOff() || !anime || !anime.animate) return;
      const dots = box.querySelectorAll(".sp-loader-dots i");
      try {
        box._veilLoop = anime.animate(dots, {
          translateY: [{ to: -9, duration: 300, ease: "outQuad" }, { to: 0, duration: 620, ease: veilSoftJiggle }],
          scaleY: [{ to: 1.12, duration: 300, ease: "outQuad" }, { to: 1, duration: 620, ease: veilSoftJiggle }],
          delay: anime.stagger ? anime.stagger(120) : 0,
          loop: true,
          loopDelay: 140
        });
      } catch (err) {}
    });
  }
  // A page opening (album, search results, artist, liked songs, a folder) or a skeleton giving way:
  // everything on screen rises and fades in on a soft spring, one after another, songs included.
  // Only what is in view takes part (rows below the fold are simply there when you scroll), and each
  // element ends with its inline transform cleared, so rows finish exactly aligned.
  function revealMain() {
    if (!veilMotionOk()) return;
    const box = main.getBoundingClientRect();
    const list = Array.from(main.querySelectorAll(".sp-search, .sp-head, .sp-main > .sp-h, .sp-hero, .sp-artist-hero, .sp-main > .sp-label, .sp-main > .sp-acts, .sp-topwrap, .sp-cardwrap, .sp-artist-card, .sp-song, .sp-main > .sp-empty, .sp-grid > .sp-empty, .sp-main > .sp-status"))
      .filter(el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top < box.bottom + 24 && r.bottom > box.top - 24; });
    if (!list.length) return;
    const step = Math.max(12, Math.min(26, Math.round(520 / list.length)));
    veilStaggerIn(list, "row", { base: 0, step: step, max: 60, bounce: 0.42, duration: 620 });
    main._veilRevealEnd = performance.now() + step * Math.min(list.length, 60) + 660;
  }
  function paintMain(animate) {
    // A quiet repaint that lands while rows are still rising in would rebuild them mid-flight and
    // snap them to full opacity, so it waits until the reveal has settled.
    clearTimeout(main._veilRevealWait);
    const left = (main._veilRevealEnd || 0) - performance.now();
    if (!animate && left > 0) {
      main._veilRevealWait = setTimeout(() => paintMain(false), left + 30);
      return;
    }
    main._veilRevealEnd = 0;
    const snap = api.snap();
    nowId = snap.track ? snap.track.id : "";
    let html = "";
    if (ui.page === "liked") {
      const tracks = lib().liked || [];
      html = '<h2 class="sp-h">Liked songs</h2><div class="sp-acts"><button type="button" class="sp-play" data-play-liked>Play</button></div>';
      html += tracks.length ? tracks.map((track, index) => songRow(track, index, '<button type="button" class="sp-x" data-unlike="' + escapeHTML(track.id) + '" aria-label="Remove">' + ico("exit.svg") + '</button>')).join("") : '<div class="sp-empty">Songs you like show up here.</div>';
    } else if (ui.page === "album") {
      const item = albumOf(ui.albumId);
      if (!item) ui.page = "home";
      else {
        html = '<div class="sp-hero">' + art(item.cover) + '<div><div class="sp-label">Album</div><h2>' + escapeHTML(item.name || "Album") + '</h2><div>' + songsLabel((item.tracks || []).length) + '</div><div class="sp-acts"><button type="button" class="sp-play" data-play-album data-pp-album="' + escapeHTML(item.id) + '">' + veilPPIcon(albumPlaying(item.id)) + '<span class="sp-pp-label">' + (albumPlaying(item.id) ? "Pause" : "Play") + '</span></button><button type="button" class="sp-icon sp-pencil" data-edit-album aria-label="Edit album">' + ico("pencil.svg") + '</button></div></div></div>';
        html += (item.tracks || []).length ? item.tracks.map((track, index) => songRow(track, index, '<button type="button" class="sp-x" data-remove-track="' + index + '" aria-label="Remove">' + ico("exit.svg") + '</button>')).join("") : '<div class="sp-empty">Search on Home and add songs here.</div>';
      }
    } else if (ui.page === "folder") {
      const item = folderOf(ui.folderId);
      if (!item) ui.page = "home";
      else {
        const kids = inFolder(item.id);
        html = '<div class="sp-head"><h2 class="sp-h">' + escapeHTML(item.name || "Folder") + '</h2><button type="button" class="sp-icon" data-edit-folder="' + escapeHTML(item.id) + '">Edit</button></div><div class="sp-grid" data-kind="shelf" data-id="' + escapeHTML(item.id) + '">' + (kids.length ? kids.map(albumCard).join("") : '<div class="sp-empty">Drop albums here.</div>') + '</div>';
      }
    }
    if (ui.page === "ralbum") {
      const meta = ui.remote;
      if (!meta) ui.page = "home";
      else {
        const tracks = meta.tracks || [];
        const saved = api.albumBySrc ? api.albumBySrc(meta.src) : "";
        const facts = [meta.artist, meta.year, tracks.length ? tracks.length + (tracks.length === 1 ? " song" : " songs") : ""].filter(Boolean).map(escapeHTML).join('<span class="sp-dot">•</span>');
        html = '<div class="sp-hero">' + art(meta.cover) + '<div><div class="sp-label">Album</div><h2>' + escapeHTML(meta.name || "Album") + '</h2><div class="sp-hero-facts">' + facts + '</div><div class="sp-acts"><button type="button" class="sp-play" data-play-ralbum data-pp-ralbum="' + escapeHTML(meta.src || "") + '"' + (tracks.length ? "" : " disabled") + '>' + veilPPIcon(ralbumPlaying(meta.src)) + '<span class="sp-pp-label">' + (ralbumPlaying(meta.src) ? "Pause" : "Play") + '</span></button><button type="button" class="sp-play sp-save' + (saved ? " on" : "") + '" data-save-ralbum' + (tracks.length ? "" : " disabled") + '>' + (saved ? "Saved" : "Save to library") + '</button></div></div></div>';
        const acts = track => '<button type="button" class="sp-x' + (api.isLiked(track.id) ? " on" : "") + '" data-like="' + escapeHTML(track.id) + '" aria-label="Like">' + ico("heart.svg") + '</button><button type="button" class="sp-x" data-add="' + escapeHTML(track.id) + '" aria-label="Add to album">' + ico("plus.svg") + '</button>';
        const loadingAlbum = !tracks.length && /^(Loading|Finding)/.test(meta.status || "Loading");
        if (loadingAlbum) html = '<div class="sp-skel" data-skel>' + skelLoader(meta.status || "Loading songs…") + skelAlbumHero() + skelRows(8) + "</div>";
        if (!loadingAlbum) html += tracks.length ? tracks.map((track, index) => songRow(track, index, acts(track))).join("") : '<div class="sp-empty">' + escapeHTML(meta.status || "Couldn't load this album's songs.") + '</div>';
      }
    }
    if (ui.page === "artist") {
      const yt = ui.artistYT && ui.artistYT.name === ui.artist ? ui.artistYT : null;
      const tracks = artistTracks();
      const note = snap.artistStatus || (tracks.length ? "" : "Loading…");
      const pfp = yt && yt.avatar ? '<img class="sp-artist-pfp" src="' + escapeHTML(yt.avatar) + '" alt="">' : '<span class="sp-artist-pfp sp-ph">' + ico("music_default.svg") + '</span>';
      const facts = yt ? [yt.subs ? compactCount(yt.subs) + " subscribers" : "", yt.views ? compactCount(yt.views) + " views" : ""].filter(Boolean).join('<span class="sp-dot">•</span>') : "";
      const ytLoading = !yt || (!yt.failed && !(yt.popular || []).length && !yt.done);
      const holdArtist = !yt || (!yt.ready && !yt.failed);
      html = holdArtist ? '<div class="sp-skel" data-skel>' + skelLoader("Loading " + (ui.artist || "artist") + "…") + skelArtistHero() + '<div class="sp-label">Popular</div>' + skelRows(7) + '<div class="sp-label">Albums</div>' + skelCards(4) + '</div>' : '<div class="sp-artist-hero' + (yt && yt.banner ? " has-banner" : "") + '">' + (yt && yt.banner ? '<div class="sp-artist-banner" style="background-image:url(&quot;' + escapeHTML(yt.banner) + '&quot;)"></div>' : '<div class="sp-artist-banner"></div>') + '<div class="sp-artist-id">' + pfp + '<div class="sp-artist-text"><div class="sp-label">Artist</div><h2>' + escapeHTML((yt && yt.title) || ui.artist || "Artist") + '</h2>' + (facts ? '<div class="sp-hero-facts">' + facts + '</div>' : "") + (yt && yt.desc ? '<div class="sp-artist-desc' + (ui.artistDescOpen ? " is-open" : "") + '">' + escapeHTML(yt.desc).replace(/\n/g, "<br>") + '</div><button type="button" class="sp-artist-more" data-artist-more>' + (ui.artistDescOpen ? "Less" : "More") + "</button>" : "") + '</div></div></div>';
      if (!holdArtist) {
        html += '<div class="sp-label">Popular</div>';
        html += !tracks.length && (ytLoading || /^(Loading|Searching)/.test(note || "")) ? '<div class="sp-skel" data-skel>' + skelRows(7) + "</div>" : tracks.length ? tracks.map((track, index) => songRow(track, index, '<button type="button" class="sp-x' + (api.isLiked(track.id) ? " on" : "") + '" data-like="' + escapeHTML(track.id) + '" aria-label="Like">' + ico("heart.svg") + '</button><button type="button" class="sp-x" data-add="' + escapeHTML(track.id) + '" aria-label="Add to album">' + ico("plus.svg") + '</button>')).join("") : '<div class="sp-empty">' + escapeHTML(note || "No songs found.") + '</div>';
        if (yt) {
          // Only real albums in Albums: '- Single' / EP releases and short (under 4 songs) ones get
          // their own Singles & EPs row underneath.
          const card = item => '<div class="sp-cardwrap"><button type="button" class="sp-card" data-ralbum="' + escapeHTML(item.src) + '">' + art(item.cover) + '<b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML(songsLabel(item.count || 0)) + '</small></button><button type="button" class="sp-quick" data-ralbum-play="' + escapeHTML(item.src) + '" data-pp-ralbum="' + escapeHTML(item.src) + '" aria-label="Play album">' + veilPPIcon(ralbumPlaying(item.src)) + '</button></div>';
          const isAlbum = item => !/(^|[\s(\[-])(single|ep)([\s)\]]|$)/i.test(item.name || "") && !(item.count > 0 && item.count < 4);
          const albumsOnly = (yt.albums || []).filter(isAlbum);
          const singles = (yt.albums || []).filter(item => !isAlbum(item));
          if (albumsOnly.length) html += '<div class="sp-label">Albums</div><div class="sp-grid sp-ralbums">' + albumsOnly.map(card).join("") + '</div>';
          if (singles.length) html += '<div class="sp-label">Singles &amp; EPs</div><div class="sp-grid sp-ralbums sp-singles">' + singles.map(card).join("") + '</div>';
        }
        if (yt && yt.status) html += '<div class="sp-status">' + escapeHTML(yt.status) + '</div>';
      }
    }
    if (ui.page === "home") {
      html = '<form class="sp-search" data-search><input data-q type="search" placeholder="Search for a song or artist" value="' + escapeHTML(ui.query) + '" aria-label="Search"><button type="submit">Search</button></form><div class="sp-status">' + escapeHTML(snap.status || "") + '</div>';
      if (ui.query && searchGate.q === ui.query && !searchGate.ready) gateCheck();
      const searching = !!ui.query && (/^Searching/.test(snap.status || "") || (searchGate.q === ui.query && !searchGate.ready));
      if (searching) {
        html = html.replace('<div class="sp-status">' + escapeHTML(snap.status || "") + "</div>", "");
        html += '<div class="sp-skel" data-skel>' + skelLoader("Searching for \u201c" + ui.query + "\u201d…") + '<div class="sp-label">Top result</div>' + skelTop() + '<div class="sp-label">Albums</div>' + skelCards(4) + '<div class="sp-label">Songs</div>' + skelRows(6) + "</div>";
      } else if ((snap.results || []).length) {
        const acts = index => {
          const track = snap.results[index];
          return '<button type="button" class="sp-x' + (api.isLiked(track.id) ? " on" : "") + '" data-like="' + escapeHTML(track.id) + '" aria-label="Like">' + ico("heart.svg") + '</button><button type="button" class="sp-x" data-add="' + escapeHTML(track.id) + '" aria-label="Add to album">' + ico("plus.svg") + "</button>";
        };
        const artistTop = ui.artistTop && ui.artistsFor === ui.query ? ui.artistTop : null;
        if (artistTop) html += '<div class="sp-label">Top result</div><div class="sp-topwrap">' + artistTopHit(artistTop) + "</div>";
        else html += '<div class="sp-label">Top result</div><div class="sp-topwrap">' + topHit(snap.results[0]) + '<span class="sp-top-acts">' + acts(0) + "</span></div>";
        const first = artistTop ? 0 : 1;
        const rest = snap.results.slice(first);
        html += artistResults();
        html += albumResults();
        if (rest.length) html += '<div class="sp-label">Songs</div>' + rest.map((track, index) => songRow(track, index + first, acts(index + first))).join("");
      } else if (!searching) html += artistResults() + albumResults();
      (lib().folders || []).forEach(folder => {
        const kids = inFolder(folder.id);
        html += '<div class="sp-label">' + escapeHTML(folder.name || "Folder") + '</div><div class="sp-grid" data-kind="shelf" data-id="' + escapeHTML(folder.id) + '">' + (kids.length ? kids.map(albumCard).join("") : '<div class="sp-empty">Drop albums here.</div>') + '</div>';
      });
      const loose = inFolder("");
      html += '<div class="sp-label">' + ((ui.albums || []).length && ui.albumsFor === ui.query ? "Your albums" : "Albums") + '</div><div class="sp-grid" data-kind="shelf" data-id="">' + (loose.length ? loose.map(albumCard).join("") : '<div class="sp-empty">Create an album, then drag it into a folder.</div>') + '</div>';
    }
    const top = main.scrollTop;
    const wasSkel = !!main.querySelector("[data-skel]");
    // A repaint while still loading that would draw the very same skeleton leaves it alone, so the
    // shimmer and the loader dots keep going instead of restarting on every bit of data that lands.
    if (wasSkel && !animate && main._veilSkelHtml === html) return;
    main._veilSkelHtml = /data-skel/.test(html) ? html : "";
    main.innerHTML = html;
    if (!animate) main.scrollTop = top;
    else main.scrollTop = 0;
    scanExplicit(main);
    if (main.querySelector("[data-skel]")) {
      startLoaders(main);
      if (animate && !wasSkel) veilStaggerIn(main.children, "row", { base: 0, step: 40, max: 4, bounce: 0.4, duration: 560 });
    } else if (wasSkel || animate) revealMain();
  }
  function paintBar() {
    const snap = api.snap();
    const track = snap.track;
    const who = root.querySelector(".sp-who");
    const src = track && track.thumb ? prettySrc(track.thumb, false) : "";
    const current = who.querySelector(".sp-art");
    const shown = current && current.tagName === "IMG" ? current.getAttribute("src") || "" : "";
    if (current && src !== shown) current.outerHTML = art(src);
    setTitle(root.querySelector("[data-title]"), track ? track.title : "Nothing playing");
    const author = track && track.author ? track.author : "";
    const by = root.querySelector("[data-by]");
    const nowBy = root.querySelector("[data-now-by]");
    if (by) {
      by.textContent = author;
      if (author) by.setAttribute("data-artist", author);
      else by.removeAttribute("data-artist");
    }
    setTitle(root.querySelector("[data-now-title]"), track ? track.title : "Nothing playing");
    if (nowBy) {
      nowBy.textContent = author;
      if (author) nowBy.setAttribute("data-artist", author);
      else nowBy.removeAttribute("data-artist");
    }
    root.dataset.seconds = track && track.seconds ? String(track.seconds) : "";
    const known = Number(root.dataset.seconds) || 0;
    const durEl = root.querySelector("[data-dur]");
    if (durEl) durEl.textContent = api.clock(known);
    const big = root.querySelector("[data-now-art]");
    const bigSrc = track && track.thumb ? prettySrc(track.thumb, true) : "";
    if (big) {
      const box = big.parentNode;
      const wasEmpty = box.classList.contains("is-empty");
      box.classList.toggle("is-empty", !bigSrc);
      if (!bigSrc) big.hidden = true;
      else big.hidden = false;
      // The placeholder settles in with a soft spring whenever playback ends.
      if (!bigSrc && !wasEmpty) veilSpringIn(box.querySelector(".sp-now-empty"), "pop", { bounce: 0.5, duration: 700, force: true });
      if (bigSrc && big.getAttribute("src") !== bigSrc) {
        big.setAttribute("data-fb", prettySrc(track.thumb, false));
        big.src = bigSrc;
      }
    }
    const heart = root.querySelector("[data-bar-like]");
    const add = root.querySelector("[data-bar-add]");
    if (heart) {
      heart.classList.toggle("on", !!(track && api.isLiked(track.id)));
      heart.disabled = !track || !!track.local;
    }
    if (add) add.disabled = !track;
    const videoBtn = root.querySelector("[data-video]");
    const noVideo = !!(track && window.__veilNoVideo && window.__veilNoVideo[track.id]);
    if (videoBtn) {
      const gone = !track || !!track.local || noVideo;
      videoBtn.classList.toggle("is-gone", gone);
      videoBtn.disabled = gone;
      videoBtn.classList.toggle("on", !!(videoPanel && !videoPanel.hidden));
    }
    const lyricBtn = root.querySelector("[data-lyrics-toggle]");
    if (lyricBtn) lyricBtn.classList.toggle("on", !lyricFrame.hidden);
    const toggle = root.querySelector("[data-toggle]");
    if (toggle) {
      veilPPSet(toggle, snap.playing);
      toggle.setAttribute("aria-label", snap.playing ? "Pause" : "Play");
    }
    syncPPButtons(snap);
    const id = track && track.id;
    root.querySelectorAll(".sp-song").forEach(el => el.classList.toggle("is-on", el.getAttribute("data-track") === id));
    paintQueue(snap);
    const lyricBg = lyricFrame.querySelector("[data-lyric-bg]");
    if (lyricBg) lyricBg.style.backgroundImage = bigSrc ? "url(\"" + String(bigSrc).replace(/"/g, "") + "\")" : "";
    loadLyrics(track);
    if (window.__veilSyncDock) window.__veilSyncDock();
  }
  function paintQueue(snap) {
    const box = root.querySelector("[data-queue]");
    if (!box) return;
    const q = snap.queue || [];
    const key = String(snap.index == null ? -1 : snap.index) + ":" + q.map(track => track.id).join(".");
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    if (!q.length) {
      box.innerHTML = '<div class="sp-empty">Queue is empty.</div>';
      return;
    }
    box.innerHTML = q.map((track, index) => {
      const on = index === snap.index ? " is-on" : "";
      return '<button type="button" class="sp-q' + on + '" data-queue-index="' + index + '">' + art(track.thumb) + '<span><b>' + escapeHTML(track.title || "Untitled") + '</b><small class="sp-sub">' + expMark(track) + (track.author ? "<span>" + escapeHTML(track.author) + "</span>" : "") + "</small></span></button>";
    }).join("");
    scanExplicit(box);
  }
  function signature() {
    const data = lib();
    const snap = api.snap();
    return [ui.page, ui.albumId, ui.folderId, ui.artist, (data.folders || []).map(item => item.id + item.name + (item.cover || "").length).join("|"), (data.playlists || []).map(item => item.id + item.name + (item.cover || "").length + (item.folderId || "") + (item.tracks || []).map(track => track.id).join(".")).join("|"), (data.liked || []).map(track => track.id).join("."), (snap.results || []).map(track => track.id).join("."), (snap.artistResults || []).map(track => track.id).join("."), snap.status || "", snap.artistStatus || "", ui.artistYT ? ui.artistYT.name + ":" + ui.artistYT.stamp : "", ui.albumsKey || "", ui.artistsKey || "", ui.remote ? ui.remote.src + ":" + (ui.remote.status || "") + ":" + (ui.remote.tracks || []).map(track => track.id).join(".") : ""].join("~");
  }
  let sig = "";
  function grabFlip(scope) {
    const map = new Map();
    if (!scope) return map;
    scope.querySelectorAll("[data-flip]").forEach(el => map.set(el.getAttribute("data-flip"), el.getBoundingClientRect()));
    return map;
  }
  function runFlip(scope, prev) {
    const anime = window.anime;
    if (!prev || !scope || motionOff() || !anime || !anime.animate) return;
    scope.querySelectorAll("[data-flip]").forEach(el => {
      const old = prev.get(el.getAttribute("data-flip"));
      if (!old) return;
      if (el.closest(".sp-kids.is-folding")) return;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      try { anime.animate(el, { translateX: [dx, 0], translateY: [dy, 0], ease: veilSpring(0.38, 540) }); } catch (err) {}
    });
  }
  function full(animate) {
    const sidePrev = animate ? null : grabFlip(side);
    const mainPrev = animate ? null : grabFlip(main);
    sig = signature();
    paintSide();
    paintMain(animate);
    paintBar();
    // The folder's own open/close starts first (kids pinned at 0 height when opening), so the FLIP
    // pass measures the rows below the folder where they really are this frame. They then simply
    // ride the folder's height spring down, instead of being measured at the fully-open spot,
    // flung to the top and racing the folder on a separate spring (the teleport/overlap bug).
    animateFold();
    runFlip(side, sidePrev);
    runFlip(main, mainPrev);
  }
  function animateFold() {
    const id = ui.animFold;
    const dir = ui.foldDir || "open";
    if (!id) return;
    ui.animFold = "";
    ui.foldDir = "";
    const token = (ui.folding[id] || 0) + 1;
    let kids = null;
    let btn = null;
    side.querySelectorAll("[data-kids]").forEach(el => { if (el.getAttribute("data-kids") === id) kids = el; });
    side.querySelectorAll("[data-fold]").forEach(el => { if (el.getAttribute("data-fold") === id) btn = el; });
    const chev = btn && btn.querySelector(".sp-chev");
    const anime = window.anime;
    const current = () => ui.folding[id] === token;
    const settle = () => {
      if (!current()) return;
      delete ui.folding[id];
      const box = side.querySelector('[data-kids="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      const fold = side.querySelector('[data-fold="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      const folder = fold && fold.closest(".sp-folder");
      const chevNow = fold && fold.querySelector(".sp-chev");
      if (ui.open[id] === false) {
        if (box) box.remove();
        if (folder) folder.classList.add("is-shut");
        if (chevNow) chevNow.style.transform = "rotate(0deg)";
      } else {
        if (box) {
          box.classList.remove("is-folding");
          ["height", "overflow", "opacity", "transform", "border", "boxShadow"].forEach(key => { box.style[key] = ""; });
        }
        if (folder) folder.classList.remove("is-shut");
        if (chevNow) chevNow.style.transform = "rotate(90deg)";
      }
    };
    if (kids && kids._veilFold) { try { kids._veilFold.cancel(); } catch (err) {} }
    if (chev && chev._veilFold) { try { chev._veilFold.cancel(); } catch (err) {} }
    ui.folding[id] = token;
    if (motionOff() || !anime || !anime.animate || !kids) {
      settle();
      return;
    }
    // Each fold starts from wherever the folder is right now, so reversing mid-way glides back.
    const rot = chev ? (parseFloat((/rotate\(([-\d.]+)deg\)/.exec(chev.style.transform || "") || [])[1]) || (dir === "close" ? 90 : 0)) : 0;
    if (chev) {
      try { chev._veilFold = anime.animate(chev, { rotate: [rot, dir === "close" ? 0 : 90], ease: veilSpring(0.22, 520) }); } catch (err) {}
    }
    const from = kids.classList.contains("is-folding") ? kids.getBoundingClientRect().height : (dir === "close" ? kids.scrollHeight : 0);
    const fromOpacity = kids.classList.contains("is-folding") ? parseFloat(getComputedStyle(kids).opacity) || 0 : (dir === "close" ? 1 : 0);
    kids.style.overflow = "hidden";
    kids.style.border = "0";
    kids.style.boxShadow = "none";
    kids.classList.add("is-folding");
    kids.style.height = from + "px";
    const to = dir === "close" ? 0 : kids.scrollHeight;
    if (dir === "close" && from < 8) {
      settle();
      return;
    }
    try {
      kids._veilFold = anime.animate(kids, { height: [from, to], opacity: [fromOpacity, dir === "close" ? 0 : 1], ease: dir === "close" ? veilSpring(0.16, 560) : veilSpring(0.24, 620) });
      if (kids._veilFold && typeof kids._veilFold.then === "function") kids._veilFold.then(settle);
    } catch (err) {}
    setTimeout(settle, dir === "close" ? 900 : 1100);
  }
  function askName(title, value, withCover, onOk, onDelete) {
    const old = document.querySelector(".sp-modal");
    if (old) old.remove();
    const modal = document.createElement("div");
    modal.className = "modal-overlay sp-modal";
    modal.innerHTML = '<div class="modal-box"><h2></h2><button type="button" class="sp-coverpick" data-pick aria-label="Add a picture">+</button><input class="text-input" data-name maxlength="40"><div class="modal-actions"><button type="button" class="modal-cancel" data-cancel>Cancel</button><button type="button" class="primary-btn" data-ok>Save</button></div></div>';
    modal.querySelector("h2").textContent = title;
    const input = modal.querySelector("[data-name]");
    input.value = value || "";
    const pick = modal.querySelector("[data-pick]");
    if (!withCover) pick.hidden = true;
    else if (ui.cover) pick.innerHTML = '<img alt="" src="' + escapeHTML(ui.cover) + '">';
    if (onDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "modal-cancel";
      del.textContent = "Delete";
      del.onclick = () => { modal.remove(); onDelete(); };
      modal.querySelector(".modal-actions").prepend(del);
    }
    pick.onclick = () => {
      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/*";
      file.onchange = () => {
        const blob = file.files && file.files[0];
        if (!blob) return;
        const image = new Image();
        const url = URL.createObjectURL(blob);
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 240 / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          let quality = 0.72;
          let data = canvas.toDataURL("image/jpeg", quality);
          while (data.length >= 140000 && quality > 0.4) {
            quality -= 0.12;
            data = canvas.toDataURL("image/jpeg", quality);
          }
          ui.cover = data.length < 140000 ? data : "";
          pick.innerHTML = ui.cover ? '<img alt="" src="' + ui.cover + '">' : "+";
        };
        image.onerror = () => URL.revokeObjectURL(url);
        image.src = url;
      };
      file.click();
    };
    modal.querySelector("[data-cancel]").onclick = () => modal.remove();
    modal.querySelector("[data-ok]").onclick = () => {
      const name = input.value.trim();
      modal.remove();
      if (name) onOk(name, ui.cover || "");
    };
    document.body.appendChild(modal);
    input.focus();
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        modal.querySelector("[data-ok]").click();
      } else if (event.key === "Escape") modal.remove();
    });
    spring(modal.querySelector(".modal-box"), 0.96, 1);
  }
  function openArtist(name) {
    name = String(name || "").trim();
    if (!name) return;
    ui.page = "artist";
    ui.artist = name;
    ui.artistDescOpen = false;
    full(true);
    if (api.searchArtist) api.searchArtist(name);
    loadArtistYT(name);
  }
  // Artist page data from YouTube (via Invidious, which sends CORS headers): the channel's
  // picture, banner, subscriber count and description, its most viewed uploads as "Popular",
  // and its Releases tab (YouTube Music album playlists) as "Albums".
  const YT_API_HOSTS = ["https://yt.chocolatemoo53.com", "https://echostreamz.com"];
  async function ytApi(path) {
    let last = null;
    for (const host of YT_API_HOSTS) {
      try {
        const res = await fetch(host + "/api/v1/" + path);
        if (res.ok) return await res.json();
        last = new Error("HTTP " + res.status);
      } catch (err) { last = err; }
    }
    throw last || new Error("no host");
  }
  function compactCount(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function ytBest(list, min) {
    const rows = (list || []).filter(item => item && item.url).sort((a, b) => (a.width || 0) - (b.width || 0));
    const hit = rows.find(item => (item.width || 0) >= min) || rows[rows.length - 1];
    if (!hit) return "";
    return hit.url.indexOf("//") === 0 ? "https:" + hit.url : hit.url;
  }
  function ytSongTitle(title, artist) {
    let out = String(title || "");
    const who = String(artist || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (who) out = out.replace(new RegExp("^\\s*" + who + "\\s*(,[^-–—]*)?[-–—:]\\s*", "i"), "");
    out = out.replace(/\s*[(\[](official|music video|lyric|lyrics|audio|visualizer|video|hd|4k)[^)\]]*[)\]]/ig, "").trim();
    return out || String(title || "Untitled");
  }
  function artistTracks() {
    const yt = ui.artistYT && ui.artistYT.name === ui.artist ? ui.artistYT : null;
    if (yt && (yt.popular || []).length) return yt.popular;
    return api.snap().artistResults || [];
  }
  function ralbumMeta(src) {
    const pool = (ui.albums || []).concat((ui.artistYT && ui.artistYT.albums) || []);
    return pool.find(item => item.src === src) || null;
  }
  async function loadArtistYT(name) {
    const want = { name: name, stamp: 0, popular: [], albums: [], status: "" };
    ui.artistYT = want;
    // Never hold the profile longer than this, whatever is still on its way.
    setTimeout(() => { if (ui.artistYT === want && !want.ready && !want.failed && want.found) { want.ready = true; bump(); } }, 15000);
    const bump = () => {
      want.stamp += 1;
      if (ui.artistYT === want && ui.page === "artist") {
        full(false);
        const desc = document.querySelector(".sp-artist-desc");
        const more = document.querySelector("[data-artist-more]");
        if (desc && more && !desc.classList.contains("is-open")) more.hidden = desc.scrollHeight <= desc.clientHeight + 2;
        if (want.avatar && !want.popped && !motionOff() && window.anime && window.anime.animate) {
          const pic = document.querySelector(".sp-artist-pfp");
          if (pic) {
            want.popped = true;
            try { window.anime.animate(pic, { scale: [0.82, 1], opacity: [0, 1], ease: veilSpring(0.5, 760) }); } catch (err) {}
          }
        }
      }
    };
    try {
      const found = await ytApi("search?" + new URLSearchParams({ q: name, type: "channel" }).toString());
      const chans = (found || []).filter(item => item && item.type === "channel" && item.authorId);
      const low = name.toLowerCase();
      const chan = chans.find(item => String(item.author || "").toLowerCase() === low) || chans.find(item => !/ - topic$/i.test(item.author || "")) || chans[0];
      if (!chan) throw new Error("no channel");
      if (ui.artistYT !== want) return;
      want.title = chan.author;
      want.found = true;
      want.avatar = ytBest(chan.authorThumbnails, 176);
      want.subs = chan.subCount || 0;
      bump();
      const id = encodeURIComponent(chan.authorId);
      const [info, vids, rel] = await Promise.all([
        ytApi("channels/" + id).catch(() => null),
        ytApi("channels/" + id + "/videos?sort_by=popular").catch(() => null),
        ytApi("channels/" + id + "/releases").catch(() => null)
      ]);
      if (ui.artistYT !== want) return;
      if (info) {
        want.avatar = ytBest(info.authorThumbnails, 176) || want.avatar;
        want.banner = ytBest(info.authorBanners, 1060);
        want.desc = String(info.description || "").trim();
        want.subs = info.subCount || want.subs;
        want.views = info.totalViews || 0;
      }
      want.done = true;
      const rows = ((vids && (vids.videos || vids)) || []).filter(item => item && item.videoId && (item.lengthSeconds || 0) >= 60 && (item.lengthSeconds || 0) <= 720);
      rows.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      want.popular = rows.slice(0, 10).map(item => ({
        id: String(item.videoId),
        title: ytSongTitle(item.title, chan.author),
        author: chan.author,
        seconds: Number(item.lengthSeconds) || 0,
        thumb: "https://i.ytimg.com/vi/" + item.videoId + "/mqdefault.jpg",
        views: item.viewCount || 0,
        local: false
      }));
      want.albums = ((rel && rel.playlists) || []).filter(item => item && item.playlistId).slice(0, 24).map(item => ({
        src: "yt:" + item.playlistId,
        name: item.title || "Album",
        artist: chan.author,
        cover: item.playlistThumbnail || "",
        count: item.videoCount || 0
      }));
      // Keep the skeleton up until the pictures are in too (avatar, banner, the first covers and
      // song art), then the whole profile springs in at once.
      await preloadImgs([want.avatar, want.banner].concat(want.albums.slice(0, 8).map(item => prettySrc(item.cover, false)), want.popular.slice(0, 8).map(t => t.thumb)), 4000);
      if (ui.artistYT !== want) return;
      want.ready = true;
      bump();
    } catch (err) {
      console.warn("[Veil music] Artist page: couldn't load YouTube channel for \"" + name + "\": " + (err && err.message || err));
      if (ui.artistYT === want) {
        want.failed = true;
        bump();
      }
    }
  }
  let videoToken = 0;
  function closeVideo(resume) {
    videoToken += 1;
    const vid = videoPanel && videoPanel.querySelector("[data-video-el]");
    if (vid) {
      vid.onerror = null;
      try { vid.pause(); } catch (err) {}
      vid.removeAttribute("src");
    }
    if (videoPanel) {
      videoPanel.hidden = true;
      videoPanel.style.opacity = "";
    }
    if (resume && ui.videoWasPlaying) {
      ui.videoWasPlaying = false;
      try { if (!api.snap().playing) api.toggle(); } catch (err) {}
    } else ui.videoWasPlaying = false;
    const btn = root.querySelector("[data-video]");
    if (btn) btn.classList.remove("on");
  }
  function fadeVideo(track) {
    if (track && track.id) {
      if (!window.__veilNoVideo) window.__veilNoVideo = {};
      window.__veilNoVideo[track.id] = 1;
    }
    const btn = root.querySelector("[data-video]");
    if (btn) btn.classList.add("is-gone");
    const dockBtn = document.querySelector("[data-dock-video]");
    if (dockBtn) dockBtn.classList.add("is-gone");
    const anime = window.anime;
    if (!videoPanel || videoPanel.hidden || motionOff() || !anime || !anime.animate) {
      closeVideo(true);
      return;
    }
    try { anime.animate(videoPanel, { opacity: [1, 0], ease: veilSpring(0.16, 380) }); } catch (err) {}
    setTimeout(() => closeVideo(true), 320);
  }
  function openLyrics(force) {
    const open = force == null ? lyricFrame.hidden : !!force;
    const anime = window.anime;
    const stopFrame = () => {
      (lyricFrame._veilOpen || []).forEach(job => { try { if (job && job.cancel) job.cancel(); } catch (err) {} });
      lyricFrame._veilOpen = [];
      clearTimeout(lyricFrame._veilHide);
    };
    // The frame grows out of the lyrics button: origin at the button, rising and scaling up on the
    // tab-bar spring while it fades in, then the first lines drift up into place behind it.
    const aimOrigin = () => {
      const btn = root.querySelector("[data-lyrics-toggle]");
      const fr = lyricFrame.getBoundingClientRect();
      const br = btn && btn.getBoundingClientRect();
      if (br && br.width && fr.width) {
        const ox = Math.max(0, Math.min(fr.width, br.left + br.width / 2 - fr.left));
        const oy = Math.max(0, Math.min(fr.height * 1.15, br.top + br.height / 2 - fr.top));
        lyricFrame.style.transformOrigin = ox.toFixed(0) + "px " + oy.toFixed(0) + "px";
      } else lyricFrame.style.transformOrigin = "50% 100%";
    };
    if (!open) {
      if (!motionOff() && anime && anime.animate && !lyricFrame.hidden) {
        stopFrame();
        aimOrigin();
        try {
          lyricFrame._veilOpen = [
            anime.animate(lyricFrame, { opacity: 0, duration: 220, ease: "inQuad" }),
            anime.animate(lyricFrame, { translateY: 26, scale: 0.92, ease: veilTabSpring("exit") })
          ];
        } catch (err) {}
        lyricFrame._veilHide = setTimeout(() => {
          stopFrame();
          lyricFrame.hidden = true;
          lyricFrame.style.opacity = "";
          lyricFrame.style.transform = "";
        }, 300);
      } else lyricFrame.hidden = true;
      const lyricBtn = root.querySelector("[data-lyrics-toggle]");
      if (lyricBtn) lyricBtn.classList.remove("on");
      return;
    }
    const wasHidden = lyricFrame.hidden;
    stopFrame();
    lyricFrame.hidden = false;
    lyricFrame.style.opacity = "";
    if (!motionOff() && anime && anime.animate) {
      aimOrigin();
      try {
        const lines = Array.from(lyricFrame.querySelectorAll(".sp-lyrics > *")).slice(0, 14);
        lyricFrame._veilOpen = [
          anime.animate(lyricFrame, { opacity: [wasHidden ? 0 : Number(getComputedStyle(lyricFrame).opacity) || 0, 1], duration: 260, ease: "outQuad" }),
          anime.animate(lyricFrame, { translateY: [wasHidden ? 48 : 26, 0], scale: [wasHidden ? 0.88 : 0.94, 1], ease: veilSpring(0.3, 640) })
        ];
        if (lines.length && anime.stagger) {
          lyricFrame._veilOpen.push(anime.animate(lines, { opacity: [0, 1], translateY: [18, 0], delay: anime.stagger(28, { start: 90 }), ease: veilSpring(0.24, 760), onComplete: () => lines.forEach(n => { n.style.opacity = ""; if (!n._veilLine) n.style.transform = ""; }) }));
        }
      } catch (err) {}
    }
    const lyricBtn = root.querySelector("[data-lyrics-toggle]");
    if (lyricBtn) lyricBtn.classList.add("on");
    const track = api.snap().track;
    if (!track || ui.lyricFor !== track.id) loadLyrics(track);
    const bg = lyricFrame.querySelector("[data-lyric-bg]");
    if (bg) bg.style.backgroundImage = track && track.thumb ? "url(\"" + String(prettySrc(track.thumb, true)).replace(/"/g, "") + "\")" : "";
  }
  window.__veilCloseVideo = closeVideo;
  let skipClick = false;
  root.addEventListener("click", event => {
    if (skipClick) {
      skipClick = false;
      return;
    }
    const lyricLine = event.target.closest(".sp-line");
    if (lyricLine && lyricFrame.contains(lyricLine)) {
      const at = Number(lyricLine.getAttribute("data-t"));
      if (at >= 0) api.seekTo(at);
      return;
    }
    if (event.target.closest("[data-lyric-close]")) {
      openLyrics(false);
      return;
    }
    if (event.target.closest("[data-video-close]")) {
      closeVideo(true);
      return;
    }
    if (event.target.closest("[data-lyrics-toggle]")) {
      openLyrics();
      return;
    }
    const queued = event.target.closest("[data-queue-index]");
    if (queued) {
      const snap = api.snap();
      api.play(snap.queue || [], Number(queued.getAttribute("data-queue-index")));
      return;
    }
    const artistBtn = event.target.closest("[data-artist]");
    if (artistBtn) {
      const name = artistBtn.getAttribute("data-artist") || "";
      if (name) {
        openArtist(name);
        return;
      }
    }
    const playCard = event.target.closest("[data-play-card]");
    if (playCard) {
      const id = playCard.getAttribute("data-play-card");
      const item = albumOf(id);
      if (ui.playingFrom === "album:" + id && api.snap().track) { api.toggle(); return; }
      if (item && (item.tracks || []).length) {
        ui.playingFrom = "album:" + id;
        api.play(item.tracks, 0);
      }
      return;
    }
    const topPlay = event.target.closest("[data-top-play]");
    if (topPlay) {
      const snap = api.snap();
      const id = topPlay.getAttribute("data-pp-track");
      if (snap.track && snap.track.id === id) api.toggle();
      else {
        ui.playingFrom = "";
        api.play(snap.results || [], 0);
      }
      // Optimistic morph so the icon answers the click straight away, before audio starts.
      veilPPSet(topPlay, !(snap.track && snap.track.id === id && snap.playing));
      return;
    }
    const descMore = event.target.closest("[data-artist-more]");
    if (descMore) {
      const desc = descMore.parentNode.querySelector(".sp-artist-desc");
      if (!desc) return;
      const before = desc.getBoundingClientRect().height;
      ui.artistDescOpen = !desc.classList.contains("is-open");
      desc.classList.toggle("is-open", ui.artistDescOpen);
      descMore.textContent = ui.artistDescOpen ? "Less" : "More";
      const after = desc.getBoundingClientRect().height;
      const anime = window.anime;
      if (!motionOff() && anime && anime.animate && Math.abs(after - before) > 1) {
        desc.style.overflow = "hidden";
        try {
          anime.animate(desc, { height: [before, after], ease: veilSpring(0.3, 640), onComplete: () => { desc.style.height = ""; desc.style.overflow = ""; } });
        } catch (err) { desc.style.height = ""; }
      }
      return;
    }
    const artistOpen = event.target.closest("[data-open-artist]");
    if (artistOpen) {
      openArtist(artistOpen.getAttribute("data-open-artist"));
      return;
    }
    if (event.target.closest("[data-top-open]")) {
      const results = api.snap().results || [];
      if (results[0]) openTrackAlbum(results[0]);
      return;
    }
    const fold = event.target.closest("[data-fold]");
    if (fold) {
      const id = fold.getAttribute("data-fold");
      const now = Date.now();
      if (ui.foldAt[id] && now - ui.foldAt[id] < 220) return;
      ui.foldAt[id] = now;
      // The open state flips right away, so a repaint or a second click mid-animation always
      // sees where the folder is heading, never where it was.
      const opening = ui.open[id] === false;
      ui.open[id] = opening;
      saveFolds();
      ui.animFold = id;
      ui.foldDir = opening ? "open" : "close";
      full(false);
      return;
    }
    const openAlbum = event.target.closest("[data-open-album]");
    const openFolder = event.target.closest("[data-open-folder]");
    const go = event.target.closest("[data-go]");
    const made = event.target.closest("[data-new]");
    if (openAlbum) {
      ui.page = "album";
      ui.albumId = openAlbum.getAttribute("data-open-album");
      full(true);
      return;
    }
    if (openFolder && !event.target.closest("[data-edit-folder]")) {
      ui.page = "folder";
      ui.folderId = openFolder.getAttribute("data-open-folder");
      if (ui.open[ui.folderId] === false && !ui.folding[ui.folderId]) { ui.animFold = ui.folderId; ui.foldDir = "open"; }
      ui.open[ui.folderId] = true;
      saveFolds();
      full(true);
      return;
    }
    if (go) {
      ui.page = go.getAttribute("data-go");
      full(true);
      return;
    }
    const maker = event.target.closest("[data-make]");
    if (maker) {
      const menu = side.querySelector("[data-make-menu]");
      if (menu) toggleMakeMenu(menu, menu.hidden);
      return;
    }
    if (!event.target.closest("[data-make-menu]")) {
      const menu = side.querySelector("[data-make-menu]");
      if (menu && !menu.hidden) toggleMakeMenu(menu, false);
    }
    if (made) {
      const menu = side.querySelector("[data-make-menu]");
      if (menu && !menu.hidden) toggleMakeMenu(menu, false);
      const kind = made.getAttribute("data-new");
      ui.cover = "";
      askName(kind === "folder" ? "New folder" : "New album", "", true, name => {
        const cover = ui.cover || "";
        if (kind === "folder") api.createFolder(name, cover);
        else {
          ui.page = "album";
          ui.albumId = api.createAlbum(name, cover);
        }
        ui.cover = "";
        full(true);
      });
      return;
    }
    if (event.target.closest("[data-edit-album]")) {
      const item = albumOf(ui.albumId);
      if (!item) return;
      ui.cover = item.cover || "";
      askName("Edit album", item.name, true, name => {
        api.updateAlbum(item.id, { name: name, cover: ui.cover || "" });
        ui.cover = "";
        full(true);
      }, () => {
        api.deleteAlbum(item.id);
        ui.page = "home";
        full(true);
      });
      return;
    }
    const editFolder = event.target.closest("[data-edit-folder]");
    if (editFolder) {
      const id = editFolder.getAttribute("data-edit-folder");
      const item = folderOf(id);
      if (!item) return;
      ui.cover = item.cover || "";
      askName("Edit folder", item.name, true, name => {
        api.renameFolder(id, name, ui.cover || "");
        ui.cover = "";
        full(false);
      }, () => {
        api.deleteFolder(id);
        if (ui.folderId === id) ui.page = "home";
        full(true);
      });
      return;
    }
    const ralbumPlay = event.target.closest("[data-ralbum-play]");
    if (ralbumPlay) {
      const src = ralbumPlay.getAttribute("data-ralbum-play");
      if (ui.playingFrom === "ralbum:" + src && api.snap().track) { api.toggle(); return; }
      const hit = ralbumMeta(src);
      if (hit) openRemoteAlbum(hit, true);
      return;
    }
    const ralbum = event.target.closest("[data-ralbum]");
    if (ralbum) {
      const hit = ralbumMeta(ralbum.getAttribute("data-ralbum"));
      if (hit) openRemoteAlbum(hit, false);
      return;
    }
    if (event.target.closest("[data-play-ralbum]")) {
      const tracks = (ui.remote && ui.remote.tracks) || [];
      if (ui.remote && ui.playingFrom === "ralbum:" + ui.remote.src && api.snap().track) { api.toggle(); return; }
      if (tracks.length) {
        ui.playingFrom = "ralbum:" + ui.remote.src;
        api.play(tracks, 0);
      }
      return;
    }
    if (event.target.closest("[data-save-ralbum]")) {
      const meta = ui.remote;
      if (!meta || !(meta.tracks || []).length) return;
      const have = api.albumBySrc && api.albumBySrc(meta.src);
      if (have) {
        ui.page = "album";
        ui.albumId = have;
        full(true);
        return;
      }
      api.saveRemoteAlbum({ src: meta.src, name: meta.name, artist: meta.artist, cover: meta.cover, tracks: meta.tracks });
      full(false);
      const again = main.querySelector("[data-save-ralbum]");
      if (again && window.anime && window.anime.animate && !motionOff()) {
        try { window.anime.animate(again, { scale: [0.9, 1], ease: veilTabSpring("select") }); } catch (err) {}
      }
      return;
    }
    // The whole song card plays the song; only its own buttons (like, add, remove) and the
    // artist link do something else.
    const songHit = event.target.closest(".sp-song");
    const playIndex = event.target.closest("[data-play-index]") || (songHit && main.contains(songHit) && !event.target.closest(".sp-x, button:not(.meta), [data-artist], input") ? songHit : null);
    if (playIndex) {
      const index = Number(playIndex.getAttribute("data-play-index") || playIndex.getAttribute("data-index"));
      const tracks = ui.page === "ralbum" ? ((ui.remote && ui.remote.tracks) || []) : ui.page === "album" ? ((albumOf(ui.albumId) || {}).tracks || []) : ui.page === "liked" ? (lib().liked || []) : ui.page === "artist" ? artistTracks() : (api.snap().results || []);
      ui.playingFrom = ui.page === "album" ? "album:" + ui.albumId : ui.page === "ralbum" && ui.remote ? "ralbum:" + ui.remote.src : "";
      api.play(tracks, index);
      return;
    }
    if (event.target.closest("[data-play-album]")) {
      const tracks = (albumOf(ui.albumId) || {}).tracks || [];
      if (ui.playingFrom === "album:" + ui.albumId && api.snap().track) { api.toggle(); return; }
      if (tracks.length) {
        ui.playingFrom = "album:" + ui.albumId;
        api.play(tracks, 0);
      }
      return;
    }
    if (event.target.closest("[data-play-liked]")) {
      const tracks = lib().liked || [];
      if (tracks.length) api.play(tracks, 0);
      return;
    }
    const add = event.target.closest("[data-add], [data-bar-add]");
    if (add) {
      const id = add.getAttribute("data-add") || ((api.snap().track || {}).id || "");
      const track = trackById(id);
      if (track) {
        popBtn(add, false);
        openAdd(add, track);
      }
      return;
    }
    const like = event.target.closest("[data-like], [data-bar-like]");
    if (like) {
      const id = like.getAttribute("data-like") || ((api.snap().track || {}).id || "");
      const track = trackById(id);
      if (track) {
        const was = api.isLiked(track.id);
        api.like(track);
        popLike(track.id, !was);
      }
      return;
    }
    const unlike = event.target.closest("[data-unlike]");
    if (unlike) {
      const track = (lib().liked || []).find(item => item.id === unlike.getAttribute("data-unlike"));
      const row = unlike.closest(".sp-song");
      if (track) {
        if (row && window.veilMotion && window.veilMotion.ok()) window.veilMotion.exit(row, () => api.like(track));
        else api.like(track);
      }
      return;
    }
    const remove = event.target.closest("[data-remove-track]");
    if (remove) {
      const at = Number(remove.getAttribute("data-remove-track"));
      const album = ui.albumId;
      const row = remove.closest(".sp-song");
      if (row && window.veilMotion && window.veilMotion.ok()) window.veilMotion.exit(row, () => api.removeTrack(album, at));
      else api.removeTrack(album, at);
    }
  });
  root.addEventListener("submit", event => {
    const form = event.target.closest("[data-search]");
    if (!form) return;
    event.preventDefault();
    ui.query = form.querySelector("[data-q]").value.trim();
    ui.page = "home";
    gateStart(ui.query);
    api.search(ui.query);
    searchAlbums(ui.query);
    searchArtists(ui.query);
    full(false);
  });
  // Song cards grow as one piece (title, art and their like / add buttons together), like the
  // album cards, so the buttons inside a card don't also grow on their own.
  const SONG_HOVER = 1.014;
  let hoverSyncAt = 0;
  function hoverSync(except) {
    hoverSyncAt = 0;
    root.querySelectorAll(".sp-song.is-hover, .sp-topwrap.is-hover").forEach(el => {
      if (el === except) return;
      let on = false;
      try { on = el.matches(":hover"); } catch (err) {}
      if (on) return;
      el.classList.remove("is-hover");
      glide(el, 1, true);
    });
    grown.forEach(el => {
      if (el === except) return;
      if (!el.isConnected) { grown.delete(el); return; }
      let on = false;
      try { on = el.matches(":hover"); } catch (err) {}
      if (!on) glide(el, 1, el.matches(".sp-song, .sp-topwrap"));
    });
  }
  const hoverSyncSoon = () => { if (!hoverSyncAt) hoverSyncAt = requestAnimationFrame(() => hoverSync()); };
  root.addEventListener("pointerover", event => {
    const song = event.target.closest(".sp-song, .sp-topwrap");
    if (song && !song.contains(event.relatedTarget)) {
      // Only one row is ever lit: any other row still marked hovered (its pointerout was lost to a
      // re-render or a scroll) drops back first.
      hoverSync(song);
      song.classList.add("is-hover");
      glide(song, SONG_HOVER, true);
    } else hoverSyncSoon();
  });
  root.addEventListener("pointerleave", () => hoverSync());
  root.addEventListener("scroll", () => { clearTimeout(root._veilHoverScroll); root._veilHoverScroll = setTimeout(() => hoverSync(), 90); }, true);
  root.addEventListener("pointerout", event => {
    const song = event.target.closest(".sp-song, .sp-topwrap");
    if (song && !song.contains(event.relatedTarget)) {
      song.classList.remove("is-hover");
      glide(song, 1, true);
    }
  });
  root.addEventListener("pointerover", event => {
    if (event.target.closest(".sp-song, .sp-topwrap") && !event.target.closest(".sp-top-play")) return;
    const btn = event.target.closest("button, .sp-card, .sp-q, .sp-nav, .sp-top");
    // Text buttons (song titles, artist links) don't grow on hover: scaling a wide title button
    // pushed its text over the cover art next to it. Their titles scroll inside their own box.
    if (btn && btn.matches(".meta, .sp-artist")) return;
    if (!btn || btn.disabled || btn.contains(event.relatedTarget)) return;
    glide(btn, 1.012);
  });
  root.addEventListener("pointerout", event => {
    if (event.target.closest(".sp-song, .sp-topwrap") && !event.target.closest(".sp-top-play")) return;
    const btn = event.target.closest("button, .sp-card, .sp-q, .sp-nav, .sp-top");
    // Text buttons (song titles, artist links) don't grow on hover: scaling a wide title button
    // pushed its text over the cover art next to it. Their titles scroll inside their own box.
    if (btn && btn.matches(".meta, .sp-artist")) return;
    if (!btn || btn.contains(event.relatedTarget)) return;
    glide(btn, 1);
  });
  root.addEventListener("pointerdown", event => {
    const song = event.target.closest(".sp-song, .sp-topwrap");
    if (song && !event.target.closest(".sp-x, .sp-exp, .sp-top-play")) {
      glide(song, 0.99, true);
      return;
    }
    const btn = event.target.closest("button, .sp-card, .sp-q, .sp-nav");
    if (btn && !btn.disabled && !btn.matches(".sp-top")) glide(btn, 0.986);
  });
  root.addEventListener("pointerup", event => {
    const song = event.target.closest(".sp-song, .sp-topwrap");
    if (song && !event.target.closest(".sp-x, .sp-exp, .sp-top-play")) {
      glide(song, song.matches(":hover") ? SONG_HOVER : 1, true);
      return;
    }
    const btn = event.target.closest("button, .sp-card, .sp-q, .sp-nav");
    if (btn && !btn.matches(".sp-top")) glide(btn, btn.matches(":hover") ? 1.012 : 1);
  });
  let drag = null;
  root.addEventListener("dragstart", event => {
    if (event.target.closest(".sp-x, [data-bar-like], [data-bar-add]")) {
      event.preventDefault();
      return;
    }
    const el = event.target.closest("[data-kind]");
    if (!el || el.getAttribute("draggable") === "false") return;
    drag = { kind: el.getAttribute("data-kind"), id: el.getAttribute("data-id") || "", index: Number(el.getAttribute("data-index")) };
    skipClick = true;
    event.dataTransfer.effectAllowed = "move";
    try { event.dataTransfer.setData("text/plain", drag.id || String(drag.index)); } catch (err) {}
    el.style.opacity = "0.55";
  });
  root.addEventListener("dragend", event => {
    const el = event.target.closest("[data-kind]");
    if (el) el.style.opacity = "";
    root.querySelectorAll(".sp-drop").forEach(node => node.classList.remove("sp-drop"));
    drag = null;
    setTimeout(() => { skipClick = false; }, 80);
  });
  root.addEventListener("dragover", event => {
    if (!drag) return;
    const el = event.target.closest("[data-kind]");
    if (!el) return;
    const kind = el.getAttribute("data-kind");
    const ok = (drag.kind === "track" && kind === "track" && ui.page === "album")
      || (drag.kind === "folder" && kind === "folder" && el.getAttribute("data-id") !== drag.id)
      || (drag.kind === "album" && (kind === "folder" || kind === "shelf"))
      || (drag.kind === "album" && kind === "album" && el.getAttribute("data-id") !== drag.id);
    if (!ok) return;
    event.preventDefault();
    root.querySelectorAll(".sp-drop").forEach(node => node.classList.remove("sp-drop"));
    el.classList.add("sp-drop");
  });
  root.addEventListener("drop", event => {
    const el = event.target.closest("[data-kind]");
    if (!drag || !el) return;
    event.preventDefault();
    const kind = el.getAttribute("data-kind");
    if (drag.kind === "track" && kind === "track" && ui.page === "album") {
      api.moveTrack(ui.albumId, drag.index, Number(el.getAttribute("data-index")));
      return;
    }
    if (drag.kind === "folder" && kind === "folder" && el.getAttribute("data-id") !== drag.id) {
      api.placeFolder(drag.id, el.getAttribute("data-id"));
      return;
    }
    if (drag.kind !== "album") return;
    if (kind === "shelf" || kind === "folder") {
      api.placeAlbum(drag.id, el.getAttribute("data-id") || "", "");
      return;
    }
    if (kind === "album" && el.getAttribute("data-id") !== drag.id) {
      api.placeAlbum(drag.id, el.getAttribute("data-folder") || "", el.getAttribute("data-id"));
    }
  });
  root.querySelector("[data-prev]").onclick = () => api.prev();
  root.querySelector("[data-next]").onclick = () => api.next();
  root.querySelector("[data-toggle]").onclick = () => api.toggle();
  function pushVolume(value, from) {
    api.volume(value);
    const pct = String(Math.round(Math.max(0, Math.min(1, value)) * 100));
    [root.querySelector("[data-vol]"), document.querySelector("#spDock [data-dock-vol]")].forEach(input => {
      if (!input || input === from) return;
      input.value = pct;
      syncRangeKnob(input, false);
    });
  }
  root.querySelector("[data-vol]").oninput = event => pushVolume(Number(event.target.value) / 100, event.target);
  const seek = root.querySelector("[data-seek]");
  seek.addEventListener("input", () => api.seek(Number(seek.value) / 1000));
  dressRangeInput(seek);
  dressRangeInput(root.querySelector("[data-vol]"));
  // Belt and braces for the play/pause icons: repaint straight from the audio element's own
  // play/pause/ended events (capture phase, media events don't bubble), not only from the
  // player's change feed.
  const onMediaState = event => {
    if (!pane.isConnected) {
      ["play", "playing", "pause", "ended", "emptied"].forEach(kind => document.removeEventListener(kind, onMediaState, true));
      return;
    }
    if (!event.target || !event.target.matches || !event.target.matches("audio[data-audio]")) return;
    requestAnimationFrame(() => {
      try { paintBar(); } catch (err) {}
      try { if (window.__veilSyncDock) window.__veilSyncDock(); } catch (err) {}
    });
  };
  ["play", "playing", "pause", "ended", "emptied"].forEach(kind => document.addEventListener(kind, onMediaState, true));
  const off = api.on(() => {
    if (!pane.isConnected) {
      off();
      return;
    }
    const next = signature();
    if (next !== sig) full(false);
    else paintBar();
  });
  const offTick = api.onTick(audio => {
    if (!pane.isConnected) {
      offTick();
      return;
    }
    const known = Number(root.dataset.seconds) || 0;
    const dur = audio.duration && isFinite(audio.duration) ? audio.duration : known;
    root.querySelector("[data-cur]").textContent = api.clock(audio.currentTime);
    root.querySelector("[data-dur]").textContent = api.clock(dur);
    if (dur && !seek.__veilDrag) {
      seek.value = String(Math.round(((audio.currentTime || 0) / dur) * 1000));
      syncRangeKnob(seek, false);
    }
    tickLyrics(audio.currentTime || 0);
  });
  root.addEventListener("error", event => {
    const img = event.target;
    if (!img || img.tagName !== "IMG") return;
    const fallback = img.getAttribute("data-fb");
    if (!fallback || img.getAttribute("src") === fallback) return;
    img.removeAttribute("data-fb");
    img.src = fallback;
  }, true);
  lyricFrame.onclick = event => {
    const line = event.target.closest(".sp-line");
    if (line) {
      const at = Number(line.getAttribute("data-t"));
      if (at >= 0) api.seekTo(at);
      return;
    }
    if (event.target.closest("[data-lyric-close]")) openLyrics(false);
  };
  lyricFrame.onpointerdown = event => {
    const line = event.target.closest(".sp-line");
    if (line) {
      glide(line, 0.992);
      return;
    }
    const btn = event.target.closest("button");
    if (btn) glide(btn, 0.986);
  };
  lyricFrame.onpointerup = event => {
    const line = event.target.closest(".sp-line");
    if (line) glide(line, 1);
    const btn = event.target.closest("button");
    if (btn) glide(btn, btn.matches(":hover") ? 1.012 : 1);
  };
  lyricFrame.onpointerout = event => {
    const line = event.target.closest(".sp-line");
    if (line && !line.contains(event.relatedTarget)) glide(line, 1);
  };
  if (videoPanel) {
    videoPanel.onclick = event => {
      if (event.target.closest("[data-video-close]")) closeVideo(true);
    };
  }
  function musicPaneOn() {
    if (document.body.dataset.veilView !== "entertainment") return false;
    const paneOn = document.querySelector('.ent-pane[data-pane="music"]');
    return !!(paneOn && paneOn.classList.contains("on"));
  }
  function ensureDock() {
    let dock = document.getElementById("spDock");
    if (dock && !dock.querySelector("[data-dock-vol]")) {
      dock.remove();
      dock = null;
    }
    if (dock) return dock;
    dock = document.createElement("div");
    dock.id = "spDock";
    dock.className = "sp-dock";
    dock.hidden = true;
    dock.innerHTML = '<div class="sp-dock-line"></div><div class="sp-dock-card"><button type="button" class="sp-dock-id" data-dock-open><span class="sp-art sp-ph" data-dock-art>' + ico("music_default.svg") + '</span><span class="sp-dock-meta"><b data-dock-title>Nothing playing</b><small data-dock-by></small></span></button><div class="sp-dock-controls"><button type="button" data-dock-prev aria-label="Previous">' + ico("skip-back.svg") + '</button><button type="button" class="play" data-dock-toggle aria-label="Play">' + veilPPIcon(false) + '</button><button type="button" data-dock-next aria-label="Next">' + ico("skip-next.svg") + '</button></div><div class="sp-dock-seek"><span data-dock-cur>0:00</span><input data-dock-seek type="range" min="0" max="1000" value="0" aria-label="Position"><span data-dock-dur>0:00</span></div><input class="sp-dock-vol" data-dock-vol type="range" min="0" max="100" value="100" aria-label="Volume"><button type="button" data-dock-lyrics aria-label="Lyrics">' + ico("lyrics.svg") + '</button></div>';
    document.body.appendChild(dock);
    // One spring drives one number (--dock-p) that both the bar and the card read, so they slide
    // down together and back up together, and a new hover simply retargets the running spring.
    const state = { p: 0 };
    const moveDock = to => {
      if (dock._veilDockJob && dock._veilDockJob.cancel) {
        try { dock._veilDockJob.cancel(); } catch (err) {}
      }
      dock._veilDockJob = null;
      const anime = window.anime;
      if (motionOff() || !anime || !anime.animate) {
        state.p = to;
        dock.style.setProperty("--dock-p", String(to));
        return;
      }
      try {
        dock._veilDockJob = anime.animate(state, {
          p: to,
          ease: to ? veilTabSpring("slide") : veilTabSpring("exit"),
          onUpdate: () => dock.style.setProperty("--dock-p", state.p.toFixed(4))
        });
      } catch (err) {
        state.p = to;
        dock.style.setProperty("--dock-p", String(to));
      }
    };
    dock.__veilDockMove = moveDock;
    const openDock = () => {
      if (dock.hidden || dock.classList.contains("is-open")) return;
      dock.classList.add("is-open");
      moveDock(1);
    };
    const line = dock.querySelector(".sp-dock-line");
    if (line) line.addEventListener("pointerenter", openDock);
    dock.addEventListener("pointerenter", openDock);
    dock.addEventListener("pointerleave", () => {
      if (!dock.classList.contains("is-open")) return;
      dock.classList.remove("is-open");
      moveDock(0);
    });
    return dock;
  }
  function syncDock() {
    const dock = ensureDock();
    const snap = api.snap();
    const track = snap.track;
    const show = !!(track && (snap.playing || (snap.currentTime || 0) > 0.15) && !musicPaneOn());
    dock.hidden = !show;
    if (!show && dock.classList.contains("is-open")) {
      dock.classList.remove("is-open");
      if (dock.__veilDockMove) dock.__veilDockMove(0);
    }
    const id = track && track.id || "";
    if (dock.dataset.track !== id) {
      dock.dataset.track = id;
      try { loadLyrics(track); } catch (err) {}
      const bg = document.querySelector("#spLyricFrame [data-lyric-bg]");
      if (bg) bg.style.backgroundImage = track && track.thumb ? "url(\"" + String(prettySrc(track.thumb, true)).replace(/"/g, "") + "\")" : "";
    }
    const title = dock.querySelector("[data-dock-title]");
    setTitle(title, track ? (track.title || "Untitled") : "Nothing playing");
    const by = dock.querySelector("[data-dock-by]");
    if (by) by.textContent = track && track.author ? track.author : "";
    const artEl = dock.querySelector("[data-dock-art]");
    const src = track && track.thumb ? prettySrc(track.thumb, false) : "";
    if (artEl) {
      const img = artEl.querySelector("img");
      const shown = img ? (img.getAttribute("src") || "") : "";
      if (src !== shown) artEl.innerHTML = src ? '<img alt="" src="' + escapeHTML(src) + '">' : ico("music_default.svg");
    }
    const toggle = dock.querySelector("[data-dock-toggle]");
    if (toggle) {
      veilPPSet(toggle, snap.playing);
      toggle.setAttribute("aria-label", snap.playing ? "Pause" : "Play");
    }
    const videoBtn = dock.querySelector("[data-dock-video]");
    if (videoBtn) {
      const gone = !track || !!track.local || !!(window.__veilNoVideo && track && window.__veilNoVideo[track.id]);
      videoBtn.classList.toggle("is-gone", gone);
      videoBtn.disabled = gone;
    }
    const known = snap.duration || (track && track.seconds) || 0;
    const durEl = dock.querySelector("[data-dock-dur]");
    if (durEl) durEl.textContent = api.clock(known);
    const vol = dock.querySelector("[data-dock-vol]");
    if (vol && !vol.__veilDrag) {
      const next = String(Math.round((snap.volume == null ? 1 : snap.volume) * 100));
      if (vol.value !== next) {
        vol.value = next;
        syncRangeKnob(vol, false);
      }
    }
  }
  function syncDockTime(audio) {
    const dock = document.getElementById("spDock");
    if (!dock || dock.hidden) return;
    const cur = dock.querySelector("[data-dock-cur]");
    const durEl = dock.querySelector("[data-dock-dur]");
    const seek = dock.querySelector("[data-dock-seek]");
    const known = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
    if (cur) cur.textContent = api.clock(audio.currentTime || 0);
    if (durEl && known) durEl.textContent = api.clock(known);
    if (seek && known && !seek.__veilDrag) {
      seek.value = String(Math.round(((audio.currentTime || 0) / known) * 1000));
      syncRangeKnob(seek, false);
    }
  }
  const dock = ensureDock();
  window.__veilLoadLyrics = loadLyrics;
  window.__veilSyncDock = syncDock;
  window.__veilSyncDockTime = syncDockTime;
  dock.onclick = event => {
    if (event.target.closest("[data-dock-prev]")) { api.prev(); return; }
    if (event.target.closest("[data-dock-next]")) { api.next(); return; }
    if (event.target.closest("[data-dock-toggle]")) { api.toggle(); return; }
    if (event.target.closest("[data-dock-lyrics]")) { openLyrics(true); return; }
    if (event.target.closest("[data-dock-open], .sp-dock-line")) openMusicFromDock(dock);
  };
  dock.onpointerover = event => {
    const btn = event.target.closest("button");
    if (!btn || btn.contains(event.relatedTarget)) return;
    glide(btn, 1.012);
  };
  dock.onpointerout = event => {
    const btn = event.target.closest("button");
    if (!btn || btn.contains(event.relatedTarget)) return;
    glide(btn, 1);
  };
  dock.onpointerdown = event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    glide(btn, 0.986);
  };
  dock.onpointerup = event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    glide(btn, btn.matches(":hover") ? 1.012 : 1);
  };
  const dockSeek = dock.querySelector("[data-dock-seek]");
  const dockVol = dock.querySelector("[data-dock-vol]");
  dressRangeInput(dockSeek);
  dressRangeInput(dockVol);
  if (dockSeek) dockSeek.oninput = () => api.seek(Number(dockSeek.value) / 1000);
  if (dockVol) dockVol.oninput = () => pushVolume(Number(dockVol.value) / 100, dockVol);
  if (!window.__veilDockBound) {
    window.__veilDockBound = true;
    api.on(() => { if (window.__veilSyncDock) window.__veilSyncDock(); });
    api.onTick(audio => { if (window.__veilSyncDockTime) window.__veilSyncDockTime(audio); });
  }
  syncDock();
  full(false);
}

// Opening the song page from the mini player: the cover flies from the widget to its place in the
// player while the page drops in from the top on the tab spring. The widget's own motion is
// untouched; this only runs after it is clicked.
function openMusicFromDock(dock) {
  const anime = window.anime;
  const from = dock && dock.querySelector(".sp-dock-id img, .sp-dock-id .sp-art");
  const rect = from && from.getBoundingClientRect();
  const src = from && from.tagName === "IMG" ? from.currentSrc || from.src : "";
  openMusic();
  if (motionOff() || !anime || !anime.animate) return;
  requestAnimationFrame(() => {
    const pane = document.querySelector('#stageBody .ent-pane[data-pane="music"] .sp');
    if (pane) {
      pane.style.transformOrigin = "50% 0";
      try {
        anime.animate(pane, { opacity: [0, 1], duration: 280, ease: "outQuad" });
        anime.animate(pane, { translateY: [-28, 0], scale: [0.965, 1], ease: veilSpring(0.4, 720), onComplete: () => { pane.style.transform = ""; pane.style.transformOrigin = ""; } });
      } catch (err) {}
    }
    if (!src || !rect || !rect.width) return;
    const bigArt = document.querySelector(".sp-now-art img[data-now-art]:not([hidden])");
    const target = bigArt && bigArt.getBoundingClientRect().width > 40 ? bigArt : document.querySelector(".sp-bar .sp-who .sp-art");
    const to = target && target.getBoundingClientRect();
    if (!to || !to.width) return;
    const ghost = document.createElement("img");
    ghost.src = src;
    ghost.alt = "";
    ghost.style.cssText = "position:fixed;z-index:200;pointer-events:none;object-fit:cover;border-radius:6px;box-shadow:0 18px 40px rgba(0,0,0,.45);left:" + rect.left + "px;top:" + rect.top + "px;width:" + rect.width + "px;height:" + rect.height + "px;transform-origin:0 0;will-change:transform";
    document.body.appendChild(ghost);
    target.style.opacity = "0";
    const done = () => {
      target.style.opacity = "";
      try {
        anime.animate(ghost, { opacity: 0, duration: 200, ease: "outQuad", onComplete: () => ghost.remove() });
      } catch (err) { ghost.remove(); }
    };
    try {
      anime.animate(ghost, {
        translateX: to.left - rect.left,
        translateY: to.top - rect.top,
        scaleX: to.width / rect.width,
        scaleY: to.height / rect.height,
        ease: veilSpring(0.36, 780),
        onComplete: done
      });
    } catch (err) { done(); }
    setTimeout(() => { if (ghost.isConnected) done(); }, 1400);
  });
}
function openMusic() {
  const body = document.getElementById("stageBody");
  const pane = body && body.querySelector('.ent-pane[data-pane="music"]');
  if (!pane) showEntertainment();
  setVeilView("entertainment");
  showEntPane("music");
}
function showEntertainment() {
  const stage = document.getElementById("veilStage");
  const title = document.getElementById("stageTitle");
  const sw = document.getElementById("stageSwitch");
  const body = document.getElementById("stageBody");
  if (title) title.textContent = "Entertainment";
  if (sw) sw.hidden = false;
  if (body && !body.querySelector("#gamesRoot")) {
    body.innerHTML = '<div class="ent-pane on" data-pane="games"><div class="games-page" id="gamesRoot"></div></div><div class="ent-pane" data-pane="music"><div class="ent-empty"><strong>Music</strong><span>Nothing here yet.</span></div></div><div class="ent-pane" data-pane="drawing"><div class="ent-draw" data-draw></div></div><div class="ent-pane" data-pane="more"><div class="ent-empty"><strong>More</strong><span>Nothing here yet.</span></div></div>';
    try { renderGamesPage(body.querySelector("#gamesRoot")); } catch (err) {}
  }
  showEntPane("games");
  setVeilView("entertainment");
  const gamesRoot = body && body.querySelector("#gamesRoot");
  if (gamesRoot && gamesRoot.dataset.ready === "1") playStageIntro(gamesRoot, ".games-hero, .games-header, .games-section");
  fadeIn(stage);
}
function showChat() {
  const title = document.getElementById("stageTitle");
  const sw = document.getElementById("stageSwitch");
  const body = document.getElementById("stageBody");
  if (title) title.textContent = "Chat";
  if (sw) sw.hidden = true;
  if (body) {
    body.dataset.chatEnter = "1";
    body.innerHTML = '<div class="chat-page" id="chatRoot"></div>';
    try { renderChatPage(body.querySelector("#chatRoot")); } catch (err) {}
    try { bootChatLink(); } catch (err) {}
  }
  setVeilView("chat");
  fadeIn(document.getElementById("veilStage"));
}
function openBrowserSettings() {
  if (document.body.classList.contains("veil-os") && typeof window.veilOSOpenApp === "function") {
    closeMenu();
    window.veilOSOpenApp("settings");
    return;
  }
  openSettings("browser");
}
function showAdmin() {
  closeMenu();
  try { closePanels(); } catch (err) {}
  const title = document.getElementById("stageTitle");
  const sw = document.getElementById("stageSwitch");
  const body = document.getElementById("stageBody");
  if (title) title.textContent = "Admin";
  if (sw) sw.hidden = true;
  if (body) {
    const src = new URL("admin/index.html", location.href).href;
    body.innerHTML = '<iframe class="admin-frame" title="Admin" src="' + src + '"></iframe>';
  }
  setVeilView("admin");
  fadeIn(document.getElementById("veilStage"));
}
let settingsReturn = "dash";
function leaveSettings(force) {
  const backTo = force === "browser" || force === "dash" ? force : settingsReturn === "browser" ? "browser" : "dash";
  if (backTo !== "browser") {
    showDash();
    return;
  }
  const panel = document.getElementById("settingsPanel");
  const go = () => {
    quietSettingsPanel();
    const backdrop = document.getElementById("backdrop");
    if (backdrop) backdrop.classList.remove("open");
    showBrowser();
  };
  if (panel && panel.classList.contains("open") && window.anime && window.anime.animate && !motionOff()) {
    try { window.anime.animate(panel, { opacity: [1, 0], duration: 240, ease: "outCubic" }); } catch (err) {}
    setTimeout(go, 250);
  } else go();
}
function openSettings(scope) {
  wallpaperScope = scope === "browser" ? "browser" : "home";
  settingsReturn = wallpaperScope === "browser" ? "browser" : "dash";
  closeMenu();
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;
  panel.style.transition = "";
  panel.style.visibility = "";
  panel.style.opacity = "";
  panel.style.transform = "";
  panel.style.scale = "";
  panel.classList.remove("is-options");
  panel.classList.toggle("is-browser-scope", wallpaperScope === "browser");
  panel.classList.add("open", "is-page");
  if (wallpaperScope === "browser") {
    document.querySelectorAll("[data-settings-tab]").forEach(tab => {
      tab.classList.toggle("active", tab.getAttribute("data-settings-tab") === "custom");
    });
    document.querySelectorAll("[data-settings-page]").forEach(page => {
      page.classList.toggle("active", page.getAttribute("data-settings-page") === "custom");
    });
  }
  const title = panel.querySelector(".panel-head > span");
  if (title) title.textContent = "Options";
  const backdrop = document.getElementById("backdrop");
  if (backdrop) backdrop.classList.remove("open");
  const back = document.getElementById("optionsBack");
  if (back) back.title = settingsReturn === "browser" ? "Back to browser" : "Back to dashboard";
  try { highlightTheme(); } catch (err) {}
  setVeilView("options");
  requestAnimationFrame(() => moveSettingsPill(false));
  try {
    fillWispSelect();
    startLivePings();
    fillChatSettings();
    fillDesktopSettings();
  } catch (err) {}
  const body = panel.querySelector(".panel-body");
  if (body && window.anime && window.anime.animate && !motionOff()) {
    try {
      window.anime.animate(body, { opacity: [0, 1], duration: 280, ease: "outCubic" });
      setTimeout(() => { body.style.opacity = ""; }, 400);
    } catch (err) {}
  }
}
function showOptions() {
  openSettings("home");
}
function wireDash() {
  const dash = document.getElementById("veilDash");
  if (dash && !dash.dataset.wired) {
    dash.dataset.wired = "1";
    dash.addEventListener("click", event => {
      const tile = event.target.closest("[data-dash]");
      if (!tile || tile.disabled || tile.classList.contains("dash-soon")) return;
      const which = tile.getAttribute("data-dash");
      if (which === "browser") showBrowser();
      else if (which === "entertainment") confirmDevArea(showEntertainment);
      else if (which === "chat") confirmDevArea(showChat);
      else if (which === "options") showOptions();
    });
  }
  const back = document.getElementById("stageBack");
  if (back && !back.dataset.wired) {
    back.dataset.wired = "1";
    back.onclick = () => showDash();
  }
  const sw = document.getElementById("stageSwitch");
  if (sw && !sw.dataset.wired) {
    sw.dataset.wired = "1";
    sw.addEventListener("click", event => {
      const btn = event.target.closest("[data-ent]");
      if (!btn) return;
      showEntPane(btn.getAttribute("data-ent"));
    });
  }
}
wireDash();
let __veilBootPromise = null;
function bootVeilApp() {
  if (__veilBootPromise) return __veilBootPromise;
  __veilBootPromise = bootVeilAppInner();
  return __veilBootPromise;
}
async function bootVeilAppInner() {
  try {
    document.body.classList.remove("gate-lock");
    const browser = document.getElementById("browser") || document.getElementById("app");
    if (browser) {
      browser.style.display = "none";
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
  try {
    if (localStorage.getItem("veil_page_locked") === "1") lockVeil(true);
  } catch (err) {}
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
    forceHomeTab();
    const channel = new URLSearchParams(location.search).get("open");
    if (channel) {
      const kind = unwrapProxyUrl(channel) || channel;
      try {
        history.replaceState(null, "", location.pathname);
      } catch (err) {}
      if (/^https?:\/\//i.test(kind)) {
        navigate(kind);
        window.__veilOpenLink = true;
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
  setBootLine("Starting proxy…");
  try {
    await Promise.race([
      initEngine(),
      new Promise(resolve => setTimeout(resolve, 12000))
    ]);
  } catch (err) {
    const msg = String(err && err.message || err);
    if (/did not load|unavailable|Service workers/i.test(msg)) throw err;
    console.error(err);
    setBootLine("Server is waking up…");
  }
  try {
    pushAdblockToSW();
  } catch (err) {}
  setBootLine("Ready");
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
  try {
    await ensureAnime();
  } catch (err) {}
  if (window.__veilOpenLink) setVeilView("browser");
  else setVeilView("dash");
  setTimeout(function () {
    showCookieConsent().catch(function (err) {
      console.warn("cookie consent", err);
    }).then(function () {
      return showSignup();
    }).catch(function (err) {
      console.warn("signup", err);
    });
  }, 900);
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
      fillDesktopSettings();
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
      fillDesktopSettings();
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
const GAMES_CATS = ["Sports", "Adventure", "Horror", "Sandbox", "Casual", "Idle", "Racing", "Arcade", "FNF", "Emulators"];
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
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);
}
function gameId(value) {
  return value.id || gameSlug(value.name) || value.url || value.name;
}
const VEIL_GAMES_BASE = "https://rtpx101.github.io/veil-games/";
function resolveGameAsset(value) {
  if (!value) {
    return "";
  }
  value = String(value);
  if (/^veil-games:/i.test(value)) {
    return VEIL_GAMES_BASE + value.replace(/^veil-games:\/*/i, "");
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (/^\/\//.test(value)) {
    return location.protocol + value;
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
  // There is no image/games/preview folder in the repo, so guessing a path only produced 404s.
  return "";
}
function gamePlayUrl(value) {
  return resolveGameAsset(value.url || value.path || "");
}
window.veilGamePlay = function (id) {
  const game = (gamesCatalog || []).find(value => gameId(value) === id);
  return game ? gamePlayUrl(game) : "";
};
function gameOnDesktop(id) {
  try {
    const list = JSON.parse(localStorage.getItem("veil_os_apps") || "[]");
    return Array.isArray(list) && list.some(item => item && item.url === "veil-game:" + id);
  } catch (err) {
    return false;
  }
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
    }, {
      name: "Granny",
      image: "image/games/small/granny.png",
      imageLarge: "image/games/large/granny.png",
      url: "assets/granny/granny.html",
      category: "Horror",
      description: "Escape Granny's house in five days without making a sound.",
      controls: "WASD to move, mouse to look, click to interact.",
      howToPlay: "Find the items that unlock the exit and hide when Granny comes.",
      sideNotes: "Loads about 70 MB the first time. Contains jumpscares.",
      maturity: "T",
      difficulty: "6"
    }, {
      name: "FNAF",
      image: "image/games/small/fnaf.png",
      imageLarge: "image/games/large/fnaf.png",
      url: "assets/fnaf/fnaf.html",
      category: "Horror",
      description: "Survive five nights as the night guard at Freddy Fazbear's Pizza.",
      controls: "Mouse only: doors, lights, and the camera monitor.",
      howToPlay: "Watch the cameras, shut the doors in time, and save power until 6 AM.",
      sideNotes: "Loads about 160 MB the first time. Contains jumpscares.",
      maturity: "T",
      difficulty: "7"
    }, {
      name: "Pokémon Emerald",
      image: "image/games/small/pokemonemerald.png",
      imageLarge: "image/games/large/pokemonemerald.png",
      url: "assets/pokemonemerald/pokemonemerald.html",
      category: "Adventure",
      description: "Catch and train Pokémon across Hoenn and earn all eight gym badges.",
      controls: "Arrows move, Z = A, X = B, Enter = Start, V = Select.",
      howToPlay: "Battle trainers, level up your team, and challenge the gym leaders.",
      sideNotes: "Runs in the built-in GBA emulator. Save from the in-game Start menu.",
      maturity: "E",
      difficulty: "4"
    }, {
      name: "Tomb of the Mask",
      image: "image/games/small/tombofthemask.png",
      imageLarge: "image/games/large/tombofthemask.png",
      url: "assets/tombofthemask/tombofthemask.html",
      category: "Arcade",
      description: "Dash wall to wall up an endless tomb and outrun the rising flood.",
      controls: "Arrow keys to dash in a direction.",
      howToPlay: "Grab dots and coins, dodge traps, and keep climbing.",
      sideNotes: "Loads about 15 MB the first time.",
      maturity: "E",
      difficulty: "5"
    }, {
      name: "Slope",
      image: "image/games/small/slope.png",
      imageLarge: "image/games/large/slope.png",
      url: "assets/slope/slope.html",
      category: "Arcade",
      description: "Steer a speeding ball down an endless neon slope.",
      controls: "A/D or Left/Right arrows to steer.",
      howToPlay: "Stay on the track, dodge red blocks, and go as far as you can.",
      sideNotes: "Loads about 33 MB the first time.",
      maturity: "E",
      difficulty: "6"
    }, {
      name: "Minecraft",
      image: "image/games/small/minecraft.png",
      imageLarge: "image/games/large/minecraft.png",
      url: "assets/minecraft/minecraft.html",
      category: "Sandbox",
      description: "Build, mine and explore in Eaglercraft. Pick from nine versions.",
      controls: "WASD to move, mouse to look, left click breaks, right click places.",
      howToPlay: "Choose a version, make a singleplayer world, and build.",
      sideNotes: "Each version loads 16 to 75 MB the first time.",
      maturity: "E10+",
      difficulty: "4",
      versions: [
        { name: "Eaglercraft 26.2", url: "assets/minecraft/eaglercraft-26-2.html" },
        { name: "EaglercraftX 1.20.6", url: "assets/minecraft/eaglercraftx-1-20-6.html" },
        { name: "EaglercraftX 1.16", url: "assets/minecraft/eaglercraftx-1-16.html" },
        { name: "Minecraft 1.12.2", url: "assets/minecraft/minecraft-1-12-2.html" },
        { name: "Minecraft 1.11.2", url: "assets/minecraft/minecraft-1-11-2.html" },
        { name: "Minecraft 1.9", url: "assets/minecraft/minecraft-1-9.html" },
        { name: "Minecraft 1.8.8", url: "assets/minecraft/minecraft-1-8-8.html" },
        { name: "Minecraft 1.5.2", url: "assets/minecraft/minecraft-1-5-2.html" },
        { name: "Minecraft 1.7.3", url: "assets/minecraft/minecraft-1-7-3.html" }
      ]
    }, {
      name: "Basket Random",
      image: "image/games/small/basketrandom.png",
      imageLarge: "image/games/large/basketrandom.png",
      url: "assets/basketrandom/basketrandom.html",
      category: "Sports",
      description: "Chaotic 2-player basketball with ragdoll physics.",
      controls: "Player 1: W. Player 2: Up arrow.",
      howToPlay: "Score more baskets than your opponent.",
      sideNotes: "Best with a friend on the same keyboard.",
      maturity: "E",
      difficulty: "2"
    }, {
      name: "Escape Road",
      image: "image/games/small/escaperoad.png",
      imageLarge: "image/games/large/escaperoad.png",
      url: "assets/escaperoad/escaperoad.html",
      category: "Racing",
      description: "High-speed chase through traffic. Dodge the cops as long as you can.",
      controls: "A and D or the arrow keys to steer.",
      howToPlay: "Stay on the road and outrun pursuit for a high score.",
      sideNotes: "Loads about 27 MB the first time.",
      maturity: "E10+",
      difficulty: "5"
    }, {
      name: "Fallout Shelter",
      image: "image/games/small/falloutshelter.png",
      imageLarge: "image/games/large/falloutshelter.png",
      url: "https://rtpx101.github.io/veil-games/falloutshelter/falloutshelter.html",
      category: "Idle",
      description: "Build and run your own underground Vault after the bombs fall.",
      controls: "Mouse to tap and drag dwellers, wheel to zoom.",
      howToPlay: "Build rooms, assign dwellers, and keep power, food and water up.",
      sideNotes: "Experimental web port. Loads about 340 MB the first time.",
      maturity: "T",
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
    if (typeof window.veilMusicAccountSlice === "function") {
      const musicSlice = window.veilMusicAccountSlice();
      if (musicSlice) next.music = musicSlice;
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
      syncFavoriteUI(gamesRenderRoot, value);
    } catch (err) {
      try { paintGamesLists(gamesRenderRoot); } catch (e2) {}
    }
  }
}
// The star: one smooth move from wherever it is now (no jump to a start value), a short dip then a
// soft zero-velocity jiggle back, while the colour cross-fades in CSS.
function starJiggle(img) {
  const anime = window.anime;
  if (!img || motionOff() || !anime || !anime.animate) return;
  if (img._veilStar && img._veilStar.cancel) { try { img._veilStar.cancel(); } catch (err) {} }
  try {
    img._veilStar = anime.animate(img, {
      scale: [{ to: 0.74, duration: 150, ease: "outQuad" }, { to: 1, duration: 760, ease: veilSoftJiggle }],
      rotate: [{ to: -16, duration: 150, ease: "outQuad" }, { to: 0, duration: 760, ease: veilSoftJiggle }]
    });
  } catch (err) {}
}
// Favouriting updates the cards in place (no reshuffle / repaint of the whole page): the stars
// animate, a new favourite pops into the Favorites row and a removed one springs out while the rest
// slide over.
function syncFavoriteUI(root, id) {
  const on = isFavorite(id);
  root.querySelectorAll('.game-tile[data-play="' + CSS.escape(id) + '"]').forEach(tile => {
    tile.classList.toggle("fav", on);
    const btn = tile.querySelector("[data-fav]");
    if (btn) {
      btn.classList.toggle("on", on);
      starJiggle(btn.querySelector("img"));
    }
  });
  const sec = root.querySelector("#gamesFavSection");
  const row = root.querySelector("#gamesFavRow");
  if (!sec || !row) return;
  const state = root._gamesState || { activeCat: "all", query: "" };
  const allowed = state.activeCat === "all" && !state.query;
  const anime = window.anime;
  const motion = veilMotionOk();
  if (on) {
    if (!allowed || row.querySelector('.game-tile[data-play="' + CSS.escape(id) + '"]')) return;
    const game = gamesCatalog.find(g => gameId(g) === id);
    if (!game) return;
    const wasHidden = sec.style.display === "none";
    const tmp = document.createElement("div");
    tmp.innerHTML = tileHTML(game);
    const tile = tmp.firstElementChild;
    row.appendChild(tile);
    sec.style.display = "";
    if (motion) {
      if (wasHidden) veilSpringIn(sec, "rise", { bounce: 0.45, duration: 640, force: true });
      veilSpringIn(tile, "pop", { bounce: 0.5, duration: 680, force: true, delay: wasHidden ? 90 : 0 });
    }
    return;
  }
  const gone = row.querySelector('.game-tile[data-play="' + CSS.escape(id) + '"]');
  if (!gone) return;
  const finish = () => {
    const rest = Array.from(row.children).filter(el => el !== gone);
    const before = motion ? veilSnapshot(rest) : null;
    gone.remove();
    if (!row.querySelector(".game-tile")) sec.style.display = "none";
    else if (before) veilFlip(before);
  };
  if (!motion) { finish(); return; }
  gone.style.pointerEvents = "none";
  try { anime.animate(gone, { opacity: 0, scale: 0.9, ease: veilTabSpring("exit") }); } catch (err) {}
  setTimeout(finish, 230);
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
  if (document.body.classList.contains("veil-os") && typeof window.veilOSOpenApp === "function") {
    closeMenu();
    window.veilOSOpenApp("store");
    return;
  }
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
    const chat = !!meta && !!meta.isChat;
    const mode = root || !!meta && (!!meta.newTab || !!meta.isAdmin || chat);
    menuDevtools.classList.remove("is-faded");
    menuDevtools.classList.toggle("disabled", mode);
    menuDevtools.disabled = mode;
    menuDevtools.setAttribute("aria-disabled", mode ? "true" : "false");
  }
}
function tileHTML(value) {
  const icon = gameId(value);
  const title = isFavorite(icon);
  const sub = [value.category || "", maturityLabel(value)].filter(Boolean).map(escapeHTML).join('<span class="gm-dot">•</span>');
  return "<div class=\"game-tile" + (title ? " fav" : "") + "\" data-play=\"" + escapeHTML(icon) + "\" role=\"button\" tabindex=\"0\" aria-label=\"Play " + escapeHTML(value.name) + "\"><div class=\"thumb\"><img src=\"" + escapeHTML(smallThumb(value)) + "\" alt=\"\" draggable=\"false\" onerror=\"this.style.opacity=.25\"><span class=\"gm-shade\"></span><div class=\"tile-tools\"><button type=\"button\" class=\"tile-tool" + (title ? " on" : "") + "\" data-fav=\"" + escapeHTML(icon) + "\" title=\"Favorite\" aria-label=\"Favorite\"><img src=\"" + IMG + "star.svg\" alt=\"\"></button><button type=\"button\" class=\"tile-tool\" data-info=\"" + escapeHTML(icon) + "\" title=\"Info\" aria-label=\"Info\"><img src=\"" + IMG + "info.svg\" alt=\"\"></button></div><span class=\"gm-quick\" aria-hidden=\"true\">" + veilPPIcon(false) + "</span></div><div class=\"meta\"><div class=\"name\">" + escapeHTML(value.name) + "</div><div class=\"cat\">" + sub + "</div></div></div>";
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
  const gamesAllRow = value2.querySelector("#gamesAllRow");
  // Shuffle only on a new filter / first paint; other repaints keep the cards where they are.
  const shown = gamesAllRow ? Array.from(gamesAllRow.querySelectorAll(".game-tile[data-play]")).map(el => el.getAttribute("data-play")) : [];
  if (other || !shown.length) part = shuffle(part);
  else part.sort((a, b) => { const ia = shown.indexOf(gameId(a)), ib = shown.indexOf(gameId(b)); return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib); });
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
    // Filtering: the new set of cards pops in one after another with a soft spring.
    paintGameRows();
    if (veilMotionOk()) veilStaggerIn([gamesAllRow, gamesFavRow, gamesRecentRow].filter(Boolean).reduce((all, row) => all.concat(Array.from(row.querySelectorAll(".game-tile, .games-empty"))), []), "pop", { base: 0, step: 26, max: 80, bounce: 0.45, duration: 560 });
  } else {
    paintGameRows();
  }
}
async function renderGamesPage(value3) {
  if (!value3) {
    return;
  }
  gamesRenderRoot = value3;
  // Skeleton first (same shimmer and springy dots as the music page) until the catalog, your games
  // data and the pictures are in; then everything springs in together.
  const skelCard = '<div class="gm-skel-card"><i class="sk sk-cover"></i><i class="sk sk-line" style="width:70%"></i><i class="sk sk-line sk-thin" style="width:44%"></i></div>';
  value3.innerHTML = '<div class="sp-skel gm-skel" data-skel><i class="sk gm-skel-hero"></i><div class="games-inner"><div class="sp-loader"><span class="sp-loader-dots"><i></i><i></i><i></i></span><span class="sp-loader-text">Loading games…</span></div><i class="sk gm-skel-search"></i><div class="gm-skel-chips">' + Array.from({ length: 7 }, (_, i) => '<i class="sk" style="width:' + (52 + (i * 19) % 40) + 'px"></i>').join("") + '</div><i class="sk sk-line gm-skel-h"></i><div class="games-row">' + Array.from({ length: 6 }, () => skelCard).join("") + '</div></div></div>';
  let skelDots = null;
  try {
    const anime = window.anime;
    if (anime && anime.animate && !motionOff()) skelDots = anime.animate(value3.querySelectorAll(".sp-loader-dots i"), {
      translateY: [{ to: -9, duration: 300, ease: "outQuad" }, { to: 0, duration: 620, ease: veilSoftJiggle }],
      scaleY: [{ to: 1.12, duration: 300, ease: "outQuad" }, { to: 1, duration: 620, ease: veilSoftJiggle }],
      delay: anime.stagger ? anime.stagger(120) : 0,
      loop: true,
      loopDelay: 140
    });
  } catch (err) {}
  await loadGameCatalog();
  await loadGamesUserData();
  await new Promise(resolve => {
    const urls = gamesCatalog.map(smallThumb).concat(gamesCatalog.slice(0, 2).map(largeThumb)).filter(Boolean);
    let left = urls.length;
    if (!left) { resolve(); return; }
    const one = () => { if (--left <= 0) resolve(); };
    setTimeout(resolve, 4000);
    urls.forEach(src => { const img = new Image(); img.onload = img.onerror = one; img.src = src; });
  });
  try { if (skelDots && skelDots.pause) skelDots.pause(); } catch (err) {}
  if (!value3.isConnected) return;
  const handler = ["cookieclicker", "granny", "minecraft", "escaperoad", "retrobowl", "basketrandom"];
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
  value3.dataset.ready = "1";
  paintGamesLists(value3, piece);
  wireGameGlide(value3);
  value3.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches && event.target.matches(".game-tile[data-play]")) {
      event.preventDefault();
      event.target.click();
    }
  });
  if (veilMotionOk()) {
    veilSpringIn(value3.querySelector(".games-hero"), "settle", { bounce: 0.4, duration: 700, force: true });
    veilStaggerIn(value3.querySelectorAll(".games-hero-content > *"), "side", { base: 120, step: 50, max: 6, bounce: 0.45, duration: 640 });
    veilStaggerIn(value3.querySelectorAll(".games-search-wrap, .games-cat"), "drop", { base: 60, step: 22, max: 12, bounce: 0.5, duration: 560 });
    veilStaggerIn(Array.from(value3.querySelectorAll(".games-section")).filter(sec => sec.style.display !== "none").reduce((all, sec) => all.concat(Array.from(sec.querySelectorAll("h3, .game-tile"))), []), "rise", { base: 140, step: 30, max: 80, bounce: 0.45, duration: 640 });
  } else playStageIntro(value3, ".games-hero, .games-header, .games-section");
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
      if (document.body.dataset.veilView !== "entertainment" && !value3.closest("#browser")) {
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
      toggleFavorite(key.getAttribute("data-fav"));
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
// ---- Game player (round 7 redo): music-page look, springy toolbar, a stage that holds the game,
// its loading / error states and (in fullscreen) the toasts and, optionally, the music widget.
function gameSpring(el, props, bounce, duration) {
  const anime = window.anime;
  if (!el || motionOff() || !anime || !anime.animate) return null;
  try { return anime.animate(el, Object.assign({ ease: veilSpring(bounce == null ? 0.45 : bounce, duration || 620) }, props)); } catch (err) { return null; }
}
// Hover / press scale for game cards and player buttons, interruptible like the music cards.
function gameGlide(el, scale) {
  const anime = window.anime;
  if (!el || motionOff() || !anime || !anime.animate) return;
  const m = /scale\(\s*([\d.]+)/.exec(el.style.transform || "");
  const from = m ? Number(m[1]) : (el._veilScale || 1);
  if (el._veilGlide && el._veilGlide.cancel) { try { el._veilGlide.cancel(); } catch (err) {} }
  const pressing = scale < 1 && scale < from;
  try {
    el._veilGlide = anime.animate(el, { scale: [from, scale], ease: pressing ? veilSpring(0.24, 300) : veilSpring(scale >= from ? 0.48 : 0.34, 680) });
    el._veilScale = scale;
  } catch (err) {}
}
const GAME_GLIDE_SEL = ".game-tile, .games-cat, .games-play-btn, .games-more-btn, .game-player-btn, .gp-chipbtn, .gn-item, .game-note-action, .gp-retry";
function gameGlideScale(el) {
  if (el.matches(".game-tile")) return 1.035;
  if (el.matches(".gn-item")) return 1.015;
  return 1.06;
}
function wireGameGlide(root) {
  if (!root || root._veilGameGlide) return;
  root._veilGameGlide = true;
  root.addEventListener("pointerover", event => {
    const el = event.target.closest(GAME_GLIDE_SEL);
    if (!el || el.disabled || el.contains(event.relatedTarget)) return;
    gameGlide(el, gameGlideScale(el));
  });
  root.addEventListener("pointerout", event => {
    const el = event.target.closest(GAME_GLIDE_SEL);
    if (!el || el.contains(event.relatedTarget)) return;
    gameGlide(el, 1);
  });
  root.addEventListener("pointerdown", event => {
    const el = event.target.closest(GAME_GLIDE_SEL);
    if (!el || el.disabled || event.button) return;
    gameGlide(el, el.matches(".game-tile") ? 0.97 : 0.92);
  });
  root.addEventListener("pointerup", event => {
    const el = event.target.closest(GAME_GLIDE_SEL);
    if (!el) return;
    let over = false;
    try { over = el.matches(":hover"); } catch (err) {}
    gameGlide(el, over ? gameGlideScale(el) : 1);
  });
  root.addEventListener("pointerleave", () => {
    root.querySelectorAll(GAME_GLIDE_SEL).forEach(el => { if (el._veilScale && el._veilScale !== 1) gameGlide(el, 1); });
  });
}
// Fullscreen bookkeeping shared by every game stage: toasts always follow the fullscreen element
// (a fullscreen element hides everything outside it), and the music mini widget follows it too when
// the Customization option is on.
const veilFsHome = new Map();
function veilFsMove(el, into) {
  if (!el) return;
  if (into) {
    if (el.parentNode === into) return;
    if (!veilFsHome.has(el)) veilFsHome.set(el, { parent: el.parentNode, next: el.nextSibling });
    into.appendChild(el);
    return;
  }
  const home = veilFsHome.get(el);
  veilFsHome.delete(el);
  const parent = home && home.parent && home.parent.isConnected ? home.parent : document.body;
  if (el.parentNode === parent) return;
  try { parent.insertBefore(el, home && home.next && home.next.parentNode === parent ? home.next : null); } catch (err) { document.body.appendChild(el); }
}
function veilFsSync() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement || null;
  // An iframe can't show children of its own, so only real containers take them in.
  const host = fsEl && fsEl.tagName !== "IFRAME" && fsEl !== document.documentElement && fsEl !== document.body ? fsEl : null;
  try { veilFsMove(veilToastHost(), host); } catch (err) {}
  const dock = document.getElementById("spDock");
  const dockIn = !!(host && settings.gameDockFs && host.classList.contains("gp-stage"));
  if (dock) {
    veilFsMove(dock, dockIn ? host : null);
    dock.classList.toggle("is-in-game", dockIn);
  }
  // Lyrics open from the widget, so they go wherever the widget goes (else they open behind the game).
  const lyrics = document.getElementById("spLyricFrame");
  if (lyrics) {
    veilFsMove(lyrics, dockIn ? host : null);
    lyrics.classList.toggle("is-in-game", dockIn);
  }
  document.querySelectorAll(".gp-stage").forEach(stage => stage.classList.toggle("is-fs", stage === fsEl));
  veilGameKeyLock(!!(fsEl && fsEl.classList && fsEl.classList.contains("gp-stage")));
}
// While a game is fullscreen, Esc goes to the game instead of leaving fullscreen. Chromium's Keyboard
// Lock only works in real fullscreen; holding Esc still exits (the browser shows that hint itself).
// When Veil runs inside the about:blank cloak the lock has to come from the top page.
var veilKeyLockWant = false;
var veilKeyLockNav = null;
function veilGameKeyLock(on) {
  veilKeyLockWant = on;
  if (!on) {
    const nav = veilKeyLockNav;
    veilKeyLockNav = null;
    try { if (nav && nav.keyboard && nav.keyboard.unlock) nav.keyboard.unlock(); } catch (err) {}
    return;
  }
  if (veilKeyLockNav) return;
  const navs = [navigator];
  try { if (window.top !== window && window.top.navigator) navs.push(window.top.navigator); } catch (err) {}
  const attempt = i => {
    const nav = navs[i];
    if (!nav) return;
    let p = null;
    try { p = nav.keyboard && nav.keyboard.lock ? nav.keyboard.lock(["Escape"]) : null; } catch (err) { p = null; }
    if (!p || !p.then) { attempt(i + 1); return; }
    p.then(() => {
      if (!veilKeyLockWant) { try { nav.keyboard.unlock(); } catch (err) {} return; }
      veilKeyLockNav = nav;
    }).catch(() => attempt(i + 1));
  };
  attempt(0);
}
window.veilGameKeyLock = veilGameKeyLock;
document.addEventListener("fullscreenchange", veilFsSync);
document.addEventListener("webkitfullscreenchange", veilFsSync);
window.veilFsSync = veilFsSync;
function exitAnyFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen().catch(() => {});
    if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (err) {}
  return Promise.resolve();
}
function closeGamePlayer(overlay, save) {
  if (!overlay || overlay._closing) return;
  overlay._closing = true;
  let saveWait = null;
  try {
    const gameWin = overlay.querySelector("#gameFrame") && overlay.querySelector("#gameFrame").contentWindow;
    if (gameWin && typeof gameWin.veilBeforeClose === "function") saveWait = Promise.resolve(gameWin.veilBeforeClose());
  } catch (err) { saveWait = null; }
  // Stop everything that could still touch the player: load / reload checks and their timers, the
  // frame's fade-up spring, the loading dots, pending note saves.
  try { if (overlay._veilCleanup) overlay._veilCleanup(); } catch (err) {}
  try { if (save) save(); } catch (err) {}
  overlay.style.pointerEvents = "none";
  // "closing" also tells the global overlay remove() hook this one animates itself; without it the
  // hook ran a second fade from full opacity, so the game flashed back for a moment.
  overlay.classList.add("closing");
  overlay.style.animation = "none";
  const box = overlay.querySelector(".game-player");
  if (box) box.style.animation = "none";
  const stage = overlay.querySelector(".gp-stage");
  const wasFs = stage && (document.fullscreenElement === stage || document.webkitFullscreenElement === stage);
  if (wasFs) exitAnyFullscreen();
  const frame = overlay.querySelector("#gameFrame");
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (saveWait) {
      let done = false;
      const go = () => { if (done) return; done = true; dropPlayer(); };
      saveWait.then(go, go);
      setTimeout(go, 1500);
      return;
    }
    dropPlayer();
  };
  const dropPlayer = () => {
    // Blank the game only once it is out of sight, then take the player away for good.
    try { if (frame) { frame.removeAttribute("src"); frame.remove(); } } catch (err) {}
    try { Element.prototype.remove.call(overlay); } catch (err) { try { overlay.parentNode.removeChild(overlay); } catch (e2) {} }
    veilFsSync();
  };
  const anime = window.anime;
  if (motionOff() || !anime || !anime.animate) { finish(); return; }
  const from = parseFloat(getComputedStyle(overlay).opacity) || 1;
  try {
    if (box) {
      if (box._veilIn && box._veilIn.cancel) { try { box._veilIn.cancel(); } catch (err) {} box._veilIn = null; }
      anime.animate(box, { scale: 0.94, translateY: 10, ease: veilTabSpring("exit") });
    }
    anime.animate(overlay, { opacity: [from, 0], duration: 240, ease: "outQuad", onComplete: finish });
  } catch (err) { finish(); return; }
  setTimeout(() => { if (overlay.isConnected) finish(); }, 420);
}
function openGamePlayer(game) {
  const id = gameId(game);
  pushRecent(id);
  const old = document.querySelector(".game-player-overlay");
  if (old) old.remove();
  const url = gamePlayUrl(game);
  const rating = maturityLabel(game);
  const diff = game.difficulty || "—";
  const tool = (gp, icon, label, extra) => '<button type="button" class="game-player-btn" data-gp="' + gp + '" title="' + label + '" aria-label="' + label + '"' + (extra || "") + '><img src="' + IMG + icon + '" alt=""></button>';
  const overlay = document.createElement("div");
  overlay.className = "game-player-overlay gp2";
  overlay.innerHTML = '<div class="game-player" id="gamePlayer">' +
    '<div class="game-player-main">' +
      '<div class="game-player-bar">' +
        '<button type="button" class="game-player-btn gp-close" data-gp="close" title="Close" aria-label="Close"><img src="' + IMG + 'exit.svg" alt=""></button>' +
        '<img class="gp-thumb" src="' + escapeHTML(smallThumb(game)) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="game-player-title"><span class="gpt-name" title="' + escapeHTML(game.name) + '">' + escapeHTML(game.name) + '</span>' +
          '<span class="gpt-chips"><span class="gpt-mat" title="Content rating">' + escapeHTML(String(rating)) + '</span>' + (game.category ? '<span class="gpt-chip">' + escapeHTML(game.category) + '</span>' : "") + '<span class="gpt-diff">Difficulty <b>' + escapeHTML(String(diff)) + '</b>/10</span></span></div>' +
        '<div class="gp-tools">' + tool("info", "info.svg", "Info") + tool("notes", "notepad.svg", "Notes") + tool("star", "star.svg", "Favorite") + '<span class="gp-tools-sep"></span>' + (Array.isArray(game.versions) && game.versions.length > 1 ? tool("versions", "blocks.svg", "Change version") : "") + tool("save", "download.svg", "Save & backup", " style=\"display:none\"") + tool("reload", "refresh.svg", "Reload game") + tool("fs", "zoom.svg", "Fullscreen") + '</div>' +
      '</div>' +
      '<div class="game-player-frame gp-stage" id="gameStage">' +
        '<iframe id="gameFrame" title="' + escapeHTML(game.name) + '" allow="gamepad *; autoplay *; fullscreen *; clipboard-read *; clipboard-write *"></iframe>' +
        '<div class="gp-loading" data-gp-loading><div class="gp-load-card"><img class="gp-load-art" src="' + escapeHTML(smallThumb(game)) + '" alt="" onerror="this.onerror=null;this.src=\'' + escapeHTML(largeThumb(game)) + '\'"><div class="gp-load-copy"><b>' + escapeHTML(game.name) + '</b><span class="gp-load-row"><span class="sp-loader-dots" data-gp-dots><i></i><i></i><i></i></span><span data-gp-load-text>Loading game…</span></span></div></div><div class="gp-load-bar"><i></i></div></div>' +
        '<div class="gp-error" data-gp-error hidden><div class="gp-error-card"><b>This game couldn\u2019t load</b><span data-gp-error-text>The game files aren\u2019t available right now.</span><button type="button" class="gp-retry" data-gp="reload">Try again</button></div></div>' +
      '</div>' +
    '</div>' +
    '<aside class="game-notes" id="gameNotesPanel" aria-label="Notes">' +
      '<div class="game-notes-header"><span class="gn-head-ico"><img src="' + IMG + 'notepad.svg" alt=""></span><span class="gn-head-title">Notes</span><span class="gn-count" data-gn-count></span><button type="button" class="game-player-btn gn-x" data-gp="notes-close" title="Close notes" aria-label="Close notes"><img src="' + IMG + 'exit.svg" alt=""></button></div>' +
      '<div class="gn-tabs"><div class="gn-strip" id="gameNoteList" role="tablist" aria-label="Your notes"></div><button type="button" class="game-player-btn gn-new" data-note-add title="New note" aria-label="New note"><img src="' + IMG + 'plus.svg" alt=""></button></div>' +
      '<div class="game-notes-editor">' +
        '<input type="text" class="game-note-title" id="gameNoteTitle" maxlength="60" placeholder="Note title" aria-label="Note title">' +
        '<textarea id="gameNoteBody" placeholder="Write a note…" aria-label="Note"></textarea>' +
        '<div class="gn-foot"><span class="gn-saved" data-gn-saved>Saved</span><span class="gn-chars" data-gn-chars></span><button type="button" class="game-note-action gn-del" data-note-del><img src="' + IMG + 'trash.svg" alt="">Delete</button></div>' +
      '</div>' +
    '</aside>' +
  '</div>';
  document.body.appendChild(overlay);
  wireGameGlide(overlay);
  const player = overlay.querySelector("#gamePlayer");
  const frame = overlay.querySelector("#gameFrame");
  const stage = overlay.querySelector("#gameStage");
  const loading = overlay.querySelector("[data-gp-loading]");
  const errorBox = overlay.querySelector("[data-gp-error]");
  // Loading veil: springy dots, then the frame fades up once the game has loaded.
  let dotsJob = null;
  const anime = window.anime;
  function startDots() {
    if (dotsJob || motionOff() || !anime || !anime.animate) return;
    try {
      dotsJob = anime.animate(loading.querySelectorAll("[data-gp-dots] i"), {
        translateY: [{ to: -9, duration: 300, ease: "outQuad" }, { to: 0, duration: 620, ease: veilSoftJiggle }],
        scaleY: [{ to: 1.12, duration: 300, ease: "outQuad" }, { to: 1, duration: 620, ease: veilSoftJiggle }],
        delay: anime.stagger ? anime.stagger(120) : 0,
        loop: true,
        loopDelay: 140
      });
    } catch (err) {}
  }
  function showLoading(text) {
    errorBox.hidden = true;
    loading.hidden = false;
    loading.classList.remove("is-done");
    loading.querySelector("[data-gp-load-text]").textContent = text || "Loading game…";
    startDots();
    gameSpring(loading.querySelector(".gp-load-card"), { opacity: [0, 1], scale: [0.92, 1] }, 0.5, 620);
  }
  function hideLoading() {
    if (loading.hidden || loading.classList.contains("is-done")) return;
    loading.classList.add("is-done");
    gameSpring(loading.querySelector(".gp-load-card"), { opacity: [1, 0], scale: [1, 0.96] }, 0.2, 320);
    if (!gameSpring(frame, { opacity: [0, 1], scale: [0.985, 1] }, 0.42, 680)) frame.style.opacity = "1";
    setTimeout(() => {
      if (!loading.classList.contains("is-done")) return;
      loading.hidden = true;
      if (dotsJob && dotsJob.pause) { try { dotsJob.pause(); } catch (err) {} }
      dotsJob = null;
    }, 360);
  }
  function showError(text) {
    loading.hidden = true;
    errorBox.hidden = false;
    errorBox.querySelector("[data-gp-error-text]").textContent = text || "The game files aren\u2019t available right now.";
    gameSpring(errorBox.querySelector(".gp-error-card"), { opacity: [0, 1], scale: [0.9, 1], translateY: [8, 0] }, 0.5, 680);
  }
  let loadToken = 0;
  frame.addEventListener("load", () => {
    if (!frame.getAttribute("src") || frame.getAttribute("src") === "about:blank") return;
    hideLoading();
  });
  // Check the game is really there first: a missing file would otherwise show a 404 page inside the
  // player (or Veil itself through the site's fallback page).
  function loadGame(reload) {
    const token = ++loadToken;
    showLoading(reload ? "Reloading game…" : "Loading game…");
    const fail = text => {
      if (token !== loadToken) return;
      frame.removeAttribute("src");
      showError(text);
      try { if (window.veilNotify) window.veilNotify({ kind: "error", title: "Couldn\u2019t load " + game.name, text: text || "The game files aren\u2019t available right now." }); } catch (err) {}
    };
    if (!url) { fail("This game has no file to play."); return; }
    fetch(url, { method: "GET", cache: reload ? "reload" : "default" }).then(res => {
      if (token !== loadToken) return;
      if (!res.ok) { fail("The game files are missing (" + res.status + ")."); return; }
      if (reload && frame.contentWindow && frame.getAttribute("src")) {
        let done = false;
        try { frame.contentWindow.location.reload(); done = true; } catch (err) {}
        if (done) return;
      }
      frame.setAttribute("src", "about:blank");
      requestAnimationFrame(() => { if (token === loadToken) frame.setAttribute("src", url); });
    }).catch(() => {
      if (token !== loadToken) return;
      // Offline / blocked check: try the frame anyway.
      frame.setAttribute("src", url);
    });
    // Never leave the veil up forever.
    setTimeout(() => { if (token === loadToken) hideLoading(); }, 20000);
  }
  frame.style.opacity = "0";
  loadGame(false);
  // Favorite star.
  function paintStar() {
    const btn = overlay.querySelector('[data-gp="star"]');
    if (!btn) return;
    const on = isFavorite(id);
    btn.classList.toggle("star-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  paintStar();
  // ---- Notes: a list of notes for this game, an editor, autosave, delete. Stored with the rest of
  // the games data (localStorage and the account when signed in).
  if (!gamesUserData.notes || typeof gamesUserData.notes !== "object") gamesUserData.notes = {};
  const notes = Array.isArray(gamesUserData.notes[id]) ? gamesUserData.notes[id] : [];
  notes.forEach(note => { if (!note.id) note.id = uid(); });
  let current = notes.length ? 0 : -1;
  const list = overlay.querySelector("#gameNoteList");
  const titleIn = overlay.querySelector("#gameNoteTitle");
  const bodyIn = overlay.querySelector("#gameNoteBody");
  const savedEl = overlay.querySelector("[data-gn-saved]");
  const countEl = overlay.querySelector("[data-gn-count]");
  const delBtn = overlay.querySelector("[data-note-del]");
  const charsEl = overlay.querySelector("[data-gn-chars]");
  const notesPanel = overlay.querySelector("#gameNotesPanel");
  // The sliding pill behind the active tab. It lives inside the strip so it scrolls with the tabs,
  // and it is kept across repaints so it can spring from the old tab to the new one.
  const tabInd = document.createElement("i");
  tabInd.className = "gn-ind";
  tabInd.setAttribute("aria-hidden", "true");
  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    const kept = notes.filter(note => note);
    if (kept.length) gamesUserData.notes[id] = kept;
    else delete gamesUserData.notes[id];
    saveGamesUserData();
    savedEl.textContent = "Saved";
    savedEl.classList.remove("is-saving");
    gameSpring(savedEl, { scale: [0.86, 1], opacity: [0.4, 1] }, 0.55, 520);
  }
  function persistSoon() {
    savedEl.textContent = "Saving…";
    savedEl.classList.add("is-saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 450);
  }
  const paintChars = () => {
    const note = notes[current];
    const n = note ? String(note.body || "").length : 0;
    charsEl.textContent = note ? n + (n === 1 ? " character" : " characters") : "";
  };
  let indShown = false;
  // Spring the pill to the active tab. "jump" places it without motion (used while the panel is
  // hidden, so the first frame the user sees is already in the right spot).
  function placeInd(jump) {
    const el = list.querySelector(".gn-tab.active");
    if (!el) {
      if (indShown && !jump && !motionOff() && anime && anime.animate) {
        try { anime.animate(tabInd, { opacity: 0, scaleX: 0.6, ease: veilSpring(0.2, 320) }); } catch (err) { tabInd.style.opacity = "0"; }
      } else tabInd.style.opacity = "0";
      indShown = false;
      return;
    }
    const x = el.offsetLeft;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const top = el.offsetTop;
    tabInd.style.top = top + "px";
    tabInd.style.height = h + "px";
    const can = !jump && !motionOff() && anime && anime.animate;
    if (!can) {
      try { if (anime && anime.utils && anime.utils.set) anime.utils.set(tabInd, { translateX: x, width: w, opacity: 1, scaleX: 1 }); else { tabInd.style.transform = "translateX(" + x + "px)"; tabInd.style.width = w + "px"; tabInd.style.opacity = "1"; } } catch (err) {}
      indShown = true;
      return;
    }
    try {
      if (!indShown) {
        anime.animate(tabInd, { translateX: [x, x], width: [w, w], opacity: [0, 1], scaleX: [0.6, 1], ease: veilSpring(0.45, 620) });
      } else {
        anime.animate(tabInd, { translateX: x, width: w, opacity: 1, scaleX: 1, ease: veilSpring(0.38, 640) });
      }
    } catch (err) {}
    indShown = true;
    // Keep the active tab in view, gliding the strip instead of jumping it.
    const left = list.scrollLeft;
    const right = left + list.clientWidth;
    if (x < left + 4 || x + w > right - 4) {
      const to = x < left + 4 ? x - 12 : x + w - list.clientWidth + 12;
      try { list.scrollTo({ left: Math.max(0, to), behavior: "smooth" }); } catch (err) { list.scrollLeft = Math.max(0, to); }
    }
  }
  function paintList(springId, jump) {
    countEl.textContent = notes.length ? String(notes.length) : "";
    list.innerHTML = notes.length ? notes.map((note, i) => '<button type="button" class="gn-tab' + (i === current ? " active" : "") + '" data-note="' + i + '" role="tab" aria-selected="' + (i === current) + '" title="' + escapeHTML(note.title || "Untitled") + '">' + escapeHTML(note.title || "Untitled") + '</button>').join("") : '<div class="gn-empty">No notes yet. Tap + to write one.</div>';
    list.insertBefore(tabInd, list.firstChild);
    if (springId != null) {
      const el = list.querySelector('[data-note="' + springId + '"]');
      if (el) gameSpring(el, { opacity: [0, 1], translateY: [-6, 0], scale: [0.9, 1] }, 0.5, 620);
    }
    paintChars();
    placeInd(!!jump || !player.classList.contains("notes-open"));
  }
  function paintEditor() {
    const note = notes[current];
    const on = !!note;
    titleIn.disabled = !on;
    bodyIn.disabled = !on;
    delBtn.disabled = !on;
    titleIn.value = on ? note.title || "" : "";
    bodyIn.value = on ? note.body || "" : "";
    bodyIn.placeholder = on ? "Write a note…" : "Create a note with +";
  }
  function selectNote(i) {
    current = Math.max(-1, Math.min(notes.length - 1, i));
    paintList();
    paintEditor();
    gameSpring(overlay.querySelector(".game-notes-editor"), { opacity: [0.5, 1], translateY: [6, 0] }, 0.45, 520);
  }
  function addNote() {
    notes.push({ id: uid(), title: "Note " + (notes.length + 1), body: "", at: Date.now() });
    current = notes.length - 1;
    paintList(current);
    paintEditor();
    persist();
    try { titleIn.focus(); titleIn.select(); } catch (err) {}
  }
  function deleteNote() {
    if (!notes[current]) return;
    const gone = list.querySelector('[data-note="' + current + '"]');
    const at = current;
    const finish = () => {
      notes.splice(at, 1);
      current = notes.length ? Math.min(at, notes.length - 1) : -1;
      paintList();
      paintEditor();
      persist();
      try { if (window.veilNotify) window.veilNotify({ kind: "info", title: "Note deleted" }); } catch (err) {}
    };
    if (gone && !motionOff() && anime && anime.animate) {
      gameSpring(gone, { opacity: [1, 0], scale: [1, 0.9], translateX: [0, -14] }, 0.2, 300);
      setTimeout(finish, 200);
    } else finish();
  }
  function editNote() {
    const note = notes[current];
    if (!note) return;
    note.title = (titleIn.value || "").slice(0, 60);
    note.body = bodyIn.value || "";
    note.at = Date.now();
    const row = list.querySelector('[data-note="' + current + '"]');
    if (row) {
      const label = note.title || "Untitled";
      if (row.textContent !== label) {
        row.textContent = label;
        row.title = label;
        placeInd(false);
      }
    }
    paintChars();
    persistSoon();
  }
  titleIn.addEventListener("input", editNote);
  bodyIn.addEventListener("input", editNote);
  list.addEventListener("click", event => {
    const item = event.target.closest("[data-note]");
    if (!item) return;
    const i = parseInt(item.getAttribute("data-note"), 10) || 0;
    if (i === current) {
      if (!motionOff() && anime && anime.animate) { try { anime.animate(item, { rotate: [{ to: -2.5, duration: 140, ease: "outQuad" }, { to: 0, duration: 620, ease: veilSoftJiggle }] }); } catch (err) {} }
      return;
    }
    selectNote(i);
  });
  // A mouse wheel scrolls the tab strip sideways.
  list.addEventListener("wheel", event => {
    if (list.scrollWidth <= list.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    try { list.scrollBy({ left: event.deltaY, behavior: "smooth" }); } catch (err) { list.scrollLeft += event.deltaY; }
  }, { passive: false });
  overlay.querySelector("[data-note-add]").addEventListener("click", addNote);
  delBtn.addEventListener("click", deleteNote);
  paintList(null, true);
  paintEditor();
  paintChars();
  // The panel floats over the game, so it starts tucked away (it never takes width from the stage).
  try {
    if (anime && anime.utils && anime.utils.set) anime.utils.set(notesPanel, { opacity: 0, translateX: 26, scale: 0.96 });
    else { notesPanel.style.opacity = "0"; notesPanel.style.transform = "translateX(26px) scale(0.96)"; }
  } catch (err) {}
  const flush = () => { if (saveTimer) persist(); };
  overlay._veilCleanup = () => {
    loadToken += 1;
    try { if (dotsJob && dotsJob.pause) dotsJob.pause(); } catch (err) {}
    dotsJob = null;
    clearTimeout(notesLeave);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("keyup", onKey, true);
    document.removeEventListener("fullscreenchange", onFsChange);
    [frame, loading.querySelector(".gp-load-card"), errorBox.querySelector(".gp-error-card"), notesPanel, tabInd].forEach(el => {
      try { if (el && window.anime && window.anime.utils && window.anime.utils.remove) window.anime.utils.remove(el); } catch (err) {}
    });
    flush();
  };
  function focusGame() {
    try { frame.focus({ preventScroll: true }); } catch (err) {}
    try { if (frame.contentWindow) frame.contentWindow.focus(); } catch (err) {}
  }
  let notesLeave = 0;
  function setNotes(open) {
    if (open === player.classList.contains("notes-open")) return;
    clearTimeout(notesLeave);
    player.classList.toggle("notes-open", open);
    const btn = overlay.querySelector('[data-gp="notes"]');
    if (btn) btn.classList.toggle("is-on", open);
    const can = !motionOff() && anime && anime.animate;
    const ico = btn && btn.querySelector("img");
    if (ico && can) { try { anime.animate(ico, { rotate: [{ to: open ? -12 : 10, duration: 150, ease: "outQuad" }, { to: 0, duration: 680, ease: veilSoftJiggle }] }); } catch (err) {} }
    if (open) {
      notesPanel.classList.remove("is-leaving");
      if (!notes.length) { notes.push({ id: uid(), title: "Note 1", body: "", at: Date.now() }); current = 0; persist(); }
      paintList(null, true);
      paintEditor();
      if (can) {
        try { anime.animate(notesPanel, { opacity: 1, translateX: 0, scale: 1, ease: veilSpring(0.42, 720) }); } catch (err) {}
        const parts = notesPanel.querySelectorAll(".game-notes-header, .gn-tabs, .game-notes-editor");
        parts.forEach((el, i) => gameSpring(el, { opacity: [0, 1], translateX: [14, 0], delay: 60 + i * 45 }, 0.45, 640));
        if (window.veilMotion && window.veilMotion.stagger) window.veilMotion.stagger(list.querySelectorAll(".gn-tab"), "drop", { base: 120, step: 28, max: 10 });
      } else {
        notesPanel.style.opacity = "1";
        notesPanel.style.transform = "none";
      }
      try { (notes[current] && !String(notes[current].body || "") ? titleIn : bodyIn).focus({ preventScroll: true }); } catch (err) {}
    } else {
      flush();
      notesPanel.classList.add("is-leaving");
      const done = () => { if (!player.classList.contains("notes-open")) notesPanel.classList.remove("is-leaving"); };
      if (can) {
        try { anime.animate(notesPanel, { opacity: 0, translateX: 26, scale: 0.96, ease: veilSpring(0.22, 440) }); } catch (err) {}
        notesLeave = setTimeout(done, 460);
      } else {
        notesPanel.style.opacity = "0";
        done();
      }
      focusGame();
    }
  }
  // Show the Save & backup button only while the game frame offers a backup menu.
  {
    const saveBtn = overlay.querySelector('[data-gp="save"]');
    const saveTimer = setInterval(() => {
      if (!overlay.isConnected) { clearInterval(saveTimer); return; }
      let ok = false;
      try { ok = !!(frame.contentWindow && typeof frame.contentWindow.veilSaveMenu === "function"); } catch (err) {}
      if (saveBtn) saveBtn.style.display = ok ? "" : "none";
    }, 1500);
  }
  // ---- Toolbar.
  overlay.addEventListener("click", event => {
    const btn = event.target.closest("[data-gp]");
    if (!btn) {
      if (event.target === overlay) closeGamePlayer(overlay, flush);
      return;
    }
    const act = btn.getAttribute("data-gp");
    if (act === "close") { closeGamePlayer(overlay, flush); return; }
    if (act === "reload") {
      const ico = btn.querySelector("img");
      if (ico && !motionOff() && anime && anime.animate) { try { anime.animate(ico, { rotate: [0, 360], ease: veilSpring(0.4, 760) }); } catch (err) {} }
      loadGame(true);
      return;
    }
    if (act === "versions") {
      const ico = btn.querySelector("img");
      if (ico && !motionOff() && anime && anime.animate) { try { anime.animate(ico, { rotate: [{ to: -14, duration: 160, ease: "outQuad" }, { to: 0, duration: 680, ease: veilSoftJiggle }] }); } catch (err) {} }
      loadGame(false);
      return;
    }
    if (act === "fs") {
      if (document.fullscreenElement === stage || document.webkitFullscreenElement === stage) { exitAnyFullscreen(); return; }
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(stage);
          if (p && p.catch) p.catch(err => { try { if (window.veilNotify) window.veilNotify({ kind: "warn", title: "Fullscreen blocked", text: String(err && err.message || err) }); } catch (e2) {} });
        } catch (err) {}
      }
      return;
    }
    if (act === "star") {
      toggleFavorite(id);
      paintStar();
      starJiggle(btn.querySelector("img"));
      return;
    }
    if (act === "save") {
      // Games that keep their own saves (Fallout Shelter) expose veilSaveMenu: copy/download/load a backup.
      try { const w = frame.contentWindow; if (w && typeof w.veilSaveMenu === "function") w.veilSaveMenu(); } catch (err) {}
      return;
    }
    if (act === "notes") { setNotes(!player.classList.contains("notes-open")); return; }
    if (act === "notes-close") { setNotes(false); return; }
    if (act === "info") showGameInfo(game);
  });
  // Esc belongs to the game (Minecraft's pause menu, closing in-game screens). It never closes the
  // player: the close button and the backdrop do that. If Esc lands on Veil instead of the game
  // (focus on a toolbar button, or the game lost focus after pointer lock ended), it is handed to
  // the game frame and focus goes back to the game.
  function sendEscToGame(type) {
    let win = null;
    let doc = null;
    try { win = frame.contentWindow; doc = frame.contentDocument; } catch (err) { return; }
    if (!win || !doc) return;
    focusGame();
    try {
      const KE = win.KeyboardEvent || KeyboardEvent;
      const ev = new KE(type, { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true, composed: true });
      if (ev.keyCode !== 27) {
        try { Object.defineProperty(ev, "keyCode", { get: () => 27 }); Object.defineProperty(ev, "which", { get: () => 27 }); } catch (err) {}
      }
      const active = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : null;
      (active || doc.querySelector("canvas") || doc.body || doc).dispatchEvent(ev);
    } catch (err) {}
  }
  const onKey = event => {
    if (!overlay.isConnected) {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
      return;
    }
    if (event.key !== "Escape" || overlay._closing) return;
    if (document.querySelector(".game-info-modal, .modal-overlay:not(.game-player-overlay)")) return;
    const target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (target && target.closest && target.closest(".game-notes")) {
      if (event.type === "keydown" && player.classList.contains("notes-open")) {
        event.preventDefault();
        event.stopPropagation();
        setNotes(false);
      }
      return;
    }
    if (target && target !== document.body && !overlay.contains(target) && target.closest && target.closest("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    event.stopPropagation();
    sendEscToGame(event.type);
  };
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onKey, true);
  // Entering or leaving fullscreen hands focus straight back to the game.
  const onFsChange = () => {
    if (!overlay.isConnected) { document.removeEventListener("fullscreenchange", onFsChange); return; }
    if (!overlay._closing && !player.classList.contains("notes-open")) setTimeout(focusGame, 30);
  };
  document.addEventListener("fullscreenchange", onFsChange);
  window.addEventListener("pagehide", flush);
  // Toolbar buttons and chips spring in after the player pops.
  if (window.veilMotion && window.veilMotion.stagger) {
    window.veilMotion.stagger(overlay.querySelectorAll(".game-player-bar > *, .gp-tools > .game-player-btn"), "drop", { base: 80, step: 26, max: 12 });
  }
  veilFsSync();
  return overlay;
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
  showAdmin();
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
