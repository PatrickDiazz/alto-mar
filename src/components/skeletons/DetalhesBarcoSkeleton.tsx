import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function DetalhesBarcoSkeleton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderBottomBar = () => (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-32 rounded-md max-md:h-[42px] max-md:w-[5.72rem]" />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background max-md:pb-[calc(5rem+var(--safe-area-bottom))]" aria-busy aria-label="Carregando embarcação">
      <div className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-2xl justify-between">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
      <div className="min-w-0 overflow-x-hidden md:mx-auto md:w-full md:max-w-2xl md:px-4 md:pt-6">
        <Skeleton className="aspect-square w-full max-w-full max-md:rounded-none md:mx-auto md:max-w-lg md:rounded-xl" />
      </div>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 max-md:pb-0">
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
      <div className="hidden border-t border-border md:sticky md:bottom-0 md:block">
        <div className="flex h-14 items-center px-4">{renderBottomBar()}</div>
      </div>

      {mounted &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 pb-safe backdrop-blur-md md:hidden">
            <div className="flex h-14 items-center px-4">{renderBottomBar()}</div>
          </div>,
          document.body
        )}
    </div>
  );
}
