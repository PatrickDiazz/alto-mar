import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OwnerMarinheiroForm } from "@/components/owner/OwnerMarinheiroForm";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { createOwnerMarinheiro } from "@/lib/marinheiroApi";
import { defaultMarinheiroForm } from "@/lib/marinheiroTypes";
import { toast } from "sonner";

type CreateLocationState = { boatIds?: string[] };

export default function OwnerMarinheiroCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { boats } = useOwnerPanel();
  const [saving, setSaving] = useState(false);
  const presetBoatIds = (location.state as CreateLocationState | null)?.boatIds;

  const initial = useMemo(() => {
    const ids =
      presetBoatIds?.length ? presetBoatIds : boats[0] ? [boats[0].id] : [];
    return defaultMarinheiroForm(ids);
  }, [boats, presetBoatIds]);

  const handleSubmit = async (form: Parameters<typeof createOwnerMarinheiro>[0]) => {
    setSaving(true);
    try {
      await createOwnerMarinheiro(form, t);
      toast.success(t("crew.saveOk"));
      navigate("/marinheiro/tripulacao");
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("crew.saveFail")).trim();
      toast.error(m || t("crew.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OwnerPanelPage subtitle={t("crew.createHint")} bodyLayout="stack-tight">
      <OwnerMarinheiroForm
        mode="create"
        boats={boats}
        initial={initial}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/marinheiro/tripulacao")}
      />
    </OwnerPanelPage>
  );
}
