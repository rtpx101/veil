const BASE = (() => {
  let path = self.location.pathname.replace(/\/?sw\.js$/i, "");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "/" ? "" : path;
})();

importScripts((BASE || "") + "/scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const PROXY_PREFIX = BASE + "/service/";
const ORIGIN = self.location.origin;
let adblockEnabled = false;

const AD_HOSTS = new Set([
  "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "adservice.google.com", "adnxs.com", "adsystem.com", "advertising.com",
  "amazon-adsystem.com", "taboola.com", "outbrain.com", "criteo.com",
  "pubmatic.com", "rubiconproject.com", "openx.net", "adsafeprotected.com",
  "moatads.com", "scorecardresearch.com", "quantserve.com", "adform.net",
  "adsrvr.org", "casalemedia.com", "contextweb.com", "lijit.com",
  "media.net", "smartadserver.com", "yieldmo.com", "zemanta.com"
]);

function isAdUrl(urlStr) {
  if (!adblockEnabled || !urlStr) return false;
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    for (const domain of AD_HOSTS) {
      if (host === domain || host.endsWith("." + domain)) return true;
    }
    if (/\/ads?\/|\/advert|\/banner|doubleclick|googlesyndication|pagead/i.test(u.pathname + u.search)) return true;
  } catch (err) {}
  return false;
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* Site logins set several cookies. Scramjet tells the page the cookie by
   array index ("0", "1") and waits forever if the page never answers.
   These wrappers send the real cookie, drop dead ones, and stop waiting. */
const cookieSnap = new Map();
let currentDest = "";
let cookiePersistTimer = null;

function headerKey(raw, name) {
  if (!raw || typeof raw !== "object") return "";
  return Object.keys(raw).find((key) => String(key).toLowerCase() === name) || "";
}

function splitSetCookieString(str) {
  const parts = [];
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) !== ",") continue;
    if (/^\s*[^;,\s]+=/.test(str.slice(i + 1))) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = str.slice(start).trim();
  if (last) parts.push(last);
  return parts.filter((part) => part.indexOf("=") !== -1);
}

function listSetCookie(raw) {
  const key = headerKey(raw, "set-cookie");
  if (!key) return [];
  const value = raw[key];
  const list = [];
  const chunks = Array.isArray(value) ? value : [value];
  chunks.forEach((chunk) => {
    if (typeof chunk === "string") list.push(...splitSetCookieString(chunk));
  });
  if (list.length) raw[key] = list;
  return list;
}

function cookieNameOf(line) {
  const cut = String(line || "").indexOf("=");
  return (cut === -1 ? String(line || "") : String(line).slice(0, cut)).trim();
}

function domainOk(cookieDomain, hostname) {
  const domain = String(cookieDomain || "").replace(/^\./, "").toLowerCase();
  const host = String(hostname || "").toLowerCase();
  if (!domain || !host) return false;
  return host === domain || host.endsWith("." + domain);
}

function pathOk(cookiePath, pathname) {
  const path = cookiePath || "/";
  const current = pathname || "/";
  if (path === "/") return true;
  if (current === path) return true;
  if (current.indexOf(path) !== 0) return false;
  return path.endsWith("/") || current.charAt(path.length) === "/";
}

function putCookies(data) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("$scramjet", 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      });
    };
    open.onerror = () => reject(open.error || new Error("idb"));
    open.onsuccess = () => {
      const db = open.result;
      let tx;
      try {
        tx = db.transaction("cookies", "readwrite");
      } catch (err) {
        db.close();
        reject(err);
        return;
      }
      tx.objectStore("cookies").put(data, "cookies");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error("idb put"));
      };
    };
  });
}

function scheduleCookiePersist() {
  clearTimeout(cookiePersistTimer);
  cookiePersistTimer = setTimeout(() => {
    try {
      const jar = scramjet.cookieStore && scramjet.cookieStore.cookies || {};
      const copy = {};
      Object.keys(jar).forEach((key) => { copy[key] = jar[key]; });
      putCookies(copy).catch(() => {});
    } catch (err) {}
  }, 150);
}

