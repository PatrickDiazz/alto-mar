import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { reservationThumbClass } from "./reservationUi";

export function ReservationThumbnail({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  return (
    <div className={cn(reservationThumbClass, className)}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Ship className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </div>
      )}
    </div>
  );
}
