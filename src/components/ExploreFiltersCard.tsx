import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Ship, Ruler, Users, Tag, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { filterCidadesLitoralRJSugestoes } from "@/data/praiasBrasil";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EXPLORE_MAIN_FILTER_KEYS,
  type ExploreMainFilter,
  type SizeFilterKey,
  type SeatsFilterKey,
  type PriceFilterKey,
} from "@/lib/exploreFilters";

const FILTER_ICONS: Record<(typeof EXPLORE_MAIN_FILTER_KEYS)[number], LucideIcon> = {
  type: Ship,
  size: Ruler,
  seats: Users,
  price: Tag,
  included: Package,
};

type ExploreFiltersCardProps = {
  busca: string;
  onBuscaChange: (v: string) => void;
  mainFilter: ExploreMainFilter;
  onMainFilterChange: (v: ExploreMainFilter) => void;
  tipoFiltro: string;
  onTipoFiltroChange: (v: string) => void;
  tamFiltro: SizeFilterKey;
  onTamFiltroChange: (v: SizeFilterKey) => void;
  vagasFiltro: SeatsFilterKey;
  onVagasFiltroChange: (v: SeatsFilterKey) => void;
  precoFiltro: PriceFilterKey;
  onPrecoFiltroChange: (v: PriceFilterKey) => void;
  /** Itens inclusos seleccionados (AND); vazio = qualquer barco neste critério */
  amenitySelected: string[];
  onToggleAmenity: (name: string) => void;
  amenityNames: string[];
  tiposDisponiveis: string[];
  labelTipo: (tipo: string) => string;
  /** Primeiro nível de scroll: mais enxuto. */
  compact?: boolean;
  /** Segundo nível (scroll longo): barra mínima. */
  micro?: boolean;
  className?: string;
};

