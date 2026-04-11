import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl, setSession, type AuthUser } from "@/lib/auth";
import { readJsonOrThrow } from "@/lib/apiResponse";
import type { LoginLocationState } from "@/lib/loginLocationState";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const locState = (location.state as LoginLocationState | null) ?? null;
  const from = locState?.from || "/";
  const loginContext = locState?.loginContext;
  const isMarinheiroLogin = from === "/marinheiro";

  const contextualSubtitle =
    loginContext === "reservations"
      ? t("login.hintReservations")
      : loginContext === "favorites"
        ? t("login.hintFavorites")
        : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") !== "1") return;
    toast.info(t("login.sessionExpired"), { id: "session-expired" });
    params.delete("expired");
    const q = params.toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash || ""}`;
    window.history.replaceState(null, "", next);
  }, [t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        let msg = t("login.toastFail");
        if (resp.status === 401) {
          msg = text.trim() || t("login.failCredentials");
        } else if (resp.status === 503 || resp.status === 502 || resp.status === 504) {
          msg = t("login.failUnavailable");
        } else {
          const trimmed = text.trim();
          if (trimmed) {
            try {
              const j = JSON.parse(trimmed) as { ok?: boolean };
              if (j && typeof j === "object" && j.ok === false) {
                msg = t("login.failUnavailable");
              } else {
                msg = trimmed.length < 280 ? trimmed : t("login.toastFail");
              }
            } catch {
              msg = trimmed.length < 280 ? trimmed : t("login.toastFail");
            }
          }
        }
        throw new Error(msg);
      }
      const data = await readJsonOrThrow<{ token: string; user: AuthUser }>(
        resp,
        t("login.failUnavailable")
      );
      setSession(data.token, data.user);
      toast.success(t("login.toastOk"));
      navigate(from, { replace: true });
    } catch (err) {
      const isNetwork =
        err instanceof TypeError &&
        (err.message === "Failed to fetch" || err.message.includes("fetch") || err.message.includes("NetworkError"));
      const apiMsg = err instanceof Error ? err.message.trim() : "";
      toast.error(
        isNetwork ? t("login.failNetwork") : apiMsg || t("login.toastFail")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("login.title")}</h1>
          {contextualSubtitle ? (
            <p className="text-sm text-foreground/90 leading-relaxed mt-1 rounded-lg border border-primary/20 bg-primary/[0.08] px-3 py-2.5">
              {contextualSubtitle}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {isMarinheiroLogin ? t("login.subtitleRenter") : t("login.subtitleDefault")}
            </p>
          )}
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>

        <p className="text-sm text-center">
          <Link className="text-primary font-semibold hover:underline" to="/recuperar-senha" state={location.state}>
            {t("login.forgot")}
          </Link>
        </p>

        <p className="text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link className="text-primary font-semibold hover:underline" to="/signup" state={location.state}>
            {isMarinheiroLogin ? t("login.signupRenter") : t("login.signup")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
