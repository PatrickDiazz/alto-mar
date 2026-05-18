import { useTranslation } from "react-i18next";
import { BBQ_KIT_ITEM_KEYS, formatBbqKitQuantity, type BbqKitItemConfig } from "@/lib/trip-optionals";
import { cn } from "@/lib/utils";

const ROW_STAGGER_MS = 48;
const BASE_DELAY_MS = 72;

type BbqKitContentsPanelProps = {
  open: boolean;
  items?: BbqKitItemConfig[];
};

function revealClass(open: boolean) {
  return cn(
    open &&
      "motion-safe:animate-bbq-kit-row-in motion-safe:[animation-fill-mode:both] motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:transform-none"
  );
}

export function BbqKitContentsPanel({ open, items }: BbqKitContentsPanelProps) {
  const { t } = useTranslation();
  const ownerItems = (items ?? []).filter((row) => row.label.trim() && row.amount.trim());
  const useOwnerItems = ownerItems.length > 0;

  return (
    <div className="space-y-2 pt-0.5">
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          revealClass(open)
        )}
        style={open ? { animationDelay: `${BASE_DELAY_MS}ms` } : undefined}
      >
        {t("optionals.bbqKit.itemsTitle")}
      </p>
      <div
        className={cn("overflow-hidden rounded-lg border border-border/50", revealClass(open))}
        style={open ? { animationDelay: `${BASE_DELAY_MS + ROW_STAGGER_MS}ms` } : undefined}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr
              className={cn("border-b border-border/50 bg-muted/40", revealClass(open))}
              style={open ? { animationDelay: `${BASE_DELAY_MS + ROW_STAGGER_MS * 2}ms` } : undefined}
            >
              <th className="px-2.5 py-1.5 font-semibold text-foreground">{t("optionals.bbqKit.columnItem")}</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-foreground tabular-nums">
                {t("optionals.bbqKit.columnQty")}
              </th>
            </tr>
          </thead>
          <tbody>
            {useOwnerItems
              ? ownerItems.map((row, i) => (
                  <tr
                    key={`${row.label}-${i}`}
                    className={cn("border-b border-border/40 last:border-0", revealClass(open))}
                    style={
                      open ? { animationDelay: `${BASE_DELAY_MS + ROW_STAGGER_MS * (3 + i)}ms` } : undefined
                    }
                  >
                    <td className="px-2.5 py-1.5 text-foreground">{row.label}</td>
                    <td className="px-2.5 py-1.5 text-right font-medium text-muted-foreground tabular-nums">
                      {formatBbqKitQuantity(row, t)}
                    </td>
                  </tr>
                ))
              : BBQ_KIT_ITEM_KEYS.map((key, i) => (
                  <tr
                    key={key}
                    className={cn("border-b border-border/40 last:border-0", revealClass(open))}
                    style={
                      open ? { animationDelay: `${BASE_DELAY_MS + ROW_STAGGER_MS * (3 + i)}ms` } : undefined
                    }
                  >
                    <td className="px-2.5 py-1.5 text-foreground">{t(`optionals.bbqKit.items.${key}`)}</td>
                    <td className="px-2.5 py-1.5 text-right font-medium text-muted-foreground tabular-nums">
                      {t(`optionals.bbqKit.qty.${key}`)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <p
        className={cn("text-[11px] leading-relaxed text-muted-foreground", revealClass(open))}
        style={
          open
            ? {
                animationDelay: `${BASE_DELAY_MS + ROW_STAGGER_MS * (3 + (useOwnerItems ? ownerItems.length : BBQ_KIT_ITEM_KEYS.length))}ms`,
              }
            : undefined
        }
      >
        {t("optionals.bbqKit.footnote")}
      </p>
    </div>
  );
}
