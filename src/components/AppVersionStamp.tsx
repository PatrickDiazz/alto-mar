import { getAppVersionLabel } from "@/lib/appVersion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Versão do app (semver + hash Git no build) — uso discreto no rodapé de ecrãs. */
export function AppVersionStamp({ className }: Props) {
  const label = getAppVersionLabel();
  return (
    <p
      className={cn(
        "text-[10px] leading-tight text-muted-foreground/50 tabular-nums select-none",
        className
      )}
      title={label}
    >
      {label}
    </p>
  );
}
