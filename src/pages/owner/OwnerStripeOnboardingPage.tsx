import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { PageLoader } from "@/components/PageLoader";
import {
  fetchOwnerConnectStatus,
  ownerRequiresStripeOnboarding,
  startOwnerStripeConnect,
} from "@/lib/ownerStripeConnect";
import { openStripeCheckoutUrl } from "@/lib/stripeCheckout";

export default function OwnerStripeOnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const stripeReturn = params.get("stripe_connect");

  const finishIfReady = useCallback(async () => {
    const required = await ownerRequiresStripeOnboarding();
    if (!required) {
      navigate("/marinheiro", { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (stripeReturn === "return") {
          const status = await fetchOwnerConnectStatus();
          if (!active) return;
          if (status?.ready) {
            toast.success(t("marinheiro.stripeOnboardingSuccess"));
            navigate("/marinheiro", { replace: true });
            return;
          }
          toast.info(t("marinheiro.stripeOnboardingStillIncomplete"));
        } else {
          const done = await finishIfReady();
          if (!active || done) return;
        }
      } finally {
        if (active) setLoading(false);
        if (stripeReturn) {
          params.delete("stripe_connect");
          setParams(params, { replace: true });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [finishIfReady, navigate, params, setParams, stripeReturn, t]);

  const onConfigure = async () => {
    setSubmitting(true);
    try {
      const url = await startOwnerStripeConnect();
      await openStripeCheckoutUrl(url);
    } catch (e) {
      const msg = (e instanceof Error ? e.message : t("marinheiro.toastStripeConnectFail")).trim();
      toast.error(msg || t("marinheiro.toastStripeConnectFail"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="surface-elevated w-full max-w-md space-y-5 rounded-xl p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <CreditCard className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">{t("marinheiro.stripeOnboardingTitle")}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("marinheiro.stripeOnboardingSubtitle")}
            </p>
          </div>
        </div>

        <ul className="list-disc space-y-2.5 pl-5 text-left text-sm leading-relaxed text-muted-foreground">
          <li>{t("marinheiro.stripeOnboardingStep1")}</li>
          <li>{t("marinheiro.stripeOnboardingStep2")}</li>
          <li>{t("marinheiro.stripeOnboardingStep3")}</li>
        </ul>

        <Button type="button" className="w-full" disabled={submitting} onClick={() => void onConfigure()}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {t("marinheiro.stripeOnboardingOpening")}
            </>
          ) : (
            t("marinheiro.stripeOnboardingContinue")
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">{t("marinheiro.stripeOnboardingHint")}</p>
      </div>
    </div>
  );
}
