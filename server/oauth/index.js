import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { signToken } from "../auth.js";
import { normalizeAppUrl } from "../appUrl.js";

const JWT_SECRET = (() => {
  const raw = process.env.JWT_SECRET;
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) throw new Error("JWT_SECRET required for OAuth");
  return v;
})();

const FRONTEND_URL = normalizeAppUrl(process.env.FRONTEND_URL, "http://localhost:8080");
const API_PUBLIC_URL = normalizeAppUrl(
  process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 3001}`,
  `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 3001}`
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID && String(process.env.GOOGLE_CLIENT_ID).trim();
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET && String(process.env.GOOGLE_CLIENT_SECRET).trim();
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID && String(process.env.FACEBOOK_APP_ID).trim();
const FACEBOOK_APP_SECRET =
  process.env.FACEBOOK_APP_SECRET && String(process.env.FACEBOOK_APP_SECRET).trim();

const PROVIDERS = {
  google: {
    enabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  facebook: {
    enabled: Boolean(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET),
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email,public_profile",
  },
};

export function getOAuthPublicConfig() {
  return {
    google: PROVIDERS.google.enabled,
    facebook: PROVIDERS.facebook.enabled,
  };
}

function resolveReturnBase(returnBase) {
  if (typeof returnBase === "string" && returnBase.trim()) {
    try {
      const u = new URL(returnBase.trim());
      if (u.protocol === "http:" || u.protocol === "https:") {
        return u.origin.replace(/\/$/, "");
      }
    } catch {
      /* ignore */
    }
  }
  return FRONTEND_URL;
}

function sanitizeRedirectPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/auth/callback")) return "/";
  return raw.slice(0, 500);
}

function sanitizeRole(raw) {
  return raw === "locatario" ? "locatario" : "banhista";
}

function signOAuthState(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

function verifyOAuthState(state) {
  return jwt.verify(state, JWT_SECRET);
}

function callbackUrl(provider) {
  return `${API_PUBLIC_URL}/api/auth/oauth/${provider}/callback`;
}

function redirectWithError(returnBase, code, message) {
  const params = new URLSearchParams({
    oauth_error: code,
    oauth_message: message.slice(0, 240),
  });
  return `${resolveReturnBase(returnBase)}/auth/callback?${params}`;
}

function redirectWithSuccess(returnBase, token, from) {
  const params = new URLSearchParams({
    from: sanitizeRedirectPath(from),
  });
  const base = resolveReturnBase(returnBase);
  return `${base}/auth/callback?${params}#token=${encodeURIComponent(token)}`;
}

async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: callbackUrl("google"),
    grant_type: "authorization_code",
  });
  const resp = await fetch(PROVIDERS.google.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "Falha ao trocar código Google.");
  }
  const data = await resp.json();
  if (!data.access_token) throw new Error("Token Google ausente.");

  const profileResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (!profileResp.ok) throw new Error("Perfil Google indisponível.");
  const profile = await profileResp.json();
  if (!profile.sub) throw new Error("Conta Google inválida.");
  return {
    providerId: String(profile.sub),
    email: profile.email ? String(profile.email) : null,
    name: profile.name ? String(profile.name) : null,
  };
}

async function exchangeFacebookCode(code) {
  const tokenParams = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: callbackUrl("facebook"),
    code,
  });
  const tokenResp = await fetch(`${PROVIDERS.facebook.tokenUrl}?${tokenParams}`);
  if (!tokenResp.ok) {
    const text = await tokenResp.text().catch(() => "");
    throw new Error(text || "Falha ao trocar código Facebook.");
  }
  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) throw new Error("Token Facebook ausente.");

  const profileParams = new URLSearchParams({
    fields: "id,name,email",
    access_token: String(tokenData.access_token),
  });
  const profileResp = await fetch(`https://graph.facebook.com/me?${profileParams}`);
  if (!profileResp.ok) throw new Error("Perfil Facebook indisponível.");
  const profile = await profileResp.json();
  if (!profile.id) throw new Error("Conta Facebook inválida.");
  return {
    providerId: String(profile.id),
    email: profile.email ? String(profile.email) : null,
    name: profile.name ? String(profile.name) : null,
  };
}

