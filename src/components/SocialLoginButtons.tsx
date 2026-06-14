import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiUrl, type UserRole } from "@/lib/auth";
import { readJsonOrThrow } from "@/lib/apiResponse";
import { startOAuthLogin, type OAuthPublicConfig } from "@/lib/oauth";

type SocialLoginButtonsProps = {
  from?: string;
  role?: UserRole;
  disabled?: boolean;
};

export function SocialLoginButtons({ from = "/", role = "banhista", disabled }: SocialLoginButtonsProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<OAuthPublicConfig | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch(apiUrl("/api/public/app-config"));
        if (!resp.ok) return;
        const data = await readJsonOrThrow<{ oauth?: OAuthPublicConfig }>(resp, "");
        if (!cancelled && data.oauth) setProviders(data.oauth);
      } catch {
        /* ignore — botões ficam ocultos */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers?.google && !providers?.facebook) return null;

  const onOAuth = async (provider: "google" | "facebook") => {
    setLoadingProvider(provider);
    try {
      await startOAuthLogin(provider, { from, role });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("login.oauthFail"));
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          {t("login.orContinueWith")}
        </span>
      </div>

      <div className="grid gap-2">
        {providers.google ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || loadingProvider !== null}
            onClick={() => void onOAuth("google")}
          >
            {loadingProvider === "google" ? t("login.oauthStarting") : t("login.google")}
          </Button>
        ) : null}
        {providers.facebook ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || loadingProvider !== null}
            onClick={() => void onOAuth("facebook")}
          >
            {loadingProvider === "facebook" ? t("login.oauthStarting") : t("login.facebook")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
