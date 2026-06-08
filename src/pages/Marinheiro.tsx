import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { OwnerPanelLayout } from "@/components/owner/OwnerPanelLayout";
import { PageLoader } from "@/components/PageLoader";

const OwnerDashboardPage = lazy(() => import("./owner/OwnerDashboardPage"));
const OwnerAgendaPage = lazy(() => import("./owner/OwnerAgendaPage"));
const OwnerReservasListPage = lazy(() => import("./owner/OwnerReservasListPage"));
const OwnerBookingDetailPage = lazy(() => import("./owner/OwnerBookingDetailPage"));
const OwnerBookingChatPage = lazy(() => import("./booking/BookingChatPage"));
const OwnerBoatsListPage = lazy(() => import("./owner/OwnerBoatsListPage"));
const OwnerBoatDetailPage = lazy(() => import("./owner/OwnerBoatDetailPage"));
const OwnerBoatRegisterPage = lazy(() => import("./owner/OwnerBoatRegisterPage"));
const OwnerOptionalsListPage = lazy(() => import("./owner/OwnerOptionalsListPage"));
const OwnerOptionalCreatePage = lazy(() => import("./owner/OwnerOptionalCreatePage"));
const OwnerOptionalEditPage = lazy(() => import("./owner/OwnerOptionalEditPage"));
const OwnerProfilePage = lazy(() => import("./owner/OwnerProfilePage"));
const OwnerRevenuePage = lazy(() => import("./owner/OwnerRevenuePage"));

const Marinheiro = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="reservas/:bookingId/chat" element={<OwnerBookingChatPage audience="owner" />} />
      <Route element={<OwnerPanelLayout />}>
        <Route index element={<OwnerDashboardPage />} />
        <Route path="agenda" element={<OwnerAgendaPage />} />
        <Route path="reservas" element={<OwnerReservasListPage />} />
        <Route path="reservas/:bookingId" element={<OwnerBookingDetailPage />} />
        <Route path="embarcacoes" element={<OwnerBoatsListPage />} />
        <Route path="embarcacoes/novo" element={<OwnerBoatRegisterPage />} />
        <Route path="embarcacoes/:boatId" element={<OwnerBoatDetailPage />} />
        <Route path="opcionais" element={<OwnerOptionalsListPage />} />
        <Route path="opcionais/novo" element={<OwnerOptionalCreatePage />} />
        <Route path="opcionais/:optionalKey" element={<OwnerOptionalEditPage />} />
        <Route path="perfil" element={<OwnerProfilePage />} />
        <Route path="faturamento" element={<OwnerRevenuePage />} />
        <Route path="*" element={<Navigate to="/marinheiro" replace />} />
      </Route>
    </Routes>
  </Suspense>
);

export default Marinheiro;
