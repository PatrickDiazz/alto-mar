import { cn } from "@/lib/utils";
import { bookingStatusTone, statusBadgeClasses, statusLabelKey } from "./renterBookingUi";

type Props = {
  status: string;
  t: (k: string) => string;
  className?: string;
  showDot?: boolean;
};

export function RenterBookingStatusBadge({ status, t, className, showDot = true }: Props) {
  const tone = bookingStatusTone(status);
  const dotColor =
    tone === "pending"
      ? "bg-amber-400"
      : tone === "confirmed"
        ? "bg-emerald-500"
        : tone === "cancelled"
          ? "bg-red-400"
          : "bg-slate-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        statusBadgeClasses(tone),
        className
      )}
    >
      {showDot ? <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} aria-hidden /> : null}
      {t(statusLabelKey(status))}
    </span>
  );
}
