import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl } from "@/lib/auth";

const ConfirmarEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [loading, setLoading] = useState(false);

  const onResend = async () => {
    if (!email) {
      toast.error(t("confirmarEmail.noEmail"));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || t("confirmarEmail.resendFail"));
      }
      toast.success(t("confirmarEmail.resendOk"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("confirmarEmail.resendFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="surface-elevated w-full max-w-md rounded-xl p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("confirmarEmail.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("confirmarEmail.subtitle")}
          </p>
          {email ? (
            <p className="text-sm font-medium text-foreground mt-2 break-all">{email}</p>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3 text-left leading-relaxed">
          {t("confirmarEmail.tip")}
        </p>

        <Button type="button" className="w-full" onClick={onResend} disabled={loading || !email}>
          {loading ? t("confirmarEmail.resending") : t("confirmarEmail.resend")}
        </Button>

        <Button variant="ghost" asChild className="w-full">
          <Link to="/login">{t("confirmarEmail.goLogin")}</Link>
        </Button>

        <Button variant="link" type="button" className="w-full text-muted-foreground" onClick={() => navigate("/ajuda")}>
          {t("confirmarEmail.helpLink")}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmarEmail;
