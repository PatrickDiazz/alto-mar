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
 * Monta a URL da API.
 *
 * **Desenvolvimento (`npm run dev`):** usa sempre `/api/...` relativo ao Vite, para o proxy em
 * `vite.config.ts` encaminhar a `localhost:3001`. Assim evita falhas por CORS e por `VITE_API_BASE_URL`
 * apontando direto para a API (comum no `.env` local e que quebrava só em alguns PCs/navegadores).
 * Para testar URL absoluta no dev, defina `VITE_API_ALWAYS_DIRECT=1`.
 *
 * **Produção:** em hosts que não são localhost/127.0.0.1, usa `/api` no mesmo domínio (ex.: Vercel + rewrite).
 * Com `VITE_API_BASE_URL` + build, comportamento anterior continua disponível quando não é DEV.
 */
export function apiUrl(path: string) {
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const forceDirect = import.meta.env.VITE_API_ALWAYS_DIRECT === "1" || import.meta.env.VITE_API_ALWAYS_DIRECT === "true";

  if (import.meta.env.DEV && !forceDirect) {
    return pathNorm;
  }

  if (!forceDirect && typeof window !== "undefined") {
    const h = window.location.hostname;
    const isLocal = h === "localhost" || h === "127.0.0.1";
    if (!isLocal) {
      return pathNorm;
    }
  }

  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base) return pathNorm;
  return `${base.replace(/\/$/, "")}${pathNorm}`;
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

