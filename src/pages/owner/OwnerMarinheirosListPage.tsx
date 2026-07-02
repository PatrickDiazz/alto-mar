import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { fetchOwnerMarinheiros } from "@/lib/marinheiroApi";
import type { MarinheiroRecord } from "@/lib/marinheiroTypes";
import { marinheiroFuncaoLabel, marinheiroStatusLabel, marinheiroStatusVariant } from "@/lib/marinheiroLabels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function OwnerMarinheirosListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats } = useOwnerPanel();
  const [items, setItems] = useState<MarinheiroRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchOwnerMarinheiros()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch((e) => {
        const m = e instanceof Error ? e.message : t("crew.loadFail");
        toast.error(m);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  return (
    <OwnerPanelPage
      subtitle={t("crew.listHint")}
      toolbar={
        <Button size="sm" onClick={() => navigate("/marinheiro/tripulacao/novo")} disabled={!boats.length}>
          <Plus className="mr-1 h-4 w-4" />
          {t("crew.add")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("crew.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(`/marinheiro/tripulacao/${encodeURIComponent(m.id)}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-3 text-left transition hover:bg-muted/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{m.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {marinheiroFuncaoLabel(t, m.funcao, m.funcaoCustom)}
                  {" · "}
                  {m.phone}
                </p>
                <p className="truncate text-xs text-muted-foreground/80">
                  {t("crew.listBoatsCount", { count: m.boatIds.length })}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", marinheiroStatusVariant(m.approvalStatus))}>
                {marinheiroStatusLabel(t, m.approvalStatus)}
              </span>
            </button>
          ))}
        </div>
      )}
    </OwnerPanelPage>
  );
}
