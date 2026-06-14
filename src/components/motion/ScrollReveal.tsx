import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealClasses, useScrollReveal } from "@/hooks/useScrollReveal";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Atraso em ms (75, 100, 150, 200, 300, 500 via Tailwind). */
  delayMs?: number;
  as?: "div" | "section" | "article";
};

export function ScrollReveal({ children, className, delayMs = 0, as: Tag = "div" }: ScrollRevealProps) {
  const { ref, revealed } = useScrollReveal();

  return (
    <Tag ref={ref} className={cn(scrollRevealClasses(revealed, delayMs), className)}>
      {children}
    </Tag>
  );
}
