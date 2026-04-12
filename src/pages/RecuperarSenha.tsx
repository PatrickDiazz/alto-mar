import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl } from "@/lib/auth";

const RecuperarSenha = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || t("recuperar.toastFail"));
      }
      toast.success(t("recuperar.toastOk"));
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("recuperar.toastFail"));
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
        <Link
          to="/login"
          state={location.state}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("recuperar.back")}
        </Link>

        <div>
          <h1 className="text-xl font-bold text-foreground">{t("recuperar.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("recuperar.subtitle")}</p>
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("recuperar.submitting") : t("recuperar.submit")}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">{t("recuperar.tip")}</p>
      </div>
    </div>
  );
};

export default RecuperarSenha;
