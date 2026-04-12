import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl, setSession, type AuthUser, type UserRole } from "@/lib/auth";
import { readJsonOrThrow } from "@/lib/apiResponse";

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("banhista");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || t("signup.toastFail"));
      }
      const data = await readJsonOrThrow<{ token: string; user: AuthUser }>(
        resp,
        t("login.failUnavailable")
      );
      setSession(data.token, data.user);
      toast.success(t("signup.toastOk"));
      navigate(from || "/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.toastFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="surface-elevated w-full max-w-md rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("signup.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("signup.subtitle")}</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="name">{t("common.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("signup.namePh")}
              required
            />
          </div>
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
              placeholder={t("signup.passwordPh")}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("signup.youAre")}</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as UserRole)} className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-0 bg-muted px-4 py-3 shadow-card ring-offset-background has-[:checked]:bg-primary/15 has-[:checked]:ring-2 has-[:checked]:ring-primary dark:bg-card">
                <RadioGroupItem value="banhista" id="banhista" />
                <div>
                  <span className="text-sm font-semibold text-foreground">{t("signup.banhista")}</span>
                  <p className="text-xs text-muted-foreground">{t("signup.banhistaHint")}</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-0 bg-muted px-4 py-3 shadow-card ring-offset-background has-[:checked]:bg-primary/15 has-[:checked]:ring-2 has-[:checked]:ring-primary dark:bg-card">
                <RadioGroupItem value="locatario" id="locatario" />
                <div>
                  <span className="text-sm font-semibold text-foreground">{t("signup.locatario")}</span>
                  <p className="text-xs text-muted-foreground">{t("signup.locatarioHint")}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signup.submitting") : t("signup.submit")}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          {t("signup.hasAccount")}{" "}
          <Link className="text-primary font-semibold hover:underline" to="/login" state={location.state}>
            {t("signup.login")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
