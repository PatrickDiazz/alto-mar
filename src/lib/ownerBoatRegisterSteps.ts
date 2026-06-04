import { isMotoAquaticaVessel, MOTO_AQUATICA_MAX_CAPACITY } from "@/lib/boatVesselTypes";
import { ownerBbqKitItemsValid, type BbqKitItemConfig } from "@/lib/trip-optionals";
import {
  ownerBoatMediaStepValid,
  ownerBoatRoutePhotosStepValid,
  ownerBoatRoutesStepValid,
  type OwnerBoatFormState,
} from "@/lib/ownerBoatForm";
import {
  ownerBoatRegisterConfirmComplete,
  type OwnerBoatRegisterConfirmState,
} from "@/lib/ownerBoatRegisterConfirm";

export const OWNER_BOAT_REGISTER_STEPS = [
  "basics",
  "photos",
  "routes",
  "routePhotos",
  "optionals",
  "media",
  "confirm",
] as const;

export type OwnerBoatRegisterStepId = (typeof OWNER_BOAT_REGISTER_STEPS)[number];

export function ownerBoatRegisterStepsForTipo(tipo: string): OwnerBoatRegisterStepId[] {
  if (isMotoAquaticaVessel(tipo)) {
    return ["basics", "photos", "routes", "media", "confirm"];
  }
  return [...OWNER_BOAT_REGISTER_STEPS];
}

export function ownerBoatRegisterStepIndex(
  steps: OwnerBoatRegisterStepId[],
  step: OwnerBoatRegisterStepId
): number {
  return Math.max(0, steps.indexOf(step));
}

type StepValidationCtx = {
  boatForm: OwnerBoatFormState;
  uploadRoutePhotos: boolean;
  routePhotoRights: boolean;
  catalogAmenities: Array<{ id: string; name: string }>;
  amenityInc: Record<string, boolean>;
  bbqKitItems: BbqKitItemConfig[];
  confirm: OwnerBoatRegisterConfirmState;
  routeIslandRows: string[];
  embarkLocsText: string;
  routeIslandImages: Record<string, string[]>;
};

export function canAdvanceOwnerBoatRegisterStep(
  step: OwnerBoatRegisterStepId,
  ctx: StepValidationCtx
): boolean {
  const { boatForm: f } = ctx;
  const isMoto = isMotoAquaticaVessel(f.tipo);

  switch (step) {
    case "basics":
      return (
        f.nome.trim().length >= 2 &&
        f.distancia.trim().length >= 2 &&
        f.tipo.trim().length >= 2 &&
        f.descricao.trim().length >= 5 &&
        f.precoCents >= 100 &&
        f.tamanhoPes >= 1 &&
        (isMoto ? f.capacidade === MOTO_AQUATICA_MAX_CAPACITY : f.capacidade >= 1)
      );
    case "photos":
      return f.imagens.length >= 1;
    case "routePhotos":
      if (isMoto) return true;
      return ownerBoatRoutePhotosStepValid(
        ctx.uploadRoutePhotos,
        ctx.routePhotoRights,
        ctx.boatForm.routeIslands,
        ctx.routeIslandImages
      );
    case "routes":
      return ownerBoatRoutesStepValid(ctx.routeIslandRows, ctx.embarkLocsText);
    case "optionals":
      if (isMoto) return true;
      if (f.bbqOffered) {
        if (!ownerBbqKitItemsValid(ctx.bbqKitItems)) return false;
        if ((f.bbqKitPriceCents ?? 0) < 100) return false;
      }
      if (f.jetSkiOffered) {
        return (
          (f.jetSkiPriceCents ?? 0) >= 100 &&
          (f.jetSkiImageUrls?.length ?? 0) >= 1 &&
          String(f.jetSkiDocumentUrl || "").trim().length > 0
        );
      }
      return true;
    case "media":
      return ownerBoatMediaStepValid(f);
    case "confirm":
      return ownerBoatRegisterConfirmComplete(ctx.confirm);
    default:
      return false;
  }
}

export function canSubmitOwnerBoatRegister(ctx: StepValidationCtx): boolean {
  const steps = ownerBoatRegisterStepsForTipo(ctx.boatForm.tipo);
  return steps.every((s) => canAdvanceOwnerBoatRegisterStep(s, ctx)) && ctx.boatForm.imagens.length >= 1;
}
