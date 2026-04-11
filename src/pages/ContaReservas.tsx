import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { RenterBookingsPanel } from "@/components/RenterBookingsPanel";
import { getStoredUser } from "@/lib/auth";

const ContaReservas = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/conta/reservas" }, replace: true });
      return;
    }
    if (user.role !== "banhista") {
      navigate("/conta", { replace: true });
    }
  }, [navigate, user]);

  if (!user || user.role !== "banhista") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/explorar")}
              className="shrink-0 text-foreground transition-colors hover:text-primary"
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">{t("reservasConta.title")}</h1>
              <p className="truncate text-xs text-muted-foreground">{t("reservasConta.liveSyncHint")}</p>
            </div>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <RenterBookingsPanel />
      </div>
    </div>
  );
};

export default ContaReservas;
