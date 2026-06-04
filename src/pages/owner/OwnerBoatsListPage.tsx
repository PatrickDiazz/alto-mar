import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Ship, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { parseOwnerBoatRating } from "@/lib/ownerBoats";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerBoatsOpcionaisNav } from "@/components/owner/OwnerBoatsOpcionaisNav";
import { cn } from "@/lib/utils";

export default function OwnerBoatsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats } = useOwnerPanel();

  return (
    <OwnerSurface variant="ghost" className="space-y-4">
      <OwnerBoatsOpcionaisNav />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t("ownerPanel.myBoatsTitle")}</h2>
        <Button
          size="sm"
          className="h-8 px-2 sm:h-9 sm:px-3"
          onClick={() => navigate("/marinheiro/embarcacoes/novo")}
        >
          <span className="flex items-center gap-1 sm:hidden">
            <Plus className="h-4 w-4" />
            <Ship className="h-4 w-4" />
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Plus className="h-4 w-4" />
            {t("marinheiro.registerBoat")}
          </span>
        </Button>
      </div>

      {boats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("ownerPanel.noBoatsYet")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {boats.map((b) => {
            const rating = parseOwnerBoatRating(b);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(`/marinheiro/embarcacoes/${b.id}`)}
                className={cn(
                  "overflow-hidden rounded-xl border border-border/45 bg-transparent text-left transition-colors",
                  "hover:border-primary/40",
                  !b.ativo && "opacity-75"
                )}
              >
                <div className="aspect-[4/3] w-full bg-muted">
                  {b.imagens[0] ? (
                    <img src={b.imagens[0]} alt={b.nome} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-foreground">{b.nome}</p>
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium",
                        b.ativo ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", b.ativo ? "bg-emerald-500" : "bg-muted-foreground")}
                        aria-hidden
                      />
                      {b.ativo ? t("ownerPanel.boatActive") : t("ownerPanel.boatInactive")}
                    </p>
                    {rating > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" aria-hidden />
                        {rating.toFixed(1).replace(".", ",")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </OwnerSurface>
  );
}
