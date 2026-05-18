import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MapPin, Ship, Ruler, Users, Tag, Package, Gift, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { addMonths, format, parseISO, startOfDay, isBefore, subMonths } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EXPLORE_MAIN_FILTER_KEYS,
  type ExploreMainFilter,
  type SizeFilterKey,
  type SeatsFilterKey,
  type PriceFilterKey,
} from "@/lib/exploreFilters";
import { TRIP_OPTIONAL_FILTER_KEYS, type TripOptionalFilterKey } from "@/lib/trip-optionals";
import { FilterChipScrollMat } from "@/components/FilterChipScrollMat";
import useEmblaCarousel from "embla-carousel-react";

function subscribeDateDialogSmUp(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getDateDialogSmUp() {
  return window.matchMedia("(min-width: 640px)").matches;
}

function useDateDialogTwoMonthLayout() {
  return useSyncExternalStore(subscribeDateDialogSmUp, getDateDialogSmUp, () => false);
}

const exploreDayPickerIcons = {
  IconLeft: ({ className, ...props }: ComponentProps<typeof ChevronLeft>) => (
    <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
  ),
  IconRight: ({ className, ...props }: ComponentProps<typeof ChevronRight>) => (
    <ChevronRight className={cn("h-4 w-4", className)} {...props} />
  ),
};

function exploreLocale(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

/** ISO `yyyy-MM-dd` únicos e ordenados. */
function normalizeExploreDateIsoList(dates: string[]): string[] {
  return [...new Set(dates.map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort((a, b) =>
    a.localeCompare(b)
  );
}

const FILTER_ICONS: Record<(typeof EXPLORE_MAIN_FILTER_KEYS)[number], LucideIcon> = {
  type: Ship,
  size: Ruler,
  seats: Users,
  price: Tag,
  included: Package,
  optionals: Gift,
};

function TripOptionalsFilterScroll({
  tripOptionalSelected,
  onToggleTripOptional,
  density,
  t,
}: {
  tripOptionalSelected: TripOptionalFilterKey[];
  onToggleTripOptional: (key: TripOptionalFilterKey) => void;
  density: 0 | 1 | 2;
  t: TFunction;
}) {
  const labels: Record<TripOptionalFilterKey, string> = {
    bbq: t("optionals.bbqShort"),
    jetSki: t("optionals.jetSkiShort"),
    floatingMat: t("optionals.floatingMatShort"),
    custom: t("optionals.customFilterShort"),
  };

  return (
    <FilterChipScrollMat layoutKey={tripOptionalSelected.join("\0")}>
      <div className="flex flex-wrap content-start gap-1.5">
      {TRIP_OPTIONAL_FILTER_KEYS.map((key) => {
        const checked = tripOptionalSelected.includes(key);
        return (
          <label
            key={key}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/55 bg-muted/25 transition-colors hover:bg-muted/45 dark:bg-muted/15 dark:hover:bg-muted/35",
              density === 2 ? "px-2 py-0.5" : "px-2 py-0.5 sm:px-2.5 sm:py-1",
              checked && "border-primary/45 bg-primary/10 ring-1 ring-primary/15 dark:bg-primary/15"
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggleTripOptional(key)} className="shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap select-none text-foreground",
                density === 2 ? "text-[11px] leading-tight" : "text-xs sm:text-sm"
              )}
            >
              {labels[key]}
            </span>
          </label>
        );
      })}
      </div>
    </FilterChipScrollMat>
  );
}

function IncludedAmenitiesScroll({
  amenityNames,
  amenitySelected,
  onToggleAmenity,
  density,
}: {
  amenityNames: string[];
  amenitySelected: string[];
  onToggleAmenity: (name: string) => void;
  density: 0 | 1 | 2;
}) {
  return (
    <FilterChipScrollMat layoutKey={`${amenityNames.length}:${amenitySelected.join("\0")}`}>
      <div className="flex flex-wrap content-start gap-1.5">
        {amenityNames.map((name) => {
          const checked = amenitySelected.includes(name);
          return (
            <label
              key={name}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/55 bg-muted/25 transition-colors hover:bg-muted/45 dark:bg-muted/15 dark:hover:bg-muted/35",
                density === 2 ? "px-2 py-0.5" : "px-2 py-0.5 sm:px-2.5 sm:py-1",
                checked && "border-primary/45 bg-primary/10 ring-1 ring-primary/15 dark:bg-primary/15"
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggleAmenity(name)} className="shrink-0" />
              <span
                className={cn(
                  "whitespace-nowrap select-none text-foreground",
                  density === 2 ? "text-[11px] leading-tight" : "text-xs sm:text-sm"
                )}
              >
                {name}
              </span>
            </label>
          );
        })}
      </div>
    </FilterChipScrollMat>
  );
}

