import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SettingsMenuPanel } from "@/components/HeaderSettingsMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { OwnerPanelNavContent, OwnerSidebarNav } from "@/components/owner/OwnerSidebarNav";
import { OwnerPanelProvider, useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { useNotificationsOptional } from "@/contexts/NotificationsContext";
import { useMarkNotificationsReadOnVisit } from "@/hooks/useMarkNotificationsReadOnVisit";
import { useMatchMediaMdUp } from "@/hooks/useMatchMediaMdUp";
import { ownerPanelBackTarget, ownerPanelTabFromPath } from "@/lib/ownerPanelTab";
import { ownerPanelMaxWidthClass, ownerPanelWidthFromPath } from "@/lib/ownerPanelLayout";
import { cn } from "@/lib/utils";
import { clearSession, getStoredUser } from "@/lib/auth";
import { useState } from "react";
import type { OwnerPanelTab } from "@/lib/ownerPanelTab";

function OwnerPanelLayoutInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = getStoredUser();
  const isLocatario = user?.role === "locatario";
  const { refreshPainel, loading, dashboardLoading } = useOwnerPanel();
  const notifications = useNotificationsOptional();
  const bookingsBadgeCount = notifications?.unreadCountForPathPrefix("/marinheiro/reservas") ?? 0;
  useMarkNotificationsReadOnVisit(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const tab = ownerPanelTabFromPath(pathname);
  const backTarget = ownerPanelBackTarget(pathname);
  const pageWidth = ownerPanelWidthFromPath(pathname);
  const pageMaxWidth = ownerPanelMaxWidthClass(pageWidth);
  const refreshing = loading || dashboardLoading;
  const mdUp = useMatchMediaMdUp();

  const setTab = (next: OwnerPanelTab) => {
    if (next === "inicio") navigate("/marinheiro");
    else if (next === "reservas") navigate("/marinheiro/reservas");
    else if (next === "embarcacoes") navigate("/marinheiro/embarcacoes");
    else navigate("/marinheiro/perfil");
  };

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(t("marinheiro.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  return (
    <div className="flex min-h-screen min-w-0 bg-background dark:bg-[hsl(220_28%_6%)]">
      {isLocatario ? (
        <OwnerSidebarNav
          bookingsBadgeCount={bookingsBadgeCount}
          onRefresh={refreshPainel}
          onLogout={handleLogout}
          refreshing={refreshing}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 px-3 pb-2 pt-[calc(0.5rem+var(--safe-area-top,env(safe-area-inset-top,0px)))] backdrop-blur-md dark:bg-[hsl(220_28%_6%)]/95 sm:px-4 sm:pb-2.5 sm:pt-[calc(0.625rem+var(--safe-area-top,env(safe-area-inset-top,0px)))]">
          <div className={cn("mx-auto flex w-full items-center justify-between gap-2", pageMaxWidth)}>
            <div className="flex min-w-0 flex-1 items-center">
              {backTarget ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="hidden h-9 w-9 shrink-0 sm:inline-flex"
                    onClick={() => navigate(backTarget)}
                    aria-label={t("common.back")}
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 sm:hidden"
                    onClick={() => navigate(backTarget)}
                    aria-label={t("common.back")}
                  >
                    <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
                  </Button>
                </>
              ) : null}
            </div>

            {isLocatario ? (
              <div className="flex shrink-0 items-center gap-1">
                <NotificationBell />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => setMenuOpen(true)}
                  aria-label={mdUp ? t("nav.bottom.menuAria") : t("ownerPanel.mobileMenuAria")}
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetContent
                    side="right"
                    className={cn(
                      "flex flex-col gap-0 p-0",
                      mdUp
                        ? "w-[min(100%,16rem)] max-w-[16rem] p-4 pt-5"
                        : "w-[min(100%,17rem)] max-w-[17rem]"
                    )}
                  >
                    {mdUp ? (
                      <SettingsMenuPanel
                        onClose={() => setMenuOpen(false)}
                        idSuffix="owner-panel-desktop"
                      />
                    ) : (
                      <>
                        <OwnerPanelNavContent
                          bookingsBadgeCount={bookingsBadgeCount}
                          onRefresh={refreshPainel}
                          onLogout={handleLogout}
                          refreshing={refreshing}
                          onNavigate={() => setMenuOpen(false)}
                        />
                        <div className="shrink-0 overflow-y-auto border-t border-border/60 p-4">
                          <SettingsMenuPanel
                            onClose={() => setMenuOpen(false)}
                            idSuffix="owner-panel"
                            hideHeader
                          />
                        </div>
                      </>
                    )}
                  </SheetContent>
                </Sheet>
              </div>
            ) : null}
          </div>
        </header>

        <main
          className={cn(
            "w-full flex-1 px-3 sm:px-4",
            pathname === "/marinheiro/embarcacoes/novo" ? "py-2.5 sm:py-3" : "py-4 sm:py-6",
            isLocatario && "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-6"
          )}
        >
          <Outlet />
        </main>

        {isLocatario ? (
          <OwnerBottomNav tab={tab} onTabChange={setTab} bookingsBadgeCount={bookingsBadgeCount} />
        ) : null}
      </div>
    </div>
  );
}

export function OwnerPanelLayout() {
  return (
    <OwnerPanelProvider>
      <OwnerPanelLayoutInner />
    </OwnerPanelProvider>
  );
}
