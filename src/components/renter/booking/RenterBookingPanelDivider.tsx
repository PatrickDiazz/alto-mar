import { cn } from "@/lib/utils";

type Props = {
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function RenterBookingPanelDivider({ orientation = "vertical", className }: Props) {
  if (orientation === "horizontal") {
    return (
      <div className={cn("py-2", className)} aria-hidden>
        <span className="block h-px w-full bg-gradient-to-r from-transparent via-slate-200/90 to-transparent dark:via-border/80" />
      </div>
    );
  }

  return (
    <div className={cn("mx-3 w-px shrink-0 self-stretch", className)} aria-hidden>
      <span className="block h-full w-full bg-gradient-to-b from-transparent via-slate-200/90 to-transparent dark:via-border/80" />
    </div>
  );
}
