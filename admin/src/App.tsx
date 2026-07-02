import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import BoatReview from "./pages/BoatReview";
import BoatReviewDetail from "./pages/BoatReviewDetail";
import MarinheiroReview from "./pages/MarinheiroReview";
import MarinheiroReviewDetail from "./pages/MarinheiroReviewDetail";
import Moderation from "./pages/Moderation";
import Chats from "./pages/Chats";
import ChatConversation from "./pages/ChatConversation";
import ChatReports from "./pages/ChatReports";
import Macros from "./pages/Macros";
import Tags from "./pages/Tags";
import Audit from "./pages/Audit";
import AuditAccount from "./pages/AuditAccount";
import Staff from "./pages/Staff";
import Users from "./pages/Users";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="boats" element={<BoatReview />} />
          <Route path="boats/:id" element={<BoatReviewDetail />} />
          <Route path="marinheiros" element={<MarinheiroReview />} />
          <Route path="marinheiros/:id" element={<MarinheiroReviewDetail />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="chats" element={<Chats />} />
          <Route path="chats/reports" element={<ChatReports />} />
          <Route path="chats/:bookingId" element={<ChatConversation />} />
          <Route path="macros" element={<Macros />} />
          <Route path="tags" element={<Tags />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<Audit />} />
          <Route path="audit/:accountId" element={<AuditAccount />} />
          <Route path="staff" element={<Staff />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
