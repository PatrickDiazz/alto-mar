import i18n from "@/i18n";

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
 * - Sem esquema, o browser trata como caminho relativo ao site (ex.: Vercel + host Railway → 405).
 * - `localhost` / `127.0.0.1` sem esquema → **http** (API local é quase sempre HTTP); resto → **https**.
 * - Evita `...railway.app/api` + `/api/...` duplicado.
 */
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
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("alto_mar_401_once");
  }
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

const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/recuperar-senha", "/redefinir-senha"];

function shouldRedirect401(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  return !PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Pedidos autenticados. Se a API responder 401 (token expirado ou inválido), limpa a sessão
 * e envia para o login — evita “falha em tudo” com utilizador ainda no localStorage.
 */
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
  let resp: Response;
  try {
    resp = await fetch(url, { ...init, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNetwork =
      e instanceof TypeError ||
      /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
    if (isNetwork) {
      throw new Error(i18n.t("common.networkUnavailable"));
    }
    throw e;
  }
  const hadToken = Boolean(token);

  if (resp.status === 401 && hadToken && shouldRedirect401()) {
    clearSession();
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem("alto_mar_401_once")) {
      sessionStorage.setItem("alto_mar_401_once", "1");
      window.location.assign("/login?expired=1");
    }
  }

  return resp;
}

