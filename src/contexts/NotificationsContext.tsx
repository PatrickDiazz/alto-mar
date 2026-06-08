import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { getToken } from "@/lib/auth";
import { initPushNotifications } from "@/lib/capacitorNative";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsReadForVisit,
  notificationMatchesPathPrefix,
  registerPushToken,
  type AppNotification,
} from "@/lib/notificationsApi";

const POLL_MS = 30_000;

type NotificationsContextValue = {
  unreadCount: number;
  items: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  openNotification: (n: AppNotification) => Promise<void>;
  markAllRead: () => Promise<void>;
  markReadForVisit: (pathname: string) => Promise<void>;
  unreadCountForPathPrefix: (prefix: string) => number;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [count, list] = await Promise.all([
        fetchUnreadNotificationCount(),
        fetchNotifications(30),
      ]);
      setUnreadCount(count);
      setItems(list);
    } catch {
      /* polling silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  const openNotification = useCallback(
    async (n: AppNotification) => {
      if (!n.readAt) {
        try {
          await markNotificationRead(n.id);
          setUnreadCount((c) => Math.max(0, c - 1));
          setItems((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
          );
        } catch {
          /* ignore */
        }
      }
      if (n.path) navigate(n.path);
    },
    [navigate]
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    } catch {
      toast.error("Não foi possível marcar todas como lidas.");
    }
  }, []);

  const markReadForVisit = useCallback(async (pathname: string) => {
    const path = pathname.split("?")[0];
    const shouldMark =
      /^\/marinheiro\/reservas(\/|$)/.test(path) ||
      /^\/marinheiro\/agenda(\/|$)/.test(path) ||
      /^\/conta\/reservas(\/|$)/.test(path);
    if (!shouldMark) return;

    try {
      const { updated } = await markNotificationsReadForVisit(path);
      if (updated <= 0) return;
      const now = new Date().toISOString();
      setUnreadCount((c) => Math.max(0, c - updated));
      setItems((prev) =>
        prev.map((x) => {
          if (x.readAt || !x.path) return x;
          const ownerDetail = path.match(/^\/marinheiro\/reservas\/([^/]+)$/);
          if (ownerDetail) {
            const bookingId = ownerDetail[1];
            if (x.bookingId === bookingId || x.path === path || x.path.startsWith(`${path}/`)) {
              return { ...x, readAt: now };
            }
            return x;
          }
          if (
            (path.startsWith("/marinheiro/reservas") || path.startsWith("/marinheiro/agenda")) &&
            notificationMatchesPathPrefix(x, "/marinheiro/reservas")
          ) {
            return { ...x, readAt: now };
          }
          if (path.startsWith("/conta/reservas") && notificationMatchesPathPrefix(x, "/conta/reservas")) {
            return { ...x, readAt: now };
          }
          return x;
        })
      );
    } catch {
      /* visit mark is best-effort */
    }
  }, []);

  const unreadCountForPathPrefix = useCallback(
    (prefix: string) => items.filter((n) => notificationMatchesPathPrefix(n, prefix)).length,
    [items]
  );

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onAuth = () => void refresh();
    window.addEventListener("storage", onAuth);
    window.addEventListener("alto-mar-auth-changed", onAuth);
    return () => {
      window.removeEventListener("storage", onAuth);
      window.removeEventListener("alto-mar-auth-changed", onAuth);
    };
  }, [refresh]);

  useEffect(() => {
    if (!getToken()) return;
    void initPushNotifications((token) => {
      void registerPushToken(token, Capacitor.getPlatform()).catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const onPush = (e: Event) => {
      const detail = (e as CustomEvent<{ title?: string; body?: string }>).detail;
      if (detail?.title) {
        toast.info(detail.title, { description: detail.body });
      }
      void refresh();
    };
    window.addEventListener("alto-mar-push-received", onPush);
    return () => window.removeEventListener("alto-mar-push-received", onPush);
  }, [refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      items,
      loading,
      refresh,
      openNotification,
      markAllRead,
      markReadForVisit,
      unreadCountForPathPrefix,
    }),
    [unreadCount, items, loading, refresh, openNotification, markAllRead, markReadForVisit, unreadCountForPathPrefix]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
