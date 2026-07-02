import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { getStoredUser } from "@/lib/auth";

const TripulanteAgendaPage = lazy(() => import("./tripulante/TripulanteAgendaPage"));
const TripulanteProfilePage = lazy(() => import("./tripulante/TripulanteProfilePage"));

function RequireMarinheiroRole({ children }: { children: React.ReactNode }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace state={{ from: "/tripulante" }} />;
  if (user.role !== "marinheiro") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function Tripulante() {
  return (
    <RequireMarinheiroRole>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<TripulanteAgendaPage />} />
          <Route path="perfil" element={<TripulanteProfilePage />} />
          <Route path="*" element={<Navigate to="/tripulante" replace />} />
        </Routes>
      </Suspense>
    </RequireMarinheiroRole>
  );
}
