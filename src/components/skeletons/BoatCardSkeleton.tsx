import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BoatCardSkeletonProps = {
  className?: string;
  staggerIndex?: number;
};

export function BoatCardSkeleton({ className, staggerIndex }: BoatCardSkeletonProps) {
  const delayStyle =
    staggerIndex != null && staggerIndex > 0
      ? ({ animationDelay: `${Math.min(staggerIndex, 12) * 60}ms` } as const)
      : undefined;

  return (
    <div
      className={cn(
        "space-y-2 motion-safe:animate-stagger-fade-in motion-reduce:animate-none",
        className
      )}
      style={delayStyle}
      aria-hidden
    >
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

export function BoatStripSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
      {Array.from({ length: count }, (_, i) => (
        <BoatCardSkeleton key={i} staggerIndex={i} />
      ))}
    </div>
  );
}
