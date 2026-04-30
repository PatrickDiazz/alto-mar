import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  Ship,
  Ruler,
  Users,
  AlertTriangle,
  Heart,
  Check,
  X,
  Waves,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcos } from "@/hooks/useBarcos";
import { BoatRoutes } from "@/components/BoatRoutes";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";
import { getStoredUser, authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { toast } from "sonner";
import i18n from "@/i18n";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { vesselTypeLabel } from "@/lib/boatVesselTypes";

const DetalhesBarco = () => {
  const { t, i18n: i18nReact } = useTranslation();
  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(bcp47FromAppLang(i18nReact.language), {
        style: "currency",
        currency: "BRL",
      }),
    [i18nReact.language]
  );
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    boats: barcos,
    isLoading: barcosLoading,
    isError: barcosError,
    refetch: refetchBarcos,
    isRefetching: barcosRefetching,
  } = useBarcos();
  const barco = barcos.find((b) => b.id === id);
  const [imgIndex, setImgIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const carouselTouchRef = useRef<{ x: number; y: number } | null>(null);

  const user = getStoredUser();

  useEffect(() => {
    let active = true;
    const loadFavorites = async () => {
      if (!user || !id) {
        setIsFavorited(false);
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
        if (active) setIsFavorited(ids.includes(id));
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
  }, [user?.id, id]);

  useEffect(() => {
    setImgIndex(0);
  }, [id]);

  const toggleFavorite = useCallback(async () => {
    if (!id) return;
    if (!getStoredUser()) {
      toast.error(t("explorar.authRequiredAction"));
      navigate("/login", { state: { from: `/barco/${id}` } });
      return;
    }
    let previous = false;
    setIsFavorited((prev) => {
      previous = prev;
      return !prev;
    });
    try {
      const resp = await authFetch(`/api/favorites/${id}`, {
        method: previous ? "DELETE" : "POST",
      });
      if (resp.status === 401) {
        setIsFavorited(previous);
        return;
      }
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, i18n.t("explorar.favToggleError")));
      }
    } catch (e) {
      setIsFavorited(previous);
      const m = (e instanceof Error ? e.message : i18n.t("explorar.favToggleError")).trim();
      toast.error(m || i18n.t("explorar.favToggleError"));
    }
  }, [id, navigate, t]);

  if (barcosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("detalhes.loading")}</p>
      </div>
    );
  }

  if (barcosError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4 text-center">
        <p className="text-foreground font-medium">{t("detalhes.loadError")}</p>
        <p className="text-sm text-muted-foreground max-w-md">{t("common.boatsUnavailable")}</p>
        <Button
          type="button"
          variant="secondary"
          disabled={barcosRefetching}
          onClick={() => void refetchBarcos()}
        >
          {barcosRefetching ? t("common.loading") : t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("detalhes.notFound")}</p>
      </div>
    );
  }

  const nImagens = barco.imagens?.length ?? 0;
  const safeImgIndex = nImagens > 0 ? imgIndex % nImagens : 0;

  const prevImg = () => {
    if (nImagens <= 0) return;
    setImgIndex((p) => (p - 1 + nImagens) % nImagens);
  };
  const nextImg = () => {
    if (nImagens <= 0) return;
    setImgIndex((p) => (p + 1) % nImagens);
  };

  const SWIPE_MIN_PX = 48;

  const onCarouselTouchStart = (e: React.TouchEvent) => {
    if (nImagens <= 1) return;
    const p = e.touches[0];
    carouselTouchRef.current = { x: p.clientX, y: p.clientY };
  };

  const onCarouselTouchEnd = (e: React.TouchEvent) => {
    if (nImagens <= 1 || !carouselTouchRef.current) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - carouselTouchRef.current.x;
    const dy = p.clientY - carouselTouchRef.current.y;
    carouselTouchRef.current = null;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_MIN_PX || ax < ay * 1.15) return;
    if (dx > 0) prevImg();
    else nextImg();
  };

  const onCarouselTouchCancel = () => {
    carouselTouchRef.current = null;
  };

  const handleReservar = () => {
    if (!getStoredUser()) {
      navigate("/login", { state: { from: `/reservar/${barco.id}` } });
      return;
    }
    navigate(`/reservar/${barco.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFavorite}
              className="rounded-full p-2 text-foreground hover:bg-secondary transition-colors"
              aria-label={
                isFavorited ? t("boatCard.favRemove") : t("boatCard.favAdd")
              }
            >
              <Heart
                className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-foreground"}`}
              />
            </button>
            <HeaderSettingsMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Image carousel */}
        <div
          className="relative aspect-square max-w-lg mx-auto rounded-xl overflow-hidden shadow-elevated border border-border touch-manipulation select-none"
          onTouchStart={onCarouselTouchStart}
          onTouchEnd={onCarouselTouchEnd}
          onTouchCancel={onCarouselTouchCancel}
          role="region"
          aria-label={t("detalhes.photoCarousel")}
        >
          {nImagens > 0 ? (
            <img
              src={barco.imagens[safeImgIndex]}
              alt={barco.nome}
              className="w-full h-full object-cover"
              width={512}
              height={512}
              sizes="(max-width: 1024px) 100vw, min(32rem, 100vw)"
              loading={safeImgIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={safeImgIndex === 0 ? "high" : "low"}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
              {barco.nome}
            </div>
          )}
          {nImagens > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-1.5 text-foreground hover:bg-background transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-1.5 text-foreground hover:bg-background transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          {nImagens > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {barco.imagens.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === safeImgIndex ? "bg-primary scale-110" : "bg-background/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-bold text-foreground">{barco.nome}</h1>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <span className="text-lg font-semibold text-accent">{barco.nota}</span>
          </div>
          <p className="text-muted-foreground">{barco.distancia}</p>

          {/* Details chips */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
              <Ship className="w-4 h-4" /> {vesselTypeLabel(t, barco.tipo)}
            </span>
            <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
              <Ruler className="w-4 h-4" /> {barco.tamanho}
            </span>
            <span className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
              <Users className="w-4 h-4" /> {t("detalhes.people", { count: barco.capacidade })}
            </span>
          </div>

          {barco.verificado ? (
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-5 h-5 text-verified" />
              <span className="text-sm font-bold text-verified">{t("detalhes.verified")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-accent">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-bold">{t("detalhes.pending")}</span>
            </div>
          )}

          {barco.amenidades?.length ? (
            <>
              <hr className="border-border" />
              <div className="surface-elevated rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{t("reservar.included")}</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {barco.amenidades.map((a) => (
                    <div key={a.nome} className="flex items-center gap-1.5 text-sm">
                      {a.incluido ? (
                        <Check className="w-4 h-4 text-verified shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span
                        className={
                          a.incluido ? "text-foreground" : "text-muted-foreground line-through"
                        }
                      >
                        {a.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {barco.jetSkiOffered && barco.jetSkiPriceCents ? (
            <>
              <hr className="border-border" />
              <div className="surface-elevated rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary bg-primary/10 inline-flex items-center rounded-md px-2 py-1">
                  Opcionais
                </h3>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Waves className="w-5 h-5 text-primary shrink-0" />
                  Moto aquática
                </h4>
                <p className="text-xs text-muted-foreground">{t("detalhes.jetSkiIntro")}</p>
                <p className="text-sm font-medium text-foreground">
                  + {currencyFmt.format(barco.jetSkiPriceCents / 100)}
                </p>
                <hr className="border-border/70" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-accent shrink-0" />
                    {t("reservar.bbqTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground">{t("reservar.bbqDesc")}</p>
                  <p className="text-sm font-medium text-foreground">+ {currencyFmt.format(250)}</p>
                </div>
                {(barco.jetSkiImageUrls?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(barco.jetSkiImageUrls ?? []).map((url, i) => (
                      <a
                        key={`jet-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video overflow-hidden rounded-lg border-0 bg-muted shadow-sm"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <hr className="border-border" />

          <h2 className="text-lg font-bold text-foreground">{t("detalhes.description")}</h2>
          <p className="text-foreground/80 leading-relaxed">{barco.descricao}</p>

          <hr className="border-border" />

          <div className="surface-elevated rounded-xl p-4 space-y-3">
            <h2 className="text-lg font-bold text-foreground">{t("detalhes.availabilityTitle")}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("detalhes.availabilityHint")}</p>
            <BoatCalendarPanel variant="readonly" boatId={barco.id} />
          </div>

          <hr className="border-border" />

          <BoatRoutes boatId={barco.id} locationText={barco.distancia} routeIslands={barco.routeIslands} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-0 bg-muted px-4 py-4 dark:bg-card">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">{barco.preco}</span>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleReservar}
          >
            {t("detalhes.bookNow")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetalhesBarco;
