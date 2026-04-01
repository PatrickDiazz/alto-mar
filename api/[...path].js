import { buffer } from "node:stream/consumers";

/**
 * req.url relativo; em alguns runtimes vem sem o prefixo /api — corrige antes de bater no Railway.
 */
function resolveApiPathname(req) {
  const raw = req.url || "/";
  let pathname;
  try {
    pathname = new URL(raw, "http://localhost").pathname;
  } catch {
    return "/api";
  }
  if (pathname.startsWith("/api")) return pathname;
  if (!pathname || pathname === "/") return "/api";
  return `/api${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

/**
 * Proxy em runtime: /api/* → ALTO_MAR_API_ORIGIN + mesmo path.
 * Defina ALTO_MAR_API_ORIGIN no painel da Vercel (ex.: https://xxx.up.railway.app, sem barra no fim).
 */
export default async function handler(req, res) {
  try {
    const base = process.env.ALTO_MAR_API_ORIGIN?.trim().replace(/\/$/, "");
    if (!base) {
      res
        .status(503)
        .json({ ok: false, reason: "missing_ALTO_MAR_API_ORIGIN" });
      return;
    }

    const pathname = resolveApiPathname(req);
    let search = "";
    try {
      const raw = req.url || "/";
      search = new URL(raw, "http://localhost").search || "";
    } catch {
      search = "";
    }

    const targetUrl = `${base}${pathname}${search}`;

    const headers = new Headers();
    const forward = [
      "authorization",
      "content-type",
      "accept",
      "accept-language",
      "user-agent",
      "cookie",
    ];
    for (const name of forward) {
      const v = req.headers[name];
      if (typeof v === "string" && v.length > 0) {
        headers.set(name, v);
      } else if (Array.isArray(v) && v.length > 0) {
        headers.set(name, v.join(", "));
      }
    }

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await buffer(req);
      } catch {
        body = undefined;
      }
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? body : undefined,
      });
    } catch {
      res.status(503).json({ ok: false });
      return;
    }

    const skipResponse = new Set([
      "connection",
      "keep-alive",
      "transfer-encoding",
      "content-encoding",
    ]);

    upstream.headers.forEach((value, key) => {
      if (skipResponse.has(key.toLowerCase())) return;
      try {
        res.setHeader(key, value);
      } catch {
        // ignore invalid header names for Node
      }
    });

    res.status(upstream.status);
    const out = Buffer.from(await upstream.arrayBuffer());
    res.end(out);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[api proxy]", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false });
    }
  }
}
