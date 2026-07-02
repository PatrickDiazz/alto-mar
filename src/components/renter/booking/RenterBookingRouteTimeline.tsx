import { cn } from "@/lib/utils";
import {
  RENTER_ROUTE_STOP,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  routeStopEmoji,
} from "./renterBookingUi";

type Props = {
  stops: string[];
  t: (k: string) => string;
  readOnlyHint?: string;
};

export function RenterBookingRouteTimeline({ stops, t, readOnlyHint }: Props) {
  const items = stops.length ? stops : ["—"];

  return (
    <section className="space-y-3">
      <div>
        <h4 className={cn("text-sm font-semibold", RENTER_TEXT_TITLE)}>{t("reservasConta.routeStops")}</h4>
        {readOnlyHint ? (
          <p className={cn("mt-1 text-xs", RENTER_TEXT_MUTED)}>{readOnlyHint}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.map((stop, idx) => (
          <div key={`${stop}-${idx}`} className="flex flex-col items-center">
            <div className={RENTER_ROUTE_STOP}>
              <span className="mr-2" aria-hidden>
                {routeStopEmoji(idx, items.length)}
              </span>
              {stop}
            </div>
            {idx < items.length - 1 ? (
              <span className="my-1 select-none text-slate-300 dark:text-muted-foreground/50" aria-hidden>
                ↓
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
