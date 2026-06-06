import { useNavigate } from "react-router-dom";
import { OwnerBoatRegisterWizard } from "@/components/owner/boat-register/OwnerBoatRegisterWizard";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";

export default function OwnerBoatRegisterPage() {
  const navigate = useNavigate();
  const { reloadBoats } = useOwnerPanel();

  /** TESTE: após cadastro, ir direto ao Explorar (pula ecrã “em análise”). */
  const handleSuccess = async (_boatId?: string) => {
    await reloadBoats();
    navigate("/explorar", { replace: true });
  };

  return (
    <OwnerPanelPage bodyLayout="none">
      <OwnerBoatRegisterWizard
        onSuccess={(boatId) => void handleSuccess(boatId)}
        onCancel={() => navigate("/marinheiro/embarcacoes")}
      />
    </OwnerPanelPage>
  );
}
