import { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { BookingChatLocationState } from "@/pages/booking/BookingChatPage";
import { useRenterMobileLayout } from "@/hooks/useRenterMobileLayout";
import { RenterBookingMobileDetail } from "@/components/renter/mobile/RenterBookingMobileDetail";
import { RENTER_PAGE_BG } from "@/components/renter/booking/renterBookingUi";
import { cn } from "@/lib/utils";

const ContaReservaDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileLayout = useRenterMobileLayout();
  const chatNavState = (location.state as BookingChatLocationState | null) ?? null;

  useEffect(() => {
    if (!isMobileLayout && bookingId) {
      navigate("/conta/reservas", {
        replace: true,
        state: {
          ...chatNavState,
          selectBookingId: bookingId,
          openChatBookingId: chatNavState?.openChatBookingId,
        },
      });
    }
  }, [isMobileLayout, bookingId, navigate]);

  if (!bookingId) {
    navigate("/conta/reservas", { replace: true });
    return null;
  }

  if (!isMobileLayout) {
    return (
      <div className={cn("flex min-h-[40vh] items-center justify-center", RENTER_PAGE_BG)}>
        <p className="text-sm text-muted-foreground">…</p>
      </div>
    );
  }

  return (
    <RenterBookingMobileDetail
      bookingId={bookingId}
      autoOpenChat={chatNavState?.openChatBookingId === bookingId}
      autoOpenChatPeerLabel={chatNavState?.peerLabel}
      autoOpenChatSubtitle={chatNavState?.subtitle}
    />
  );
};

export default ContaReservaDetail;
