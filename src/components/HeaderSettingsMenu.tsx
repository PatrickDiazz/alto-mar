import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
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
        <SheetContent side="right" className="w-[min(100%,20rem)] flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("menu.title")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-1 flex-col gap-6">
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
            <div className="space-y-2">
              <Label htmlFor="alto-mar-lang-sheet">{t("lang.label")}</Label>
              <LanguageSwitcher id="alto-mar-lang-sheet" className="w-full min-w-0 max-w-none" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium leading-none">{t("menu.appearance")}</span>
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
