import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcos } from "@/hooks/useBarcos";
import { BoatRoutes } from "@/components/BoatRoutes";
import { getStoredUser } from "@/lib/auth";

const DetalhesBarco = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { boats: barcos, isLoading: barcosLoading, isError: barcosError } = useBarcos();
  const barco = barcos.find((b) => b.id === id);
  const [imgIndex, setImgIndex] = useState(0);

  if (barcosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("detalhes.loading")}</p>
      </div>
    );
  }

  if (barcosError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-3 text-center">
        <p className="text-foreground font-medium">{t("detalhes.loadError")}</p>
        <p className="text-sm text-muted-foreground max-w-md">{t("common.boatsUnavailable")}</p>
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

  const prevImg = () =>
    setImgIndex((p) => (p - 1 + barco.imagens.length) % barco.imagens.length);
  const nextImg = () =>
    setImgIndex((p) => (p + 1) % barco.imagens.length);

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
            onClick={() => navigate(-1)}
            className="text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Image carousel */}
        <div className="relative aspect-square max-w-lg mx-auto rounded-xl overflow-hidden shadow-elevated border border-border">
          <img
            src={barco.imagens[imgIndex]}
            alt={barco.nome}
            className="w-full h-full object-cover"
          />
          {barco.imagens.length > 1 && (
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {barco.imagens.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === imgIndex ? "bg-primary scale-110" : "bg-background/60"
                }`}
              />
            ))}
          </div>
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
              <Ship className="w-4 h-4" /> {barco.tipo}
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

          <hr className="border-border" />

          <h2 className="text-lg font-bold text-foreground">{t("detalhes.description")}</h2>
          <p className="text-foreground/80 leading-relaxed">{barco.descricao}</p>

          <hr className="border-border" />

          <BoatRoutes boatId={barco.id} locationText={barco.distancia} routeIslands={barco.routeIslands} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 bg-card border-t border-border px-4 py-4">
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
