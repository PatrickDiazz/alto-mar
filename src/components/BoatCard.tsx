import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Heart, Star } from "lucide-react";
import type { Boat } from "@/lib/types";

interface BoatCardProps {
  barco: Boat;
  isFavorited?: boolean;
  onToggleFavorite?: (boatId: string) => void;
}

function BoatCardInner({ barco, isFavorited = false, onToggleFavorite }: BoatCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
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

  useEffect(() => {
    setCurrentImage(0);
  }, [barco.id]);

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

  return (
    <div
      ref={rootRef}
      className="cursor-pointer group animate-fade-in [content-visibility:auto] [contain-intrinsic-size:200px_260px]"
      onClick={goDetail}
    >
      <div className="aspect-square overflow-hidden rounded-lg relative">
        {n > 0 ? (
          <img
            src={barco.imagens[Math.min(currentImage, n - 1)]}
            alt={barco.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            width={512}
            height={512}
            sizes="(max-width: 640px) 50vw, 28vw"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
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
            className="absolute top-2 right-2 rounded-full bg-background/85 p-2 text-foreground hover:bg-background transition"
            aria-label={isFavorited ? t("boatCard.favRemove") : t("boatCard.favAdd")}
          >
            <Heart
              className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-foreground"}`}
            />
          </button>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{barco.nome}</h3>
          {barco.verificado && <BadgeCheck className="w-4 h-4 text-verified shrink-0" />}
        </div>
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
    prev.onToggleFavorite === next.onToggleFavorite
  );
}

const BoatCard = memo(BoatCardInner, propsEqual);
export default BoatCard;
