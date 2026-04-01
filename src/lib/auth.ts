export type UserRole = "banhista" | "locatario";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const TOKEN_KEY = "alto_mar_token";
const USER_KEY = "alto_mar_user";

/**
 * - Sem `https://`, o browser trata o valor como caminho relativo ao site (ex.: Vercel + host Railway → 405).
 * - Evita `...railway.app/api` + `/api/...` duplicado.
 */
function normalizeApiBase(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let b = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(b)) {
    b = `https://${b.replace(/^\/+/, "")}`;
  }
  if (b.endsWith("/api")) {
    b = b.slice(0, -4);
  }
  return b.replace(/\/$/, "");
}

/**
 * Monta a URL da API.
 *
 * **Dev:** por defeito `/api` relativo → proxy Vite → `localhost:3001`. Com
 * `VITE_API_ALWAYS_DIRECT=1` e `VITE_API_BASE_URL`, usa URL absoluta (CORS na API).
 *
 * **Produção:** se `VITE_API_BASE_URL` existir no **build** (variável na Vercel), usa chamada **direta**
 * à Railway — não depende do proxy serverless `api/[...path].js`. Sem isso, usa `/api` relativo
 * (proxy + `ALTO_MAR_API_ORIGIN` na Vercel).
 */
export function apiUrl(path: string) {
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const forceDirect =
    import.meta.env.VITE_API_ALWAYS_DIRECT === "1" || import.meta.env.VITE_API_ALWAYS_DIRECT === "true";
  const base = normalizeApiBase(import.meta.env.VITE_API_BASE_URL as string | undefined);

  if (import.meta.env.DEV) {
    if (base && forceDirect) return `${base}${pathNorm}`;
    return pathNorm;
  }

  if (base) {
    return `${base}${pathNorm}`;
  }

  return pathNorm;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url =
    typeof input === "string"
      ? apiUrl(input)
      : input instanceof URL
        ? new URL(apiUrl(input.toString()))
        : input;
  return fetch(url, { ...init, headers });
}

