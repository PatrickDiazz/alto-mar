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

export async function adminFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = path.startsWith("/") ? path : `/${path}`;
  const resp = await fetch(url, { ...init, headers });
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
    const err = data as { error?: string };
    throw new Error(err.error || resp.statusText || "Erro na API");
  }
  return data as T;
}
