import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import type { Embarcacao } from "@/data/embarcacoes";

interface BoatCardProps {
  barco: Embarcacao;
}

const BoatCard = ({ barco }: BoatCardProps) => {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);

  const nextImage = useCallback(() => {
    setCurrentImage((prev) => (prev + 1) % barco.imagens.length);
  }, [barco.imagens.length]);

  useEffect(() => {
    const timer = setInterval(nextImage, 3000);
    return () => clearInterval(timer);
  }, [nextImage]);

  return (
    <div
      className="cursor-pointer group animate-fade-in"
      onClick={() => navigate(`/barco/${barco.id}`)}
    >
      <div className="aspect-square overflow-hidden rounded-lg relative">
        <img
          src={barco.imagens[currentImage]}
          alt={barco.nome}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
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
