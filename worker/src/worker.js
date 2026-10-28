const enc = new TextEncoder();
function json(value, extra = 200, other = {}) {
  return new Response(JSON.stringify(value), {
    status: extra,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": other.origin || "*",
      "access-control-allow-headers": "content-type, authorization, x-veil-admin",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "cache-control": "no-store"
    }
  });
}
function cors(value) {
  return {
    origin: value.headers.get("Origin") || "*"
  };
}
function clientIp(value) {
  return value.headers.get("CF-Connecting-IP") || (value.headers.get("X-Forwarded-For") || "").split(",")[0].trim() || "0.0.0.0";
}
function parseDuration(value) {
  if (value == null) {
    return null;
  }
  const input = String(value).trim().toLowerCase();
  if (!input) {
    return null;
  }
  if (["inf", "infinite", "perm", "permanent"].includes(input)) {
    return {
      ms: null,
      infinite: true,
      label: "inf"
    };
  }
  let output = input.replace(/days?/g, "d").replace(/hours?/g, "h").replace(/hrs?/g, "h").replace(/minutes?/g, "m").replace(/mins?/g, "m").replace(/seconds?/g, "s").replace(/secs?/g, "s").replace(/,/g, ";").replace(/\s+/g, "");
  const ev = output.split(";").filter(Boolean);
  let handler = 0;
  const nodes = /^(\d+)(ms|s|m|h|hr|d)$/;
  for (const part of ev) {
    const frame = part.match(nodes);
    if (!frame) {
      return null;
    }
    const icon = parseInt(frame[1], 10);
    const title = frame[2];
    if (title === "ms") {
      handler += icon;
    } else if (title === "s") {
      handler += icon * 1000;
    } else if (title === "m") {
      handler += icon * 60 * 1000;
    } else if (title === "h" || title === "hr") {
      handler += icon * 3600 * 1000;
    } else if (title === "d") {
      handler += icon * 86400 * 1000;
    }
  }
  if (handler <= 0) {
    return null;
  }
  return {
    ms: handler,
    infinite: false,
    label: output
  };
}
function formatLeft(value) {
  if (value == null || !Number.isFinite(value)) {
    return "inf";
  }
  if (value <= 0) {
    return "0s";
  }
  const piece = Math.floor(value / 1000);
  const chunk = Math.floor(piece / 86400);
  const bits = Math.floor(piece % 86400 / 3600);
  const amount = Math.floor(piece % 3600 / 60);
  const delay = piece % 60;
  const stamp = [];
  if (chunk) {
    stamp.push(chunk + "d");
  }
  if (bits) {
    stamp.push(bits + "h");
  }
  if (amount) {
    stamp.push(amount + "m");
  }
  if (delay || !stamp.length) {
    stamp.push(delay + "s");
  }
  return stamp.join(";");
}
function randomToken(value2 = 24) {
  const uint8Array = new Uint8Array(value2);
  crypto.getRandomValues(uint8Array);
  return [...uint8Array].map(value => value.toString(16).padStart(2, "0")).join("");
}
function genKeyCode() {
  const uint8Array = new Uint8Array(8);
  crypto.getRandomValues(uint8Array);
  return [...uint8Array].map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}
