import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import BoatReview from "./pages/BoatReview";
import BoatReviewDetail from "./pages/BoatReviewDetail";
import Moderation from "./pages/Moderation";
import Chats from "./pages/Chats";
import ChatConversation from "./pages/ChatConversation";
import ChatReports from "./pages/ChatReports";
import Macros from "./pages/Macros";
import Tags from "./pages/Tags";
import Audit from "./pages/Audit";
import Staff from "./pages/Staff";

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
          <Route path="moderation" element={<Moderation />} />
          <Route path="chats" element={<Chats />} />
          <Route path="chats/reports" element={<ChatReports />} />
          <Route path="chats/:bookingId" element={<ChatConversation />} />
          <Route path="macros" element={<Macros />} />
          <Route path="tags" element={<Tags />} />
          <Route path="audit" element={<Audit />} />
          <Route path="staff" element={<Staff />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