function patchCookieStore() {
  const store = scramjet.cookieStore;
  if (!store || store.__veilPatched) return;
  store.__veilPatched = true;
  const origSet = store.setCookies.bind(store);
  const origLoad = store.load.bind(store);
  store.load = function (data) {
    if (data && typeof data === "object") {
      this.cookies = this.cookies || {};
      Object.keys(data).forEach((key) => {
        if (!this.cookies[key]) this.cookies[key] = data[key];
      });
      return data;
    }
    return origLoad(data);
  };
  store.setCookies = function (list, url) {
    let href = url;
    try { if (typeof url === "string") href = new URL(url); } catch (err) { href = null; }
    const keep = [];
    const drop = new Set();
    const items = Array.isArray(list) ? list : [list];
    items.forEach((item) => {
      if (typeof item !== "string") return;
      if (/^\d+$/.test(item)) return;
      if (/max-age\s*=\s*0/i.test(item) || /expires\s*=\s*[^;]*1970/i.test(item)) {
        drop.add(cookieNameOf(item));
        return;
      }
      keep.push(item);
    });
    if (keep.length) origSet(keep, url);
    const now = Date.now();
    const jar = this.cookies || {};
    Object.keys(jar).forEach((key) => {
      const cookie = jar[key];
      if (!cookie) return;
      if (!cookie.receivedAt) cookie.receivedAt = now;
      if (drop.has(cookie.name) && (!href || domainOk(cookie.domain, href.hostname))) {
        delete jar[key];
        return;
      }
      if (cookie.expires && new Date(cookie.expires).getTime() <= now) delete jar[key];
      else if (typeof cookie.maxAge === "number" && cookie.maxAge <= 0) delete jar[key];
    });
    scheduleCookiePersist();
  };
  store.getCookies = function (url, forDocument) {
    let href = url;
    try { if (!(href instanceof URL)) href = new URL(String(url)); } catch (err) { return ""; }
    const now = Date.now();
    const jar = this.cookies || {};
    const out = [];
    Object.keys(jar).forEach((key) => {
      const cookie = jar[key];
      if (!cookie || !cookie.name) return;
      if (cookie.expires && new Date(cookie.expires).getTime() <= now) {
        delete jar[key];
        return;
      }
      if (typeof cookie.maxAge === "number" && cookie.receivedAt && cookie.maxAge >= 0) {
        if (cookie.receivedAt + cookie.maxAge * 1000 <= now) {
          delete jar[key];
          return;
        }
      }
      if (cookie.secure && href.protocol !== "https:") return;
      if (cookie.httpOnly && forDocument) return;
      if (!pathOk(cookie.path, href.pathname)) return;
      if (!domainOk(cookie.domain, href.hostname)) return;
      out.push(cookie.name + "=" + cookie.value);
    });
    return out.join("; ");
  };
}

