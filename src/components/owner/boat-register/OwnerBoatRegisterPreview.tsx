import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { vesselTypeLabel } from "@/lib/boatVesselTypes";
import type { OwnerBoatFormState } from "@/lib/ownerBoatForm";
import {
  ownerBoatRegisterStepsForTipo,
  type OwnerBoatRegisterStepId,
} from "@/lib/ownerBoatRegisterSteps";
import { cn } from "@/lib/utils";

function noCoverMessage(
  step: OwnerBoatRegisterStepId,
  tipo: string,
  t: (key: string) => string
): string {
  const steps = ownerBoatRegisterStepsForTipo(tipo);
  const photosIdx = steps.indexOf("photos");
  const currentIdx = steps.indexOf(step);
  if (photosIdx >= 0 && currentIdx < photosIdx) {
    return t("marinheiro.registerPreviewPhotoLater");
  }
  if (step === "photos") {
    return t("marinheiro.registerPreviewAddPhotosHere");
  }
  return t("marinheiro.registerPreviewNoPhoto");
}

export function OwnerBoatRegisterPreview({
  boatForm,
  step,
  className,
}: {
  boatForm: OwnerBoatFormState;
  step: OwnerBoatRegisterStepId;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const precoPreview = currencyFmt.format(Math.max(0, Math.round((boatForm.precoCents || 0) / 100)));
  const cover = boatForm.imagens[0];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/45 bg-card/80 shadow-sm backdrop-blur-sm",
        "motion-safe:transition-shadow motion-safe:duration-300",
        className
      )}
    >
      <div className="relative aspect-[16/10] bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={boatForm.nome || t("marinheiro.previewAlt")}
            className="h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {noCoverMessage(step, boatForm.tipo, t)}
          </div>
        )}
        {boatForm.imagens.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground backdrop-blur-sm">
            +{boatForm.imagens.length - 1}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("marinheiro.previewTitle")}
        </p>
        <h3 className="truncate text-base font-semibold text-foreground">
          {boatForm.nome || t("marinheiro.previewName")}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {(boatForm.tipo ? vesselTypeLabel(t, boatForm.tipo) : t("marinheiro.previewType"))} •{" "}
          {boatForm.distancia || t("marinheiro.previewLoc")}
        </p>
        <p className="text-xs text-muted-foreground">
          {boatForm.tamanhoPes || 0} {t("common.feet")} • {boatForm.capacidade || 0} {t("common.people")}
        </p>
        <p className="pt-1 text-lg font-bold tabular-nums text-foreground">{precoPreview}</p>
        {boatForm.descricao.trim() ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{boatForm.descricao}</p>
        ) : null}
      </div>
    </div>
  );
}