async function hmac(value2, extra) {
  const saved = await crypto.subtle.importKey("raw", enc.encode(value2), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  const fresh = await crypto.subtle.sign("HMAC", saved, enc.encode(extra));
  return [...new Uint8Array(fresh)].map(value => value.toString(16).padStart(2, "0")).join("");
}
async function makeAdminToken(value, extra = 43200000) {
  const base = Date.now() + extra;
  const full = randomToken(8);
  const short = base + "." + full;
  const line = await hmac(value.ADMIN_SECRET || value.ADMIN_PASSWORD || "veil", short);
  return short + "." + line;
}
async function verifyAdminToken(value, extra) {
  if (!extra || typeof extra !== "string") {
    return false;
  }
  const code = extra.split(".");
  if (code.length !== 3) {
    return false;
  }
  const [hash, sign, secret] = code;
  const addr = parseInt(hash, 10);
  if (!Number.isFinite(addr) || Date.now() > addr) {
    return false;
  }
  const port = await hmac(value.ADMIN_SECRET || value.ADMIN_PASSWORD || "veil", hash + "." + sign);
  return secret === port;
}
async function getIpRecord(value, extra) {
  const file = await value.VEIL_KV.get("ip:" + extra, "json");
  return file || {
    ip: extra,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    hits: 0,
    blockedUntil: 0,
    blockInfinite: false,
    access: null,
    history: [],
    geo: null
  };
}
async function putIpRecord(value, extra) {
  if (extra.history && extra.history.length > 40) {
    extra.history = extra.history.slice(-40);
  }
  await value.VEIL_KV.put("ip:" + String(extra.ip || "0.0.0.0"), JSON.stringify(extra), {
    expirationTtl: 15552000
  });
}
async function listIpKeys(value) {
  const ctx = [];
  let width;
  do {
    const color = await value.VEIL_KV.list({
      prefix: "ip:",
      cursor: width
    });
    for (const tab of color.keys) {
      ctx.push(tab.name);
    }
    width = color.list_complete ? null : color.cursor;
  } while (width);
  return ctx;
}
async function getGlobalEpoch(value) {
  const size = await value.VEIL_KV.get("meta:globalEpoch");
  if (size) {
    return parseInt(size, 10) || 0;
  } else {
    return 0;
  }
}
export default {
  async fetch(value2, extra2) {
    const uRL = new URL(value2.url);
    const flag = cors(value2);
    if (value2.method === "OPTIONS") {
      return json({
        ok: true
      }, 204, flag);
    }
    if (uRL.pathname === "/" || uRL.pathname === "/api/health") {
      return json({
        ok: true,
        service: "veil-access"
      }, 200, flag);
    }
    try {
      if (uRL.pathname === "/api/admin/login" && value2.method === "POST") {
        const show = await value2.json().catch(() => ({}));
        if (!extra2.ADMIN_PASSWORD || show.password !== extra2.ADMIN_PASSWORD) {
          return json({
            ok: false,
            error: "Invalid admin password"
          }, 401, flag);
        }
        const email = await makeAdminToken(extra2);
        return json({
          ok: true,
          token: email
        }, 200, flag);
      }
      const page = value2.headers.get("x-veil-admin") || (value2.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || "";
      if (uRL.pathname === "/api/admin/generate-key" && value2.method === "POST") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const password = await value2.json().catch(() => ({}));
        const response = parseDuration(password.duration || password.ttl || "1h");
        if (!response) {
          return json({
            ok: false,
            error: "Invalid duration format"
          }, 400, flag);
        }
        const clientId = genKeyCode();
        const path = {
          code: clientId,
          created: Date.now(),
          durationMs: response.ms,
          infinite: !!response.infinite,
          durationLabel: response.label,
          used: false,
          usedAt: null,
          usedByIp: null
        };
        await extra2.VEIL_KV.put("key:" + clientId, JSON.stringify(path), {
          expirationTtl: 2592000
        });
        return json({
          ok: true,
          key: clientId,
          duration: response.label,
          infinite: response.infinite
        }, 200, flag);
      }
      if (uRL.pathname === "/api/admin/ips" && value2.method === "GET") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const body = await listIpKeys(extra2);
        const token = Date.now();
        const user = [];
        for (const immediate of body) {
          const source = await extra2.VEIL_KV.get(immediate, "json");
          if (!source) {
            continue;
          }
          const target = !!source.blockInfinite || source.blockedUntil && source.blockedUntil > token;
          let reason = null;
          if (source.access) {
            const value = source.access.infinite ? null : Math.max(0, (source.access.expires || 0) - token);
            const extra = source.access.infinite || source.access.expires && source.access.expires > token;
            reason = {
              ...source.access,
              valid: extra,
              timeLeft: source.access.infinite ? "inf" : formatLeft(value),
              timeLeftMs: value
            };
          }
          user.push({
            ip: source.ip,
            firstSeen: source.firstSeen,
            lastSeen: source.lastSeen,
            hits: source.hits,
            blocked: target,
            blockedUntil: source.blockedUntil || 0,
            blockInfinite: !!source.blockInfinite,
            blockLeft: source.blockInfinite ? "inf" : formatLeft(Math.max(0, (source.blockedUntil || 0) - token)),
            access: reason,
            geo: source.geo || null
          });
        }
        user.sort((value, extra) => (extra.lastSeen || 0) - (value.lastSeen || 0));
        return json({
          ok: true,
          ips: user
        }, 200, flag);
      }
      if (uRL.pathname.startsWith("/api/admin/ip/") && value2.method === "GET") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const data = decodeURIComponent(uRL.pathname.slice("/api/admin/ip/".length));
        const msg = await getIpRecord(extra2, data);
        const isErr = Date.now();
        const name2 = msg.geo && msg.geo.lat;
        const maxAge = msg.geo && msg.geo.lon;
        let key = "https://www.openstreetmap.org/search?query=" + encodeURIComponent(data);
        if (name2 && maxAge) {
          key = "https://www.openstreetmap.org/?mlat=" + name2 + "&mlon=" + maxAge + "#map=10/" + name2 + "/" + maxAge;
        }
        return json({
          ok: true,
          ip: msg,
          blocked: !!msg.blockInfinite || msg.blockedUntil && msg.blockedUntil > isErr,
          blockLeft: msg.blockInfinite ? "inf" : formatLeft(Math.max(0, (msg.blockedUntil || 0) - isErr)),
          mapUrl: key
        }, 200, flag);
      }
      if (uRL.pathname === "/api/admin/block" && value2.method === "POST") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const id = await value2.json().catch(() => ({}));
        const url = String(id.ip || "").trim();
        if (!url) {
          return json({
            ok: false,
            error: "Missing ip"
          }, 400, flag);
        }
        const el = parseDuration(id.duration || "1h");
        if (!el) {
          return json({
            ok: false,
            error: "Invalid duration"
          }, 400, flag);
        }
        const node = await getIpRecord(extra2, url);
        node.blockInfinite = !!el.infinite;
        node.blockedUntil = el.infinite ? 0 : Date.now() + el.ms;
        node.access = null;
        await putIpRecord(extra2, node);
        return json({
          ok: true,
          ip: url,
          blockLeft: el.infinite ? "inf" : formatLeft(el.ms)
        }, 200, flag);
      }
      if (uRL.pathname === "/api/admin/unblock" && value2.method === "POST") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const err = await value2.json().catch(() => ({}));
        const list = String(err.ip || "").trim();
        const item = await getIpRecord(extra2, list);
        item.blockInfinite = false;
        item.blockedUntil = 0;
        await putIpRecord(extra2, item);
        return json({
          ok: true
        }, 200, flag);
      }
      if (uRL.pathname === "/api/admin/signout-all" && value2.method === "POST") {
        if (!(await verifyAdminToken(extra2, page))) {
          return json({
            ok: false,
            error: "Unauthorized"
          }, 401, flag);
        }
        const text = Date.now();
        await extra2.VEIL_KV.put("meta:globalEpoch", String(text));
        const raw = await listIpKeys(extra2);
        for (const locked of raw) {
          const note = await extra2.VEIL_KV.get(locked, "json");
          if (note) {
            note.access = null;
            await extra2.VEIL_KV.put(locked, JSON.stringify(note));
          }
        }
        return json({
          ok: true,
          epoch: text
        }, 200, flag);
      }
      if (uRL.pathname === "/api/redeem" && value2.method === "POST") {
        const found = clientIp(value2);
        const next = await value2.json().catch(() => ({}));
        const prev = String(next.key || next.code || "").trim().toUpperCase().replace(/\s+/g, "");
        if (!prev) {
          return json({
            ok: false,
            error: "Enter a key"
          }, 400, flag);
        }
        const timer = await getIpRecord(extra2, found);
        timer.lastSeen = Date.now();
        timer.hits = (timer.hits || 0) + 1;
        const box = value2.cf || {};
        timer.geo = {
          country: box.country || null,
          region: box.region || null,
          city: box.city || null,
          lat: box.latitude || null,
          lon: box.longitude || null,
          asOrganization: box.asOrganization || null,
          timezone: box.timezone || null
        };
        const btn = Date.now();
        if (timer.blockInfinite || timer.blockedUntil && timer.blockedUntil > btn) {
          const inf = timer.blockInfinite ? "inf" : formatLeft(Math.max(0, timer.blockedUntil - btn));
          await putIpRecord(extra2, timer);
          return json({
            ok: false,
            blocked: true,
            error: "You are blocked from entering Veil for " + inf + ".",
            blockLeft: inf
          }, 403, flag);
        }
        const html = await extra2.VEIL_KV.get("key:" + prev, "json");
        if (!html || html.used) {
          await putIpRecord(extra2, timer);
          return json({
            ok: false,
            error: "Invalid or already used key"
          }, 400, flag);
        }
        html.used = true;
        html.usedAt = btn;
        html.usedByIp = found;
        await extra2.VEIL_KV.put("key:" + prev, JSON.stringify(html));
        const cls = await getGlobalEpoch(extra2);
        const style = randomToken(24);
        const opts = !!html.infinite;
        const src = opts ? null : btn + (html.durationMs || 0);
        const dest = {
          id: style,
          ip: found,
          key: prev,
          started: btn,
          expires: src,
          infinite: opts,
          durationLabel: html.durationLabel,
          durationMs: html.durationMs,
          epoch: cls
        };
        const host = opts ? 7776000 : Math.max(60, Math.ceil((html.durationMs || 0) / 1000) + 60);
        await extra2.VEIL_KV.put("session:" + style, JSON.stringify(dest), {
          expirationTtl: Math.min(host, 7776000)
        });
        timer.access = {
          sessionId: style,
          key: prev,
          started: btn,
          expires: src,
          infinite: opts,
          durationLabel: html.durationLabel,
          durationMs: html.durationMs
        };
        timer.history = timer.history || [];
        timer.history.push({
          at: btn,
          key: prev,
          durationLabel: html.durationLabel
        });
        await putIpRecord(extra2, timer);
        return json({
          ok: true,
          token: style,
          expires: src,
          infinite: opts,
          durationLabel: html.durationLabel,
          timeLeft: opts ? "inf" : formatLeft(html.durationMs)
        }, 200, flag);
      }
      if (uRL.pathname === "/api/session/check" && value2.method === "POST") {
        const query = clientIp(value2);
        const res = await value2.json().catch(() => ({}));
        const req = String(res.token || "").trim();
        const rec = Date.now();
        const row = await getIpRecord(extra2, query);
        row.lastSeen = rec;
        if (row.blockInfinite || row.blockedUntil && row.blockedUntil > rec) {
          const inf = row.blockInfinite ? "inf" : formatLeft(Math.max(0, row.blockedUntil - rec));
          await putIpRecord(extra2, row);
          return json({
            ok: false,
            blocked: true,
            error: "You are blocked from entering Veil for " + inf + ".",
            blockLeft: inf
          }, 403, flag);
        }
        if (!req) {
          await putIpRecord(extra2, row);
          return json({
            ok: false,
            error: "No session"
          }, 401, flag);
        }
        const count = await extra2.VEIL_KV.get("session:" + req, "json");
        if (!count) {
          await putIpRecord(extra2, row);
          return json({
            ok: false,
            error: "Session expired or invalid"
          }, 401, flag);
        }
        const index = await getGlobalEpoch(extra2);
        if ((count.epoch || 0) < index) {
          await extra2.VEIL_KV.delete("session:" + req);
          await putIpRecord(extra2, row);
          return json({
            ok: false,
            error: "Signed out globally"
          }, 401, flag);
        }
        if (!count.infinite && count.expires && count.expires <= rec) {
          await extra2.VEIL_KV.delete("session:" + req);
          if (row.access && row.access.sessionId === req) {
            row.access = null;
          }
          await putIpRecord(extra2, row);
          return json({
            ok: false,
            error: "Session expired"
          }, 401, flag);
        }
        count.lastIp = query;
        count.lastSeen = rec;
        await extra2.VEIL_KV.put("session:" + req, JSON.stringify(count));
        const entry = count.infinite ? null : Math.max(0, count.expires - rec);
        await putIpRecord(extra2, row);
        return json({
          ok: true,
          expires: count.expires,
          infinite: !!count.infinite,
          timeLeft: count.infinite ? "inf" : formatLeft(entry),
          key: count.key
        }, 200, flag);
      }
      return json({
        ok: false,
        error: "Not found"
      }, 404, flag);
    } catch (err) {
      return json({
        ok: false,
        error: String(err && err.message ? err.message : err)
      }, 500, flag);
    }
  }
};