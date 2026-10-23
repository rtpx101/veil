// sw.js — matched to working rtpx101/testprox
const BASE = (() => {
  let p = self.location.pathname.replace(/\/?sw\.js$/i, "");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p === "/" ? "" : p;
})();

importScripts((BASE || "") + "/scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const PROXY_PREFIX = BASE + "/service/";
const ORIGIN = self.location.origin;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function isStaticAsset(path) {
  if (path === BASE + "/sw.js" || path === "/sw.js") return true;
  if (path === BASE + "/" || path === BASE + "/index.html" || path === BASE || path === "/") return true;
  if (path === BASE + "/veil-app.js" || path === "/veil-app.js") return true;
  if (path.startsWith(BASE + "/baremux/") || path.startsWith("/baremux/")) return true;
  if (path.startsWith(BASE + "/epoxy/") || path.startsWith("/epoxy/")) return true;
  if (path.startsWith(BASE + "/libcurl/") || path.startsWith("/libcurl/")) return true;
  if (path.startsWith(BASE + "/scramjet/") || path.startsWith("/scramjet/")) return true;
  if (path.startsWith(BASE + "/image/") || path.startsWith("/image/")) return true;
  if (path.endsWith(".map")) return true;
  return false;
}

/**
 * Peel nested /veil/service/https://.../service/ wraps down to the real URL.
 * Returns null when this is not a proxy path.
 */
function peelServiceUrl(pathname) {
  const marker = PROXY_PREFIX;
  if (!pathname.startsWith(marker)) return null;
  let rest = pathname.slice(marker.length);
  for (let i = 0; i < 8; i++) {
    let decoded = rest;
    try { decoded = decodeURIComponent(rest); } catch (e) {}
    if (!/^https?:\/\//i.test(decoded)) return null;
    const originPrefix = ORIGIN + marker;
    let next = null;
    if (decoded.startsWith(originPrefix)) next = decoded.slice(originPrefix.length);
    else if (decoded.startsWith(marker)) next = decoded.slice(marker.length);
    else {
      const at = decoded.indexOf(originPrefix);
      if (at !== -1) next = decoded.slice(at + originPrefix.length);
    }
    if (next == null) return decoded;
    rest = next;
  }
  return null;
}

function isNestedProxy(pathname) {
  if (!pathname.startsWith(PROXY_PREFIX)) return false;
  let rest = pathname.slice(PROXY_PREFIX.length);
  let decoded = rest;
  try { decoded = decodeURIComponent(rest); } catch (e) { return false; }
  const originPrefix = ORIGIN + PROXY_PREFIX;
  return decoded.startsWith(originPrefix) || decoded.includes(originPrefix);
}

function isCdnMedia(real, request) {
  let host = "";
  try { host = new URL(real).hostname; } catch (e) { return false; }
  if (!/^(images|videos|downloads)\.ctfassets\.net$|^github\.githubassets\.com$|^avatars\.githubusercontent\.com$|^camo\.githubusercontent\.com$|^media\.githubusercontent\.com$|^private-user-images\.githubusercontent\.com$|^opengraph\.githubassets\.com$|^user-images\.githubusercontent\.com$/i.test(host)) {
    return false;
  }
  const dest = request.destination;
  if (dest === "document" || dest === "script" || dest === "style" || dest === "worker") return false;
  if (dest === "image" || dest === "video" || dest === "audio" || dest === "font") return true;
  return /\.(png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|m4v|mp3|woff2?|ttf|otf)(\?|#|$)/i.test(real);
}

async function fetchCdn(real, request) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const range = request.headers.get("range");
  if (accept) headers.set("accept", accept);
  if (range) headers.set("range", range);
  try {
    const res = await fetch(real, { method: request.method, headers: headers, redirect: "follow", credentials: "omit" });
    if (res && (res.ok || res.status === 206)) return res;
  } catch (e) {}
  try {
    return await fetch(real, { mode: "no-cors", credentials: "omit", redirect: "follow" });
  } catch (e) {}
  return null;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (isStaticAsset(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const real = peelServiceUrl(url.pathname);
        if (real) {
          const topDoc = event.request.mode === "navigate" && event.request.destination === "document";
          if (topDoc) {
            const back = ORIGIN + (BASE || "") + "/?open=" + encodeURIComponent(real);
            return Response.redirect(back, 302);
          }
          if (isNestedProxy(url.pathname)) {
            return Response.redirect(ORIGIN + PROXY_PREFIX + encodeURIComponent(real), 302);
          }
          if (isCdnMedia(real, event.request)) {
            const direct = await fetchCdn(real, event.request);
            if (direct) return direct;
          }
        }

        // A loadConfig message can set .config without installing the codec.
        // Clear it so loadConfig reads IndexedDB and sets prefix.
        scramjet.config = undefined;
        await scramjet.loadConfig();
        if (!scramjet.config || !scramjet.config.prefix) {
          return fetch(event.request);
        }
        if (scramjet.route(event)) {
          return await scramjet.fetch(event);
        }
      } catch (err) {
        console.warn("[SW] Scramjet error, network fallback:", err);
      }
      return fetch(event.request);
    })()
  );
});
