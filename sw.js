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

let configPromise = null;

function ensureConfig(force) {
  if (force) configPromise = null;
  if (!configPromise) {
    configPromise = scramjet.loadConfig().catch((err) => {
      configPromise = null;
      throw err;
    });
  }
  return configPromise;
}

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
  await ensureConfig(false);
  if (!scramjet.config || !scramjet.config.prefix) await ensureConfig(true);
  if (!scramjet.route(event)) return fetch(event.request);
  try {
    return await scramjet.fetch(event);
  } catch (err) {
    const message = String(err && err.message || err);
    if (/prefix/i.test(message)) {
      await ensureConfig(true);
      if (scramjet.route(event)) return await scramjet.fetch(event);
    }
    throw err;
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "veil-config") event.waitUntil(ensureConfig(true));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== ORIGIN) return;
  if (url.pathname.indexOf(PROXY_PREFIX) !== 0) return;
  event.respondWith(proxyFetch(event).catch((err) => {
    console.warn("[veil] proxy failed", err);
    return new Response("Veil could not open this page.", { status: 502, headers: { "content-type": "text/plain" } });
  }));
});
