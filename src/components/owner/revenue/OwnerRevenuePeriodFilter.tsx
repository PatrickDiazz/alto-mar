import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  OWNER_REVENUE_PERIOD_PRESETS,
  type OwnerRevenuePeriodFilter,
  type OwnerRevenuePeriodPreset,
} from "@/lib/ownerRevenuePeriod";
import { cn } from "@/lib/utils";

export function OwnerRevenuePeriodFilter({
  value,
  onChange,
  className,
}: {
  value: OwnerRevenuePeriodFilter;
  onChange: (next: OwnerRevenuePeriodFilter) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from ?? "");
  const [customTo, setCustomTo] = useState(value.to ?? "");

  useEffect(() => {
    setCustomFrom(value.from ?? "");
    setCustomTo(value.to ?? "");
  }, [value.from, value.to]);

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange({ preset: "custom", from: customFrom, to: customTo });
    setOpen(false);
  };

  const selectPreset = (preset: OwnerRevenuePeriodPreset) => {
    if (preset === "custom") {
      onChange({
        preset: "custom",
        from: customFrom || undefined,
        to: customTo || undefined,
      });
      return;
    }
    onChange({ preset });
    setOpen(false);
  };

  const activeLabel =
    value.preset === "custom" && value.from && value.to
      ? `${value.from} – ${value.to}`
      : t(`ownerRevenue.period.${value.preset}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("h-9 w-9 shrink-0", className)}
          aria-label={t("ownerRevenue.periodFilterIconAria", { period: activeLabel })}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t("ownerRevenue.periodFilterTitle")}
        </p>
        <ul className="max-h-64 overflow-y-auto" role="listbox" aria-label={t("ownerRevenue.periodQuickAria")}>
          {OWNER_REVENUE_PERIOD_PRESETS.map((p) => {
            const active = value.preset === p;
            return (
              <li key={p}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectPreset(p)}
                  className={cn(
                    "flex w-full rounded-md px-2 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {t(`ownerRevenue.period.${p}`)}
                </button>
              </li>
            );
          })}
        </ul>
        {value.preset === "custom" ? (
          <div className="mt-2 space-y-2 border-t border-border/40 px-2 pt-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground" htmlFor="rev-from">
                {t("ownerRevenue.periodCustomFrom")}
              </label>
              <Input
                id="rev-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground" htmlFor="rev-to">
                {t("ownerRevenue.periodCustomTo")}
              </label>
              <Input
                id="rev-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9"
              />
            </div>
            <Button type="button" size="sm" className="h-9 w-full" onClick={applyCustom}>
              {t("ownerRevenue.periodCustomApply")}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
