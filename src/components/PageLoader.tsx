import { Loader2 } from "lucide-react";

/** Fallback para rotas carregadas com React.lazy. */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
    </div>
  );
}
