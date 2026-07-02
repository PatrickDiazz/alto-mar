import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  containerClassName?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, visible: visibleProp, onVisibleChange, ...props }, ref) => {
    const { t } = useTranslation();
    const [internalVisible, setInternalVisible] = React.useState(false);
    const visible = visibleProp ?? internalVisible;
    const setVisible = onVisibleChange ?? setInternalVisible;

    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
