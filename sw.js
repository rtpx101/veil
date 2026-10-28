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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
  const url = new URL(event.request.url);
  const real = unwrapDoubleProxy(url.pathname);
  if (real) {
    return Response.redirect(ORIGIN + PROXY_PREFIX + encodeURIComponent(real), 302);
  }
  await installCodec();
  if (!configLooksUsable(scramjet.config)) {
    return new Response("Veil could not open this page.", {
      status: 503,
      headers: { "content-type": "text/plain", "cache-control": "no-store" }
    });
  }
  if (!scramjet.route(event)) return fetch(event.request);
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
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== ORIGIN) return;
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
