import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (body: string) => Promise<void>;
};

export function BookingChatInput({ disabled, sending, onSend }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const submit = async () => {
    const body = text.trim();
    if (!body || disabled || sending) return;
    await onSend(body);
    setText("");
  };

  return (
    <div className="flex items-end gap-2 border-t border-border/50 pt-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("bookingChat.inputPlaceholder")}
        maxLength={2000}
        rows={2}
        disabled={disabled || sending}
        className="min-h-[2.5rem] resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <Button
        type="button"
        size="icon"
        className="shrink-0"
        disabled={disabled || sending || !text.trim()}
        onClick={() => void submit()}
        aria-label={t("bookingChat.send")}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
