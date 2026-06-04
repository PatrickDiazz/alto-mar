import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OwnerOptionalForm } from "@/components/owner/OwnerOptionalForm";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerBoatsOpcionaisNav } from "@/components/owner/OwnerBoatsOpcionaisNav";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { findCatalogItemFromApi } from "@/lib/ownerOptionalsCatalog";
import { saveOwnerOptional } from "@/lib/ownerOptionalSave";
import { defaultOwnerBbqKitItems } from "@/lib/trip-optionals";
import { toast } from "sonner";

export default function OwnerOptionalEditPage() {
  const { optionalKey } = useParams<{ optionalKey: string }>();
  const decodedKey = optionalKey ? decodeURIComponent(optionalKey) : null;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats, optionals, reloadBoats, reloadOptionals } = useOwnerPanel();
  const [saving, setSaving] = useState(false);

  const existing = useMemo(
    () => (decodedKey ? findCatalogItemFromApi(optionals, decodedKey) : null),
    [optionals, decodedKey]
  );

  const initial = useMemo(() => {
    if (!existing) return undefined;
    return {
      kind: existing.kind,
      title: existing.title,
      description: existing.description,
      priceCents: existing.priceCents,
      imageUrls: existing.imageUrl ? [existing.imageUrl] : [],
      boatIds: [...existing.boatIds],
      vehicleDocumentUrl: existing.vehicleDocumentUrl ?? "",
      bbqKitItems: existing.bbqKitItems?.length ? existing.bbqKitItems : defaultOwnerBbqKitItems(),
      customId: existing.customOptional?.id,
    };
  }, [existing]);

  if (!existing) {
    return (
      <OwnerSurface variant="ghost" className="space-y-3">
        <OwnerBoatsOpcionaisNav />
        <p className="text-sm text-muted-foreground">{t("ownerPanel.optionalNotFound")}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary"
          onClick={() => navigate("/marinheiro/opcionais")}
        >
          {t("common.back")}
        </button>
      </OwnerSurface>
    );
  }

  const handleSubmit = async (form: Parameters<typeof saveOwnerOptional>[0]) => {
    setSaving(true);
    try {
      await saveOwnerOptional(form, existing.key, t);
      await reloadOptionals();
      await reloadBoats();
      toast.success(t("ownerPanel.optionalSaveOk"));
      navigate("/marinheiro/opcionais");
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("ownerPanel.optionalSaveFail")).trim();
      toast.error(m || t("ownerPanel.optionalSaveFail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OwnerSurface variant="ghost" className="space-y-3">
      <OwnerBoatsOpcionaisNav />
      <h2 className="text-lg font-semibold text-foreground">{t("ownerPanel.optionalEdit")}</h2>
      <OwnerOptionalForm
        mode="edit"
        boats={boats}
        initial={initial}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/marinheiro/opcionais")}
      />
    </OwnerSurface>
  );
}
