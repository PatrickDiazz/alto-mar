import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookingChat } from "@/components/chat/useBookingChat";
import { BookingChatMessage } from "@/components/chat/BookingChatMessage";
import { BookingChatInput } from "@/components/chat/BookingChatInput";
import { getStoredUser } from "@/lib/auth";

type Props = {
  bookingId: string;
  peerLabel: string;
  enabled?: boolean;
  autoFocus?: boolean;
  unreadCount?: number;
  onUnreadChange?: (count: number) => void;
  className?: string;
  anchorId?: string;
  /** page = ecrã inteiro mobile; dialog = popup desktop */
  surface?: "embedded" | "page" | "dialog";
  hideHeader?: boolean;
};

const CHAT_ERROR_I18N: Record<string, string> = {
  CHAT_CONTENT_BLOCKED: "bookingChat.errorContentBlocked",
  CHAT_READ_ONLY: "bookingChat.errorReadOnly",
  CHAT_NOT_AVAILABLE: "bookingChat.errorNotAvailable",
  CHAT_RATE_LIMIT: "bookingChat.errorRateLimit",
  CHAT_INVALID_BODY: "bookingChat.errorInvalid",
  chat_load_fail: "bookingChat.errorLoad",
  chat_send_fail: "bookingChat.errorSend",
};

export function BookingChatPanel({
  bookingId,
  peerLabel,
  enabled = true,
  autoFocus = false,
  unreadCount = 0,
  onUnreadChange,
  className,
  anchorId,
  surface = "embedded",
  hideHeader = false,
}: Props) {
  const { t } = useTranslation();
  const user = getStoredUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { meta, messages, loading, sending, error, send, isMine } = useBookingChat({
    bookingId,
    enabled,
    autoFocus,
    currentUserId: user?.id ?? null,
    onUnreadChange,
  });

  useEffect(() => {
    if (!error) return;
    const key = CHAT_ERROR_I18N[error] ?? "bookingChat.errorSend";
    toast.error(t(key));
  }, [error, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  if (!enabled) return null;
  if (!loading && (!meta || meta.mode === "hidden")) return null;

  const canSend = meta?.mode === "read_write" && meta.canSend;
  const readOnly = meta?.mode === "read_only";

  const messagesScrollClass =
    surface === "page"
      ? "min-h-0 flex-1 space-y-2 overflow-y-auto py-1 pr-1"
      : surface === "dialog"
        ? "max-h-[min(52vh,22rem)] space-y-2 overflow-y-auto py-1 pr-1"
        : "max-h-64 space-y-2 overflow-y-auto py-1 pr-1";

  const defaultClass =
    surface === "embedded" ? "mt-3 rounded-xl border border-border/50 bg-muted/20 p-3" : "";

  return (
    <section
      id={anchorId}
      className={className ?? defaultClass}
      aria-label={t("bookingChat.sectionTitle")}
    >
      {!hideHeader ? (
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">{t("bookingChat.sectionTitle")}</h3>
          {unreadCount > 0 ? (
            <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
      ) : null}

      {readOnly ? (
        <p className="mb-2 text-xs text-muted-foreground">{t("bookingChat.readOnlyBanner")}</p>
      ) : null}

      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-2/3 ml-auto" />
        </div>
      ) : (
        <div className={messagesScrollClass}>
          {messages.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{t("bookingChat.empty")}</p>
          ) : (
            messages.map((msg) => (
              <BookingChatMessage
                key={msg.id}
                message={msg}
                isMine={isMine(msg)}
                peerLabel={peerLabel}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {canSend ? (
        <BookingChatInput
          disabled={!canSend}
          sending={sending}
          onSend={async (body) => {
            try {
              await send(body);
            } catch (e) {
              const code = e instanceof Error ? e.message : "";
              const key = CHAT_ERROR_I18N[code];
              if (key) toast.error(t(key));
            }
          }}
        />
      ) : null}
    </section>
  );
}
