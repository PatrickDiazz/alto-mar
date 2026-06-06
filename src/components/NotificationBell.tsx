import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getStoredUser } from "@/lib/auth";
import { useNotificationsOptional } from "@/contexts/NotificationsContext";

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

export function NotificationBell({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const ctx = useNotificationsOptional();
  const user = getStoredUser();

  if (!user || !ctx) return null;

  const { unreadCount, items, loading, openNotification, markAllRead, refresh } = ctx;
  const dateLocale = localeForLang(i18n.language);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative h-9 w-9 shrink-0", className)}
          aria-label={t("notifications.bellAria", { count: unreadCount })}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">{t("notifications.title")}</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => void markAllRead()}
            >
              {t("notifications.markAllRead")}
            </button>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("notifications.loading")}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("notifications.empty")}</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                      !n.readAt && "bg-primary/[0.04]"
                    )}
                    onClick={() => void openNotification(n)}
                  >
                    <span className="text-sm font-medium text-foreground">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
