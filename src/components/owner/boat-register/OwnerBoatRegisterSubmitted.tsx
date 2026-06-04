import { useTranslation } from "react-i18next";
import { ClipboardList, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerSurface } from "@/components/owner/OwnerSurface";

export function OwnerBoatRegisterSubmitted({
  boatName,
  onViewBoats,
  onViewBoat,
}: {
  boatName: string;
  onViewBoats: () => void;
  onViewBoat?: () => void;
}) {
  const { t } = useTranslation();
  const displayName = boatName.trim() || t("marinheiro.previewName");

  return (
    <OwnerSurface
      className="surface-elevated mx-auto max-w-lg space-y-6 p-6 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none sm:p-8"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
        <ClipboardList className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t("marinheiro.registerSubmittedTitle")}</h2>
        <p className="text-sm font-medium text-primary">{displayName}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("marinheiro.registerSubmittedLead")}</p>
      </div>
      <div className="rounded-lg border border-border/50 bg-muted/25 px-4 py-3 text-left text-xs leading-relaxed text-muted-foreground">
        {t("marinheiro.registerSubmittedNote")}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" className="w-full sm:w-auto" onClick={onViewBoats}>
          <Ship className="mr-2 h-4 w-4" aria-hidden />
          {t("marinheiro.registerSubmittedCtaBoats")}
        </Button>
        {onViewBoat ? (
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onViewBoat}>
            {t("marinheiro.registerSubmittedCtaDetail")}
          </Button>
        ) : null}
      </div>
    </OwnerSurface>
  );
}
