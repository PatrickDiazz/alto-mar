import { useNavigate } from "react-router-dom";
import { OwnerBoatRegisterWizard } from "@/components/owner/boat-register/OwnerBoatRegisterWizard";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";

export default function OwnerBoatRegisterPage() {
  const navigate = useNavigate();
  const { reloadBoats } = useOwnerPanel();

  const handleSuccess = async (boatId?: string) => {
    await reloadBoats();
    if (boatId) {
      navigate(`/marinheiro/embarcacoes/${boatId}`);
    } else {
      navigate("/marinheiro/embarcacoes");
    }
  };

  return (
    <OwnerSurface variant="ghost" className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none">
      <OwnerBoatRegisterWizard
        onSuccess={(boatId) => void handleSuccess(boatId)}
        onCancel={() => navigate("/marinheiro/embarcacoes")}
      />
    </OwnerSurface>
  );
}
