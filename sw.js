const BASE = (() => {
  let path = self.location.pathname.replace(/\/?sw\.js$/i, "");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "/" ? "" : path;
})();

const rawFetch = self.fetch.bind(self);
function askClientForBlob(client, url) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      reject(new Error("blob timeout"));
    }, 4000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      const data = event.data || {};
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    try {
      client.postMessage({ type: "veil-read-blob", url: url }, [channel.port2]);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}
async function readBlob(url) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (!clients.length) return rawFetch(url);
  return new Promise((resolve) => {
    let left = clients.length;
    let done = false;
    const fail = () => {
      left -= 1;
      if (!done && left <= 0) {
        done = true;
        rawFetch(url).then(resolve, () => resolve(new Response("", { status: 502 })));
      }
    };
    clients.forEach((client) => {
      askClientForBlob(client, url).then((data) => {
        if (done) return;
        if (data && data.buf) {
          done = true;
          resolve(new Response(data.buf, {
            status: 200,
            headers: { "content-type": data.type || "text/javascript" }
          }));
          return;
        }
        fail();
      }).catch(fail);
    });
  });
}
self.fetch = function (input, init) {
  let url = "";
  try {
    url = typeof input === "string" ? input : (input && input.url) || "";
  } catch (err) {}
  if (url.indexOf("blob:") === 0) return readBlob(url);
  return rawFetch(input, init);
};

importScripts((BASE || "") + "/scramjet/scramjet.all.js?v=5");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
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
});

const DROP_HEADERS = [
  "cross-origin-opener-policy",
  "cross-origin-opener-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-embedder-policy-report-only",
  "cross-origin-resource-policy",
  "x-frame-options"
];
const BLOB_HOOK = "<script data-veil-blob>(function(){if(self.__veilBlobHook)return;self.__veilBlobHook=1;var native=fetch.bind(self);function onMsg(ev){var data=ev.data;if(!data||data.type!==\"veil-read-blob\")return;var port=ev.ports&&ev.ports[0];if(!port)return;native(data.url).then(function(res){return res.arrayBuffer().then(function(buf){port.postMessage({buf:buf,type:res.headers.get(\"content-type\")||\"text/javascript\"},[buf]);});}).catch(function(err){try{port.postMessage({error:String(err&&err.message||err)});}catch(e){}}); }if(navigator.serviceWorker)navigator.serviceWorker.addEventListener(\"message\",onMsg);})();</script>";

function injectHook(html) {
  const match = html.match(/<head[^>]*>/i);
  if (!match) return BLOB_HOOK + html;
  const at = match.index + match[0].length;
  return html.slice(0, at) + BLOB_HOOK + html.slice(at);
}

async function finish(response, destination) {
  const headers = new Headers(response.headers || {});
  for (let i = 0; i < DROP_HEADERS.length; i++) headers.delete(DROP_HEADERS[i]);
  const type = (headers.get("content-type") || "").toLowerCase();
  if ((destination === "document" || destination === "iframe") && type.indexOf("text/html") !== -1) {
    const html = await response.text();
    headers.delete("content-length");
    return new Response(injectHook(html), {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

async function handleRequest(event) {
  try {
    if (!scramjet.config || !scramjet.config.prefix) {
      scramjet.config = null;
      await scramjet.loadConfig();
    }
  } catch (err) {}
  if (scramjet.config && !self.__veilWasmReady) {
    const start = Date.now();
    while (!self.__veilWasmReady && Date.now() - start < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
  if (!scramjet.config || !scramjet.config.prefix || !scramjet.route(event)) return rawFetch(event.request);
  const target = targetOf(event.request.url);
  if (target && isAdUrl(target)) {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  try {
    return await finish(await scramjet.fetch(event), event.request.destination);
  } catch (err) {
    try {
      scramjet.config = null;
      self.__veilWasmReady = 0;
      await scramjet.loadConfig();
      return await finish(await scramjet.fetch(event), event.request.destination);
    } catch (err2) {
      return new Response("Veil could not open this page.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
      });
    }
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.indexOf(PREFIX) !== 0 && path !== BASE + "/scramjet/scramjet.wasm.wasm") return;
  event.respondWith(handleRequest(event));
});
