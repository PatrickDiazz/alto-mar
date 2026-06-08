import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChatMessages,
  fetchChatMeta,
  markChatRead,
  sendChatMessage,
  type ChatMessage,
  type ChatMeta,
} from "@/lib/chatApi";

const POLL_MS = 5_000;

type Options = {
  bookingId: string;
  enabled?: boolean;
  autoFocus?: boolean;
  currentUserId?: string | null;
  onUnreadChange?: (count: number) => void;
};

export function useBookingChat({
  bookingId,
  enabled = true,
  autoFocus = false,
  currentUserId,
  onUnreadChange,
}: Options) {
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCreatedAtRef = useRef<string | null>(null);
  const markedReadRef = useRef(false);

  const syncUnread = useCallback(
    (count: number) => {
      onUnreadChange?.(count);
    },
    [onUnreadChange]
  );

  const loadInitial = useCallback(async () => {
    if (!enabled || !bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const m = await fetchChatMeta(bookingId);
      setMeta(m);
      if (!m || m.mode === "hidden") {
        setMessages([]);
        syncUnread(0);
        return;
      }
      syncUnread(m.unreadCount);
      const data = await fetchChatMessages(bookingId, { limit: 100 });
      setMessages(data.messages);
      const last = data.messages[data.messages.length - 1];
      lastCreatedAtRef.current = last?.createdAt ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "chat_load_fail");
    } finally {
      setLoading(false);
    }
  }, [bookingId, enabled, syncUnread]);

  const pollNew = useCallback(async () => {
    if (!enabled || !bookingId || !meta || meta.mode === "hidden") return;
    try {
      const since = lastCreatedAtRef.current;
      const data = await fetchChatMessages(bookingId, { since: since ?? undefined, limit: 100 });
      if (data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const merged = [...prev];
          for (const msg of data.messages) {
            if (!ids.has(msg.id)) merged.push(msg);
          }
          return merged;
        });
        const last = data.messages[data.messages.length - 1];
        lastCreatedAtRef.current = last?.createdAt ?? lastCreatedAtRef.current;
      }
      const m = await fetchChatMeta(bookingId);
      if (m) {
        setMeta(m);
        syncUnread(m.unreadCount);
      }
    } catch {
      /* silent poll */
    }
  }, [bookingId, enabled, meta, syncUnread]);

  const markRead = useCallback(async () => {
    if (!bookingId || markedReadRef.current) return;
    try {
      await markChatRead(bookingId);
      markedReadRef.current = true;
      syncUnread(0);
      setMeta((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));
    } catch {
      /* ignore */
    }
  }, [bookingId, syncUnread]);

  useEffect(() => {
    markedReadRef.current = false;
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!enabled || !meta || meta.mode === "hidden") return;
    if (autoFocus || meta.unreadCount > 0) {
      void markRead();
    }
  }, [autoFocus, enabled, markRead, meta]);

  useEffect(() => {
    if (!enabled || !meta || meta.mode === "hidden") return;
    if (document.visibilityState !== "visible") return;
    const id = window.setInterval(() => void pollNew(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, meta, pollNew]);

  const send = useCallback(
    async (body: string) => {
      setSending(true);
      setError(null);
      try {
        const msg = await sendChatMessage(bookingId, body);
        setMessages((prev) => [...prev, msg]);
        lastCreatedAtRef.current = msg.createdAt;
        setMeta((prev) =>
          prev
            ? {
                ...prev,
                messageCount: prev.messageCount + 1,
                lastMessageAt: msg.createdAt,
              }
            : prev
        );
      } catch (e) {
        const code = e instanceof Error ? e.message : "chat_send_fail";
        setError(code);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [bookingId]
  );

  const isMine = useCallback(
    (msg: ChatMessage) => Boolean(currentUserId && msg.senderUserId === currentUserId),
    [currentUserId]
  );

  return {
    meta,
    messages,
    loading,
    sending,
    error,
    send,
    isMine,
    reload: loadInitial,
    markRead,
  };
}
