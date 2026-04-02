import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Ship, Ruler, Users, Tag, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { filterPraiasSugestoes } from "@/data/praiasBrasil";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const JETSKY_TYPE = "Jetsky";

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
  amenityFiltro: string;
  onAmenityFiltroChange: (v: string) => void;
  amenityNames: string[];
  tiposDisponiveis: string[];
  labelTipo: (tipo: string) => string;
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
  amenityFiltro,
  onAmenityFiltroChange,
  amenityNames,
  tiposDisponiveis,
  labelTipo,
}: ExploreFiltersCardProps) {
  const { t } = useTranslation();
  const sugListId = useId();
  const [locFocused, setLocFocused] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterPraiasSugestoes(busca, 12), [busca]);
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
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card shadow-card">
      <div className="p-3 space-y-3">
        <div ref={wrapRef} className="relative">
          <div className="flex items-center gap-2 rounded-full border border-input bg-background px-3 py-2.5 shadow-sm">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
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
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("explorar.filtersHeading")}
          </p>
          <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
            {EXPLORE_MAIN_FILTER_KEYS.map((key) => {
              const Icon = FILTER_ICONS[key];
              const isActive = mainFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onMainFilterChange(isActive ? "all" : key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition-all duration-200 sm:px-2",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>
                    {t(`explorar.filters.${key}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {mainFilter !== "all" && (
          <div className="border-t border-border pt-3">
            {mainFilter === "type" && (
              <Select value={tipoFiltro} onValueChange={onTipoFiltroChange}>
                <SelectTrigger className="w-full bg-background">
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
                <SelectTrigger className="w-full bg-background">
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
                <SelectTrigger className="w-full bg-background">
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
                <SelectTrigger className="w-full bg-background">
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
              <Select value={amenityFiltro} onValueChange={onAmenityFiltroChange}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t("explorar.selectIncluded")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {amenityNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { JETSKY_TYPE };
