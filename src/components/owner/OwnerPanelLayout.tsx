import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Anchor, ArrowLeft, LogOut, Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SettingsMenuPanel } from "@/components/HeaderSettingsMenu";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { OwnerPanelProvider, useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { ownerPanelBackTarget, ownerPanelTabFromPath } from "@/lib/ownerPanelTab";
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
  const { refreshPainel, loading, dashboardLoading, pendingCount } = useOwnerPanel();
  const [menuOpen, setMenuOpen] = useState(false);
  const tab = ownerPanelTabFromPath(pathname);
  const backTarget = ownerPanelBackTarget(pathname);
  const headerTitle = (() => {
    if (pathname.startsWith("/marinheiro/faturamento")) return t("ownerRevenue.title");
    if (pathname === "/marinheiro/opcionais/novo") return t("ownerPanel.optionalAdd");
    if (pathname.startsWith("/marinheiro/opcionais/")) return t("ownerPanel.optionalEdit");
    if (pathname === "/marinheiro/opcionais") return t("ownerPanel.myOptionalsTitle");
    if (pathname === "/marinheiro/embarcacoes/novo") return t("marinheiro.newBoat");
    if (pathname.startsWith("/marinheiro/embarcacoes")) return t("ownerPanel.myBoatsTitle");
    return t("marinheiro.title");
  })();

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
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background dark:bg-[hsl(220_28%_6%)]">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 px-3 py-2.5 backdrop-blur-md dark:bg-[hsl(220_28%_6%)]/95 sm:px-4 sm:py-3">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            {backTarget ? (
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
            ) : null}
            <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
              {backTarget ? (
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
              ) : (
                <Anchor className="h-5 w-5 shrink-0 text-primary" />
              )}
              <span className="truncate">{headerTitle}</span>
            </h1>
          </div>
          {isLocatario ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={() => setMenuOpen(true)}
                aria-label={t("nav.bottom.menuAria")}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleLogout} title={t("marinheiro.logout")}>
                <LogOut className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={refreshPainel}
                disabled={loading || dashboardLoading}
                title={t("marinheiro.refresh")}
              >
                <RefreshCw className={cn("h-5 w-5", (loading || dashboardLoading) && "animate-spin")} aria-hidden />
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="right" className="flex w-[min(100%,16rem)] max-w-[16rem] flex-col gap-0 p-4 pt-5">
                  <SettingsMenuPanel onClose={() => setMenuOpen(false)} idSuffix="owner-panel" />
                </SheetContent>
              </Sheet>
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-3 sm:px-4",
          pathname === "/marinheiro/embarcacoes/novo" ? "py-2.5 sm:py-3" : "py-4 sm:py-6",
          isLocatario && "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-6"
        )}
      >
        <Outlet />
      </div>

      {isLocatario ? <OwnerBottomNav tab={tab} onTabChange={setTab} pendingCount={pendingCount} /> : null}
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
