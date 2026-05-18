import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type FilterChipScrollMatProps = {
  children: ReactNode;
  className?: string;
  /** Recalcula o tapete quando o conteúdo muda (ex.: lista de chips). */
  layoutKey?: string | number;
  /** Altura máxima da área rolável (padrão: filtros em chips). */
  maxHeightClass?: string;
};

/** Área rolável com tapete flutuante (gradiente) no rodapé. */
export function FilterChipScrollMat({
  children,
  className,
  layoutKey,
  maxHeightClass = "max-h-36",
}: FilterChipScrollMatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollCue, setShowScrollCue] = useState(false);

  const recomputeScrollCue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 4;
    setShowScrollCue(scrollHeight > clientHeight + epsilon && scrollTop < scrollHeight - clientHeight - epsilon);
  }, []);

  useLayoutEffect(() => {
    recomputeScrollCue();
  }, [layoutKey, recomputeScrollCue]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeScrollCue());
    ro.observe(el);
    return () => ro.disconnect();
  }, [layoutKey, recomputeScrollCue]);

  return (
    <div className={cn("relative rounded-md", className)}>
      <div
        ref={scrollRef}
        onScroll={recomputeScrollCue}
        className={cn(
          "overflow-y-auto rounded-md border border-border/50 bg-transparent p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          maxHeightClass
        )}
      >
        {children}
      </div>
      {showScrollCue ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 rounded-b-md bg-gradient-to-t from-muted/90 via-muted/35 to-transparent dark:from-card/90 dark:via-card/35"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
