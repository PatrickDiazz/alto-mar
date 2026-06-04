import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Segment = "boats" | "optionals";

export function OwnerBoatsOpcionaisNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active: Segment = pathname.startsWith("/marinheiro/opcionais") ? "optionals" : "boats";

  const go = (segment: Segment) => {
    navigate(segment === "optionals" ? "/marinheiro/opcionais" : "/marinheiro/embarcacoes");
  };

  return (
    <div
      className="flex gap-1 rounded-lg border border-border/40 bg-muted/40 p-1"
      role="tablist"
      aria-label={t("ownerPanel.boatsOpcionaisNavAria")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "boats"}
        className={cn(
          "flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
          active === "boats"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => go("boats")}
      >
        {t("ownerPanel.tabBoats")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "optionals"}
        className={cn(
          "flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
          active === "optionals"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => go("optionals")}
      >
        {t("ownerPanel.tabOptionals")}
      </button>
    </div>
  );
}
