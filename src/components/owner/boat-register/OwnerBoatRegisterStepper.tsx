import { useTranslation } from "react-i18next";
import type { OwnerBoatRegisterStepId } from "@/lib/ownerBoatRegisterSteps";
import { cn } from "@/lib/utils";

/** Altura fixa da área de rótulos para alinhar todas as barras na mesma linha. */
const STEP_LABEL_MIN_H = "min-h-[2.25rem]";

export function OwnerBoatRegisterStepper({
  steps,
  current,
}: {
  steps: OwnerBoatRegisterStepId[];
  current: OwnerBoatRegisterStepId;
}) {
  const { t } = useTranslation();
  const idx = Math.max(0, steps.indexOf(current));

  return (
    <nav aria-label={t("marinheiro.registerProgressAria")}>
      <ol
        className="grid w-full list-none items-end gap-x-1 p-0 sm:gap-x-1.5"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          const label = t(`marinheiro.registerStep.${step}`);
          const filled = done || active;

          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 flex-col gap-0"
            >
              <span
                title={label}
                className={cn(
                  "flex w-full items-end justify-center text-center",
                  STEP_LABEL_MIN_H,
                  "text-[9px] leading-tight sm:text-[10px] md:text-[11px]",
                  "line-clamp-2 hyphens-auto",
                  active && "font-semibold text-primary",
                  done && !active && "font-medium text-muted-foreground",
                  !filled && "text-muted-foreground/55"
                )}
              >
                {label}
              </span>
              <div
                className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-muted"
                role="presentation"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-[width] motion-safe:duration-300 motion-reduce:transition-none",
                    filled ? "w-full" : "w-0"
                  )}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
