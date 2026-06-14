import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { PageLoader } from "@/components/PageLoader";
import { setSession, type AuthUser } from "@/lib/auth";

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as {
      sub?: string;
      name?: string;
      email?: string;
      role?: AuthUser["role"];
    };
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub,
      name: payload.name || payload.email.split("@")[0] || "Utilizador",
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

const AuthCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const finish = async () => {
      const oauthError = params.get("oauth_error");
      const oauthMessage = params.get("oauth_message");
      if (oauthError) {
        toast.error(oauthMessage || t("authCallback.fail"));
        navigate("/login", { replace: true });
        return;
      }

      const hashRaw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hashRaw);
      const token = hashParams.get("token") || params.get("token");
      const from = params.get("from") || "/";
      if (!token) {
        toast.error(t("authCallback.fail"));
        navigate("/login", { replace: true });
        return;
      }

      const user = decodeJwtPayload(token);
      if (!user) {
        toast.error(t("authCallback.fail"));
        navigate("/login", { replace: true });
        return;
      }

      setSession(token, user);
      toast.success(t("authCallback.success"));

      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.close();
        } catch {
          /* ignore */
        }
      }

      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      navigate(from.startsWith("/") ? from : "/", { replace: true });
    };

    void finish();
  }, [navigate, params, t]);

  return <PageLoader />;
};

export default AuthCallback;
