!function () {
  "use strict";
  const post = MessagePort.prototype.postMessage;
  const NativeWebSocket = self.WebSocket;
  // Errors that can only mean the Wisp connection itself is gone.
  const DEAD_MUX = /MuxTaskEnded|Multiplexor task ended|WsClosed|WebSocketConnectFailed|websocket did not open|WebSocket failed to connect/i;
  // Errors that a single site can also cause (refused or reset stream). They only count when the
  // connection has no live socket left, so one bad host never tears down working streams.
  const MAYBE_DEAD = /websocket (?:was )?closed|websocket error|ConnectionClosed|connection closed|Connection reset|socket hang up|Failure when receiving data|Failed sending data|Send failure|Recv failure|Could(?:n't| not) connect to server/i;
  const IDLE_REBUILD_MS = 4 * 60 * 1000;
  const SLEEP_GAP_MS = 30 * 1000;
  const TICK_MS = 5000;
  let streamable = null;
  let transport = null;
  let transportName = "";
  let maker = null;
  let generation = null;
  let rebuilding = null;
  let lastActivity = Date.now();
  let lastTick = Date.now();
  const retired = [];

  function canStream() {
    if (streamable !== null) return streamable;
    const channel = new MessageChannel();
    const stream = new ReadableStream();
    try {
      post.call(channel.port1, stream, [stream]);
      streamable = true;
    } catch (err) {
      streamable = false;
    }
    return streamable;
  }

  function newGeneration(wisp) {
    return { wisp: wisp || "", sockets: new Set(), opened: false, dead: false, stale: false, born: Date.now() };
  }

  function sameServer(a, b) {
    return String(a || "").replace(/\/+$/, "") === String(b || "").replace(/\/+$/, "");
  }

  function liveSockets(gen) {
    let n = 0;
    gen.sockets.forEach(ws => {
      if (ws.readyState === 0 || ws.readyState === 1) n++;
    });
    return n;
  }

  if (typeof NativeWebSocket === "function") {
    const Tracked = function (url, protocols) {
      const ws = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
      const gen = generation;
      if (gen && (!gen.wisp || sameServer(String(url), gen.wisp))) {
        gen.sockets.add(ws);
        gen.dead = false;
        ws.addEventListener("open", () => { gen.opened = true; });
        ws.addEventListener("close", () => {
          gen.sockets.delete(ws);
          if (!liveSockets(gen)) gen.dead = true;
        });
      }
      return ws;
    };
    Tracked.prototype = NativeWebSocket.prototype;
    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(k => { Tracked[k] = NativeWebSocket[k]; });
    self.WebSocket = Tracked;
  }

  self.addEventListener("error", event => {
    if (/closure invoked after being dropped/.test(String(event && event.message || ""))) event.preventDefault();
  });
  self.addEventListener("unhandledrejection", event => {
    if (/closure invoked after being dropped/.test(String(event && event.reason && (event.reason.message || event.reason) || ""))) event.preventDefault();
  });

  // Timers stop while the device sleeps, so a long gap between ticks means we just woke up and
  // every socket opened before the sleep is probably half-open.
  function checkSleep() {
    const now = Date.now();
    if (now - lastTick > SLEEP_GAP_MS && generation) generation.stale = "sleep";
    lastTick = now;
  }
  setInterval(checkSleep, TICK_MS);

  // Retire a dead or suspect connection. close() alone is not enough for a half-open socket: the
  // close handshake never finishes, so no close event fires and libcurl keeps reusing it.
  function killSockets(gen) {
    gen.sockets.forEach(ws => {
      try { ws.close(); } catch (err) {}
      if (ws.readyState !== 3 && !ws.__veilKilled) {
        ws.__veilKilled = true;
        try { ws.dispatchEvent(new CloseEvent("close", { code: 1006, reason: "veil: connection retired" })); } catch (err) {}
      }
    });
    gen.sockets.clear();
    gen.dead = true;
  }

  function noClients() {
    return new Error("there are no bare clients", { cause: "No BareTransport was set. Try creating a BareMuxConnection and calling setTransport() or setManualTransport() on it before using BareClient." });
  }

  function reportError(port, err, what) {
    console.error(`error while processing '${what}': `, err);
    port.postMessage({ type: "error", error: err });
  }

  function note(data) {
    try { self.postMessage(data); } catch (err) {}
  }

  function serverList() {
    if (!maker) return [];
    const opts = maker.args[0] || {};
    const list = [opts.wisp || opts.websocket].concat(Array.isArray(opts.veilFallbacks) ? opts.veilFallbacks : []);
    const out = [];
    list.forEach(url => {
      if (url && !out.some(value => sameServer(value, url))) out.push(url);
    });
    return out;
  }

  async function build(wisp) {
    const args = maker.args.slice();
    if (args[0] && typeof args[0] === "object" && wisp) args[0] = Object.assign({}, args[0], { wisp: wisp, websocket: wisp });
    const gen = newGeneration(wisp || (args[0] && (args[0].wisp || args[0].websocket)));
    const prevGen = generation;
    generation = gen;
    let next;
    try {
      next = new maker.Ctor(...args);
      if (!next.ready) await next.init();
    } catch (err) {
      generation = prevGen;
      throw err;
    }
    return { next, gen };
  }

  function rebuild(reason, useFallback) {
    if (rebuilding) return rebuilding;
    if (!maker) return Promise.resolve(false);
    rebuilding = (async () => {
      const old = transport;
      const oldGen = generation;
      const servers = serverList();
      let target = oldGen && oldGen.wisp || servers[0];
      if (useFallback && servers.length > 1) {
        const idx = servers.findIndex(value => sameServer(value, target));
        target = servers[(idx + 1) % servers.length];
      }
      const { next, gen } = await build(target);
      transport = next;
      if (old) {
        retired.push(old);
        while (retired.length > 6) retired.shift();
      }
      if (oldGen) killSockets(oldGen);
      console.info("[veil-mux] transport rebuilt (" + reason + ")" + (useFallback ? " on " + target : ""));
      note({ type: "veil-mux-rebuilt", reason: reason, wisp: gen.wisp, switched: !!useFallback });
      return true;
    })().finally(() => { rebuilding = null; });
    return rebuilding;
  }

  async function ensureTransport() {
    if (rebuilding) await rebuilding.catch(() => {});
    if (!transport) throw noClients();
    if (transport instanceof MessagePort) return;
    checkSleep();
    const gen = generation;
    const idle = Date.now() - lastActivity > IDLE_REBUILD_MS;
    if (gen && (gen.dead || gen.stale || (idle && gen.opened))) {
      try {
        await rebuild(gen.dead ? "dead" : gen.stale ? String(gen.stale) : "idle");
      } catch (err) {
        console.warn("[veil-mux] rebuild failed", err);
      }
    }
    lastActivity = Date.now();
    if (!transport.ready) await transport.init();
  }

  function deadMux(err) {
    if (generation && generation.dead) return true;
    const text = String(err && (err.message || err) || "");
    if (DEAD_MUX.test(text)) return true;
    return MAYBE_DEAD.test(text) && !!generation && !liveSockets(generation);
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function doFetch(msg, port) {
    const method = String(msg.fetch.method || "GET").toUpperCase();
    const replayable = method === "GET" || method === "HEAD";
    let res;
    for (let attempt = 0; ; attempt++) {
      await ensureTransport();
      try {
        res = await transport.request(new URL(msg.fetch.remote), msg.fetch.method, msg.fetch.body, msg.fetch.headers, null);
        break;
      } catch (err) {
        if (attempt >= 2 || !deadMux(err)) throw err;
        console.warn("[veil-mux] dead connection on " + method + ", rebuilding", String(err && err.message || err).slice(0, 160));
        try {
          await rebuild("error", attempt === 1);
        } catch (rebuildErr) {
          console.warn("[veil-mux] rebuild failed", rebuildErr);
        }
        if (!replayable) throw err;
        await wait(attempt ? 600 : 150);
      }
    }
    if (!canStream() && res.body instanceof ReadableStream) {
      res.body = await new Response(res.body).arrayBuffer();
    }
    if (res.body instanceof ReadableStream || res.body instanceof ArrayBuffer) post.call(port, { type: "fetch", fetch: res }, [res.body]);
    else post.call(port, { type: "fetch", fetch: res });
  }

  async function doWebSocket(msg, port) {
    const spec = msg.websocket;
    const channel = spec.channel;
    let opened = false;
    let retried = false;
    let handles = null;
    const open = () => {
      const mine = { done: false };
      const pair = transport.connect(
        new URL(spec.url), spec.protocols, spec.requestHeaders,
        proto => { if (mine.done) return; opened = true; lastActivity = Date.now(); post.call(channel, { type: "open", args: [proto] }); },
        data => { if (mine.done) return; lastActivity = Date.now(); data instanceof ArrayBuffer ? post.call(channel, { type: "message", args: [data] }, [data]) : post.call(channel, { type: "message", args: [data] }); },
        (code, reason) => { if (mine.done) return; if (!opened && retry(mine, reason)) return; post.call(channel, { type: "close", args: [code, reason] }); },
        err => { if (mine.done) return; if (!opened && retry(mine, err)) return; post.call(channel, { type: "error", args: [err] }); }
      );
      handles = pair;
    };
    const retry = (mine, why) => {
      if (retried || !deadMux(why)) return false;
      retried = true;
      mine.done = true;
      console.warn("[veil-mux] websocket hit a dead connection, rebuilding");
      rebuild("ws-error").catch(err => console.warn("[veil-mux] rebuild failed", err)).then(() => {
        try { open(); } catch (err) { post.call(channel, { type: "error", args: [String(err && err.message || err)] }); }
      });
      return true;
    };
    open();
    channel.onmessage = event => {
      const data = event.data;
      if (!handles) return;
      lastActivity = Date.now();
      if (data.type === "data") handles[0](data.data);
      else if (data.type === "close") handles[1](data.closeCode, data.closeReason);
    };
    post.call(port, { type: "websocket" });
  }

  function forward(msg, port) {
    const list = [port];
    if (msg.fetch && msg.fetch.body) list.push(msg.fetch.body);
    if (msg.websocket && msg.websocket.channel) list.push(msg.websocket.channel);
    post.call(transport, { message: msg, port: port }, list);
  }

  function attach(source) {
    try { source.start(); } catch (err) {}
    source.onmessage = async event => {
      const port = event.data.port;
      const msg = event.data.message;
      if (msg.type === "ping") {
        post.call(port, { type: "pong" });
      } else if (msg.type === "set") {
        try {
          const AsyncFunction = async function () {}.constructor;
          if (msg.client.function === "bare-mux-remote") {
            transport = msg.client.args[0];
            transportName = `bare-mux-remote (${msg.client.args[1]})`;
            maker = null;
            generation = null;
          } else {
            const [Ctor, name] = await new AsyncFunction(msg.client.function)();
            maker = { Ctor: Ctor, args: msg.client.args };
            const opts = msg.client.args[0] || {};
            generation = newGeneration(opts.wisp || opts.websocket);
            transport = new Ctor(...msg.client.args);
            transportName = name;
            lastActivity = Date.now();
          }
          console.log("set transport to ", transport, transportName);
          post.call(port, { type: "set" });
        } catch (err) {
          reportError(port, err, "set");
        }
      } else if (msg.type === "get") {
        port.postMessage({ type: "get", name: transportName });
      } else if (msg.type === "fetch") {
        try {
          if (!transport) throw noClients();
          if (transport instanceof MessagePort) return void forward(msg, port);
          await doFetch(msg, port);
        } catch (err) {
          reportError(port, err, "fetch");
        }
      } else if (msg.type === "websocket") {
        try {
          if (!transport) throw noClients();
          if (transport instanceof MessagePort) return void forward(msg, port);
          await ensureTransport();
          await doWebSocket(msg, port);
        } catch (err) {
          reportError(port, err, "websocket");
        }
      }
    };
  }

  new BroadcastChannel("bare-mux").postMessage({ type: "refreshPort" });
  self.onconnect = event => { attach(event.ports[0]); };
  self.onmessage = event => {
    const data = event.data || {};
    if (data.type === "veil-mux-wake") {
      if (generation && transport && !(transport instanceof MessagePort)) {
        checkSleep();
        const quiet = Date.now() - lastActivity;
        if (data.reason === "online") generation.stale = "online";
        else if (quiet > IDLE_REBUILD_MS && generation.opened) generation.stale = "idle";
        if (generation.stale || generation.dead) {
          rebuild(generation.dead ? "dead" : String(generation.stale)).catch(err => console.warn("[veil-mux] rebuild failed", err));
        }
      }
      return;
    }
    if (data.type === "veil-mux-state") {
      const gen = generation;
      try {
        event.ports[0].postMessage({ name: transportName, wisp: gen && gen.wisp, sockets: gen ? liveSockets(gen) : 0, dead: !!(gen && gen.dead), stale: gen && gen.stale || false, retired: retired.length });
      } catch (err) {}
      return;
    }
    const port = data.port || event.ports && event.ports[0];
    if (port && port.postMessage) attach(port);
  };
  console.debug("bare-mux: running v2.1.7 (build c56d286) + veil reconnect");
}();
