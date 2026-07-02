import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { apiUrl } from "@/lib/auth";

const VerificarEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || token.length < 32) {
        setOk(false);
        setChecking(false);
        return;
      }
      try {
        const resp = await fetch(apiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`));
        if (!resp.ok) {
          if (!cancelled) setOk(false);
          return;
        }
        const data = (await resp.json()) as { ok?: boolean };
        if (!cancelled) setOk(Boolean(data.ok));
      } catch {
        if (!cancelled) setOk(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute top-4 right-4">
          <HeaderSettingsMenu />
        </div>
        <p className="text-muted-foreground">{t("verificarEmail.checking")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="surface-elevated w-full max-w-md rounded-xl p-6 space-y-4 text-center">
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("verificarEmail.okTitle")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("verificarEmail.okSubtitle")}</p>
            <Button asChild className="w-full">
              <Link to="/login">{t("verificarEmail.goLogin")}</Link>
            </Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("verificarEmail.failTitle")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("verificarEmail.failSubtitle")}</p>
            <Button asChild className="w-full">
              <Link to="/confirmar-email">{t("verificarEmail.resend")}</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link to="/login">{t("verificarEmail.goLogin")}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerificarEmail;
