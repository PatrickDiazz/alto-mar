import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";

function statusTone(status: string): string {
  if (status === "ACCEPTED") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  if (status === "PENDING") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  if (status === "COMPLETED") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

export function OwnerBookingCompactRow({
  booking,
  whenLabel,
  statusLabel,
  amountLabel,
  onClick,
  className,
}: {
  booking: OwnerBookingRow;
  whenLabel: string;
  statusLabel: string;
  amountLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border/35 px-3 py-2.5 text-left transition-colors hover:bg-muted/25",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{booking.boat.nome}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              statusTone(booking.status)
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{booking.renter.nome}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/90">
          {whenLabel} · {amountLabel}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function OwnerBookingPreviewStrip({
  booking,
  whenLabel,
  statusLabel,
  amountLabel,
  onClick,
  className,
}: {
  booking: OwnerBookingRow;
  whenLabel: string;
  statusLabel: string;
  amountLabel: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{booking.renter.nome}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {whenLabel} · {amountLabel}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
          statusTone(booking.status)
        )}
      >
        {statusLabel}
      </span>
      {onClick ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-border/35 bg-muted/15 px-2.5 py-2 text-left transition-colors hover:bg-muted/30",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border/35 bg-muted/15 px-2.5 py-2", className)}>
      {content}
    </div>
  );
}
