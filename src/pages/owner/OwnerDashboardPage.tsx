import { useNavigate } from "react-router-dom";
import { OwnerDashboardHome } from "@/components/owner/OwnerDashboardHome";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { boats, optionals, dashboard, dashboardLoading, bookings, loading: bookingsLoading } =
    useOwnerPanel();

  return (
    <OwnerPanelPage bodyLayout="stack-tight">
      <OwnerDashboardHome
      stats={dashboard?.stats ?? null}
      boats={boats}
      ownerOptionals={optionals}
      bookings={bookings}
      bookingsLoading={bookingsLoading && bookings.length === 0}
      loading={dashboardLoading && !dashboard}
      onOpenAgenda={() => navigate("/marinheiro/agenda")}
      onOpenBoats={() => navigate("/marinheiro/embarcacoes")}
      onOpenOptional={(key) => {
        if (key) navigate(`/marinheiro/opcionais/${encodeURIComponent(key)}`);
        else if (optionals.length > 0) navigate("/marinheiro/opcionais");
        else navigate("/marinheiro/opcionais/novo");
      }}
      onOpenBoat={(id) => navigate(`/marinheiro/embarcacoes/${id}`)}
      onOpenRevenue={() => navigate("/marinheiro/faturamento")}
    />
    </OwnerPanelPage>
  );
}
