import { Loader2 } from "lucide-react";

/** Fallback para rotas carregadas com React.lazy. */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground motion-safe:animate-page-enter motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary/80" aria-hidden />
    </div>
  );
}
