import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Settings } from "lucide-react";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type HeaderSettingsMenuProps = {
  className?: string;
  triggerClassName?: string;
};

export function HeaderSettingsMenu({ className, triggerClassName }: HeaderSettingsMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const user = getStoredUser();
  const isLocatario = user?.role === "locatario";
  const onMarinheiroRoute = location.pathname === "/marinheiro";

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
        <SheetContent side="right" className="w-[min(100%,16rem)] max-w-[16rem] gap-0 p-4 pt-5 flex flex-col">
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
                      setOpen(false);
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
                      setOpen(false);
                    }}
                  >
                    {t("menu.marinheiroMode")}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Label htmlFor="alto-mar-lang-sheet" className="text-xs shrink-0 text-muted-foreground">
                  {t("lang.label")}
                </Label>
                <LanguageSwitcher
                  id="alto-mar-lang-sheet"
                  iconOnlyTrigger
                  className="shrink-0"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {t("menu.appearance")}
                </span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
