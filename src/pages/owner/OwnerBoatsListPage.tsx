import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Ship, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { ownerBoatStatusLabelKey, ownerBoatStatusTone, parseOwnerBoatRating } from "@/lib/ownerBoats";
import { OwnerBoatsOpcionaisNav } from "@/components/owner/OwnerBoatsOpcionaisNav";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { cn } from "@/lib/utils";

export default function OwnerBoatsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats } = useOwnerPanel();

  return (
    <OwnerPanelPage
      toolbar={<OwnerBoatsOpcionaisNav />}
      actions={
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
      }
      bodyLayout="stack-tight"
    >
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
                  "overflow-hidden rounded-xl border border-border/45 bg-transparent text-left transition-colors hover:border-primary/40"
                )}
              >
                <div className="aspect-[4/3] w-full bg-muted">
                  {b.imagens[0] ? (
                    <img src={b.imagens[0]} alt={b.nome} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Ship className="h-8 w-8" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-2.5">
                  <p className="truncate text-sm font-semibold text-foreground">{b.nome}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {rating > 0 ? (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden />
                        {rating.toFixed(1).replace(".", ",")}
                      </p>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        ownerBoatStatusTone(b)
                      )}
                    >
                      {t(ownerBoatStatusLabelKey(b))}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </OwnerPanelPage>
  );
}
