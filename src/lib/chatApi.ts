import { authFetch } from "@/lib/auth";

export type ChatMode = "hidden" | "read_write" | "read_only";

export type ChatMessage = {
  id: string;
  senderUserId: string;
  senderRole: "banhista" | "locatario";
  body: string;
  createdAt: string;
};

export type ChatMeta = {
  mode: ChatMode;
  canSend: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  messageCount: number;
};

export type ChatApiError = {
  code: string;
  message: string;
};

export async function parseChatError(resp: Response, fallback: string): Promise<string> {
  const raw = await resp.text().catch(() => "");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as ChatApiError;
    if (parsed.code) return parsed.code;
    if (parsed.message) return parsed.message;
  } catch {
    /* plain text */
  }
  return raw.length > 400 ? `${raw.slice(0, 397)}…` : raw;
}

export async function fetchChatMeta(bookingId: string): Promise<ChatMeta | null> {
  const resp = await authFetch(`/api/bookings/${encodeURIComponent(bookingId)}/chat/meta`);
  if (resp.status === 401 || resp.status === 404) return null;
  if (!resp.ok) throw new Error(await parseChatError(resp, "chat_load_fail"));
  return (await resp.json()) as ChatMeta;
}

export async function fetchChatMessages(
  bookingId: string,
  opts?: { since?: string | null; limit?: number }
): Promise<{ mode: ChatMode; messages: ChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (opts?.since) params.set("since", opts.since);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const q = params.toString();
  const resp = await authFetch(
    `/api/bookings/${encodeURIComponent(bookingId)}/chat/messages${q ? `?${q}` : ""}`
  );
  if (resp.status === 401) throw new Error("unauthorized");
  if (!resp.ok) throw new Error(await parseChatError(resp, "chat_load_fail"));
  return (await resp.json()) as { mode: ChatMode; messages: ChatMessage[]; hasMore: boolean };
}

export async function sendChatMessage(bookingId: string, body: string): Promise<ChatMessage> {
  const resp = await authFetch(`/api/bookings/${encodeURIComponent(bookingId)}/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (resp.status === 401) throw new Error("unauthorized");
  if (!resp.ok) throw new Error(await parseChatError(resp, "chat_send_fail"));
  const data = (await resp.json()) as { message: ChatMessage };
  return data.message;
}

export async function markChatRead(bookingId: string): Promise<void> {
  const resp = await authFetch(`/api/bookings/${encodeURIComponent(bookingId)}/chat/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (resp.status === 401) return;
  if (!resp.ok) throw new Error(await parseChatError(resp, "chat_read_fail"));
}

export async function fetchChatUnreadSummary(): Promise<{
  totalUnread: number;
  byBooking: { bookingId: string; count: number }[];
}> {
  const resp = await authFetch("/api/chat/unread-summary");
  if (resp.status === 401) return { totalUnread: 0, byBooking: [] };
  if (!resp.ok) throw new Error(await parseChatError(resp, "chat_unread_fail"));
  return (await resp.json()) as { totalUnread: number; byBooking: { bookingId: string; count: number }[] };
}
