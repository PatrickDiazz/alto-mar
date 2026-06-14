import { Skeleton } from "@/components/ui/skeleton";

export function DetalhesBarcoSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" aria-busy aria-label="Carregando embarcação">
      <div className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-2xl justify-between">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <Skeleton className="mx-auto aspect-square max-w-lg w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="sticky bottom-0 border-t border-border px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
