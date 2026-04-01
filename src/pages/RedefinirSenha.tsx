import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl } from "@/lib/auth";

const RedefinirSenha = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || token.length < 32) {
        setValid(false);
        setChecking(false);
        return;
      }
      try {
        const resp = await fetch(
          apiUrl(`/api/auth/reset-token-check?token=${encodeURIComponent(token)}`)
        );
        const data = (await resp.json()) as { valid?: boolean };
        if (!cancelled) setValid(Boolean(data.valid));
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("redefinir.toastMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("redefinir.toastShort"));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || t("redefinir.toastResetFail"));
      }
      toast.success(t("redefinir.toastOk"));
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("redefinir.toastResetFail"));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute top-4 right-4">
          <HeaderSettingsMenu />
        </div>
        <p className="text-muted-foreground">{t("redefinir.checking")}</p>
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute top-4 right-4">
          <HeaderSettingsMenu />
        </div>
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4 text-center">
          <h1 className="text-xl font-bold text-foreground">{t("redefinir.invalidTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("redefinir.invalidHint")}</p>
          <Button asChild className="w-full">
            <Link to="/recuperar-senha">{t("redefinir.newLink")}</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link to="/login">{t("redefinir.goLogin")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("redefinir.newPassTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("redefinir.newPassSubtitle")}</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="password">{t("redefinir.newPass")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("redefinir.passPh")}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">{t("redefinir.confirm")}</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t("redefinir.confirmPh")}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("redefinir.saving") : t("redefinir.save")}
          </Button>
        </form>

        <Button variant="ghost" asChild className="w-full">
          <Link to="/login">{t("redefinir.backLogin")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default RedefinirSenha;
