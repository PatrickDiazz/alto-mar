const DEFAULT_BLOCKED_KEYWORDS = [
  "whatsapp",
  "watsapp",
  "wa.me",
  "telegram",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "snapchat",
  "signal",
  "pix",
  "chave pix",
  "transferencia",
  "transferência",
  "deposita",
  "deposito",
  "depósito",
  "pagamento externo",
  "me liga",
  "me chama",
  "me ligue",
  "me chame",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9][-a-z0-9]*\.(com|br|net|org|io|app|me|co|xyz|info|dev)(?:\/[^\s]*)?/i;
const HANDLE_RE = /@[a-z0-9._]{2,}/i;

function blockedKeywords() {
  const raw = process.env.CHAT_BLOCKED_KEYWORDS;
  if (!raw || !String(raw).trim()) return DEFAULT_BLOCKED_KEYWORDS;
  return String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function digitsOnly(text) {
  return String(text).replace(/\D/g, "");
}

function hasPhoneLikeSequence(text) {
  const compact = digitsOnly(text);
  if (compact.length < 10) return false;
  for (let i = 0; i <= compact.length - 10; i++) {
    const slice = compact.slice(i, i + 11);
    if (slice.length === 10 || slice.length === 11) {
      if (/^\d{10,11}$/.test(slice)) return true;
    }
  }
  const spaced = String(text).replace(/[^\d+()\s.-]/g, " ");
  const chunks = spaced.split(/\s+/).map(digitsOnly).filter((c) => c.length >= 8);
  return chunks.some((c) => c.length >= 10 && c.length <= 13);
}

/**
 * @param {string} body
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateMessageBody(body) {
  const trimmed = String(body ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > 2000) return { ok: false, reason: "too_long" };

  const lower = trimmed.toLowerCase();
  const normalized = lower.replace(/\s+/g, " ");

  if (EMAIL_RE.test(normalized)) return { ok: false, reason: "email" };
  if (URL_RE.test(normalized)) return { ok: false, reason: "url" };
  if (HANDLE_RE.test(normalized)) return { ok: false, reason: "handle" };
  if (hasPhoneLikeSequence(trimmed)) return { ok: false, reason: "phone" };

  for (const kw of blockedKeywords()) {
    if (normalized.includes(kw)) return { ok: false, reason: `keyword:${kw}` };
  }

  return { ok: true };
}
