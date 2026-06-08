import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Home, Ship, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OwnerPanelTab } from "@/lib/ownerPanelTab";

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
};

export function OwnerBottomNav({
  tab,
  onTabChange,
  bookingsBadgeCount,
}: {
  tab: OwnerPanelTab;
  onTabChange: (tab: OwnerPanelTab) => void;
  bookingsBadgeCount: number;
}) {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-[hsl(220_26%_8%)]/95 shadow-[0_-10px_32px_-14px_rgba(0,0,0,0.5)] backdrop-blur-md dark:bg-[hsl(220_26%_8%)]/98 md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label={t("ownerPanel.bottomNavAria")}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-1 pt-1">
        <TabButton
          active={tab === "inicio"}
          icon={Home}
          label={t("ownerPanel.tabHome")}
          onClick={() => onTabChange("inicio")}
        />
        <button
          type="button"
          onClick={() => onTabChange("reservas")}
          className={cn(
            "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px]",
            tab === "reservas" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          aria-current={tab === "reservas" ? "page" : undefined}
        >
          <ClipboardList className="h-5 w-5 shrink-0" strokeWidth={tab === "reservas" ? 2.25 : 2} aria-hidden />
          <span className="max-w-full truncate">{t("ownerPanel.tabBookings")}</span>
          {bookingsBadgeCount > 0 ? (
            <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {bookingsBadgeCount > 9 ? "9+" : bookingsBadgeCount}
            </span>
          ) : null}
        </button>
        <TabButton
          active={tab === "embarcacoes"}
          icon={Ship}
          label={t("ownerPanel.tabBoats")}
          onClick={() => onTabChange("embarcacoes")}
        />
        <TabButton
          active={tab === "perfil"}
          icon={UserRound}
          label={t("ownerPanel.tabProfile")}
          onClick={() => onTabChange("perfil")}
        />
      </div>
    </nav>
  );
}
