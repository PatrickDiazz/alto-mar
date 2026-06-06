import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch, getStoredUser } from "@/lib/auth";
import { OwnerSurface } from "@/components/owner/OwnerSurface";

type MeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  guest_rating?: string | number | null;
};

type ConnectStatus = {
  configured?: boolean;
  ready?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export function OwnerProfileTab({
  paymentsStripe,
  onStripeConnect,
  onLogout,
  loading,
}: {
  paymentsStripe: boolean;
  onStripeConnect: () => void;
  onLogout: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stored = getStoredUser();
  const [me, setMe] = useState<MeUser | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const resp = await authFetch("/api/me");
        if (resp.status === 401 || !active) return;
        if (!resp.ok) return;
        const data = (await resp.json()) as { user: MeUser };
        if (active) setMe(data.user);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentsStripe) return;
    let active = true;
    void (async () => {
      try {
        const resp = await authFetch("/api/owner/stripe/connect-status");
        if (resp.status === 401 || !active) return;
        if (!resp.ok) return;
        const data = (await resp.json()) as ConnectStatus;
        if (active) setConnectStatus(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [paymentsStripe]);

  const name = me?.name || stored?.name || "—";
  const email = me?.email || stored?.email || "—";
  const showConnectBanner = paymentsStripe && connectStatus && !connectStatus.ready;

  return (
    <div className="space-y-4">
      <OwnerSurface className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <UserRound className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <p className="mt-1 text-xs text-primary font-medium">{t("marinheiro.roleName")}</p>
          </div>
        </div>
      </OwnerSurface>

      {showConnectBanner ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-pretty text-xs leading-relaxed text-amber-950 dark:text-amber-100">
          {t("marinheiro.stripeConnectIncomplete")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" className="w-full justify-start" onClick={() => navigate("/conta/dados")}>
          {t("ownerPanel.editProfile")}
        </Button>
        <Button type="button" variant="outline" className="w-full justify-start" onClick={() => navigate("/conta/ajuda-teste")}>
          {t("ownerPanel.help")}
        </Button>
        {paymentsStripe ? (
          <Button type="button" variant="outline" className="w-full justify-start" disabled={loading} onClick={onStripeConnect}>
            {connectStatus?.ready ? t("marinheiro.stripeConnectManage") : t("marinheiro.stripeConnectButton")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-start gap-2"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t("marinheiro.logout")}
        </Button>
      </div>
    </div>
  );
}
