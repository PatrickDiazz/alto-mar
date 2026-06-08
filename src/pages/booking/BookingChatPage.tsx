import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchChatMeta } from "@/lib/chatApi";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
import { getStoredUser } from "@/lib/auth";
import {
  ownerBookingDetailPath,
  renterReservationsPath,
  type BookingChatAudience,
} from "@/lib/bookingChatRoutes";
import { useMarkNotificationsReadOnVisit } from "@/hooks/useMarkNotificationsReadOnVisit";
import { useMatchMediaMdUp } from "@/hooks/useMatchMediaMdUp";

export type BookingChatLocationState = {
  peerLabel?: string;
  subtitle?: string;
  backTo?: string;
  openChat?: boolean;
  /** Banhista (desktop): abrir popup na lista de reservas */
  openChatBookingId?: string;
};

type Props = {
  audience: BookingChatAudience;
};

export default function BookingChatPage({ audience }: Props) {
  const { bookingId: rawId } = useParams<{ bookingId: string }>();
  const bookingId = rawId ? decodeURIComponent(rawId).trim() : "";
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getStoredUser();
  const mdUp = useMatchMediaMdUp();
  const state = (location.state as BookingChatLocationState | null) ?? null;

  useMarkNotificationsReadOnVisit(location.pathname);

  const backTo = useMemo(() => {
    if (state?.backTo) return state.backTo;
    return audience === "owner" && bookingId
      ? ownerBookingDetailPath(bookingId)
      : renterReservationsPath();
  }, [audience, bookingId, state?.backTo]);

  const peerLabel = state?.peerLabel ?? (audience === "owner" ? t("marinheiro.client") : t("bookingChat.owner"));
  const subtitle = state?.subtitle ?? "";

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname }, replace: true });
      return;
    }
    if (audience === "owner" && user.role !== "locatario") {
      navigate("/conta", { replace: true });
      return;
    }
    if (audience === "renter" && user.role !== "banhista") {
      navigate("/conta", { replace: true });
    }
  }, [audience, location.pathname, navigate, user]);

  useEffect(() => {
    if (!bookingId || mdUp) return;
    let cancelled = false;
    void (async () => {
      const meta = await fetchChatMeta(bookingId);
      if (cancelled) return;
      if (!meta || meta.mode === "hidden") {
        toast.message(t("bookingChat.errorNotAvailable"));
        navigate(backTo, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backTo, bookingId, mdUp, navigate, t]);

  useEffect(() => {
    if (!bookingId || !mdUp) return;
    const state: BookingChatLocationState =
      audience === "owner"
        ? { openChat: true, peerLabel, subtitle }
        : { openChatBookingId: bookingId, peerLabel, subtitle };
    navigate(backTo, { replace: true, state });
  }, [audience, backTo, bookingId, mdUp, navigate, peerLabel, subtitle]);

  if (!user || !bookingId) return null;
  if (mdUp) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="shrink-0 text-foreground transition-colors hover:text-primary"
              aria-label={t("bookingChat.backToBooking")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">{t("bookingChat.pageTitle")}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : (
                <p className="truncate text-xs text-muted-foreground">{peerLabel}</p>
              )}
            </div>
          </div>
          {audience === "renter" ? <HeaderSettingsMenu /> : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <BookingChatPanel
          bookingId={bookingId}
          peerLabel={peerLabel}
          enabled
          autoFocus
          surface="page"
          className="flex min-h-0 flex-1 flex-col border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
