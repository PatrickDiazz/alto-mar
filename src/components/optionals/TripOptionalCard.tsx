import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type TripOptionalCardProps = {
  imageUrl: string;
  imageAlt: string;
  title: string;
  description?: string;
  priceLabel?: string;
  badge?: string;
  footer?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function TripOptionalCard({
  imageUrl,
  imageAlt,
  title,
  description,
  priceLabel,
  badge,
  footer,
  actions,
  className,
  compact = false,
}: TripOptionalCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/70 bg-card shadow-sm",
        compact ? "flex flex-col" : "flex flex-col sm:flex-row",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          compact
            ? "aspect-[16/10] w-full rounded-t-xl"
            : "aspect-[16/10] w-full rounded-t-xl sm:aspect-auto sm:w-40 md:w-44 sm:min-h-[132px] sm:rounded-l-xl sm:rounded-tr-none"
        )}
      >
        <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent sm:bg-gradient-to-r" />
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {badge ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" aria-hidden />
                {badge}
              </span>
            ) : null}
            <h4 className="text-sm font-bold text-foreground sm:text-base">{title}</h4>
            {priceLabel ? (
              <p className="text-sm font-semibold text-accent tabular-nums">{priceLabel}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
        {footer ? <div className="overflow-visible">{footer}</div> : null}
      </div>
    </article>
  );
}