type FilterExpandFieldsProps = {
  density: 0 | 1 | 2;
  mainFilter: ExploreMainFilter;
  tipoFiltro: string;
  onTipoFiltroChange: (v: string) => void;
  tamFiltro: SizeFilterKey;
  onTamFiltroChange: (v: SizeFilterKey) => void;
  vagasFiltro: SeatsFilterKey;
  onVagasFiltroChange: (v: SeatsFilterKey) => void;
  precoFiltro: PriceFilterKey;
  onPrecoFiltroChange: (v: PriceFilterKey) => void;
  amenitySelected: string[];
  onToggleAmenity: (name: string) => void;
  amenityNames: string[];
  tripOptionalSelected: TripOptionalFilterKey[];
  onToggleTripOptional: (key: TripOptionalFilterKey) => void;
  tiposDisponiveis: string[];
  labelTipo: (tipo: string) => string;
  t: TFunction;
};

function renderFilterExpandContent(p: FilterExpandFieldsProps): ReactNode {
  const { density, mainFilter } = p;
  if (mainFilter === "all") return null;
  const {
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
    tripOptionalSelected,
    onToggleTripOptional,
    tiposDisponiveis,
    labelTipo,
    t,
  } = p;
  return (
    <div className="min-w-0">
      {mainFilter === "type" && (
        <Select value={tipoFiltro} onValueChange={onTipoFiltroChange}>
          <SelectTrigger
            className={cn("w-full bg-transparent", density >= 1 && "h-8 text-xs", density === 2 && "h-7 min-h-7 text-[11px]")}
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
            className={cn("w-full bg-transparent", density >= 1 && "h-8 text-xs", density === 2 && "h-7 min-h-7 text-[11px]")}
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
            className={cn("w-full bg-transparent", density >= 1 && "h-8 text-xs", density === 2 && "h-7 min-h-7 text-[11px]")}
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
            className={cn("w-full bg-transparent", density >= 1 && "h-8 text-xs", density === 2 && "h-7 min-h-7 text-[11px]")}
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
        <div className={cn(density === 2 ? "space-y-1" : "space-y-0")}>
          {amenityNames.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2 rounded-md border border-dashed border-border">
              {t("explorar.noAmenitiesCatalog")}
            </p>
          ) : (
            <IncludedAmenitiesScroll
              amenityNames={amenityNames}
              amenitySelected={amenitySelected}
              onToggleAmenity={onToggleAmenity}
              density={density}
            />
          )}
        </div>
      )}

      {mainFilter === "optionals" && (
        <TripOptionalsFilterScroll
          tripOptionalSelected={tripOptionalSelected}
          onToggleTripOptional={onToggleTripOptional}
          density={density}
          t={t}
        />
      )}
    </div>
  );
}

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
  amenitySelected: string[];
  onToggleAmenity: (name: string) => void;
  amenityNames: string[];
  tripOptionalSelected: TripOptionalFilterKey[];
  onToggleTripOptional: (key: TripOptionalFilterKey) => void;
  tiposDisponiveis: string[];
  labelTipo: (tipo: string) => string;
  compact?: boolean;
  micro?: boolean;
  className?: string;
  /** Dias (ISO) em que a embarcação deve estar livre em todos (intersecção). Vazio = sem filtro por data. */
  exploreDates?: string[];
  onExploreDatesChange?: (isos: string[]) => void;
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
  tripOptionalSelected,
  onToggleTripOptional,
  tiposDisponiveis,
  labelTipo,
  compact = false,
  micro = false,
  className,
  exploreDates = [],
  onExploreDatesChange,
}: ExploreFiltersCardProps) {
  const { t, i18n } = useTranslation();
  const density = micro ? 2 : compact ? 1 : 0;
  const sugListId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [locFocused, setLocFocused] = useState(false);
  const [hi, setHi] = useState(-1);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [draftMulti, setDraftMulti] = useState<Date[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterCidadesLitoralRJSugestoes(busca, 12), [busca]);
  const showSug = locFocused && busca.trim().length >= 2 && suggestions.length > 0;
  const hasExploreCalendar = typeof onExploreDatesChange === "function";
  const exploreLoc = exploreLocale(i18n.language);
  const dateDialogTwoMonths = useDateDialogTwoMonthLayout();
  const [exploreMonth, setExploreMonth] = useState(() => new Date());
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    duration: 22,
    startIndex: 1,
  });
  const [carouselSnap, setCarouselSnap] = useState(1);
  const carouselSettlingRef = useRef(false);
  const filterChipsRowRef = useRef<HTMLDivElement>(null);
  const exploreDatesNorm = useMemo(() => normalizeExploreDateIsoList(exploreDates), [exploreDates]);
  /**
   * Três slides; ordem no DOM [próximo, atual, anterior] — `scrollNext` ↔ mês anterior (índice 2).
   * Mobile: 1 mês por slide, passo ±1. Desktop (sm+): 2 meses por slide, passo ±2.
   */
  const monthCarouselSlides = useMemo(() => {
    if (dateDialogTwoMonths) {
      return [addMonths(exploreMonth, 2), exploreMonth, subMonths(exploreMonth, 2)] as const;
    }
    return [addMonths(exploreMonth, 1), exploreMonth, subMonths(exploreMonth, 1)] as const;
  }, [exploreMonth, dateDialogTwoMonths]);
  const carouselLabelMonth = monthCarouselSlides[carouselSnap] ?? exploreMonth;
  const carouselMonthRangeLabel = useMemo(() => {
    const a = carouselLabelMonth;
    if (!dateDialogTwoMonths) {
      return format(a, "LLLL yyyy", { locale: exploreLoc });
    }
    const b = addMonths(a, 1);
    return `${format(a, "LLLL", { locale: exploreLoc })} – ${format(b, "LLLL yyyy", { locale: exploreLoc })}`;
  }, [carouselLabelMonth, exploreLoc, dateDialogTwoMonths]);
  const exploreDisablePastMatcher: Matcher = useMemo(
    () => (d) => isBefore(startOfDay(d), startOfDay(new Date())),
    []
  );

  const handleDateDialogOpenChange = (open: boolean) => {
    if (open) {
      setDraftMulti(exploreDatesNorm.map((d) => parseISO(`${d}T12:00:00`)));
    }
    setDateDialogOpen(open);
  };

  const applyDateFilter = () => {
    const isos = normalizeExploreDateIsoList(draftMulti.map((d) => format(d, "yyyy-MM-dd")));
    onExploreDatesChange?.(isos);
    setDateDialogOpen(false);
  };

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

  useEffect(() => {
    const first = exploreDatesNorm[0];
    if (first) setExploreMonth(parseISO(`${first}T12:00:00`));
  }, [exploreDatesNorm]);

  useEffect(() => {
    if (!emblaApi || !dateDialogOpen) return;
    carouselSettlingRef.current = true;
    const r0 = requestAnimationFrame(() => {
      emblaApi.reInit();
      emblaApi.scrollTo(1, false);
      setCarouselSnap(1);
      requestAnimationFrame(() => {
        carouselSettlingRef.current = false;
      });
    });
    return () => cancelAnimationFrame(r0);
  }, [dateDialogOpen, emblaApi, dateDialogTwoMonths]);

  useEffect(() => {
    if (!emblaApi) return;
    const step = dateDialogTwoMonths ? 2 : 1;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setCarouselSnap(i);
      if (carouselSettlingRef.current) return;
      if (i === 0) {
        carouselSettlingRef.current = true;
        setExploreMonth((prev) => addMonths(prev, step));
        requestAnimationFrame(() => {
          emblaApi.reInit();
          emblaApi.scrollTo(1, false);
          setCarouselSnap(1);
          requestAnimationFrame(() => {
            carouselSettlingRef.current = false;
          });
        });
      } else if (i === 2) {
        carouselSettlingRef.current = true;
        setExploreMonth((prev) => subMonths(prev, step));
        requestAnimationFrame(() => {
          emblaApi.reInit();
          emblaApi.scrollTo(1, false);
          setCarouselSnap(1);
          requestAnimationFrame(() => {
            carouselSettlingRef.current = false;
          });
        });
      }
    };
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, dateDialogTwoMonths]);

  useLayoutEffect(() => {
    const row = filterChipsRowRef.current;
    if (!row) return;
    const active = row.querySelector<HTMLElement>("[data-explore-filter-active='true']");
    if (!active) return;
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [mainFilter]);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[min(100%,20rem)] border-0 bg-muted/95 backdrop-blur-md transition-[padding,box-shadow,border-radius] duration-300 ease-out dark:bg-card/95",
        density === 0 && "rounded-xl shadow-elevated dark:shadow-card",
        density === 1 && "rounded-lg shadow-card",
        density === 2 && "rounded-md shadow-none",
        className
      )}
    >
      <div
        className={cn(
          density === 0 && "space-y-0.5 px-1 py-0.5 sm:space-y-1 sm:px-1.5 sm:py-1",
          density === 1 && "space-y-1.5 p-1.5",
          density === 2 && "space-y-1 p-1"
        )}
      >
        <div
          className={cn(
            "flex flex-col",
            density === 0 && "mx-auto w-full max-w-[16rem] gap-1 min-[380px]:max-w-[17rem] sm:max-w-[17.75rem]",
            density === 1 && "gap-1.5",
            density === 2 && "gap-1"
          )}
        >
        <div ref={wrapRef} className="relative">
          <div
            className={cn(
              "flex items-center rounded-full border border-input bg-background",
              density === 0 && "h-6 min-h-6 w-full gap-0.5 px-1.5 py-0 sm:px-2",
              density === 1 && "gap-1 px-2 py-1",
              density === 2 && "h-7 min-h-7 gap-1 px-1.5 py-0"
            )}
          >
            <MapPin
              className={cn(
                "shrink-0 text-primary",
                density === 0 ? "h-3.5 w-3.5" : density === 1 ? "h-4 w-4" : "h-3.5 w-3.5"
              )}
              aria-hidden
            />
            <input
              ref={inputRef}
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
                density === 0 && "h-full py-0 text-[10px] leading-tight sm:text-[11px]",
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

        <div className={cn("border-t border-border", density === 0 && "pt-1", density === 1 && "pt-1", density === 2 && "pt-1")}>
          <p
            className={cn(
              "text-center font-medium uppercase tracking-wide text-muted-foreground",
              density === 0 && "mb-1 text-[9px]",
              density === 1 && "mb-1 text-[8px]",
              density === 2 && "sr-only"
            )}
          >
            {t("explorar.filtersHeading")}
          </p>
          <div
            ref={filterChipsRowRef}
            className="flex w-full max-w-full flex-nowrap justify-start gap-px overflow-x-auto overscroll-x-contain scroll-smooth py-0.5 [-webkit-tap-highlight-color:transparent] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x touch-pan-y"
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
                  aria-pressed={isActive}
                  data-explore-filter-active={isActive ? "true" : undefined}
                  onClick={() => onMainFilterChange(isActive ? "all" : key)}
                  className={cn(
                    "flex shrink-0 flex-col items-center justify-center rounded-md bg-transparent motion-safe:transition-[transform,background-color,color,box-shadow,opacity] motion-safe:duration-300 motion-safe:ease-out",
                    density === 2
                      ? "min-w-[2.35rem] px-0.5 py-0.5"
                      : "gap-0.5",
                    density === 0 && "min-w-[2.8125rem] px-px py-0.5 sm:min-w-[3rem]",
                    density === 1 && "min-w-[3rem] px-0.5 py-0.5",
                    isActive
                      ? "scale-[1.02] bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0",
                      density === 0 ? "h-4 w-4" : density === 1 ? "h-4 w-4" : "h-3.5 w-3.5"
                    )}
                  />
                  <span
                    className={cn(
                      "leading-none text-center",
                      density === 0 && "text-[8px]",
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
            {hasExploreCalendar && density === 0 ? (
              <button
                type="button"
                title={t("explorar.dateFilterDialogTrigger")}
                aria-label={t("explorar.dateFilterDialogTrigger")}
                aria-haspopup="dialog"
                aria-expanded={dateDialogOpen}
                aria-pressed={exploreDatesNorm.length > 0}
                onClick={() => handleDateDialogOpenChange(true)}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-transparent px-px py-0.5 motion-safe:transition-[transform,background-color,color,box-shadow] motion-safe:duration-300 motion-safe:ease-out sm:min-w-[3.25rem]",
                  "min-w-[2.8125rem]",
                  exploreDatesNorm.length > 0
                    ? "scale-[1.02] bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
                )}
              >
                <CalendarDays
                  className={cn("shrink-0", density === 0 ? "h-4 w-4" : "h-4 w-4")}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-[3rem] truncate text-center leading-none text-[8px] sm:max-w-[3.5rem] sm:text-[9px]",
                    exploreDatesNorm.length > 0 ? "font-bold" : "font-medium"
                  )}
                >
                  {t("explorar.filters.date")}
                </span>
              </button>
            ) : null}
            {hasExploreCalendar && density >= 1 ? (
              <button
                type="button"
                title={t("explorar.dateFilterDialogTrigger")}
                aria-label={t("explorar.dateFilterDialogTrigger")}
                aria-haspopup="dialog"
                aria-expanded={dateDialogOpen}
                aria-pressed={exploreDatesNorm.length > 0}
                onClick={() => handleDateDialogOpenChange(true)}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center rounded-md bg-transparent motion-safe:transition-[transform,background-color,color,box-shadow] motion-safe:duration-300 motion-safe:ease-out",
                  density === 2 ? "min-w-[2.35rem] px-0.5 py-0.5" : "min-w-[3.25rem] gap-0.5 px-0.5 py-0.5",
                  exploreDatesNorm.length > 0
                    ? "scale-[1.02] bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
                )}
              >
                <CalendarDays className={cn("shrink-0", density === 1 ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
                <span
                  className={cn(
                    "max-w-[2.35rem] truncate text-center leading-none",
                    density === 1 ? "text-[8px]" : "text-[7px]",
                    exploreDatesNorm.length > 0 ? "font-bold" : "font-medium"
                  )}
                >
                  {t("explorar.filters.date")}
                </span>
              </button>
            ) : null}
          </div>
        </div>
        </div>

        {mainFilter !== "all" && (
          <div
            key={mainFilter}
            className={cn(
              "border-t border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none",
              density === 0 && "pt-1",
              density >= 1 && "pt-1"
            )}
          >
            {renderFilterExpandContent({
              density,
              mainFilter,
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
              tripOptionalSelected,
              onToggleTripOptional,
              tiposDisponiveis,
              labelTipo,
              t,
            })}
          </div>
        )}

        {hasExploreCalendar ? (
          <Dialog open={dateDialogOpen} onOpenChange={handleDateDialogOpenChange}>
            <DialogContent
              aria-describedby={undefined}
              className={cn(
                "!flex max-h-[min(calc(100dvh-1rem),100svh)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] !translate-x-[-50%] !translate-y-[-50%] flex-col !gap-0 overflow-hidden rounded-2xl border-0 bg-background !p-0 shadow-2xl sm:max-h-[min(88dvh,820px)] sm:max-w-[min(96vw,720px)]"
              )}
            >
              <div className="shrink-0 border-b border-border/60 bg-gradient-to-br from-primary/[0.14] via-background to-muted/40 px-4 py-2.5 dark:from-primary/[0.12] dark:via-card dark:to-card sm:px-6 sm:py-3">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {t("explorar.dateFilterDialogTitle")}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-2 sm:px-5 sm:py-3">
                <div
                  className="flex shrink-0 items-center justify-center gap-1.5 pb-2 sm:gap-2 sm:pb-2.5"
                  aria-live="polite"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full border-border sm:h-9 sm:w-9"
                    onClick={() => emblaApi?.scrollNext()}
                    aria-label={t("explorar.dateCarouselPrevMonth")}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold capitalize leading-tight text-foreground sm:text-sm sm:leading-snug md:text-base">
                    {carouselMonthRangeLabel}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full border-border sm:h-9 sm:w-9"
                    onClick={() => emblaApi?.scrollPrev()}
                    aria-label={t("explorar.dateCarouselNextMonth")}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div
                  className="overflow-hidden pt-0.5 [-webkit-tap-highlight-color:transparent] sm:pt-1"
                  ref={emblaRef}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label={t("explorar.dateFilterHeading")}
                >
                  <div className="flex touch-pan-y">
                    {monthCarouselSlides.map((slideMonth) => (
                      <div
                        className="flex min-w-0 shrink-0 grow-0 basis-full justify-center px-0.5 sm:px-0.5"
                        key={`${format(slideMonth, "yyyy-MM")}-${dateDialogTwoMonths ? "2" : "1"}`}
                      >
                        <DayPicker
                          mode="multiple"
                          numberOfMonths={dateDialogTwoMonths ? 2 : 1}
                          locale={exploreLoc}
                          month={slideMonth}
                          selected={draftMulti}
                          onSelect={(dates) => setDraftMulti(dates ?? [])}
                          disabled={exploreDisablePastMatcher}
                          components={exploreDayPickerIcons}
                          className={cn(
                            "rdp-dialog-compact mx-auto w-auto min-w-0 max-w-full rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent max-sm:rounded-xl",
                            dateDialogTwoMonths && "rdp-dialog-two-months"
                          )}
                          classNames={{
                            months: dateDialogTwoMonths
                              ? "rdp-months !m-0 flex w-full max-w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-nowrap sm:items-start sm:gap-4 md:gap-5"
                              : "rdp-months !m-0 flex w-full flex-col items-center gap-0",
                            month: "rdp-month !m-0 flex shrink-0 flex-col items-center gap-0.5 sm:gap-1",
                            caption: "hidden",
                            caption_label: "hidden",
                            nav: "hidden",
                            table: "rdp-table border-collapse",
                            head_row: "rdp-head_row",
                            head_cell: "rdp-head_cell p-0 align-middle",
                            row: "rdp-row",
                            cell: "rdp-cell p-0 align-middle",
                            day: "rdp-day font-medium transition-colors hover:bg-accent/80 aria-selected:opacity-100",
                            day_selected:
                              "!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary",
                            day_today: "font-semibold ring-1 ring-primary/45 ring-offset-1 ring-offset-background",
                            day_outside: "text-muted-foreground opacity-45",
                            day_disabled: "text-muted-foreground opacity-35 line-through",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-0 border-t border-border/60 bg-muted/25 px-3 py-2.5 dark:bg-card/60 sm:justify-center sm:px-6 sm:py-3">
                <Button type="button" className="w-full min-[400px]:w-auto sm:min-w-[8rem]" onClick={() => void applyDateFilter()}>
                  {t("explorar.dateFilterDialogApply")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
