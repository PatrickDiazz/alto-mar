import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Heart } from "lucide-react";
import type { Boat } from "@/lib/types";

interface BoatCardProps {
  barco: Boat;
  isFavorited?: boolean;
  onToggleFavorite?: (boatId: string) => void;
}

const BoatCard = ({ barco, isFavorited = false, onToggleFavorite }: BoatCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const n = barco.imagens?.length ?? 0;

  useEffect(() => {
    setCurrentImage(0);
  }, [barco.id]);

  const nextImage = useCallback(() => {
    if (n <= 0) return;
    setCurrentImage((prev) => (prev + 1) % n);
  }, [n]);

  useEffect(() => {
    if (n <= 0) return;
    const timer = setInterval(nextImage, 3000);
    return () => clearInterval(timer);
  }, [nextImage, n]);

  return (
    <div
      className="cursor-pointer group animate-fade-in"
      onClick={() => navigate(`/barco/${barco.id}`)}
    >
      <div className="aspect-square overflow-hidden rounded-lg relative">
        {n > 0 ? (
          <img
            src={barco.imagens[Math.min(currentImage, n - 1)]}
            alt={barco.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          <h3 className="text-sm font-semibold text-foreground truncate">
            {barco.nome}
          </h3>
          {barco.verificado && (
            <BadgeCheck className="w-4 h-4 text-verified shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{barco.distancia}</p>
        <p className="text-sm font-semibold text-foreground">{barco.preco}</p>
      </div>
    </div>
  );
};

export default BoatCard;
