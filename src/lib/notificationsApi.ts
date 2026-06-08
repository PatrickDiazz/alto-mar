import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  path: string | null;
  bookingId: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  const resp = await authFetch(`/api/notifications?limit=${limit}`);
  if (resp.status === 401) return [];
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao carregar notificações."));
  }
  const data = (await resp.json()) as { notifications: AppNotification[] };
  return data.notifications ?? [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const resp = await authFetch("/api/notifications/unread-count");
  if (resp.status === 401) return 0;
  if (!resp.ok) return 0;
  const data = (await resp.json()) as { count: number };
  return Number(data.count ?? 0);
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
  const resp = await authFetch("/api/notifications/push-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
  if (resp.status === 401) return;
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao registar dispositivo."));
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const resp = await authFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
  if (resp.status === 401) return;
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao marcar notificação."));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const resp = await authFetch("/api/notifications/read-all", { method: "POST" });
  if (resp.status === 401) return;
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao marcar notificações."));
  }
}

export async function markNotificationsReadForVisit(pathname: string): Promise<{ updated: number }> {
  const resp = await authFetch("/api/notifications/mark-visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname }),
  });
  if (resp.status === 401) return { updated: 0 };
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao marcar notificações."));
  }
  const data = (await resp.json()) as { updated?: number };
  return { updated: Number(data.updated ?? 0) };
}

export function notificationMatchesPathPrefix(n: AppNotification, prefix: string): boolean {
  if (n.readAt || !n.path) return false;
  return n.path === prefix || n.path.startsWith(`${prefix}/`);
}
