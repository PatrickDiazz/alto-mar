import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { format, parseISO } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown, Heart, LogOut, Search, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import BoatCard from "@/components/BoatCard";
import { ExploreFiltersCard } from "@/components/ExploreFiltersCard";
import { BOAT_VESSEL_TYPES, normalizeVesselTipo, vesselTypeLabel } from "@/lib/boatVesselTypes";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcosInfinite } from "@/hooks/useBarcosInfinite";
import { getStoredUser, clearSession, authFetch, apiUrl } from "@/lib/auth";
import i18n from "@/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoLight from "@/assets/logo-altomar-light.png";
import logoDark from "@/assets/logo-altomar-dark.png";
import {
  matchesExploreFilters,
  type ExploreMainFilter,
  type SizeFilterKey,
  type SeatsFilterKey,
  type PriceFilterKey,
} from "@/lib/exploreFilters";
import { TRIP_OPTIONAL_FILTER_KEYS, type TripOptionalFilterKey } from "@/lib/trip-optionals";
import { readResponseErrorMessage } from "@/lib/responseError";
import { fetchBoatsAvailableOn } from "@/lib/boatsAvailableOnApi";
import { cn } from "@/lib/utils";
import type { Boat } from "@/lib/types";

const STRIP_PAGE_DESKTOP = 5;

/** Distância circular entre índices no carrossel (centro modo). */
function exploreCircIndexDistance(a: number, b: number, len: number): number {
  if (len <= 1) return 0;
  const raw = Math.abs(a - b);
  return Math.min(raw, len - raw);
}

