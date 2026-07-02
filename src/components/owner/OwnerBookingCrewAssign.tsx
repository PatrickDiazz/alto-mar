import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  assignBookingMarinheiros,
  fetchBookingMarinheiros,
  fetchOwnerMarinheiros,
} from "@/lib/marinheiroApi";
import type { MarinheiroRecord } from "@/lib/marinheiroTypes";
import { marinheiroFuncaoLabel, marinheiroStatusLabel } from "@/lib/marinheiroLabels";
import { toast } from "sonner";

type Props = {
  bookingId: string;
  disabled?: boolean;
};

export function OwnerBookingCrewAssign({ bookingId, disabled }: Props) {
  const { t } = useTranslation();
  const [all, setAll] = useState<MarinheiroRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchOwnerMarinheiros(), fetchBookingMarinheiros(bookingId)])
      .then(([crew, assigned]) => {
        if (!active) return;
        setAll(crew);
        setSelected(assigned.map((m) => m.id));
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
  }, [bookingId, t]);

  const approved = useMemo(() => all.filter((m) => m.approvalStatus === "APROVADO"), [all]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await assignBookingMarinheiros(bookingId, selected, t);
      toast.success(t("crew.assignOk"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("crew.assignFail"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">{t("common.loading")}</p>;
  if (!all.length) return <p className="text-xs text-muted-foreground">{t("crew.noCrewYet")}</p>;

  return (
    <div className="space-y-3 rounded-xl border border-border/50 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("crew.assignTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("crew.assignHint")}</p>
      </div>
      <div className="space-y-2">
        {all.map((m) => {
          const canSelect = m.approvalStatus === "APROVADO";
          return (
            <label
              key={m.id}
              className="flex items-start gap-2 rounded-lg border border-border/40 px-2 py-2 text-sm"
            >
              <Checkbox
                checked={selected.includes(m.id)}
                disabled={disabled || !canSelect}
                onCheckedChange={(v) => toggle(m.id, v === true)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{m.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {marinheiroFuncaoLabel(t, m.funcao, m.funcaoCustom)}
                  {" · "}
                  {marinheiroStatusLabel(t, m.approvalStatus)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {!approved.length ? (
        <p className="text-xs text-amber-600 dark:text-amber-300">{t("crew.noApproved")}</p>
      ) : null}
      <Button type="button" size="sm" disabled={disabled || saving} onClick={() => void save()}>
        {saving ? t("common.loading") : t("crew.assignSave")}
      </Button>
    </div>
  );
}
