import { useTranslation } from "react-i18next";
import { Check, Clock, Route } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type BookingRouteOption = {
  nome: string;
  duracaoHoras: number;
  stops: { ilha: string; paradaMin: number }[];
};

type BookingRoutePickerProps = {
  routes: BookingRouteOption[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  /** Paradas quando há um único roteiro (fallback sem metadados). */
  fallbackStops?: string[];
};

function RouteStopsList({ route }: { route: BookingRouteOption }) {
  const { t } = useTranslation();

  return (
    <ol className="space-y-2" aria-label={route.nome}>
      {route.stops.map((stop, idx) => (
        <li key={`${route.nome}-${stop.ilha}-${idx}`} className="flex items-center gap-2.5 text-sm">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            aria-hidden
          >
            {idx + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-foreground">{stop.ilha}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {t("boatRoutes.stopLine", { min: stop.paradaMin })}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RouteDurationBadge({ hours }: { hours: number }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-secondary">
      <Clock className="h-3 w-3" aria-hidden />
      {t("boatRoutes.hours", { h: hours })}
    </span>
  );
}

function SingleRouteCard({ route }: { route: BookingRouteOption }) {
  return (
    <article className="rounded-xl border border-border bg-muted/40 p-4 dark:bg-card/60">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h4 className="text-sm font-semibold leading-snug text-foreground">{route.nome}</h4>
        </div>
        <RouteDurationBadge hours={route.duracaoHoras} />
      </div>
      <RouteStopsList route={route} />
    </article>
  );
}

export function BookingRoutePicker({ routes, selectedIdx, onSelect, fallbackStops }: BookingRoutePickerProps) {
  const { t } = useTranslation();

  if (routes.length === 0) {
    const stops = (fallbackStops ?? []).filter(Boolean);
    if (stops.length === 0) return null;
    return (
      <article className="rounded-xl border border-border bg-muted/40 p-4 dark:bg-card/60">
        <ul className="space-y-2 text-sm text-foreground">
          {stops.map((stop, si) => (
            <li key={`${stop}-${si}`} className="flex items-start gap-2.5">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {si + 1}
              </span>
              <span>{stop}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  if (routes.length === 1) {
    return <SingleRouteCard route={routes[0]} />;
  }

  return (
    <RadioGroup
      value={String(selectedIdx)}
      onValueChange={(v) => onSelect(Number(v))}
      className="space-y-3"
      aria-label={t("reservar.routeStops")}
    >
      {routes.map((route, i) => {
        const selected = selectedIdx === i;
        return (
          <label
            key={`${route.nome}-${i}`}
            htmlFor={`reservar-route-${i}`}
            className={cn(
              "relative block cursor-pointer rounded-xl border bg-muted/40 p-4 shadow-card ring-offset-background dark:bg-card/60",
              "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
              "hover:border-primary/35 hover:shadow-elevated",
              selected
                ? "border-primary bg-primary/[0.08] ring-2 ring-primary/80 scale-[1.01]"
                : "border-border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            )}
          >
            <RadioGroupItem value={String(i)} id={`reservar-route-${i}`} className="sr-only" />
            <div className="mb-3 flex items-start justify-between gap-3 pr-6">
              <div className="flex min-w-0 items-start gap-2">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <h4 className="text-sm font-semibold leading-snug text-foreground">{route.nome}</h4>
              </div>
              <RouteDurationBadge hours={route.duracaoHoras} />
            </div>
            <RouteStopsList route={route} />
            {selected ? (
              <span
                className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : null}
          </label>
        );
      })}
    </RadioGroup>
  );
}
