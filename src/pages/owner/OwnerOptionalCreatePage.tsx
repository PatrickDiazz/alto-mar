import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OwnerOptionalForm } from "@/components/owner/OwnerOptionalForm";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerBoatsOpcionaisNav } from "@/components/owner/OwnerBoatsOpcionaisNav";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { saveOwnerOptional } from "@/lib/ownerOptionalSave";
import { defaultOwnerBbqKitItems } from "@/lib/trip-optionals";
import { toast } from "sonner";

export default function OwnerOptionalCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats, reloadBoats, reloadOptionals } = useOwnerPanel();
  const [saving, setSaving] = useState(false);

  const initial = useMemo(
    () => ({
      kind: "bbq" as const,
      title: t("ownerPanel.optionalBbqTitle"),
      description: t("ownerPanel.optionalBbqDesc"),
      priceCents: 25000,
      imageUrls: [] as string[],
      boatIds: boats[0] ? [boats[0].id] : [],
      vehicleDocumentUrl: "",
      bbqKitItems: defaultOwnerBbqKitItems(),
    }),
    [boats, t]
  );

  const handleSubmit = async (form: Parameters<typeof saveOwnerOptional>[0]) => {
    setSaving(true);
    try {
      await saveOwnerOptional(form, undefined, t);
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
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("ownerPanel.optionalAdd")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("ownerPanel.optionalCreateHint")}</p>
      </div>
      <OwnerOptionalForm
        mode="create"
        boats={boats}
        initial={initial}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/marinheiro/opcionais")}
      />
    </OwnerSurface>
  );
}
