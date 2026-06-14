import { useEffect, useRef, useState, type RefObject } from "react";

type UseScrollRevealOptions = {
  /** Só anima abaixo deste breakpoint (px). `null` = sempre. */
  maxWidthPx?: number | null;
  rootMargin?: string;
  threshold?: number;
};

export function useScrollReveal({
  maxWidthPx = null,
  rootMargin = "64px 0px -4% 0px",
  threshold = 0.05,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    if (maxWidthPx != null && window.matchMedia(`(min-width: ${maxWidthPx}px)`).matches) {
      setRevealed(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setRevealed(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { root: null, rootMargin, threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [maxWidthPx, rootMargin, threshold]);

  return { ref: ref as RefObject<HTMLDivElement>, revealed };
}

export function scrollRevealClasses(revealed: boolean, delayMs = 0) {
  const delayClass =
    delayMs <= 0
      ? ""
      : delayMs <= 75
        ? "delay-75"
        : delayMs <= 100
          ? "delay-100"
          : delayMs <= 150
            ? "delay-150"
            : delayMs <= 200
              ? "delay-200"
              : delayMs <= 300
                ? "delay-300"
                : "delay-500";

  return [
    "translate-y-3 opacity-0 transition-[opacity,transform] duration-reveal ease-reveal",
    delayClass,
    "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none motion-reduce:delay-0",
    revealed && "translate-y-0 opacity-100",
  ]
    .filter(Boolean)
    .join(" ");
}
