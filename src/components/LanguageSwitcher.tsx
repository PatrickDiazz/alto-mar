import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LANGS = [
  { code: "pt", labelKey: "lang.pt" as const },
  { code: "en", labelKey: "lang.en" as const },
  { code: "es", labelKey: "lang.es" as const },
] as const;

type LanguageSwitcherProps = {
  className?: string;
  id?: string;
  /** Gatilho só com ícone (sem código PT/EN no botão); o rótulo fica fora, ex. no menu lateral */
  iconOnlyTrigger?: boolean;
};

export function LanguageSwitcher({
  className,
  id = "alto-mar-lang",
  iconOnlyTrigger = false,
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const code = (i18n.language || "pt").split("-")[0];
  const value = code === "en" || code === "es" ? code : "pt";
  const short = value.toUpperCase();
  const currentLangLabel = value === "en" ? t("lang.en") : value === "es" ? t("lang.es") : t("lang.pt");

  return (
    <Select value={value} onValueChange={(v) => void i18n.changeLanguage(v)}>
      <SelectTrigger
        id={id}
        aria-label={t("lang.label")}
        className={cn(
          iconOnlyTrigger
            ? "h-9 w-9 shrink-0 gap-0 p-0 [&>span]:flex [&>span]:h-full [&>span]:w-full [&>span]:items-center [&>span]:justify-center"
            : "h-8 w-auto min-w-[3.75rem] max-w-[4.5rem] shrink-0 gap-1 px-2 py-0 text-xs",
          className,
        )}
      >
        <span className={cn("flex min-w-0 items-center justify-center", !iconOnlyTrigger && "flex-1 gap-1")}>
          <Languages
            className={cn("shrink-0 text-muted-foreground", iconOnlyTrigger ? "h-4 w-4" : "h-3.5 w-3.5")}
            aria-hidden
          />
          <SelectValue>
            {iconOnlyTrigger ? (
              <span className="sr-only">{currentLangLabel}</span>
            ) : (
              <span className="font-semibold tabular-nums leading-none">{short}</span>
            )}
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[10rem]">
        {LANGS.map(({ code: c, labelKey }) => {
          const label = t(labelKey);
          return (
            <SelectItem key={c} value={c} textValue={`${c.toUpperCase()} ${label}`}>
              <span className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                  {c.toUpperCase()}
                </span>
                <span className="truncate">{label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
