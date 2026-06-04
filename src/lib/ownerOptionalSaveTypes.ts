import type { OwnerOptionalKind } from "@/lib/ownerOptionalsCatalog";
import type { BbqKitItemConfig } from "@/lib/types";

export type OptionalFormState = {
  kind: OwnerOptionalKind;
  title: string;
  description: string;
  priceCents: number;
  imageUrls: string[];
  boatIds: string[];
  vehicleDocumentUrl: string;
  bbqKitItems: BbqKitItemConfig[];
  customId?: string;
};
