import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Heart, Menu, Ship, UserRound } from "lucide-react";
import type { LoginLocationState } from "@/lib/loginLocationState";
import { getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SettingsMenuPanel } from "@/components/HeaderSettingsMenu";

/** Barra inferior só em /explorar: banhista/visitante (explorar barcos) ou locatário a navegar como banhista. */
function useShowMobileExploreBottomNav(): boolean {
  const { pathname } = useLocation();
  return pathname === "/explorar";
}

function bottomTabState(pathname: string) {
  return {
    favorites: pathname === "/conta/favoritos",
    reservations: pathname === "/conta/reservas",
    account:
      pathname === "/conta" ||
      pathname.startsWith("/conta/dados") ||
      pathname.startsWith("/conta/ajuda-teste"),
  };
}

function TabButton({
  to,
  state,
  active,
  icon: Icon,
  label,
}: {
  to: string;
  state?: LoginLocationState;
  active: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-primary/[0.12] text-primary shadow-sm shadow-primary/10"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function MenuTabButton({
  open,
  onOpen,
  label,
}: {
  open: boolean;
  onOpen: () => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        open
          ? "bg-primary/[0.12] text-primary shadow-sm shadow-primary/10"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60"
      )}
      aria-label={t("nav.bottom.menuAria")}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <Menu className="h-5 w-5 shrink-0" strokeWidth={open ? 2.25 : 2} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export function MobileNavHost({ children }: { children: ReactNode }) {
  const show = useShowMobileExploreBottomNav();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const user = getStoredUser();
  const isLocatario = user?.role === "locatario";
  const isBanhista = user?.role === "banhista";
  const tab = bottomTabState(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/explorar") setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <div
        className={cn(
          show && "min-h-0 pb-[calc(3.65rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        )}
      >
        {children}
      </div>
      {show ? (
        <>
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/80 bg-background/95 shadow-[0_-10px_32px_-14px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-background/88 dark:shadow-[0_-10px_32px_-14px_rgba(0,0,0,0.45)]"
            style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
            aria-label={t("nav.bottom.aria")}
          >
            <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-0.5 pt-1">
              {isLocatario ? (
                <>
                  <TabButton
                    to="/marinheiro"
                    active={false}
                    icon={Ship}
                    label={t("nav.bottom.myBoats")}
                  />
                  <TabButton
                    to="/conta/favoritos"
                    active={tab.favorites}
                    icon={Heart}
                    label={t("nav.bottom.favorites")}
                  />
                  <TabButton
                    to="/conta"
                    active={tab.account}
                    icon={UserRound}
                    label={t("nav.bottom.account")}
                  />
                  <MenuTabButton open={menuOpen} onOpen={() => setMenuOpen(true)} label={t("nav.bottom.menu")} />
                </>
              ) : isBanhista ? (
                <>
                  <TabButton
                    to="/conta/favoritos"
                    active={tab.favorites}
                    icon={Heart}
                    label={t("nav.bottom.favorites")}
                  />
                  <TabButton
                    to="/conta/reservas"
                    active={tab.reservations}
                    icon={CalendarDays}
                    label={t("nav.bottom.myReservations")}
                  />
                  <TabButton
                    to="/conta"
                    active={tab.account}
                    icon={UserRound}
                    label={t("nav.bottom.account")}
                  />
                </>
              ) : (
                <>
                  <TabButton
                    to="/login"
                    state={{ from: "/conta/favoritos", loginContext: "favorites" }}
                    active={false}
                    icon={Heart}
                    label={t("nav.bottom.favorites")}
                  />
                  <TabButton
                    to="/login"
                    state={{ from: "/conta/reservas", loginContext: "reservations" }}
                    active={false}
                    icon={CalendarDays}
                    label={t("nav.bottom.myReservations")}
                  />
                  <TabButton
                    to="/login"
                    state={{ from: pathname || "/explorar", loginContext: "signIn" }}
                    active={false}
                    icon={UserRound}
                    label={t("nav.bottom.signIn")}
                  />
                </>
              )}
            </div>
          </nav>
          {isLocatario ? (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="right" className="flex w-[min(100%,16rem)] max-w-[16rem] flex-col gap-0 p-4 pt-5">
                <SettingsMenuPanel onClose={() => setMenuOpen(false)} idSuffix="bottom-nav" />
              </SheetContent>
            </Sheet>
          ) : null}
        </>
      ) : null}
    </>
  );
}
