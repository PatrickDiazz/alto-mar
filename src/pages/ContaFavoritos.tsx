import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

const ContaFavoritos = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBoats, setFavoriteBoats] = useState<Array<{ id: string; nome: string; distancia: string; preco: string }>>([]);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/conta/favoritos" }, replace: true });
      return;
    }
    let active = true;
    const run = async () => {
      try {
        const favResp = await authFetch("/api/favorites");
        if (favResp.status === 401) return;
        if (!favResp.ok) {
          throw new Error(await readResponseErrorMessage(favResp, t("conta.toastLoad")));
        }
        const favData = (await favResp.json()) as {
          boatIds: string[];
          boats?: Array<{ id: string; nome: string; distancia: string; preco: string }>;
        };
        if (!active) return;
        const ids = Array.isArray(favData.boatIds) ? favData.boatIds : [];
        setFavoriteIds(new Set(ids));
        setFavoriteBoats(favData.boats || []);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("conta.toastLoad")).trim();
        toast.error(m || t("conta.toastLoad"));
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [currentUser?.id, navigate, t]);

  const toggleFavorite = async (boatId: string) => {
    const has = favoriteIds.has(boatId);
    const before = new Set(favoriteIds);
    const next = new Set(favoriteIds);
    if (has) next.delete(boatId);
    else next.add(boatId);
    setFavoriteIds(next);
    try {
      const resp = await authFetch(`/api/favorites/${boatId}`, { method: has ? "DELETE" : "POST" });
      if (resp.status === 401) {
        setFavoriteIds(before);
        return;
      }
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("conta.toastFav")));
      }
      if (has) {
        setFavoriteBoats((prev) => prev.filter((b) => b.id !== boatId));
      }
    } catch (e) {
      setFavoriteIds(before);
      const m = (e instanceof Error ? e.message : t("conta.toastFav")).trim();
      toast.error(m || t("conta.toastFav"));
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/conta")}
              className="text-foreground hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("conta.favorites")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{t("conta.boatsCount", { n: favoriteBoats.length })}</span>
        </div>
        {favoriteBoats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("conta.noFavorites")}</p>
        ) : (
          <div className="space-y-2">
            {favoriteBoats.map((barco) => (
              <div
                key={barco.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/barco/${barco.id}`)}
                  className="text-left min-w-0 flex-1"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{barco.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {barco.distancia} • {barco.preco}
                  </p>
                </button>
                <Button variant="ghost" size="sm" onClick={() => toggleFavorite(barco.id)}>
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContaFavoritos;
