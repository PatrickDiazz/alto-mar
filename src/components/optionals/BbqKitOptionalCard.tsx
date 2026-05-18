import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DEFAULT_BBQ_IMAGE,
  KIT_CHURRASCO_PRICE_REAIS,
  type BbqKitItemConfig,
} from "@/lib/trip-optionals";
import { cn } from "@/lib/utils";
import { TripOptionalCard } from "@/components/optionals/TripOptionalCard";
import { BbqKitContentsPanel } from "@/components/optionals/BbqKitContentsPanel";

type BbqKitOptionalCardProps = {
  compact?: boolean;
  currencyFmt: Intl.NumberFormat;
  badge: string;
  kitItems?: BbqKitItemConfig[];
  actions?: ReactNode;
  /** Conteúdo extra abaixo da expansão (ex.: variantes na reserva). */
  trailing?: ReactNode;
};

export function BbqKitOptionalCard({
  compact = false,
  currencyFmt,
  badge,
  actions,
  trailing,
  kitItems,
}: BbqKitOptionalCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <TripOptionalCard
      compact={compact}
      imageUrl={DEFAULT_BBQ_IMAGE}
      imageAlt={t("reservar.bbqTitle")}
      title={t("reservar.bbqTitle")}
      description={open ? undefined : t("reservar.bbqDesc")}
      priceLabel={`+ ${currencyFmt.format(KIT_CHURRASCO_PRICE_REAIS)}`}
      badge={badge}
      actions={actions}
      footer={
        <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "bbq-kit-expand-trigger flex w-full items-center justify-between gap-2 rounded-sm py-1.5 text-left text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              aria-expanded={open}
            >
              <span className="bbq-kit-expand-trigger__inner min-w-0 font-medium">
                {open ? t("optionals.bbqKit.collapse") : t("optionals.bbqKit.expand")}
              </span>
              <ChevronDown
                className={cn(
                  "bbq-kit-expand-trigger__icon h-4 w-4 shrink-0 transition-transform duration-300 ease-out",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent
            className={cn(
              "overflow-hidden motion-reduce:animate-none",
              "data-[state=closed]:animate-bbq-kit-collapsible-up data-[state=open]:animate-bbq-kit-collapsible-down"
            )}
          >
            <BbqKitContentsPanel open={open} items={kitItems} />
          </CollapsibleContent>
          {trailing}
        </Collapsible>
      }
    />
  );
}
