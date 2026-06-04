import type { OptionalFormState } from "@/lib/ownerOptionalSaveTypes";
import { createOwnerOptionalApi, updateOwnerOptionalApi } from "@/lib/ownerOptionalsApi";

export type { OptionalFormState } from "@/lib/ownerOptionalSaveTypes";

export async function saveOwnerOptional(
  form: OptionalFormState,
  existingId: string | undefined,
  t: (k: string) => string
): Promise<string> {
  if (!form.boatIds.length) throw new Error(t("ownerPanel.optionalNeedBoat"));

  const body: Record<string, unknown> = {
    kind: form.kind,
    title: form.title.trim(),
    description: form.description.trim(),
    priceCents: form.priceCents,
    imageUrls: form.imageUrls,
    boatIds: form.boatIds,
  };
  if (form.kind === "vehicle") {
    body.vehicleDocumentUrl = form.vehicleDocumentUrl || null;
  }
  if (form.kind === "bbq") {
    body.bbqKitItems = form.bbqKitItems;
  }

  if (existingId) {
    const saved = await updateOwnerOptionalApi(existingId, body);
    return saved.id;
  }
  const saved = await createOwnerOptionalApi(body);
  return saved.id;
}
