import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import type { ReservationMetrics } from "./reservationUi";

const MINI_ACCENTS = {
  inCourse: {
    bg: "bg-emerald-500/10",
    label: "text-emerald-600 dark:text-emerald-300",
  },
  upcoming: {
    bg: "bg-primary/10",
    label: "text-primary",
  },
  completed: {
    bg: "bg-primary/10",
    label: "text-primary",
  },
  cancelled: {
    bg: "bg-muted/40",
    label: "text-muted-foreground",
  },
} as const;

function SummaryMini({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: (typeof MINI_ACCENTS)[keyof typeof MINI_ACCENTS];
}) {
  return (
    <div className={cn("rounded-lg border border-border/35 p-2.5 sm:p-3", accent.bg)}>
      <p className={cn("text-[11px] font-medium leading-tight", accent.label)}>{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-foreground sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ReservationSummaryCard({
  title,
  periodLabel,
  metrics,
  labels,
  className,
}: {
  title: string;
  periodLabel: string;
  metrics: ReservationMetrics;
  labels: {
    inCourse: string;
    inCourseHint: string;
    upcoming: string;
    upcomingHint: string;
    completed: string;
    completedHint: string;
    cancelled: string;
    cancelledHint: string;
  };
  className?: string;
}) {
  return (
    <OwnerSurface className={cn("flex h-full w-full flex-col p-4 lg:max-w-none", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="shrink-0 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
          {periodLabel}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryMini
          label={labels.inCourse}
          value={metrics.inCourseNow}
          hint={labels.inCourseHint}
          accent={MINI_ACCENTS.inCourse}
        />
        <SummaryMini
          label={labels.upcoming}
          value={metrics.upcoming7}
          hint={labels.upcomingHint}
          accent={MINI_ACCENTS.upcoming}
        />
        <SummaryMini
          label={labels.completed}
          value={metrics.completedMonth}
          hint={labels.completedHint}
          accent={MINI_ACCENTS.completed}
        />
        <SummaryMini
          label={labels.cancelled}
          value={metrics.cancelledMonth}
          hint={labels.cancelledHint}
          accent={MINI_ACCENTS.cancelled}
        />
      </div>
    </OwnerSurface>
  );
}
