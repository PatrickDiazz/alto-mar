import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { buildOwnerOptionalsCatalogFromApi } from "@/lib/ownerOptionalsCatalog";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerBoatsOpcionaisNav } from "@/components/owner/OwnerBoatsOpcionaisNav";
import { cn } from "@/lib/utils";

export default function OwnerOptionalsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { optionals } = useOwnerPanel();
  const items = useMemo(() => buildOwnerOptionalsCatalogFromApi(optionals), [optionals]);

  return (
    <OwnerSurface variant="ghost" className="space-y-3">
      <OwnerBoatsOpcionaisNav />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("ownerPanel.myOptionalsTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("ownerPanel.optionalsInventoryHint")}</p>
        </div>
        <Button size="sm" onClick={() => navigate("/marinheiro/opcionais/novo")}>
          <Plus className="mr-1 h-4 w-4" />
          {t("ownerPanel.optionalAdd")}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("ownerPanel.optionalsEmpty")}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => navigate(`/marinheiro/opcionais/${encodeURIComponent(opt.key)}`)}
              className={cn(
                "flex w-full overflow-hidden rounded-xl border border-border/45 bg-transparent text-left",
                "hover:border-primary/30"
              )}
            >
              <div className="h-20 w-24 shrink-0 bg-muted">
                <img src={opt.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1 p-2.5 sm:p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t("ownerPanel.optionalUnitBadge", { count: opt.quantity })}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{opt.description}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {opt.boatNames.length
                    ? t("ownerPanel.optionalBoatsLinked", { boats: opt.boatNames.join(" · ") })
                    : t("ownerPanel.optionalNoBoats")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </OwnerSurface>
  );
}