async function findOrCreateOAuthUser({ provider, providerId, email, name, role }) {
  const idCol = provider === "google" ? "google_id" : "facebook_id";

  const byProvider = await query(
    `select id, name, email, role from users where ${idCol} = $1 limit 1`,
    [providerId]
  );
  if (byProvider.rows[0]) return byProvider.rows[0];

  if (email) {
    const byEmail = await query(
      `select id, name, email, role from users where email = $1 limit 1`,
      [email]
    );
    const existing = byEmail.rows[0];
    if (existing) {
      await query(`update users set ${idCol} = $1 where id = $2`, [providerId, existing.id]);
      return existing;
    }
  }

  const effectiveRole = sanitizeRole(role);
  const displayName = (name && name.trim()) || (email ? email.split("@")[0] : "Utilizador");
  const effectiveEmail = email || `${providerId}@${provider}.oauth.local`;

  const created = await query(
    `insert into users (name, email, password_hash, role, ${idCol})
     values ($1, $2, null, $3, $4)
     returning id, name, email, role`,
    [displayName, effectiveEmail, effectiveRole, providerId]
  );
  return created.rows[0];
}

function startOAuth(provider, req, res) {
  const cfg = PROVIDERS[provider];
  if (!cfg?.enabled) {
    return res.status(503).send(`${provider} login não configurado.`);
  }

  const from = sanitizeRedirectPath(typeof req.query.from === "string" ? req.query.from : "/");
  const role = sanitizeRole(typeof req.query.role === "string" ? req.query.role : "banhista");
  const returnBase = typeof req.query.returnBase === "string" ? req.query.returnBase : undefined;

  const state = signOAuthState({ provider, from, role, returnBase });

  const params = new URLSearchParams({
    client_id: provider === "google" ? GOOGLE_CLIENT_ID : FACEBOOK_APP_ID,
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    scope: cfg.scope,
    state,
  });
  if (provider === "google") {
    params.set("access_type", "online");
    params.set("prompt", "select_account");
  }

  return res.redirect(`${cfg.authUrl}?${params}`);
}

async function finishOAuth(provider, req, res) {
  const cfg = PROVIDERS[provider];
  if (!cfg?.enabled) {
    return res.status(503).send(`${provider} login não configurado.`);
  }

  const oauthError = typeof req.query.error === "string" ? req.query.error : "";
  const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";

  let statePayload;
  try {
    statePayload = verifyOAuthState(stateRaw);
  } catch {
    return res.redirect(redirectWithError(undefined, "invalid_state", "Sessão OAuth expirada. Tente de novo."));
  }

  if (statePayload.provider !== provider) {
    return res.redirect(
      redirectWithError(statePayload.returnBase, "invalid_state", "Estado OAuth inválido.")
    );
  }

  const returnBase = statePayload.returnBase;
  const from = statePayload.from;
  const role = statePayload.role;

  if (oauthError) {
    return res.redirect(
      redirectWithError(returnBase, oauthError, "Login cancelado ou recusado pelo provedor.")
    );
  }

  if (!code) {
    return res.redirect(redirectWithError(returnBase, "missing_code", "Código OAuth ausente."));
  }

  try {
    const profile =
      provider === "google" ? await exchangeGoogleCode(code) : await exchangeFacebookCode(code);
    const user = await findOrCreateOAuthUser({
      provider,
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      role,
    });
    const token = signToken(user);
    return res.redirect(redirectWithSuccess(returnBase, token, from));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro OAuth.";
    return res.redirect(redirectWithError(returnBase, "oauth_failed", msg));
  }
}

export function installOAuthRoutes(app) {
  app.get("/api/auth/oauth/google", (req, res) => startOAuth("google", req, res));
  app.get("/api/auth/oauth/google/callback", (req, res) => finishOAuth("google", req, res));
  app.get("/api/auth/oauth/facebook", (req, res) => startOAuth("facebook", req, res));
  app.get("/api/auth/oauth/facebook/callback", (req, res) => finishOAuth("facebook", req, res));
}
