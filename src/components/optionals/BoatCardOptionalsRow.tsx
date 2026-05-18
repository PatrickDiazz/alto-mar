import { useTranslation } from "react-i18next";
import { Gift, UtensilsCrossed, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Boat } from "@/lib/types";
import {
  customOptionalDisplayTitle,
  getBoatOptionalPreviews,
  type BoatOptionalPreview,
} from "@/lib/trip-optionals";
import { cn } from "@/lib/utils";

type BoatCardOptionalsRowProps = {
  barco: Pick<Boat, "bbqOffered" | "jetSkiOffered" | "jetSkiPriceCents" | "customOptionals">;
};

const iconByKind = {
  bbq: UtensilsCrossed,
  jetSki: Waves,
  custom: Gift,
} as const;

function OptionalChip({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <li className="shrink-0">
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-primary"
        title={label}
      >
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span>{label}</span>
      </span>
    </li>
  );
}

function OptionalsChipTrack({
  items,
  labels,
  ariaHidden,
}: {
  items: BoatOptionalPreview[];
  labels: string[];
  ariaHidden?: boolean;
}) {
  return (
    <ul
      className="m-0 flex shrink-0 list-none items-center gap-2 pe-2"
      role={ariaHidden ? undefined : "list"}
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item, i) => {
        const Icon = iconByKind[item.icon];
        return <OptionalChip key={`${item.key}-${i}`} label={labels[i]!} Icon={Icon} />;
      })}
    </ul>
  );
}

export function BoatCardOptionalsRow({ barco }: BoatCardOptionalsRowProps) {
  const { t } = useTranslation();
  const items = getBoatOptionalPreviews(barco);
  if (items.length === 0) return null;

  const labels = items.map((item) =>
    item.icon === "custom" ? customOptionalDisplayTitle(item.labelKey, t) : t(item.labelKey)
  );

  if (items.length === 1) {
    const Icon = iconByKind[items[0]!.icon];
    return (
      <ul
        className="m-0 flex w-full min-w-0 list-none p-0"
        role="list"
        onClick={(e) => e.stopPropagation()}
      >
        <OptionalChip label={labels[0]!} Icon={Icon} />
      </ul>
    );
  }

  return (
    <div
      className="relative h-5 w-full min-w-0 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-5 bg-gradient-to-r from-background via-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-5 bg-gradient-to-l from-background via-background/80 to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          "flex w-max items-center",
          "motion-safe:animate-boat-card-optionals-marquee motion-safe:hover:[animation-play-state:paused]",
          "motion-reduce:max-w-full motion-reduce:animate-none motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none] motion-reduce:[&::-webkit-scrollbar]:hidden"
        )}
      >
        <OptionalsChipTrack items={items} labels={labels} />
        <OptionalsChipTrack items={items} labels={labels} ariaHidden />
      </div>
    </div>
  );
}
