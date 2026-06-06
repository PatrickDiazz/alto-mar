import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReservationSection({
  title,
  titleBadge,
  action,
  children,
  className,
  collapsible = false,
  expanded = true,
  onExpandedChange,
}: {
  title: string;
  titleBadge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const toggle = () => onExpandedChange?.(!expanded);

  return (
    <section className={cn("flex flex-col space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 text-left",
              "rounded-lg py-0.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
              aria-hidden
            />
            <span className="flex min-w-0 items-center gap-2.5">
              {titleBadge}
              <span className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</span>
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {titleBadge}
              {title}
            </h2>
          </div>
        )}

        {!collapsible ? action : null}
      </div>
      {(!collapsible || expanded) && (
        <div className={cn(!collapsible && "lg:min-h-0 lg:flex-1")}>{children}</div>
      )}
    </section>
  );
}
