import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchChatMeta } from "@/lib/chatApi";
import {
  bookingChatPath,
  type BookingChatAudience,
} from "@/lib/bookingChatRoutes";
import { BookingChatDialog } from "@/components/chat/BookingChatDialog";
import type { BookingChatLocationState } from "@/pages/booking/BookingChatPage";

type Props = {
  bookingId: string;
  audience: BookingChatAudience;
  peerLabel: string;
  subtitle?: string;
  unreadCount?: number;
  onUnreadChange?: (count: number) => void;
  autoOpen?: boolean;
};

export function BookingChatEntry({
  bookingId,
  audience,
  peerLabel,
  subtitle,
  unreadCount = 0,
  onUnreadChange,
  autoOpen = false,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);

  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const syncUnread = useCallback((n: number) => {
    setLocalUnread(n);
    onUnreadChangeRef.current?.(n);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meta = await fetchChatMeta(bookingId);
        if (cancelled) return;
        setAvailable(Boolean(meta && meta.mode !== "hidden"));
        if (meta && meta.mode !== "hidden") syncUnread(meta.unreadCount);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, syncUnread]);

  useEffect(() => {
    if (!autoOpen || available !== true) return;
    if (isMobile) {
      const state: BookingChatLocationState = { peerLabel, subtitle };
      navigate(bookingChatPath(audience, bookingId), { state });
      return;
    }
    setDialogOpen(true);
  }, [audience, autoOpen, available, bookingId, isMobile, navigate, peerLabel, subtitle]);

  if (available !== true) return null;

  const openChat = () => {
    if (isMobile) {
      const state: BookingChatLocationState = { peerLabel, subtitle };
      navigate(bookingChatPath(audience, bookingId), { state });
      return;
    }
    setDialogOpen(true);
  };

  const badge = localUnread > 0 ? (localUnread > 99 ? "99+" : String(localUnread)) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2 sm:w-auto"
        onClick={openChat}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("bookingChat.open")}</span>
        {badge ? (
          <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        ) : null}
      </Button>

      {!isMobile ? (
        <BookingChatDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          bookingId={bookingId}
          peerLabel={peerLabel}
          subtitle={subtitle}
          unreadCount={localUnread}
          onUnreadChange={syncUnread}
        />
      ) : null}
    </>
  );
}
