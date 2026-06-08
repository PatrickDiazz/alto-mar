import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { ChatMessage } from "@/lib/chatApi";
import { cn } from "@/lib/utils";

type Props = {
  message: ChatMessage;
  isMine: boolean;
  peerLabel: string;
};

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

export function BookingChatMessage({ message, isMine, peerLabel }: Props) {
  const { t, i18n } = useTranslation();
  const when = format(new Date(message.createdAt), "d MMM HH:mm", {
    locale: localeForLang(i18n.language),
  });

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
          isMine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/60 bg-muted/50 text-foreground"
        )}
      >
        <p className="mb-0.5 text-[10px] font-medium opacity-80">
          {isMine ? t("bookingChat.you") : peerLabel}
        </p>
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <time className="mt-1 block text-[10px] opacity-70" dateTime={message.createdAt}>
          {when}
        </time>
      </div>
    </div>
  );
}
