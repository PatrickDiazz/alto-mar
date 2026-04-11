import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarDays, LogOut, Trash2, UserRound, CircleHelp, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "banhista" | "locatario";
    created_at: string;
    guest_rating?: string | number | null;
  };
};

const ContaUsuario = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(false);

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    const visible = name.slice(0, 2);
    const stars = "*".repeat(Math.max(2, name.length - 2));
    return `${visible}${stars}@${domain}`;
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/conta" }, replace: true });
      return;
    }
    let active = true;
    const run = async () => {
      try {
        const meResp = await authFetch("/api/me");
        if (meResp.status === 401) return;
        if (!meResp.ok) {
          throw new Error(await readResponseErrorMessage(meResp, t("conta.toastLoad")));
        }
        const meData = (await meResp.json()) as MeResponse;
        if (!active) return;
        setMe(meData.user);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("conta.toastLoad")).trim();
        toast.error(m || t("conta.toastLoad"));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [currentUser?.id, navigate, t]);

  const logout = () => {
    clearSession();
    const goHome = window.confirm(t("conta.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  const guestRatingN = me?.guest_rating != null ? Number(me.guest_rating) : 0;
  const hasGuestRating = me?.role === "banhista" && guestRatingN > 0;

  const deleteAccount = async () => {
    const ok = window.confirm(t("conta.deleteConfirm"));
    if (!ok) return;
    setLoading(true);
    try {
      const resp = await authFetch("/api/me", { method: "DELETE" });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("conta.toastDeleteFail")));
      }
      clearSession();
      toast.success(t("conta.toastDeleted"));
      navigate("/", { replace: true });
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("conta.toastDeleteFail")).trim();
      toast.error(m || t("conta.toastDeleteFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/explorar")}
              className="text-foreground hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("conta.title")}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HeaderSettingsMenu />
            <Button size="sm" variant="secondary" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />
              {t("conta.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div className="text-sm text-foreground space-y-1">
            <p className="font-semibold">{me?.name || currentUser?.name}</p>
            <p className="text-muted-foreground">{maskEmail(me?.email || currentUser?.email || "")}</p>
            {me?.role === "banhista" ? (
              <p className="text-xs text-foreground flex items-center gap-1.5 pt-0.5">
                <Star
                  className={`w-3.5 h-3.5 shrink-0 ${hasGuestRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <span className="text-muted-foreground">{t("conta.guestRatingLabel")}:</span>
                {hasGuestRating ? (
                  <span className="font-medium text-foreground tabular-nums">
                    {guestRatingN.toFixed(1)}/5
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("conta.guestRatingNone")}</span>
                )}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => navigate("/conta/dados")}>
              <UserRound className="w-4 h-4 mr-1" />
              {t("conta.accountData")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/conta/ajuda-teste")}>
              <CircleHelp className="w-4 h-4 mr-1" />
              {t("conta.helpTest")}
            </Button>
            {me?.role === "banhista" ? (
              <Button variant="default" className="sm:col-span-2" onClick={() => navigate("/conta/reservas")}>
                <CalendarDays className="w-4 h-4 mr-1" />
                {t("conta.reservations")}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-1">{t("conta.helpSectionTitle")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("conta.helpSectionDesc")}</p>
          <Button variant="secondary" onClick={() => navigate("/conta/ajuda-teste")}>
            <CircleHelp className="w-4 h-4 mr-1" />
            {t("conta.openHelp")}
          </Button>
        </section>

        <section className="rounded-xl border border-red-200/50 bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-1">{t("conta.riskTitle")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("conta.riskDesc")}</p>
          <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-1" />
            {loading ? t("conta.deleting") : t("conta.delete")}
          </Button>
        </section>
      </div>
    </div>
  );
};

export default ContaUsuario;
