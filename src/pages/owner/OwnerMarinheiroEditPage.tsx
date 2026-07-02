import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OwnerMarinheiroForm } from "@/components/owner/OwnerMarinheiroForm";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { fetchOwnerMarinheiro, updateOwnerMarinheiro } from "@/lib/marinheiroApi";
import type { MarinheiroFormState, MarinheiroRecord } from "@/lib/marinheiroTypes";
import { toast } from "sonner";

function recordToForm(record: MarinheiroRecord): MarinheiroFormState {
  return {
    nome: record.nome,
    email: record.email,
    password: "",
    cpf: record.cpf,
    birthDate: record.birthDate,
    phone: record.phone,
    photoUrl: record.photoUrl,
    funcao: record.funcao,
    funcaoCustom: record.funcaoCustom ?? "",
    identityDocUrl: record.identityDocUrl,
    identityDocExpiresAt: record.identityDocExpiresAt ?? "",
    nauticalCertUrl: record.nauticalCertUrl,
    nauticalCertExpiresAt: record.nauticalCertExpiresAt ?? "",
    bio: record.bio ?? "",
    showOnBoatDetail: record.showOnBoatDetail,
    boatIds: record.boatIds,
  };
}

export default function OwnerMarinheiroEditPage() {
  const { marinheiroId: rawId } = useParams<{ marinheiroId: string }>();
  const marinheiroId = rawId ? decodeURIComponent(rawId).trim() : "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats } = useOwnerPanel();
  const [record, setRecord] = useState<MarinheiroRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!marinheiroId) return;
    let active = true;
    fetchOwnerMarinheiro(marinheiroId)
      .then((m) => {
        if (active) setRecord(m);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : t("crew.loadFail"));
        navigate("/marinheiro/tripulacao");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [marinheiroId, navigate, t]);

  const initial = useMemo(() => (record ? recordToForm(record) : undefined), [record]);

  const handleSubmit = async (form: MarinheiroFormState) => {
    if (!marinheiroId) return;
    setSaving(true);
    try {
      const updated = await updateOwnerMarinheiro(marinheiroId, form, t);
      setRecord(updated);
      toast.success(t("crew.saveOk"));
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("crew.saveFail")).trim();
      toast.error(m || t("crew.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OwnerPanelPage subtitle={t("common.loading")}>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </OwnerPanelPage>
    );
  }

  if (!record || !initial) return null;

  return (
    <OwnerPanelPage subtitle={t("crew.editHint")} bodyLayout="stack-tight">
      <OwnerMarinheiroForm
        mode="edit"
        boats={boats}
        initial={initial}
        record={record}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/marinheiro/tripulacao")}
      />
    </OwnerPanelPage>
  );
}
