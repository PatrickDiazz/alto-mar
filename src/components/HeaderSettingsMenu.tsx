import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Heart, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getStoredUser } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type HeaderSettingsMenuProps = {
  className?: string;
  triggerClassName?: string;
};

type SettingsMenuPanelProps = {
  onClose: () => void;
  /** Sufixo único para ids de acessibilidade quando há mais de um painel no ecrã (ex.: barra inferior + cabeçalho). */
  idSuffix?: string;
};

export function SettingsMenuPanel({ onClose, idSuffix = "header" }: SettingsMenuPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();
  const isLocatario = user?.role === "locatario";
  const onMarinheiroRoute = location.pathname === "/marinheiro";
  const langId = `alto-mar-lang-sheet-${idSuffix}`;

  return (
    <>
      <SheetHeader className="space-y-0 pb-3">
        <div className="flex justify-center" aria-hidden>
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <SheetTitle className="sr-only">{t("menu.title")}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4">
        {isLocatario && (
          <div className="space-y-2">
            <Label>{t("menu.roleArea")}</Label>
            <p className="text-xs text-muted-foreground leading-snug">{t("menu.roleAreaHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={!onMarinheiroRoute ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => {
                  navigate("/explorar");
                  onClose();
                }}
              >
                {t("menu.banhistaMode")}
              </Button>
              <Button
                type="button"
                variant={onMarinheiroRoute ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => {
                  navigate("/marinheiro");
                  onClose();
                }}
              >
                {t("menu.marinheiroMode")}
              </Button>
            </div>
          </div>
        )}
        {user && (
          <div className="space-y-2 border-t border-border pt-4">
            <Label className="text-xs font-medium text-muted-foreground">{t("menu.quickLinks")}</Label>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  navigate("/conta/favoritos");
                  onClose();
                }}
              >
                <Heart className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {t("conta.favorites")}
              </Button>
              {user.role === "banhista" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                        navigate("/conta/reservas");
                    onClose();
                  }}
                >
                  <CalendarDays className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {t("conta.reservations")}
                </Button>
              ) : null}
            </div>
          </div>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Label htmlFor={langId} className="shrink-0 text-xs text-muted-foreground">
              {t("lang.label")}
            </Label>
            <LanguageSwitcher id={langId} iconOnlyTrigger className="shrink-0" />
          </div>
          <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{t("menu.appearance")}</span>
            <ThemeToggle />
          </div>
        </div>
        <div className="flex justify-center border-t border-border pt-4">
          <AppVersionStamp />
        </div>
      </div>
    </>
  );
}

export function HeaderSettingsMenu({ className, triggerClassName }: HeaderSettingsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("shrink-0", className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-9 w-9", triggerClassName)}
            aria-label={t("menu.open")}
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[min(100%,16rem)] max-w-[16rem] flex-col gap-0 p-4 pt-5">
          <SettingsMenuPanel onClose={() => setOpen(false)} idSuffix="header" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