export function ExploreFiltersCard({
  busca,
  onBuscaChange,
  mainFilter,
  onMainFilterChange,
  tipoFiltro,
  onTipoFiltroChange,
  tamFiltro,
  onTamFiltroChange,
  vagasFiltro,
  onVagasFiltroChange,
  precoFiltro,
  onPrecoFiltroChange,
  amenitySelected,
  onToggleAmenity,
  amenityNames,
  tiposDisponiveis,
  labelTipo,
  compact = false,
  micro = false,
  className,
}: ExploreFiltersCardProps) {
  const { t } = useTranslation();
  const density = micro ? 2 : compact ? 1 : 0;
  const sugListId = useId();
  const [locFocused, setLocFocused] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterCidadesLitoralRJSugestoes(busca, 12), [busca]);
  const showSug = locFocused && busca.trim().length >= 2 && suggestions.length > 0;

  useEffect(() => {
    setHi(-1);
  }, [busca]);

  useEffect(() => {
    if (!showSug) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setLocFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSug]);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md border border-border bg-card/95 backdrop-blur-md transition-[padding,box-shadow,border-radius] duration-300 ease-out",
        density === 0 && "rounded-xl shadow-sm",
        density === 1 && "rounded-lg shadow-sm",
        density === 2 && "rounded-md border-border/70 shadow-none",
        className
      )}
    >
      <div
        className={cn(
          density === 0 && "space-y-2 p-2",
          density === 1 && "space-y-1.5 p-1.5",
          density === 2 && "space-y-1 p-1"
        )}
      >
        <div ref={wrapRef} className="relative">
          <div
            className={cn(
              "flex items-center rounded-full border border-input bg-background",
              density === 0 && "gap-1.5 px-2.5 py-1.5",
              density === 1 && "gap-1 px-2 py-1",
              density === 2 && "h-7 min-h-7 gap-1 px-1.5 py-0"
            )}
          >
            <MapPin
              className={cn(
                "shrink-0 text-primary",
                density === 0 ? "h-5 w-5" : density === 1 ? "h-4 w-4" : "h-3.5 w-3.5"
              )}
              aria-hidden
            />
            <input
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              onFocus={() => setLocFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setLocFocused(false), 180);
              }}
              onKeyDown={(e) => {
                if (!showSug) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHi((i) => Math.min(suggestions.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHi((i) => Math.max(-1, i - 1));
                } else if (e.key === "Enter" && hi >= 0 && suggestions[hi]) {
                  e.preventDefault();
                  onBuscaChange(suggestions[hi]);
                  setLocFocused(false);
                } else if (e.key === "Escape") {
                  setLocFocused(false);
                }
              }}
              placeholder={t("explorar.searchLocationPlaceholder")}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
                density === 0 && "text-xs",
                density >= 1 && "text-[11px] leading-snug"
              )}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSug}
              aria-controls={sugListId}
              aria-autocomplete="list"
              aria-label={t("explorar.searchLocationAria")}
            />
          </div>
          {showSug && (
            <ul
              id={sugListId}
              role="listbox"
              aria-label={t("explorar.searchSuggestionsListLabel")}
              className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 max-h-48 overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
            >
              {suggestions.map((s, idx) => (
                <li key={s} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === hi}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-foreground transition-colors",
                      idx === hi ? "bg-muted" : "hover:bg-muted/70"
                    )}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onMouseEnter={() => setHi(idx)}
                    onClick={() => {
                      onBuscaChange(s);
                      setLocFocused(false);
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn("border-t border-border", density === 0 && "pt-1.5", density === 1 && "pt-1", density === 2 && "pt-1")}>
          <p
            className={cn(
              "text-center font-medium uppercase tracking-wide text-muted-foreground",
              density === 0 && "mb-1.5 text-[9px]",
              density === 1 && "mb-1 text-[8px]",
              density === 2 && "sr-only"
            )}
          >
            {t("explorar.filtersHeading")}
          </p>
          <div
            className={cn(
              density === 2
                ? "flex flex-nowrap gap-0 overflow-x-auto overscroll-x-contain py-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x touch-pan-y lg:flex-wrap lg:justify-center lg:overflow-visible"
                : "grid max-lg:grid-cols-5 gap-0.5 lg:flex lg:flex-wrap lg:justify-center lg:gap-1"
            )}
          >
            {EXPLORE_MAIN_FILTER_KEYS.map((key) => {
              const Icon = FILTER_ICONS[key];
              const isActive = mainFilter === key;
              const label = t(`explorar.filters.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => onMainFilterChange(isActive ? "all" : key)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md transition-all duration-200",
                    density === 2
                      ? "min-w-[2.35rem] shrink-0 px-0.5 py-0.5"
                      : "gap-0.5 lg:flex-1 lg:max-w-[140px] lg:flex-row lg:justify-center lg:gap-1.5",
                    density === 0 && "px-0.5 py-1 lg:px-2",
                    density === 1 && "px-0.5 py-0.5 lg:px-1.5",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0",
                      density === 0 ? "h-5 w-5" : density === 1 ? "h-4 w-4" : "h-3.5 w-3.5"
                    )}
                  />
                  <span
                    className={cn(
                      "leading-none text-center",
                      density === 0 && "text-[9px]",
                      density === 1 && "text-[8px]",
                      density === 2 && "text-[7px] max-w-[2.35rem] truncate",
                      isActive ? "font-bold" : "font-medium"
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {mainFilter !== "all" && (
          <div className={cn("border-t border-border", density === 0 && "pt-1.5", density >= 1 && "pt-1")}>
            {mainFilter === "type" && (
              <Select value={tipoFiltro} onValueChange={onTipoFiltroChange}>
                <SelectTrigger
                  className={cn(
                    "w-full bg-background",
                    density >= 1 && "h-8 text-xs",
                    density === 2 && "h-7 min-h-7 text-[11px]"
                  )}
                >
                  <SelectValue placeholder={t("explorar.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {tiposDisponiveis.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {labelTipo(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mainFilter === "size" && (
              <Select value={tamFiltro} onValueChange={(v) => onTamFiltroChange(v as SizeFilterKey)}>
                <SelectTrigger
                  className={cn(
                    "w-full bg-background",
                    density >= 1 && "h-8 text-xs",
                    density === 2 && "h-7 min-h-7 text-[11px]"
                  )}
                >
                  <SelectValue placeholder={t("explorar.selectSize")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="upTo25">{t("explorar.size.upTo25")}</SelectItem>
                  <SelectItem value="26to30">{t("explorar.size.26to30")}</SelectItem>
                  <SelectItem value="31plus">{t("explorar.size.31plus")}</SelectItem>
                </SelectContent>
              </Select>
            )}

            {mainFilter === "seats" && (
              <Select value={vagasFiltro} onValueChange={(v) => onVagasFiltroChange(v as SeatsFilterKey)}>
                <SelectTrigger
                  className={cn(
                    "w-full bg-background",
                    density >= 1 && "h-8 text-xs",
                    density === 2 && "h-7 min-h-7 text-[11px]"
                  )}
                >
                  <SelectValue placeholder={t("explorar.selectSeats")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="upTo6">{t("explorar.seats.upTo6")}</SelectItem>
                  <SelectItem value="7to10">{t("explorar.seats.7to10")}</SelectItem>
                  <SelectItem value="11to16">{t("explorar.seats.11to16")}</SelectItem>
                  <SelectItem value="17plus">{t("explorar.seats.17plus")}</SelectItem>
                </SelectContent>
              </Select>
            )}

            {mainFilter === "price" && (
              <Select value={precoFiltro} onValueChange={(v) => onPrecoFiltroChange(v as PriceFilterKey)}>
                <SelectTrigger
                  className={cn(
                    "w-full bg-background",
                    density >= 1 && "h-8 text-xs",
                    density === 2 && "h-7 min-h-7 text-[11px]"
                  )}
                >
                  <SelectValue placeholder={t("explorar.selectPrice")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="upTo2000">{t("explorar.price.upTo2000")}</SelectItem>
                  <SelectItem value="2001to3000">{t("explorar.price.2001to3000")}</SelectItem>
                  <SelectItem value="3001to4500">{t("explorar.price.3001to4500")}</SelectItem>
                  <SelectItem value="4501plus">{t("explorar.price.4501plus")}</SelectItem>
                </SelectContent>
              </Select>
            )}

            {mainFilter === "included" && (
              <div className={cn("space-y-2", density === 2 && "space-y-1")}>
                <p
                  className={cn(
                    "text-muted-foreground leading-snug",
                    density === 0 && "text-[11px]",
                    density >= 1 && "text-[10px]"
                  )}
                >
                  {t("explorar.includedCheckboxHint")}
                </p>
                {amenityNames.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2 rounded-md border border-dashed border-border">
                    {t("explorar.noAmenitiesCatalog")}
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
                    {amenityNames.map((name) => (
                      <label
                        key={name}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                      >
                        <Checkbox
                          checked={amenitySelected.includes(name)}
                          onCheckedChange={() => onToggleAmenity(name)}
                          className="shrink-0"
                        />
                        <span className="text-sm text-foreground select-none">{name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

