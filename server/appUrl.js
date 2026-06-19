/**
 * Garante URL absoluta com esquema (http/https). Evita erros do Stripe/OAuth quando
 * FRONTEND_URL ou API_PUBLIC_URL vêm como `altomar.app` sem `https://`.
 * @param {string | undefined | null} raw
 * @param {string} fallback
 */
export function normalizeAppUrl(raw, fallback) {
  const fb = String(fallback || "").trim().replace(/\/$/, "") || "http://localhost:8080";
  if (raw == null || !String(raw).trim()) return fb;
  let s = String(raw).trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(s)) {
    const host = (s.split("/")[0] || "").toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:");
    s = `${isLocal ? "http" : "https"}://${s}`;
  }
  try {
    return new URL(s).origin;
  } catch {
    return fb;
  }
}
