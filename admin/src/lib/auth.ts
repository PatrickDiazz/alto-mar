export type StaffRole = "STAFF" | "MODERATOR" | "SENIOR_MODERATOR" | "ADMIN";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions?: Record<string, boolean>;
};

const TOKEN_KEY = "alto_mar_admin_token";
const USER_KEY = "alto_mar_admin_user";

function schemeForHostWithoutProtocol(hostPort: string): "http" | "https" {
  const host = (hostPort.split(":")[0] || "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return "http";
  }
  return "https";
}

function normalizeApiBase(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let b = trimmed.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(b)) {
    const rest = b.replace(/^\/+/, "");
    const scheme = schemeForHostWithoutProtocol(rest);
    b = `${scheme}://${rest}`;
  }
  if (b.endsWith("/api")) {
    b = b.slice(0, -4);
  }
  return b.replace(/\/$/, "");
}

/** Dev: `/api` → proxy Vite. Produção: `VITE_API_BASE_URL` → Railway directo; senão proxy Vercel `api/[...path].js`. */
export function apiUrl(path: string) {
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const base = normalizeApiBase(import.meta.env.VITE_API_BASE_URL as string | undefined);
  if (import.meta.env.DEV && !base) return pathNorm;
  if (base) return `${base}${pathNorm}`;
  return pathNorm;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStaff(): StaffUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, staff: StaffUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(staff));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function formatApiError(
  resp: Response,
  data: { error?: string; reason?: string; ok?: boolean }
) {
  if (data.error) return data.error;
  if (data.reason === "missing_ALTO_MAR_API_ORIGIN") {
    return "Proxy da API não configurado (ALTO_MAR_API_ORIGIN na Vercel).";
  }
  if (resp.status === 503) {
    return "API indisponível. Confirme se o servidor está a correr ou se VITE_API_BASE_URL está definido.";
  }
  if (resp.statusText) return resp.statusText;
  return `Erro na API (${resp.status})`;
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let resp: Response;
  try {
    resp = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new Error(
      import.meta.env.DEV
        ? "API inacessível. Execute npm run dev:server (porta 3001)."
        : "API inacessível. Defina VITE_API_BASE_URL no build da Vercel ou ALTO_MAR_API_ORIGIN no runtime."
    );
  }
  if (resp.status === 401 && token) {
    clearSession();
    window.location.assign("/login");
  }
  return resp;
}

export async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await adminFetch(path, init);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(formatApiError(resp, data as { error?: string; reason?: string; ok?: boolean }));
  }
  return data as T;
}