function softenDocumentHeaders(res, dest) {
  if (dest !== "document" && dest !== "iframe") return;
  const raw = res && res.rawHeaders;
  if (!raw || typeof raw !== "object") return;
  const cdKey = headerKey(raw, "content-disposition");
  if (cdKey) {
    const value = raw[cdKey];
    const text = Array.isArray(value) ? String(value[0] || "") : String(value || "");
    if (/attachment/i.test(text)) raw[cdKey] = Array.isArray(value) ? ["inline"] : "inline";
  }
  const ctKey = headerKey(raw, "content-type");
  if (!ctKey) return;
  const value = raw[ctKey];
  const first = Array.isArray(value) ? String(value[0] || "") : String(value || "");
  const mime = first.split(";")[0].trim().toLowerCase();
  const ok = !mime || mime.startsWith("text/") || mime.startsWith("image/") || mime.startsWith("font/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime === "application/javascript" || mime === "application/json" || mime === "application/xml" || mime === "application/pdf" || mime === "application/xhtml+xml";
  if (!ok) raw[ctKey] = Array.isArray(value) ? ["text/html; charset=utf-8"] : "text/html; charset=utf-8";
}

function patchProxyClient() {
  patchCookieStore();
  if (scramjet.client && typeof scramjet.client.fetch === "function" && !scramjet.client.fetch.__veilPatched) {
    const orig = scramjet.client.fetch.bind(scramjet.client);
    const wrapped = function (url, opts) {
      const dest = currentDest;
      return Promise.resolve(orig(url, opts)).then((res) => {
        try {
          const href = url && url.href ? url.href : String(url || "");
          const list = listSetCookie(res && res.rawHeaders);
          if (list.length && href) cookieSnap.set(href, list);
          if (cookieSnap.size > 40) cookieSnap.delete(cookieSnap.keys().next().value);
          softenDocumentHeaders(res, dest);
        } catch (err) {}
        return res;
      });
    };
    wrapped.__veilPatched = true;
    scramjet.client.fetch = wrapped;
  }
  if (typeof scramjet.dispatch === "function" && !scramjet.dispatch.__veilPatched) {
    const origDispatch = scramjet.dispatch.bind(scramjet);
    const wrappedDispatch = function (client, msg) {
      try {
        if (msg && msg.scramjet$type === "cookie" && typeof msg.cookie === "string" && /^\d+$/.test(msg.cookie)) {
          const list = cookieSnap.get(msg.url) || [];
          const real = list[Number(msg.cookie)];
          if (!real) return Promise.resolve();
          msg = Object.assign({}, msg, { cookie: real });
        }
      } catch (err) {}
      let pending;
      try { pending = origDispatch(client, msg); }
      catch (err) { return Promise.resolve(); }
      return Promise.race([
        Promise.resolve(pending).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 700))
      ]);
    };
    wrappedDispatch.__veilPatched = true;
    scramjet.dispatch = wrappedDispatch;
  }
  if (typeof scramjet.fetch === "function" && !scramjet.fetch.__veilFetch) {
    const origFetch = scramjet.fetch.bind(scramjet);
    const wrappedFetch = function (event) {
      const prev = currentDest;
      try { currentDest = event && event.request ? (event.request.destination || "") : ""; }
      catch (err) { currentDest = ""; }
      return Promise.resolve(origFetch(event)).finally(() => { currentDest = prev; });
    };
    wrappedFetch.__veilFetch = true;
    scramjet.fetch = wrappedFetch;
  }
}

patchProxyClient();

/* A loadConfig message sets scramjet.config and then loadConfig() returns
   without installing the codec, so fetches crash on a missing prefix.
   The original method is kept so we can clear config and let it read IndexedDB. */
const nativeLoadConfig = scramjet.loadConfig.bind(scramjet);
let held = null;
let codecReady = false;
let installJob = null;

function configLooksUsable(config) {
  return !!(config && config.prefix && config.codec && config.files);
}

function rememberConfig(config) {
  if (configLooksUsable(config)) held = config;
}

function putConfig(config) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("$scramjet", 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      });
    };
    open.onerror = () => reject(open.error || new Error("idb"));
    open.onsuccess = () => {
      const db = open.result;
      let tx;
      try {
        tx = db.transaction("config", "readwrite");
      } catch (err) {
        db.close();
        reject(err);
        return;
      }
      tx.objectStore("config").put(config, "config");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error("idb put"));
      };
    };
  });
}

async function installCodec() {
  if (codecReady && configLooksUsable(scramjet.config)) return;
  if (installJob) return installJob;
  installJob = (async () => {
    rememberConfig(scramjet.config);
    scramjet.config = null;
    let failed = null;
    try {
      await nativeLoadConfig();
    } catch (err) {
      failed = err;
    }
    if (!configLooksUsable(scramjet.config) && configLooksUsable(held)) {
      try {
        await putConfig(held);
        scramjet.config = null;
        try {
          await nativeLoadConfig();
        } catch (err) {
          failed = err;
        }
      } catch (err) {
        failed = err;
      }
    }
    if (configLooksUsable(scramjet.config)) {
      codecReady = true;
      return;
    }
    scramjet.config = null;
    codecReady = false;
    if (failed) throw failed;
  })().finally(() => {
    installJob = null;
  });
  return installJob;
}

