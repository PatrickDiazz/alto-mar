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
 * Em produção no navegador (qualquer host que não seja localhost), usa caminho relativo
 * (`/api/...`) para o mesmo domínio do site — no Vercel, `vercel.json` faz proxy para a Railway
 * e evita CORS / "Failed to fetch".
 * Em dev (localhost), usa `VITE_API_BASE_URL` se existir, senão `/api` + proxy do Vite.
 * Para forçar URL absoluta em produção (ex.: deploy sem proxy), defina `VITE_API_ALWAYS_DIRECT=1`.
 */
export function apiUrl(path: string) {
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const forceDirect = import.meta.env.VITE_API_ALWAYS_DIRECT === "1" || import.meta.env.VITE_API_ALWAYS_DIRECT === "true";

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