function subscribeMatchMd768(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMatchMd768() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function useIsMdUp() {
  return useSyncExternalStore(subscribeMatchMd768, getMatchMd768, () => false);
}

function explorePageDateLocale(lang: string) {
  if (lang.startsWith("en")) return enUS;
  if (lang.startsWith("es")) return es;
  return ptBR;
}

/** Ordem estável dos chips de pré-visualização (alinhada a `exploreFilterPreviewItems`). */
const EXPLORE_FILTER_PREVIEW_KEY_ORDER = ["q", "tipo", "tam", "vagas", "preco", "amen", "date1", "dates"] as const;

const EXPLORE_FILTER_PREVIEW_EXIT_MS = 200;

type ExploreFilterPreviewRow = { key: string; text: string; exiting: boolean };

function ExploreFilterPreviewChips({
  items,
  onExhausted,
}: {
  items: { key: string; text: string }[];
  onExhausted?: () => void;
}) {
  const [rows, setRows] = useState<ExploreFilterPreviewRow[]>(() => items.map((i) => ({ ...i, exiting: false })));

  useLayoutEffect(() => {
    const incomingByKey = new Map(items.map((i) => [i.key, i]));

    setRows((prev) => {
      const prevByKey = new Map(prev.map((r) => [r.key, r]));
      const ordered: ExploreFilterPreviewRow[] = [];

      for (const k of EXPLORE_FILTER_PREVIEW_KEY_ORDER) {
        const inc = incomingByKey.get(k);
        if (inc) {
          ordered.push({ key: inc.key, text: inc.text, exiting: false });
        } else {
          const p = prevByKey.get(k);
          if (p) {
            ordered.push({ ...p, exiting: true });
          }
        }
      }

      for (const it of items) {
        if (!ordered.some((o) => o.key === it.key)) {
          ordered.push({ key: it.key, text: it.text, exiting: false });
        }
      }

      return ordered;
    });
  }, [items]);

  useEffect(() => {
    if (!rows.some((r) => r.exiting)) return;
    const id = window.setTimeout(() => {
      setRows((prev) => prev.filter((r) => !r.exiting));
    }, EXPLORE_FILTER_PREVIEW_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [rows]);

  useEffect(() => {
    if (items.length > 0 || rows.length > 0) return;
    onExhausted?.();
  }, [items.length, rows.length, onExhausted]);

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-1">
      {rows.map((row) => (
        <span
          key={row.key}
          className={cn(
            "inline-flex max-w-full min-w-0 items-center rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-left text-xs font-medium text-foreground",
            row.exiting
              ? "pointer-events-none scale-95 opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none"
              : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none"
          )}
        >
          <span className="truncate">{row.text}</span>
        </span>
      ))}
    </div>
  );
}

function parseBoatPriceReais(b: Boat): number {
  return parseInt(b.preco.replace(/[^0-9]/g, ""), 10) || 0;
}

function parseBoatRating(b: Boat): number {
  const n = parseFloat(String(b.nota).replace(",", ".").trim());
  return Number.isNaN(n) ? 0 : n;
}

function ExploreSectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const wasInCentralBandRef = useRef(false);
  /** Uma só vez por montagem da página — só volta no reload. */
  const emphasisPlayedOnceRef = useRef(false);

  /** Dispara só na primeira vez; incremental mantém compatível com o efeito da animação. */
  const [emphasisPlay, setEmphasisPlay] = useState(0);
  const [emphasisActive, setEmphasisActive] = useState(false);

  useEffect(() => {
    if (emphasisPlay === 0) return;
    setEmphasisActive(false);
    let rInner = 0;
    const rOuter = window.requestAnimationFrame(() => {
      rInner = window.requestAnimationFrame(() => setEmphasisActive(true));
    });
    const id = window.setTimeout(() => setEmphasisActive(false), 1100);
    return () => {
      window.cancelAnimationFrame(rOuter);
      window.cancelAnimationFrame(rInner);
      window.clearTimeout(id);
    };
  }, [emphasisPlay]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    /** Reduz viewport à faixa média (~18% ao centro): dispara ao cruzar esse meio */
    const obs = new IntersectionObserver(
      ([entry]) => {
        const inBand = Boolean(entry?.isIntersecting);
        const prev = wasInCentralBandRef.current;
        wasInCentralBandRef.current = inBand;

        if (
          inBand &&
          !prev &&
          !emphasisPlayedOnceRef.current &&
          typeof window !== "undefined" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          emphasisPlayedOnceRef.current = true;
          setEmphasisPlay(1);
        }
      },
      {
        threshold: [0, 1],
        rootMargin: "-41% 0px -41% 0px",
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={shellRef}
      className={cn(
        "rounded-xl border-0 bg-gradient-to-br from-primary/[0.16] via-primary/[0.06] to-card px-4 py-3.5 shadow-sm",
        emphasisActive && "explore-section-heading-emphasis-animate explore-section-heading-emphasis-layer"
      )}
    >
      <h2 className="relative z-[2] text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <p className="relative z-[2] text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function ExploreBoatStrip({
  boats,
  favoriteIds,
  onToggleFavorite,
  showScrollHint,
  t,
}: {
  boats: Boat[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  showScrollHint?: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const isMdUp = useIsMdUp();
  const boatKey = useMemo(() => boats.map((b) => b.id).join("\0"), [boats]);
  const [shownDesktop, setShownDesktop] = useState(STRIP_PAGE_DESKTOP);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [mobileDragX, setMobileDragX] = useState(0);
  const [mobileTouching, setMobileTouching] = useState(false);
  /** Enquanto a faixa faz snap (transition), só 1 swipe de cada vez — ignora novo toque. */
  const [mobileTrackSwipeLock, setMobileTrackSwipeLock] = useState(false);
  const [suppressMobileTrackTransition, setSuppressMobileTrackTransition] = useState(false);
  /** Geometria do track em modo centro (medida no cliente). */
  const [mobileCenterMetrics, setMobileCenterMetrics] = useState<{ vw: number; stride: number; slideW: number } | null>(
    null
  );
  const mobileCenterViewportRef = useRef<HTMLDivElement>(null);
  const mobileCenterTrackRef = useRef<HTMLDivElement>(null);
  const mobileIndexRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);

  useEffect(() => {
    setShownDesktop(STRIP_PAGE_DESKTOP);
  }, [boatKey]);

  const measureMobileCenterStrip = useCallback(() => {
    const viewport = mobileCenterViewportRef.current;
    const track = mobileCenterTrackRef.current;
    if (!viewport || !track || track.children.length === 0) return;
    const c0 = track.children[0] as HTMLElement;
    const c1 = track.children.length > 1 ? (track.children[1] as HTMLElement) : null;
    const slideW = c0.getBoundingClientRect().width;
    const stride = c1 ? c1.offsetLeft - c0.offsetLeft : slideW;
    const vw = viewport.clientWidth;
    if (!Number.isFinite(stride) || stride < 12 || !Number.isFinite(slideW)) return;
    setMobileCenterMetrics({ vw, stride, slideW });
  }, []);

  useLayoutEffect(() => {
    if (isMdUp || boats.length === 0) {
      setMobileCenterMetrics(null);
      return;
    }
    measureMobileCenterStrip();
    const viewport = mobileCenterViewportRef.current;
    const track = mobileCenterTrackRef.current;
    const ro =
      viewport && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measureMobileCenterStrip())
        : null;
    ro?.observe(viewport!);
    if (track && ro) ro.observe(track);
    window.addEventListener("resize", measureMobileCenterStrip);
    return () => {
      window.removeEventListener("resize", measureMobileCenterStrip);
      ro?.disconnect();
    };
  }, [boats.length, boatKey, isMdUp, measureMobileCenterStrip]);

  const visibleList = isMdUp ? boats.slice(0, shownDesktop) : boats;
  const remainingDesktop = isMdUp ? Math.max(0, boats.length - shownDesktop) : 0;
  const canLoadMoreDesktop = remainingDesktop > 0;

  useEffect(() => {
    setMobileIndex(0);
    setMobileDragX(0);
    mobileIndexRef.current = 0;
    setMobileTrackSwipeLock(false);
    setSuppressMobileTrackTransition(false);
  }, [boatKey, isMdUp]);

  useEffect(() => {
    mobileIndexRef.current = mobileIndex;
  }, [mobileIndex]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!isMdUp && mobileTrackSwipeLock) return;
      touchStartXRef.current = event.touches[0]?.clientX ?? null;
      touchDeltaXRef.current = 0;
      setMobileTouching(true);
    },
    [isMdUp, mobileTrackSwipeLock]
  );

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMdUp && mobileTrackSwipeLock) return;
    if (touchStartXRef.current === null) return;
    const currentX = event.touches[0]?.clientX;
    if (typeof currentX !== "number") return;
    const dx = currentX - touchStartXRef.current;
    touchDeltaXRef.current = dx;
    const max = typeof window !== "undefined" ? window.innerWidth * 0.45 : 220;
    setMobileDragX(Math.max(-max, Math.min(max, dx)));
  }, [isMdUp, mobileTrackSwipeLock]);

  const finalizeMobileSwipe = useCallback(() => {
    const dx = touchDeltaXRef.current;
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    setMobileTouching(false);

    const n = boats.length;
    if (n <= 1) {
      setMobileDragX(0);
      setMobileTrackSwipeLock(false);
      return;
    }

    const vw = typeof window !== "undefined" ? window.innerWidth : 360;
    const threshold = Math.max(40, vw * 0.08);

    /** No máximo 1 barco por gesto (+1 ou -1), nunca vários índices de uma só vez */
    let step = 0;
    if (dx < -threshold) step = 1;
    else if (dx > threshold) step = -1;

    const cur = mobileIndexRef.current;
    let next = cur;
    if (step !== 0) {
      next = (cur + step + n) % n;
    }

    const crossesWrapForward = step === 1 && cur === n - 1;
    const crossesWrapBackward = step === -1 && cur === 0;

    /** Evita atravessar visualmente todos os slides no wrap circular */
    if (crossesWrapForward || crossesWrapBackward) {
      setSuppressMobileTrackTransition(true);
      setMobileIndex(next);
      setMobileDragX(0);
      setMobileTrackSwipeLock(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSuppressMobileTrackTransition(false);
        });
      });
      return;
    }

    const usesTransition = step !== 0 || Math.abs(dx) > 0.5;

    setMobileDragX(0);
    setMobileIndex(next);

    if (usesTransition) {
      setMobileTrackSwipeLock(true);
    }
  }, [boats.length]);

  const handleMobileTrackTransitionEnd = useCallback((event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    setMobileTrackSwipeLock(false);
  }, []);

  const mobileCenterTranslateX =
    mobileCenterMetrics !== null && boats.length >= 1
      ? mobileCenterMetrics.vw / 2 -
        mobileCenterMetrics.slideW / 2 -
        mobileIndex * mobileCenterMetrics.stride +
        mobileDragX
      : 0;

  if (boats.length === 0) return null;

  return (
    <div>
      {showScrollHint && boats.length > 1 ? (
        <p className="md:hidden text-[11px] text-muted-foreground mb-2 px-0.5">{t("explorar.stripScrollHint")}</p>
      ) : null}
      <div
        className={cn(
          "gap-3 pb-2 md:mx-0 md:px-0 md:[scrollbar-width:thin]",
          isMdUp
            ? "grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 md:overflow-visible"
            : "overflow-hidden max-md:-mx-4 max-md:px-4"
        )}
        onTouchStart={!isMdUp ? handleTouchStart : undefined}
        onTouchMove={!isMdUp ? handleTouchMove : undefined}
        onTouchEnd={!isMdUp ? finalizeMobileSwipe : undefined}
        onTouchCancel={!isMdUp ? finalizeMobileSwipe : undefined}
      >
        {!isMdUp ? (
          <div
            ref={mobileCenterViewportRef}
            className="relative w-full overflow-hidden py-1 select-none"
          >
            <div
              ref={mobileCenterTrackRef}
              className={cn(
                "relative z-10 flex flex-row items-center gap-3 will-change-transform",
                mobileTouching || suppressMobileTrackTransition
                  ? "transition-none"
                  : "transition-transform duration-[300ms] ease-out motion-reduce:transition-none"
              )}
              style={{
                transform: `translateX(${mobileCenterTranslateX}px)`,
              }}
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return;
                handleMobileTrackTransitionEnd(e);
              }}
            >
              {boats.map((barco, i) => {
                const ring = exploreCircIndexDistance(i, mobileIndex, boats.length);
                const inactive = ring > 0;
                const neighbour = ring === 1;
                return (
                  <div
                    key={barco.id}
                    className="shrink-0 w-[min(78vw,280px)] flex justify-center"
                  >
                    <div
                      className={cn(
                        "w-full origin-center",
                        !mobileTouching &&
                          !suppressMobileTrackTransition &&
                          "transition-[transform,opacity] duration-[300ms] ease-out motion-reduce:transition-none"
                      )}
                      style={{
                        opacity: inactive ? (neighbour ? 0.45 : 0.28) : 1,
                        transform: inactive
                          ? `scale(${neighbour ? 0.93 : 0.89})`
                          : "scale(1)",
                      }}
                    >
                      <BoatCard
                        barco={barco}
                        isFavorited={favoriteIds.has(barco.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          visibleList.map((barco, idx) => (
          <div
            key={`${barco.id}-${idx}`}
            className={cn(
              !isMdUp && "w-[min(78vw,280px)] shrink-0 snap-center",
              isMdUp && "md:w-auto md:min-w-0"
            )}
          >
            <BoatCard
              barco={barco}
              isFavorited={favoriteIds.has(barco.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))
        )}
      </div>
      {canLoadMoreDesktop ? (
        <div className="hidden md:flex flex-col items-center pt-5 pb-2 gap-2">
          <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
          <Button
            type="button"
            variant="secondary"
            className={cn(
              "group relative h-auto min-h-11 gap-2.5 rounded-full border-0 bg-muted px-6 py-2.5 dark:bg-card",
              "shadow-md backdrop-blur-sm",
              "transition-[transform,box-shadow,background-color] duration-200 ease-out",
              "hover:bg-primary/12 hover:shadow-lg dark:hover:bg-primary/15",
              "active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={() =>
              setShownDesktop((n) => Math.min(n + STRIP_PAGE_DESKTOP, boats.length))
            }
            aria-label={t("explorar.stripLoadMoreAria", { count: remainingDesktop })}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/18 group-hover:ring-primary/25">
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5"
                aria-hidden
                strokeWidth={2.25}
              />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {t("explorar.stripLoadMore")}
            </span>
          </Button>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {t("explorar.stripLoadMoreHint", {
              shown: Math.min(shownDesktop, boats.length),
              total: boats.length,
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const Explorar = () => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [mainFilter, setMainFilter] = useState<ExploreMainFilter>("all");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [tamFiltro, setTamFiltro] = useState<SizeFilterKey>("all");
  const [vagasFiltro, setVagasFiltro] = useState<SeatsFilterKey>("all");
  const [precoFiltro, setPrecoFiltro] = useState<PriceFilterKey>("all");
  const [amenitySelected, setAmenitySelected] = useState<string[]>([]);
  const [tripOptionalSelected, setTripOptionalSelected] = useState<TripOptionalFilterKey[]>([]);
  const [exploreDates, setExploreDates] = useState<string[]>([]);
  const [amenityNames, setAmenityNames] = useState<string[]>([]);
  const exploreBoatsScrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    boats: listaBarcos,
    isLoading: barcosLoading,
    isError: barcosError,
    refetch: refetchBarcos,
    isRefetching: barcosRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBarcosInfinite(amenitySelected.length > 0 ? amenitySelected : null);
  const user = getStoredUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;

  useEffect(() => {
    const el = exploreBoatsScrollSentinelRef.current;
    if (!el || !hasNextPage || barcosLoading || barcosError) return;

    const io = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (!e?.isIntersecting || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { root: null, rootMargin: "360px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, barcosLoading, barcosError, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/amenities"));
        if (!r.ok) return;
        const d = (await r.json()) as { amenities?: { name: string }[] };
        const names = (d.amenities || []).map((a) => a.name).filter(Boolean);
        if (active) setAmenityNames(names.sort((a, b) => a.localeCompare(b, "pt")));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tiposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    listaBarcos.forEach((b) => {
      const n = normalizeVesselTipo(b.tipo);
      if (n) set.add(n);
    });
    BOAT_VESSEL_TYPES.forEach((t) => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
  }, [listaBarcos]);

  const exploreDatesKey = useMemo(
    () =>
      [...new Set(exploreDates.map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [exploreDates]
  );

  const exploreFilterPreviewItems = useMemo(() => {
    const loc = explorePageDateLocale(i18n.language);
    const items: { key: string; text: string }[] = [];
    const q = busca.trim();
    if (q) items.push({ key: "q", text: q });
    if (tipoFiltro !== "all") items.push({ key: "tipo", text: vesselTypeLabel(t, tipoFiltro) });
    if (tamFiltro !== "all") items.push({ key: "tam", text: t(`explorar.size.${tamFiltro}`) });
    if (vagasFiltro !== "all") items.push({ key: "vagas", text: t(`explorar.seats.${vagasFiltro}`) });
    if (precoFiltro !== "all") items.push({ key: "preco", text: t(`explorar.price.${precoFiltro}`) });
    if (amenitySelected.length > 0) {
      const top = amenitySelected.slice(0, 4);
      const more = amenitySelected.length - top.length;
      const body = more > 0 ? `${top.join(", ")} (+${more})` : top.join(", ");
      items.push({ key: "amen", text: `${t("explorar.filters.included")}: ${body}` });
    }
    if (tripOptionalSelected.length > 0) {
      const labels = tripOptionalSelected.map((key) => {
        if (key === "bbq") return t("optionals.bbqShort");
        if (key === "jetSki") return t("optionals.jetSkiShort");
        if (key === "floatingMat") return t("optionals.floatingMatShort");
        return t("optionals.customFilterShort");
      });
      items.push({ key: "opt", text: `${t("explorar.filters.optionals")}: ${labels.join(", ")}` });
    }
    if (exploreDatesKey.length === 1) {
      items.push({
        key: "date1",
        text: format(parseISO(`${exploreDatesKey[0]}T12:00:00`), "EEE d MMM · yyyy", { locale: loc }),
      });
    } else if (exploreDatesKey.length > 1) {
      items.push({ key: "dates", text: t("explorar.selectedDaysCount", { count: exploreDatesKey.length }) });
    }
    return items;
  }, [busca, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro, amenitySelected, tripOptionalSelected, exploreDatesKey, t, i18n.language]);

  const [filterPreviewStripOpen, setFilterPreviewStripOpen] = useState(false);

  useLayoutEffect(() => {
    if (exploreFilterPreviewItems.length > 0) setFilterPreviewStripOpen(true);
  }, [exploreFilterPreviewItems.length]);

  const dismissFilterPreviewStrip = useCallback(() => {
    setFilterPreviewStripOpen(false);
  }, []);

  const clearExploreFilters = useCallback(() => {
    setBusca("");
    setTipoFiltro("all");
    setTamFiltro("all");
    setVagasFiltro("all");
    setPrecoFiltro("all");
    setAmenitySelected([]);
    setTripOptionalSelected([]);
    setExploreDates([]);
    setMainFilter("all");
  }, []);

  const availByExploreDatesQuery = useQuery({
    queryKey: ["explore-boats-available-multi", exploreDatesKey.join("\0")] as const,
    queryFn: async () => {
      if (exploreDatesKey.length === 0) return [] as string[];
      const lists = await Promise.all(exploreDatesKey.map((d) => fetchBoatsAvailableOn(d)));
      let ids = new Set(lists[0].map((b) => b.id));
      for (let i = 1; i < lists.length; i++) {
        const next = new Set(lists[i].map((b) => b.id));
        ids = new Set([...ids].filter((x) => next.has(x)));
      }
      return [...ids];
    },
    enabled: exploreDatesKey.length > 0,
  });

  const availOnDatesIdSet = useMemo(() => new Set(availByExploreDatesQuery.data ?? []), [availByExploreDatesQuery.data]);

  const listaSomenteFiltros = useMemo(
    () =>
      listaBarcos.filter((barco) =>
        matchesExploreFilters(barco, {
          q: busca,
          tipoFiltro,
          tamFiltro,
          vagasFiltro,
          precoFiltro,
          amenitySelected,
          tripOptionalSelected,
        })
      ),
    [busca, listaBarcos, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro, amenitySelected, tripOptionalSelected]
  );

  const listaExibida = useMemo(() => {
    if (exploreDatesKey.length === 0) return listaSomenteFiltros;
    if (availByExploreDatesQuery.isPending) return [];
    if (availByExploreDatesQuery.isError) return [];
    return listaSomenteFiltros.filter((b) => availOnDatesIdSet.has(b.id));
  }, [
    listaSomenteFiltros,
    exploreDatesKey,
    availByExploreDatesQuery.isPending,
    availByExploreDatesQuery.isError,
    availOnDatesIdSet,
  ]);

  const exploreEmptyMessage = (() => {
    if (listaSomenteFiltros.length === 0) return t("explorar.noResultsFilter");
    if (exploreDatesKey.length === 0) return t("explorar.noResultsFilter");
    if (availByExploreDatesQuery.isPending) return t("explorar.checkingAvailability");
    if (availByExploreDatesQuery.isError) return t("explorar.availabilityLoadError");
    return exploreDatesKey.length > 1
      ? t("explorar.noBoatsAvailableOnDays")
      : t("explorar.noBoatsAvailableOnDay");
  })();

  const { destaques, baratos, porTipo } = useMemo(() => {
    const list = listaExibida;
    if (list.length === 0) {
      return { destaques: [] as Boat[], baratos: [] as Boat[], porTipo: [] as { tipo: string; boats: Boat[] }[] };
    }
    const used = new Set<string>();
    const byRating = [...list].sort((a, b) => parseBoatRating(b) - parseBoatRating(a));

    let dest: Boat[] = [];
    for (const b of byRating) {
      if (parseBoatRating(b) >= 4.5 && dest.length < 12) {
        dest.push(b);
        used.add(b.id);
      }
    }
    if (dest.length < 2) {
      used.clear();
      dest = byRating.slice(0, Math.min(6, byRating.length));
      dest.forEach((b) => used.add(b.id));
    }

    const baratosList = [...list]
      .filter((b) => !used.has(b.id))
      .sort((a, b) => parseBoatPriceReais(a) - parseBoatPriceReais(b))
      .slice(0, 12);
    baratosList.forEach((b) => used.add(b.id));

    const tipoMap = new Map<string, Boat[]>();
    for (const b of list) {
      if (used.has(b.id)) continue;
      const tipo = normalizeVesselTipo(b.tipo);
      if (!tipoMap.has(tipo)) tipoMap.set(tipo, []);
      tipoMap.get(tipo)!.push(b);
    }
    const porTipoList = Array.from(tipoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt"))
      .map(([tipo, boats]) => ({ tipo, boats }));

    return { destaques: dest, baratos: baratosList, porTipo: porTipoList };
  }, [listaExibida]);

  /** Pílula: histerese (salto único cartão ↔ botão). Padding/gap do header: dois estados com transição CSS. */
  const FILTER_SCROLL_COLLAPSE = 28;
  const FILTER_SCROLL_EXPAND_PILL = 22;
  const FILTER_SCROLL_EXPAND = 5;
  const FILTER_OPEN_COLLAPSE_DELTA = 88;
  const HEADER_PAD_PX_MAX = 10;
  const HEADER_PAD_PX_MIN = 5;
  const HEADER_GAP_PX_EXPANDED = 8;
  const HEADER_GAP_PX_COLLAPSED = 8;
  const [filterScrollY, setFilterScrollY] = useState(0);
  const [filtersOpenedByUser, setFiltersOpenedByUser] = useState(false);
  const [filtersScrollCollapsed, setFiltersScrollCollapsed] = useState(false);
  const filtersOpenAnchorY = useRef(0);
  const filtersScrollCollapsedRef = useRef(false);
  useEffect(() => {
    const readScroll = () => {
      const y = window.scrollY;
      setFilterScrollY(y);

      let collapsed = filtersScrollCollapsedRef.current;
      if (y >= FILTER_SCROLL_COLLAPSE) collapsed = true;
      else if (y <= FILTER_SCROLL_EXPAND_PILL) collapsed = false;

      if (collapsed !== filtersScrollCollapsedRef.current) {
        filtersScrollCollapsedRef.current = collapsed;
        setFiltersScrollCollapsed(collapsed);
      }
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        readScroll();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    readScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const y = filterScrollY;
    if (y <= FILTER_SCROLL_EXPAND) {
      setFiltersOpenedByUser(false);
      return;
    }
    setFiltersOpenedByUser((open) => {
      if (!open) return false;
      if (y > filtersOpenAnchorY.current + FILTER_OPEN_COLLAPSE_DELTA) return false;
      return true;
    });
  }, [filterScrollY]);
  const handleExpandFilters = useCallback(() => {
    filtersOpenAnchorY.current = window.scrollY;
    setFiltersOpenedByUser(true);
  }, []);
  const filtersBarCollapsed = filtersScrollCollapsed && !filtersOpenedByUser;
  const headerPadPx = filtersBarCollapsed ? HEADER_PAD_PX_MIN : HEADER_PAD_PX_MAX;
  const headerInnerGapPx = filtersBarCollapsed ? HEADER_GAP_PX_COLLAPSED : HEADER_GAP_PX_EXPANDED;
  const headerPadTransition = "padding-top 220ms cubic-bezier(0.33, 1, 0.32, 1), padding-bottom 220ms cubic-bezier(0.33, 1, 0.32, 1)";
  const headerGapTransition = "gap 220ms cubic-bezier(0.33, 1, 0.32, 1)";

  const labelTipo = useCallback((tipo: string) => vesselTypeLabel(t, tipo), [t]);

  const handleToggleAmenity = useCallback((name: string) => {
    setAmenitySelected((prev) =>
      prev.includes(name)
        ? prev.filter((x) => x !== name)
        : [...prev, name].sort((a, b) => a.localeCompare(b, "pt"))
    );
  }, []);

  const handleToggleTripOptional = useCallback((key: TripOptionalFilterKey) => {
    setTripOptionalSelected((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key].sort(
            (a, b) =>
              TRIP_OPTIONAL_FILTER_KEYS.indexOf(a) - TRIP_OPTIONAL_FILTER_KEYS.indexOf(b)
          )
    );
  }, []);

  useEffect(() => {
    let active = true;
    const loadFavorites = async () => {
      if (!user) {
        setFavoriteIds(new Set());
        return;
      }
      try {
        const resp = await authFetch("/api/favorites");
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, i18n.t("explorar.favLoadError")));
        }
        const data = (await resp.json()) as { boatIds?: string[] };
        const ids = Array.isArray(data.boatIds) ? data.boatIds : [];
        if (active) setFavoriteIds(new Set(ids));
      } catch (e) {
        const msg = (e instanceof Error ? e.message : i18n.t("explorar.favLoadError")).trim();
        if (msg && !msg.includes("user_boat_favorites")) {
          toast.error(msg, { id: "favorites-load" });
        }
      }
    };
    loadFavorites();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const toggleFavorite = useCallback(
    async (boatId: string) => {
      if (!user) {
        toast.error(t("explorar.authRequiredAction"));
        navigate("/login", { state: { from: "/explorar" } });
        return;
      }
      const prev = favoriteIdsRef.current;
      const already = prev.has(boatId);
      const before = new Set(prev);
      const next = new Set(prev);
      if (already) next.delete(boatId);
      else next.add(boatId);
      setFavoriteIds(next);

      try {
        const resp = await authFetch(`/api/favorites/${boatId}`, {
          method: already ? "DELETE" : "POST",
        });
        if (resp.status === 401) {
          setFavoriteIds(before);
          return;
        }
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("explorar.favToggleError")));
        }
      } catch (e) {
        setFavoriteIds(before);
        const m = (e instanceof Error ? e.message : t("explorar.favToggleError")).trim();
        toast.error(m || t("explorar.favToggleError"));
      }
    },
    [navigate, t, user]
  );

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(t("explorar.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  const goSejaLocadorFromHeader = useCallback(() => {
    navigate("/seja-locador");
  }, [navigate]);

  const headerLogo = resolvedTheme === "dark" ? logoDark : logoLight;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      if (mq.matches) document.documentElement.classList.add("explorar-mobile-scroll-hide");
      else document.documentElement.classList.remove("explorar-mobile-scroll-hide");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.documentElement.classList.remove("explorar-mobile-scroll-hide");
    };
  }, []);

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
        <div
          className="mx-auto max-w-6xl xl:max-w-7xl px-4"
          style={{
            paddingTop: headerPadPx,
            paddingBottom: headerPadPx,
            transition: headerPadTransition,
          }}
        >
          <div
            className={cn(
              "w-full max-lg:flex lg:grid lg:grid-cols-[1fr_auto_1fr]",
              filtersBarCollapsed
                ? "max-lg:flex-row max-lg:items-center lg:items-center"
                : "max-lg:flex-col max-lg:items-stretch lg:items-start"
            )}
            style={{
              gap: headerInnerGapPx,
              transition: headerGapTransition,
            }}
          >
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start",
                !filtersBarCollapsed && "max-lg:w-full max-lg:justify-center",
                filtersBarCollapsed ? "lg:items-center" : "lg:items-start"
              )}
            >
              <button
                type="button"
                onClick={() => navigate("/explorar")}
                className="shrink-0 rounded-md outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t("explorar.title")}
              >
                <img
                  src={headerLogo}
                  alt=""
                  className={cn(
                    "h-11 w-auto max-h-12 sm:h-12 sm:max-h-14 object-contain bg-transparent object-left",
                    !filtersBarCollapsed && "max-lg:object-center lg:object-left"
                  )}
                  width={180}
                  height={48}
                  decoding="async"
                  fetchPriority="low"
                />
              </button>
              {user?.role !== "locatario" ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goSejaLocadorFromHeader}
                  className="inline-flex h-auto min-h-0 max-w-[min(100%,9.5rem)] shrink items-start text-balance py-1.5 pl-1.5 pr-1.5 text-left text-[11px] font-normal leading-snug text-muted-foreground hover:bg-transparent hover:text-foreground sm:max-w-none sm:pl-2 sm:pr-2 sm:text-xs"
                  aria-label={t("explorar.becomeRenterAria")}
                >
                  {t("explorar.becomeRenterCtaShort")}
                </Button>
              ) : null}
            </div>

            <div
              className={cn(
                "relative isolate min-h-[2.75rem] min-w-0 justify-self-center lg:min-h-0 lg:w-full lg:max-w-[20rem] lg:justify-self-start",
                filtersBarCollapsed ? "max-lg:flex-1 max-lg:w-auto" : "w-full"
              )}
            >
              <div
                className={
                  filtersBarCollapsed
                    ? "pointer-events-none absolute inset-x-0 top-1/2 z-0 w-full -translate-y-1/2 origin-center scale-[0.96] opacity-0 will-change-[opacity,transform] transition-[opacity,transform] duration-300 ease-out"
                    : "relative z-10 w-full scale-100 opacity-100 will-change-[opacity,transform] transition-[opacity,transform] duration-300 ease-out"
                }
                style={{
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                aria-hidden={filtersBarCollapsed}
              >
                <ExploreFiltersCard
                  busca={busca}
                  onBuscaChange={setBusca}
                  mainFilter={mainFilter}
                  onMainFilterChange={setMainFilter}
                  tipoFiltro={tipoFiltro}
                  onTipoFiltroChange={setTipoFiltro}
                  tamFiltro={tamFiltro}
                  onTamFiltroChange={setTamFiltro}
                  vagasFiltro={vagasFiltro}
                  onVagasFiltroChange={setVagasFiltro}
                  precoFiltro={precoFiltro}
                  onPrecoFiltroChange={setPrecoFiltro}
                  amenitySelected={amenitySelected}
                  onToggleAmenity={handleToggleAmenity}
                  amenityNames={amenityNames}
                  tripOptionalSelected={tripOptionalSelected}
                  onToggleTripOptional={handleToggleTripOptional}
                  tiposDisponiveis={tiposDisponiveis}
                  labelTipo={labelTipo}
                  exploreDates={exploreDates}
                  onExploreDatesChange={setExploreDates}
                  className="mx-auto w-full max-w-[min(100%,20rem)] lg:mx-0"
                />
              </div>
              <div
                className={cn(
                  filtersBarCollapsed
                    ? "relative z-10 flex w-full justify-center py-0.5 will-change-[opacity,transform] animate-explore-pill-in max-lg:min-w-0 max-lg:flex-1 max-lg:justify-end lg:justify-center"
                    : "pointer-events-none absolute inset-x-0 top-1/2 z-0 flex w-full -translate-y-1/2 justify-center py-0.5 scale-[0.92] opacity-0 will-change-[opacity,transform] transition-[opacity,transform] duration-300 ease-out"
                )}
                style={
                  !filtersBarCollapsed
                    ? { transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }
                    : undefined
                }
                aria-hidden={!filtersBarCollapsed}
              >
                <button
                  type="button"
                  onClick={handleExpandFilters}
                  className={cn(
                    "flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-full border-0 bg-muted px-3 shadow-md backdrop-blur-md transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] hover:bg-primary/12 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-card sm:gap-2 sm:px-4",
                    filtersBarCollapsed
                      ? "min-w-0 max-lg:w-auto max-lg:max-w-[min(100%,17rem)] max-lg:shrink lg:w-auto lg:max-w-none"
                      : "w-full max-w-[min(100%,20rem)] sm:w-auto sm:max-w-none"
                  )}
                  aria-expanded={false}
                  aria-label={t("explorar.filtersCollapsedAria")}
                >
                  <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm font-semibold text-foreground truncate">
                    {t("explorar.filtersCollapsedCta")}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={cn(
                "hidden shrink-0 justify-end gap-2 justify-self-end lg:flex lg:justify-self-end",
                filtersBarCollapsed ? "lg:items-center" : "lg:items-start lg:pt-0.5"
              )}
            >
              {user ? (
                <div className="flex items-center gap-1.5 pr-1 border-r border-border/70 mr-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 shadow-none bg-background/80"
                    onClick={() => navigate("/conta/favoritos")}
                    title={t("conta.favorites")}
                    aria-label={t("conta.favorites")}
                  >
                    <Heart className="h-4 w-4" aria-hidden />
                  </Button>
                  {user.role === "banhista" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 shadow-none bg-background/80"
                      onClick={() => navigate("/conta/reservas")}
                      title={t("conta.reservations")}
                      aria-label={t("conta.reservations")}
                    >
                      <CalendarDays className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <HeaderSettingsMenu />
              {user ? (
                <div className="flex min-w-0 max-w-[220px] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/conta")}
                    className="min-w-0 flex-1 truncate text-right text-sm font-medium text-foreground/85 transition-colors hover:text-primary"
                    title={user.name}
                  >
                    {user.name}
                  </button>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0 px-2 text-muted-foreground">
                    <LogOut className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t("explorar.logout")}</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate("/login", { state: { from: "/explorar" } })}>
                    {t("explorar.login")}
                  </Button>
                  <Button type="button" size="sm" onClick={() => navigate("/signup", { state: { from: "/explorar" } })}>
                    {t("explorar.signup")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl xl:max-w-7xl px-4 py-6 space-y-10">
        <div className="mx-auto max-w-2xl text-center space-y-2">
          <h1 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg md:text-xl lg:text-2xl">
            {t("explorar.sectionIdeal")}
          </h1>
          <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{t("explorar.sectionIdealSubtitle")}</p>
          {filterPreviewStripOpen ? (
            <div className="mx-auto flex max-w-full flex-col items-center gap-2 pt-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none">
              <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {t("explorar.activeFiltersPreviewTitle")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  aria-label={t("explorar.activeFiltersClearAria")}
                  title={t("explorar.activeFiltersClearAria")}
                  onClick={clearExploreFilters}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <ExploreFilterPreviewChips items={exploreFilterPreviewItems} onExhausted={dismissFilterPreviewStrip} />
            </div>
          ) : null}
        </div>

        {barcosLoading && <p className="text-center text-muted-foreground py-8">{t("explorar.loadingBoats")}</p>}
        {barcosError && (
          <div className="surface-elevated space-y-2 rounded-lg p-4 text-sm">
            <p className="font-medium text-foreground">{t("explorar.loadErrorTitle")}</p>
            <p className="text-muted-foreground">{t("common.boatsUnavailable")}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={barcosRefetching}
              onClick={() => void refetchBarcos()}
            >
              {barcosRefetching ? t("common.loading") : t("common.tryAgain")}
            </Button>
          </div>
        )}

        {!barcosLoading && !barcosError && listaExibida.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{exploreEmptyMessage}</p>
        ) : null}

        {!barcosLoading && !barcosError && listaExibida.length > 0 ? (
          <div className="space-y-10">
            {destaques.length > 0 ? (
              <section className="space-y-4">
                <ExploreSectionHeading
                  title={t("explorar.sectionTopRated")}
                  subtitle={t("explorar.sectionTopRatedHint")}
                />
                <ExploreBoatStrip
                  boats={destaques}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  showScrollHint
                  t={t}
                />
              </section>
            ) : null}

            {baratos.length > 0 ? (
              <section className="space-y-4">
                <ExploreSectionHeading
                  title={t("explorar.sectionBestPrice")}
                  subtitle={t("explorar.sectionBestPriceHint")}
                />
                <ExploreBoatStrip
                  boats={baratos}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  showScrollHint
                  t={t}
                />
              </section>
            ) : null}

            {porTipo.length > 0 ? (
              <section className="space-y-6">
                <ExploreSectionHeading
                  title={t("explorar.sectionByType")}
                  subtitle={t("explorar.sectionByTypeHint")}
                />
                <div className="space-y-8">
                  {porTipo.map(({ tipo, boats }) => (
                    <div key={tipo} className="space-y-3">
                      <h3 className="text-base font-semibold text-foreground border-l-4 border-primary/35 pl-3 py-0.5">
                        {vesselTypeLabel(t, tipo)}
                      </h3>
                      <ExploreBoatStrip
                        boats={boats}
                        favoriteIds={favoriteIds}
                        onToggleFavorite={toggleFavorite}
                        showScrollHint
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {!barcosLoading && !barcosError && hasNextPage ? (
          <div
            ref={exploreBoatsScrollSentinelRef}
            className="flex min-h-[3rem] justify-center py-6"
          >
            {isFetchingNextPage ? (
              <p className="text-sm text-muted-foreground">{t("explorar.loadingMoreBoats")}</p>
            ) : null}
          </div>
        ) : null}

        {!barcosLoading && !barcosError && !hasNextPage && listaBarcos.length > 0 ? (
          <p className="pb-4 text-center text-xs text-muted-foreground">{t("explorar.allBoatsLoaded")}</p>
        ) : null}
      </main>
    </div>
  );
};

export default Explorar;
