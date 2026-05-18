import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import type { BbqKitItemConfig, BbqKitItemUnit } from "@/lib/trip-optionals";
import { BBQ_KIT_UNITS } from "@/lib/trip-optionals";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OwnerBbqKitItemsEditorProps = {
  items: BbqKitItemConfig[];
  onChange: (items: BbqKitItemConfig[]) => void;
  priceCents: number;
  onPriceCentsChange: (cents: number) => void;
};

function emptyRow(): BbqKitItemConfig {
  return { label: "", amount: "", unit: "un" };
}

export function OwnerBbqKitItemsEditor({
  items,
  onChange,
  priceCents,
  onPriceCentsChange,
}: OwnerBbqKitItemsEditorProps) {
  const { t } = useTranslation();
  const priceReais = Math.max(1, Math.round(priceCents / 100));

  const updateRow = (index: number, patch: Partial<BbqKitItemConfig>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyRow()]);
  };

  const addRow = () => {
    onChange([...items, emptyRow()]);
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 dark:bg-muted/10">
      <p className="text-xs font-semibold text-foreground">{t("marinheiro.bbqKitTableTitle")}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("marinheiro.bbqKitTableHint")}</p>
      <div className="space-y-1">
        <Label className="text-xs font-semibold">{t("marinheiro.bbqKitPriceLabel")}</Label>
        <div className="relative w-full max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {t("common.currency")}
          </span>
          <Input
            type="number"
            min={1}
            step={1}
            className="h-9 pl-10 text-sm tabular-nums"
            value={priceReais}
            onChange={(e) =>
              onPriceCentsChange(Math.max(100, Number(e.target.value || 1)) * 100)
            }
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t("marinheiro.bbqKitPriceHint")}</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/40">
              <th className="px-2 py-1.5 font-semibold text-foreground">{t("marinheiro.bbqKitColItem")}</th>
              <th className="px-2 py-1.5 font-semibold text-foreground w-24">{t("marinheiro.bbqKitColAmount")}</th>
              <th className="px-2 py-1.5 font-semibold text-foreground w-28">{t("marinheiro.bbqKitColUnit")}</th>
              <th className="w-9 px-1 py-1.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={index} className="border-b border-border/40 last:border-0">
                <td className="px-2 py-1.5">
                  <Input
                    value={row.label}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    placeholder={t("marinheiro.bbqKitItemPh")}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.amount}
                    onChange={(e) => updateRow(index, { amount: e.target.value })}
                    placeholder="0"
                    inputMode="decimal"
                    className="h-8 text-xs tabular-nums"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.unit}
                    onValueChange={(v) => updateRow(index, { unit: v as BbqKitItemUnit })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BBQ_KIT_UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="text-xs">
                          {t(`optionals.bbqKit.units.${u}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1.5 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(index)}
                    aria-label={t("marinheiro.bbqKitRemoveRow")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addRow}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        {t("marinheiro.bbqKitAddRow")}
      </Button>
    </div>
  );
}
