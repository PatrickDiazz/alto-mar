import { useTranslation } from "react-i18next";
import { ArrowLeft, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RENTER_HEADER, RENTER_TEXT_TITLE } from "@/components/renter/booking/renterBookingUi";

type Props = {
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  menuItems?: { label: string; onClick: () => void; destructive?: boolean }[];
  className?: string;
};

export function RenterBookingMobileHeader({
  title,
  onBack,
  onRefresh,
  refreshing,
  menuItems,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        RENTER_HEADER,
        "safe-area-top sticky top-0 z-30",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={onBack}
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <span className="w-9 shrink-0" aria-hidden />
        )}
        <h1 className={cn("min-w-0 flex-1 truncate text-center text-base font-bold", RENTER_TEXT_TITLE)}>
          {title}
        </h1>
        <div className="flex w-9 shrink-0 items-center justify-end gap-0.5">
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={refreshing}
              onClick={onRefresh}
              aria-label="Atualizar"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          ) : menuItems && menuItems.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    className={item.destructive ? "text-red-600 focus:text-red-600" : undefined}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="w-9" aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}
