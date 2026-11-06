const BASE = (() => {
  let path = self.location.pathname.replace(/\/?sw\.js$/i, "");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "/" ? "" : path;
})();

importScripts((BASE || "") + "/scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
let scramjet = null;
function startScramjet() {
  if (scramjet) return scramjet;
  scramjet = new ScramjetServiceWorker();
  return scramjet;
}
const PREFIX = BASE + "/service/";

let adblockEnabled = false;
const AD_HOSTS = new Set([
  "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "adservice.google.com", "adnxs.com", "advertising.com", "amazon-adsystem.com",
  "taboola.com", "outbrain.com", "criteo.com", "pubmatic.com", "rubiconproject.com",
  "openx.net", "adsafeprotected.com", "moatads.com", "scorecardresearch.com",
  "quantserve.com", "adform.net", "adsrvr.org", "casalemedia.com", "smartadserver.com",
  "adtechus.com", "chartbeat.com", "krxd.net", "demdex.net", "ads-api.twitter.com"
]);
const AD_BITS = [
  "youtube.com/api/stats/ads",
  "youtube.com/pagead",
  "youtube.com/ptracking",
  "youtube.com/get_midroll",
  "/adserver/",
  "/pagead/"
];

function isAdUrl(urlStr) {
  if (!adblockEnabled || !urlStr) return false;
  const text = String(urlStr).toLowerCase();
  let host = "";
  try { host = new URL(urlStr).hostname.toLowerCase(); } catch (err) {}
  for (const domain of AD_HOSTS) {
    if (host === domain || host.endsWith("." + domain)) return true;
  }
  for (let i = 0; i < AD_BITS.length; i++) {
    if (text.indexOf(AD_BITS[i]) !== -1) return true;
  }
  return false;
}

function targetOf(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (url.pathname.indexOf(PREFIX) !== 0) return "";
    return decodeURIComponent(url.pathname.slice(PREFIX.length));
  } catch (err) {
    return "";
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "veil-adblock") adblockEnabled = !!data.enabled;
  if (data.type === "veil-mux-ready") startScramjet();
});

async function handleRequest(event) {
  if (!scramjet) {
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        if (scramjet) {
          clearInterval(timer);
          resolve();
        }
      }, 40);
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 3000);
    });
  }
  if (!scramjet) return fetch(event.request);
  try {
    if (!scramjet.config) await scramjet.loadConfig();
  } catch (err) {}
  if (!scramjet.config || !scramjet.route(event)) return fetch(event.request);
  const target = targetOf(event.request.url);
  if (target && isAdUrl(target)) {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  return scramjet.fetch(event);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.indexOf(PREFIX) !== 0 && path !== BASE + "/scramjet/scramjet.wasm.wasm") return;
  event.respondWith(handleRequest(event));
});
