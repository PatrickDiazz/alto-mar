import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RENTER_BTN_PRIMARY } from "@/components/renter/booking/renterBookingUi";

type Props = {
  children: ReactNode;
  className?: string;
};

export function RenterBookingMobileBottomBar({ children, className }: Props) {
  return (
    <div
      className={cn(
        "safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-border/70 dark:bg-background/95",
        className
      )}
    >
      {children}
    </div>
  );
}

type PayBarProps = {
  totalLabel: string;
  payLabel: string;
  paying?: boolean;
  onPay: () => void;
};

export function RenterBookingMobilePayBar({ totalLabel, payLabel, paying, onPay }: PayBarProps) {
  return (
    <RenterBookingMobileBottomBar>
      <div className="mx-auto flex max-w-lg items-center gap-4">
        <p className="min-w-0 flex-1 text-lg font-bold tabular-nums text-slate-900 dark:text-foreground">
          {totalLabel}
        </p>
        <Button
          type="button"
          className={cn("h-11 flex-1 rounded-xl font-semibold", RENTER_BTN_PRIMARY)}
          disabled={paying}
          onClick={onPay}
        >
          {payLabel}
        </Button>
      </div>
    </RenterBookingMobileBottomBar>
  );
}

type ActionBarProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructiveLabel?: string;
  onDestructive?: () => void;
  destructiveDisabled?: boolean;
};

export function RenterBookingMobileActionBar({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  destructiveLabel,
  onDestructive,
  destructiveDisabled,
}: ActionBarProps) {
  return (
    <RenterBookingMobileBottomBar>
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        {destructiveLabel && onDestructive ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            disabled={destructiveDisabled}
            onClick={onDestructive}
          >
            {destructiveLabel}
          </Button>
        ) : null}
        <div className="flex gap-2">
          {secondaryLabel && onSecondary ? (
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn("h-11 flex-1 rounded-xl font-semibold", RENTER_BTN_PRIMARY)}
            disabled={primaryDisabled}
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </RenterBookingMobileBottomBar>
  );
}

export function RenterBookingMobileEditBar({
  saveLabel,
  cancelLabel,
  onSave,
  onCancel,
  saveDisabled,
}: {
  saveLabel: string;
  cancelLabel: string;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <RenterBookingMobileActionBar
      primaryLabel={saveLabel}
      onPrimary={onSave}
      primaryDisabled={saveDisabled}
      secondaryLabel={cancelLabel}
      onSecondary={onCancel}
    />
  );
}
