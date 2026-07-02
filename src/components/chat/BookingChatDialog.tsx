import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  peerLabel: string;
  subtitle?: string;
  unreadCount?: number;
  onUnreadChange?: (count: number) => void;
};

export function BookingChatDialog({
  open,
  onOpenChange,
  bookingId,
  peerLabel,
  subtitle,
  unreadCount = 0,
  onUnreadChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,40rem)] w-[min(100vw-2rem,32rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
          <DialogTitle>{t("bookingChat.pageTitle")}</DialogTitle>
          <DialogDescription>
            {subtitle ? `${subtitle} · ${peerLabel}` : peerLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          {open ? (
            <div className="flex min-h-[min(52vh,22rem)] min-h-0 flex-1 flex-col">
              <BookingChatPanel
                bookingId={bookingId}
                peerLabel={peerLabel}
                enabled
                autoFocus
                unreadCount={unreadCount}
                onUnreadChange={onUnreadChange}
                surface="dialog"
                className="flex min-h-0 flex-1 flex-col border-0 bg-transparent p-0"
                hideHeader
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
