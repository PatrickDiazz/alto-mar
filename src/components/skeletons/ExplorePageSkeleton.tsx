import { BoatStripSkeleton } from "@/components/skeletons/BoatCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function ExplorePageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6" aria-busy aria-label="Carregando embarcações">
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      {Array.from({ length: 3 }, (_, section) => (
        <section key={section} className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <BoatStripSkeleton count={section === 0 ? 5 : 4} />
        </section>
      ))}
    </div>
  );
}
