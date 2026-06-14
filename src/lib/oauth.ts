import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { apiUrl, type UserRole } from "@/lib/auth";

export type OAuthProvider = "google" | "facebook";

export type OAuthPublicConfig = {
  google: boolean;
  facebook: boolean;
};

function oauthReturnBaseUrl(): string | undefined {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return undefined;
  return window.location.origin.replace(/\/$/, "");
}

export function oauthStartUrl(
  provider: OAuthProvider,
  opts: { from?: string; role?: UserRole } = {}
) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.role) params.set("role", opts.role);
  const returnBase = oauthReturnBaseUrl();
  if (returnBase) params.set("returnBase", returnBase);
  const q = params.toString();
  return apiUrl(`/api/auth/oauth/${provider}${q ? `?${q}` : ""}`);
}

export async function startOAuthLogin(
  provider: OAuthProvider,
  opts: { from?: string; role?: UserRole } = {}
) {
  const url = oauthStartUrl(provider, opts);
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.location.assign(url);
}