scramjet.loadConfig = function () {
  return installCodec();
};

function unwrapDoubleProxy(pathname) {
  if (!pathname.startsWith(PROXY_PREFIX)) return "";
  let rest = pathname.slice(PROXY_PREFIX.length);
  let decoded = rest;
  try { decoded = decodeURIComponent(rest); } catch (err) { return ""; }
  const leak = ORIGIN + PROXY_PREFIX;
  if (decoded.indexOf(leak) !== 0 && decoded.indexOf(PROXY_PREFIX) !== 0) return "";
  for (let i = 0; i < 6; i++) {
    if (decoded.indexOf(leak) === 0) decoded = decoded.slice(leak.length);
    else if (decoded.indexOf(PROXY_PREFIX) === 0) decoded = decoded.slice(PROXY_PREFIX.length);
    else break;
    try { decoded = decodeURIComponent(decoded); } catch (err) {}
  }
  if (/^https?:\/\//i.test(decoded) && decoded.indexOf(PROXY_PREFIX) === -1) return decoded;
  return "";
}

async function proxyFetch(event) {
  const job = proxyFetchInner(event);
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Response("Veil timed out opening this page.", {
        status: 504,
        headers: { "content-type": "text/plain", "cache-control": "no-store" }
      }));
    }, 35000);
  });
  return Promise.race([job, timeout]);
}

async function proxyFetchInner(event) {
  const url = new URL(event.request.url);
  const real = unwrapDoubleProxy(url.pathname);
  if (real) {
    const method = event.request.method || "GET";
    const status = method === "GET" || method === "HEAD" ? 302 : 307;
    return Response.redirect(ORIGIN + PROXY_PREFIX + encodeURIComponent(real), status);
  }
  let target = "";
  try {
    const rest = url.pathname.slice(PROXY_PREFIX.length);
    target = decodeURIComponent(rest);
  } catch (err) {}
  if (isAdUrl(target)) {
    return new Response("", {
      status: 204,
      headers: { "cache-control": "no-store" }
    });
  }
  await installCodec();
  if (!configLooksUsable(scramjet.config)) {
    return new Response("Veil could not open this page.", {
      status: 503,
      headers: { "content-type": "text/plain", "cache-control": "no-store" }
    });
  }
  return scramjet.fetch(event);
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.config) rememberConfig(data.config);
  if (data.type === "veil-config" || data.scramjet$type === "loadConfig") {
    if (!(codecReady && configLooksUsable(scramjet.config))) {
      event.waitUntil(installCodec().catch(() => {}));
    }
  }
  if (data.type === "veil-adblock") {
    adblockEnabled = !!data.enabled;
  }
});

const WASM_PATH = BASE + "/scramjet/scramjet.wasm.wasm";
let wasmScriptBody = null;

function bytesToBase64(bytes) {
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

async function rewriterWasmScript() {
  if (!wasmScriptBody) {
    const res = await fetch(WASM_PATH);
    if (!res.ok) throw new Error("rewriter wasm missing");
    const bytes = new Uint8Array(await res.arrayBuffer());
    wasmScriptBody = "if ('document' in self && document.currentScript) { document.currentScript.remove(); }\nself.WASM = '" + bytesToBase64(bytes) + "';\n";
  }
  return new Response(wasmScriptBody, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== ORIGIN) return;
  if (url.pathname === WASM_PATH) {
    event.respondWith(rewriterWasmScript().catch((err) => {
      console.warn("[veil] rewriter wasm", err);
      return fetch(event.request);
    }));
    return;
  }
  if (url.pathname.indexOf(PROXY_PREFIX) !== 0) return;
  event.respondWith(proxyFetch(event).catch((err) => {
    console.warn("[veil] proxy failed", err);
    if (err && String(err.message || err).indexOf("prefix") !== -1) {
      codecReady = false;
      try { scramjet.config = null; } catch (e) {}
    }
    return new Response("Veil could not open this page.", {
      status: 502,
      headers: { "content-type": "text/plain", "cache-control": "no-store" }
    });
  }));
});
