import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown, Heart, LogOut, Search } from "lucide-react";
import { useTheme } from "next-themes";
import BoatCard from "@/components/BoatCard";
import { ExploreFiltersCard } from "@/components/ExploreFiltersCard";
import { BOAT_VESSEL_TYPES, normalizeVesselTipo, vesselTypeLabel } from "@/lib/boatVesselTypes";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcos } from "@/hooks/useBarcos";
import { getStoredUser, clearSession, authFetch, apiUrl } from "@/lib/auth";
import i18n from "@/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoLight from "@/assets/logo-altomar-light.png";
import logoDark from "@/assets/logo-altomar-dark.png";
import exploreHeroBg from "@/assets/explore-banhista-hero.png";
import {
  matchesExploreFilters,
  type ExploreMainFilter,
  type SizeFilterKey,
  type SeatsFilterKey,
  type PriceFilterKey,
} from "@/lib/exploreFilters";
import { readResponseErrorMessage } from "@/lib/responseError";
import { cn } from "@/lib/utils";
import type { Boat } from "@/lib/types";

const STRIP_PAGE_DESKTOP = 5;

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

function parseBoatPriceReais(b: Boat): number {
  return parseInt(b.preco.replace(/[^0-9]/g, ""), 10) || 0;
}

function parseBoatRating(b: Boat): number {
  const n = parseFloat(String(b.nota).replace(",", ".").trim());
  return Number.isNaN(n) ? 0 : n;
}

function ExploreSectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.16] via-primary/[0.06] to-card px-4 py-3.5 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
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

  useEffect(() => {
    setShownDesktop(STRIP_PAGE_DESKTOP);
  }, [boatKey]);

  if (boats.length === 0) return null;

  const visibleList = isMdUp ? boats.slice(0, shownDesktop) : boats;
  const remainingDesktop = isMdUp ? Math.max(0, boats.length - shownDesktop) : 0;
  const canLoadMoreDesktop = remainingDesktop > 0;

  return (
    <div>
      {showScrollHint && boats.length > 1 ? (
        <p className="md:hidden text-[11px] text-muted-foreground mb-2 px-0.5">{t("explorar.stripScrollHint")}</p>
      ) : null}
      <div
        className={cn(
          "gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:thin]",
          isMdUp
            ? "grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 md:overflow-visible"
            : "flex overflow-x-auto snap-x snap-mandatory md:snap-none overscroll-x-contain touch-pan-x touch-pan-y"
        )}
        style={!isMdUp ? { WebkitOverflowScrolling: "touch" } : undefined}
      >
        {visibleList.map((barco) => (
          <div
            key={barco.id}
            className={cn(
              !isMdUp && "w-[min(78vw,280px)] shrink-0 snap-start",
              isMdUp && "md:w-auto md:min-w-0"
            )}
          >
            <BoatCard
              barco={barco}
              isFavorited={favoriteIds.has(barco.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
      {canLoadMoreDesktop ? (
        <div className="hidden md:flex flex-col items-center pt-5 pb-2 gap-2">
          <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
          <Button
            type="button"
            variant="secondary"
            className={cn(
              "group relative h-auto min-h-11 gap-2.5 rounded-full border border-primary/25 bg-card/90 px-6 py-2.5",
              "shadow-md shadow-primary/[0.06] backdrop-blur-sm",
              "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
              "hover:border-primary/40 hover:bg-primary/[0.08] hover:shadow-lg hover:shadow-primary/[0.08]",
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
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [mainFilter, setMainFilter] = useState<ExploreMainFilter>("all");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [tamFiltro, setTamFiltro] = useState<SizeFilterKey>("all");
  const [vagasFiltro, setVagasFiltro] = useState<SeatsFilterKey>("all");
  const [precoFiltro, setPrecoFiltro] = useState<PriceFilterKey>("all");
  const [amenitySelected, setAmenitySelected] = useState<string[]>([]);
  const [amenityNames, setAmenityNames] = useState<string[]>([]);
  const {
    boats: listaBarcos,
    isLoading: barcosLoading,
    isError: barcosError,
    refetch: refetchBarcos,
    isRefetching: barcosRefetching,
  } = useBarcos(amenitySelected.length > 0 ? amenitySelected : null);
  const user = getStoredUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;

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

  const listaExibida = useMemo(() => {
    return listaBarcos.filter((barco) =>
      matchesExploreFilters(barco, {
        q: busca,
        tipoFiltro,
        tamFiltro,
        vagasFiltro,
        precoFiltro,
        amenitySelected,
      })
    );
  }, [busca, listaBarcos, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro, amenitySelected]);

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
  const HEADER_GAP_PX_EXPANDED = 12;
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
  const heroBgOpacity = Math.max(0, 1 - filterScrollY / 240);
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

  const goMarinheiroFromHeader = useCallback(() => {
    if (!user) {
      navigate("/login", { state: { from: "/marinheiro" } });
      return;
    }
    navigate("/marinheiro");
  }, [navigate, user]);

  const headerLogo = resolvedTheme === "dark" ? logoDark : logoLight;

  return (
    <div className="relative z-0 min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-[min(62vh,540px)] overflow-hidden transition-[opacity] duration-300 ease-out"
        style={{ opacity: heroBgOpacity }}
      >
        <div
          className="absolute inset-0 bg-cover bg-[center_40%] blur-[3px] scale-[1.03]"
          style={{ backgroundImage: `url(${exploreHeroBg})` }}
        />
        <div className="absolute inset-0 bg-primary/[0.14] dark:bg-primary/[0.18]" />
        <div className="absolute inset-0 bg-background/44 dark:bg-background/52" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-background/18 to-background" />
      </div>
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
              "w-full max-lg:flex lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center",
              filtersBarCollapsed ? "max-lg:flex-row max-lg:items-center" : "max-lg:flex-col max-lg:items-stretch"
            )}
            style={{
              gap: headerInnerGapPx,
              transition: headerGapTransition,
            }}
          >
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start",
                !filtersBarCollapsed && "max-lg:w-full max-lg:justify-center"
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
                  onClick={goMarinheiroFromHeader}
                  className="hidden h-auto min-h-0 shrink whitespace-normal py-1.5 pl-2 pr-2 text-left text-xs font-normal leading-snug text-muted-foreground hover:bg-transparent hover:text-foreground lg:inline-flex"
                  aria-label={t("explorar.becomeRenterAria")}
                >
                  {t("explorar.becomeRenterCtaShort")}
                </Button>
              ) : null}
            </div>

            <div
              className={cn(
                "relative isolate min-h-[2.75rem] min-w-0 justify-self-center lg:w-full lg:max-w-2xl",
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
                  tiposDisponiveis={tiposDisponiveis}
                  labelTipo={labelTipo}
                  className="mx-auto w-full max-w-2xl"
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
                    "flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-card/95 px-3 shadow-md backdrop-blur-md transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] hover:border-primary/40 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-2 sm:px-4",
                    filtersBarCollapsed
                      ? "min-w-0 max-lg:w-auto max-lg:max-w-[min(100%,17rem)] max-lg:shrink lg:w-auto lg:max-w-none"
                      : "w-full max-w-md sm:w-auto sm:max-w-none"
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

            <div className="hidden shrink-0 items-center justify-end gap-2 justify-self-end lg:flex">
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
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg md:text-xl lg:text-2xl">
            {t("explorar.sectionIdeal")}
          </h1>
        </div>

        {barcosLoading && <p className="text-center text-muted-foreground py-8">{t("explorar.loadingBoats")}</p>}
        {barcosError && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
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
          <p className="text-center text-muted-foreground py-8">{t("explorar.noResultsFilter")}</p>
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
      </main>
    </div>
  );
};

export default Explorar;
