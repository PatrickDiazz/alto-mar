import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignBoatMarinheiros, fetchOwnerMarinheiros } from "@/lib/marinheiroApi";
import type { MarinheiroRecord } from "@/lib/marinheiroTypes";
import { marinheiroFuncaoLabel, marinheiroStatusLabel, marinheiroStatusVariant } from "@/lib/marinheiroLabels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  boatId: string;
};

const FUNCAO_RANK: Record<string, number> = {
  CAPITAO: 1,
  MESTRE: 2,
  IMDEDIATO: 3,
  CONDUTOR: 4,
  GUIA_NAUTICO: 5,
  MARINHEIRO: 6,
  TRIPULANTE: 7,
};

function pickPrimaryLinked(crew: MarinheiroRecord[], boatId: string): string | null {
  const linked = crew.filter((m) => m.boatIds.includes(boatId));
  if (!linked.length) return null;
  linked.sort((a, b) => {
    const ra = FUNCAO_RANK[a.funcao] ?? 99;
    const rb = FUNCAO_RANK[b.funcao] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
  return linked[0].id;
}

export function OwnerBoatCrewLink({ boatId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [all, setAll] = useState<MarinheiroRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOwnerMarinheiros()
      .then((crew) => {
        if (!active) return;
        setAll(crew);
        setSelectedId(pickPrimaryLinked(crew, boatId));
      })
      .catch(() => {
        if (active) toast.error(t("crew.loadFail"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [boatId, t]);

  const selectedMember = useMemo(
    () => (selectedId ? all.find((m) => m.id === selectedId) : null),
    [all, selectedId]
  );

  const showOnPublic =
    selectedMember?.approvalStatus === "APROVADO" && selectedMember.showOnBoatDetail;

  const save = async () => {
    setSaving(true);
    try {
      await assignBoatMarinheiros(boatId, selectedId ? [selectedId] : [], t);
      const refreshed = await fetchOwnerMarinheiros();
      setAll(refreshed);
      setSelectedId(pickPrimaryLinked(refreshed, boatId));
      toast.success(t("crew.boatLinkOk"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("crew.boatLinkFail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("crew.boatLinkTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("crew.boatLinkHint")}</p>
        {showOnPublic ? (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t("crew.boatLinkPublicOne")}</p>
        ) : selectedMember ? (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">{t("crew.boatLinkNotPublic")}</p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{t("crew.empty")}</p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => navigate("/marinheiro/tripulacao/novo", { state: { boatIds: [boatId] } })}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("crew.add")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2" role="radiogroup" aria-label={t("crew.boatLinkTitle")}>
            {all.map((m) => {
              const active = selectedId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(active ? null : m.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:bg-muted/30"
                  )}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <UserRound className="h-5 w-5" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {marinheiroFuncaoLabel(t, m.funcao, m.funcaoCustom)}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        marinheiroStatusVariant(m.approvalStatus)
                      )}
                    >
                      {marinheiroStatusLabel(t, m.approvalStatus)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? t("common.loading") : t("crew.boatLinkSave")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate("/marinheiro/tripulacao/novo", { state: { boatIds: [boatId] } })}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("crew.add")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => navigate("/marinheiro/tripulacao")}>
              {t("crew.manageAll")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
