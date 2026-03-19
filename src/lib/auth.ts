export type UserRole = "banhista" | "locatario";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const TOKEN_KEY = "alto_mar_token";
const USER_KEY = "alto_mar_user";

export function apiUrl(path: string) {
  const base = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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

