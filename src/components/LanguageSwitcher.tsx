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
};

export function LanguageSwitcher({ className, id = "alto-mar-lang" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const code = (i18n.language || "pt").split("-")[0];
  const value = code === "en" || code === "es" ? code : "pt";
  const short = value.toUpperCase();

  return (
    <Select value={value} onValueChange={(v) => void i18n.changeLanguage(v)}>
      <SelectTrigger
        id={id}
        aria-label={t("lang.label")}
        className={cn(
          "h-8 w-auto min-w-[3.75rem] max-w-[4.5rem] shrink-0 gap-1 px-2 py-0 text-xs",
          className,
        )}
      >
        <span className="flex flex-1 items-center justify-center gap-1 min-w-0">
          <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <SelectValue>
            <span className="font-semibold tabular-nums leading-none">{short}</span>
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
