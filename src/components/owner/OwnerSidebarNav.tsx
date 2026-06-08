import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  RefreshCw,
  Ship,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ownerPanelNavFromPath,
  ownerPanelNavPath,
  type OwnerPanelNavId,
} from "@/lib/ownerPanelTab";

type NavItem = {
  id: OwnerPanelNavId;
  icon: LucideIcon;
  labelKey: string;
};

export const OWNER_PANEL_NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, labelKey: "ownerPanel.tabHome" },
  { id: "agenda", icon: CalendarDays, labelKey: "ownerPanel.navAgenda" },
  { id: "bookings", icon: ClipboardList, labelKey: "ownerPanel.tabBookings" },
  { id: "boats", icon: Ship, labelKey: "ownerPanel.tabBoats" },
  { id: "optionals", icon: Sparkles, labelKey: "ownerPanel.tabOptionals" },
  { id: "revenue", icon: TrendingUp, labelKey: "ownerPanel.navRevenue" },
  { id: "profile", icon: UserRound, labelKey: "ownerPanel.tabProfile" },
];

function NavLink({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className="truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export function OwnerPanelNavContent({
  bookingsBadgeCount,
  onRefresh,
  onLogout,
  refreshing,
  onNavigate,
  showHeader = true,
  className,
}: {
  bookingsBadgeCount: number;
  onRefresh: () => void;
  onLogout: () => void;
  refreshing: boolean;
  /** Fecha o sheet mobile após navegar. */
  onNavigate?: () => void;
  showHeader?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeNav = ownerPanelNavFromPath(pathname);

  const go = (id: OwnerPanelNavId) => {
    navigate(ownerPanelNavPath(id));
    onNavigate?.();
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {showHeader ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
          <Anchor className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-sm font-semibold text-foreground">{t("marinheiro.title")}</span>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t("ownerPanel.sidebarAria")}>
        {OWNER_PANEL_NAV_ITEMS.map(({ id, icon, labelKey }) => (
          <NavLink
            key={id}
            active={activeNav === id}
            icon={icon}
            label={t(labelKey)}
            badge={id === "bookings" ? bookingsBadgeCount : undefined}
            onClick={() => go(id)}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border/60 p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 shrink-0", refreshing && "animate-spin")} aria-hidden />
          {t("marinheiro.refresh")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          {t("marinheiro.logout")}
        </Button>
      </div>
    </div>
  );
}

export function OwnerSidebarNav({
  bookingsBadgeCount,
  onRefresh,
  onLogout,
  refreshing,
}: {
  bookingsBadgeCount: number;
  onRefresh: () => void;
  onLogout: () => void;
  refreshing: boolean;
}) {
  const { t } = useTranslation();

  return (
    <aside
      className="sticky top-0 hidden h-svh w-[15.5rem] shrink-0 flex-col border-r border-border/60 bg-background dark:bg-[hsl(220_28%_6%)] md:flex"
      aria-label={t("ownerPanel.sidebarAria")}
    >
      <OwnerPanelNavContent
        bookingsBadgeCount={bookingsBadgeCount}
        onRefresh={onRefresh}
        onLogout={onLogout}
        refreshing={refreshing}
      />
    </aside>
  );
}
