import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Heart, Star } from "lucide-react";
import type { Boat } from "@/lib/types";
import { BoatCardOptionalsRow } from "@/components/optionals/BoatCardOptionalsRow";
import { cn } from "@/lib/utils";

interface BoatCardProps {
  barco: Boat;
  isFavorited?: boolean;
  onToggleFavorite?: (boatId: string) => void;
  /** Índice para entrada em cascata (Explorar). */
  staggerIndex?: number;
}

function BoatCardInner({ barco, isFavorited = false, onToggleFavorite, staggerIndex }: BoatCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [favPop, setFavPop] = useState(false);
  const n = barco.imagens?.length ?? 0;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { root: null, rootMargin: "120px 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const prevFavoritedRef = useRef(isFavorited);

  useEffect(() => {
    setCurrentImage(0);
  }, [barco.id]);

  useEffect(() => {
    if (!prevFavoritedRef.current && isFavorited) {
      setFavPop(true);
      const timer = window.setTimeout(() => setFavPop(false), 420);
      prevFavoritedRef.current = isFavorited;
      return () => window.clearTimeout(timer);
    }
    prevFavoritedRef.current = isFavorited;
  }, [isFavorited]);

  const nextImage = useCallback(() => {
    if (n <= 0) return;
    setCurrentImage((prev) => (prev + 1) % n);
  }, [n]);

  useEffect(() => {
    if (!inView || n <= 0) return;
    const timer = setInterval(nextImage, 3000);
    return () => clearInterval(timer);
  }, [inView, nextImage, n]);

  const goDetail = useCallback(() => {
    navigate(`/barco/${barco.id}`);
  }, [navigate, barco.id]);

  const ratingN = parseFloat(String(barco.nota).replace(",", ".").trim());
  const hasRating = Number.isFinite(ratingN) && ratingN > 0;

  const staggerStyle =
    staggerIndex != null && staggerIndex > 0
      ? ({ animationDelay: `${Math.min(staggerIndex, 14) * 55}ms` } as const)
      : undefined;

  return (
    <div
      ref={rootRef}
      style={staggerStyle}
      className={cn(
        "group cursor-pointer [content-visibility:auto] [contain-intrinsic-size:200px_260px]",
        "motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:ease-out",
        "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-elevated motion-reduce:transition-none",
        staggerIndex != null
          ? "motion-safe:animate-stagger-fade-in motion-reduce:animate-fade-in"
          : "animate-fade-in"
      )}
      onClick={goDetail}
    >
      <div className="aspect-square overflow-hidden rounded-lg relative bg-muted">
        {n > 0 ? (
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "h-full w-full",
                "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-105",
                "motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              )}
            >
              {barco.imagens.map((src, i) => (
                <img
                  key={`${barco.id}-${i}`}
                  src={src}
                  alt={i === currentImage ? barco.nome : ""}
                  aria-hidden={i !== currentImage}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    "motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-in-out",
                    "motion-reduce:transition-none",
                    i === currentImage ? "opacity-100 z-[1]" : "opacity-0 z-0"
                  )}
                  width={512}
                  height={512}
                  sizes="(max-width: 640px) 50vw, 28vw"
                  loading={i === 0 ? "lazy" : "eager"}
                  decoding="async"
                  fetchPriority={i === 0 ? "low" : "auto"}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground px-2 text-center">
            {barco.nome}
          </div>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(barco.id);
            }}
            className="absolute top-2 right-2 z-10 rounded-full bg-background/85 p-2 text-foreground transition-[background-color,transform] duration-200 hover:bg-background motion-safe:active:scale-95"
            aria-label={isFavorited ? t("boatCard.favRemove") : t("boatCard.favAdd")}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isFavorited ? "fill-red-500 text-red-500" : "text-foreground",
                favPop && "motion-safe:animate-favorite-pop motion-reduce:animate-none"
              )}
            />
          </button>
        )}
      </div>
      <div className="mt-2 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{barco.nome}</h3>
          {barco.verificado && <BadgeCheck className="w-4 h-4 text-verified shrink-0" />}
        </div>
        <BoatCardOptionalsRow barco={barco} />
        <p className="text-xs text-muted-foreground">{barco.distancia}</p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-sm font-semibold text-foreground">{barco.preco}</p>
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums ${
              hasRating ? "text-foreground" : "text-muted-foreground"
            }`}
            title={t("boatCard.ratingHint")}
          >
            <Star
              className={`h-3.5 w-3.5 ${hasRating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
              aria-hidden
            />
            {hasRating ? barco.nota : t("boatCard.noRating")}
          </span>
        </div>
      </div>
    </div>
  );
}

function propsEqual(prev: BoatCardProps, next: BoatCardProps) {
  return (
    prev.barco === next.barco &&
    prev.isFavorited === next.isFavorited &&
    prev.onToggleFavorite === next.onToggleFavorite &&
    prev.staggerIndex === next.staggerIndex
  );
}

const BoatCard = memo(BoatCardInner, propsEqual);
export default BoatCard;
