import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import BoatCard from "@/components/BoatCard";
import { ExploreFiltersCard, JETSKY_TYPE } from "@/components/ExploreFiltersCard";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcos } from "@/hooks/useBarcos";
import { getStoredUser, clearSession, authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo-altomar.png";
import {
  matchesExploreFilters,
  type ExploreMainFilter,
  type SizeFilterKey,
  type SeatsFilterKey,
  type PriceFilterKey,
} from "@/lib/exploreFilters";

const Explorar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mainFilter, setMainFilter] = useState<ExploreMainFilter>("all");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [tamFiltro, setTamFiltro] = useState<SizeFilterKey>("all");
  const [vagasFiltro, setVagasFiltro] = useState<SeatsFilterKey>("all");
  const [precoFiltro, setPrecoFiltro] = useState<PriceFilterKey>("all");
  const { boats: listaBarcos, isLoading: barcosLoading, isError: barcosError, refetch: refetchBarcos } = useBarcos();
  const user = getStoredUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const tiposDisponiveis = useMemo(() => {
    const set = new Set(listaBarcos.map((b) => b.tipo).filter(Boolean));
    set.add(JETSKY_TYPE);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [listaBarcos]);

  const listaExibida = useMemo(() => {
    return listaBarcos.filter((barco) =>
      matchesExploreFilters(barco, {
        q: busca,
        tipoFiltro,
        tamFiltro,
        vagasFiltro,
        precoFiltro,
      })
    );
  }, [busca, listaBarcos, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro]);

  const favoritosAngrenses = useMemo(
    () =>
      listaBarcos.filter((b) => {
        const n = parseFloat(String(b.nota).replace(",", ".").trim());
        return !Number.isNaN(n) && n > 4.5;
      }),
    [listaBarcos]
  );

  const labelTipo = (tipo: string) => (tipo === JETSKY_TYPE ? t("explorar.jetskyType") : tipo);

  useEffect(() => {
    let active = true;
    const loadFavorites = async () => {
      if (!user) {
        setFavoriteIds(new Set());
        return;
      }
      try {
        const resp = await authFetch("/api/favorites");
        if (!resp.ok) throw new Error(await resp.text());
        const data = (await resp.json()) as { boatIds: string[] };
        if (active) setFavoriteIds(new Set(data.boatIds));
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("explorar.favLoadError");
        if (!msg.includes("user_boat_favorites")) {
          toast.error(msg);
        }
      }
    };
    loadFavorites();
    return () => {
      active = false;
    };
  }, [user?.id, t]);

  const toggleFavorite = async (boatId: string) => {
    if (!user) return;
    const already = favoriteIds.has(boatId);
    const next = new Set(favoriteIds);
    if (already) next.delete(boatId);
    else next.add(boatId);
    setFavoriteIds(next);

    try {
      const resp = await authFetch(`/api/favorites/${boatId}`, {
        method: already ? "DELETE" : "POST",
      });
      if (!resp.ok) throw new Error(await resp.text());
    } catch (e) {
      setFavoriteIds(new Set(favoriteIds));
      toast.error(e instanceof Error ? e.message : t("explorar.favToggleError"));
    }
  };

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(t("explorar.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              onClick={() => navigate("/explorar")}
              className="shrink-0 rounded-md outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("explorar.title")}
            >
              <img src={logo} alt="" className="h-9 w-auto max-h-10 object-contain object-left" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HeaderSettingsMenu />
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigate("/conta")}
                className="text-sm text-muted-foreground max-w-[100px] sm:max-w-[120px] truncate hover:text-foreground transition-colors"
                title={user?.name}
              >
                {user?.name}
              </button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground px-2 shrink-0">
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">{t("explorar.logout")}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
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
          tiposDisponiveis={tiposDisponiveis}
          labelTipo={labelTipo}
        />

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("explorar.sectionIdeal")}</h2>
          {barcosLoading && <p className="text-center text-muted-foreground py-8">{t("explorar.loadingBoats")}</p>}
          {barcosError && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">{t("explorar.loadErrorTitle")}</p>
              <p className="text-muted-foreground">{t("common.boatsUnavailable")}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => refetchBarcos()}>
                {t("common.tryAgain")}
              </Button>
            </div>
          )}
          {!barcosLoading && !barcosError && listaExibida.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("explorar.noResultsFilter")}</p>
          ) : !barcosLoading && !barcosError ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listaExibida.map((barco) => (
                <BoatCard
                  key={barco.id}
                  barco={barco}
                  isFavorited={favoriteIds.has(barco.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("explorar.sectionAngrenses")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("explorar.sectionAngrensesHint")}</p>
          {barcosError ? (
            <p className="text-center text-muted-foreground py-8 text-sm">{t("explorar.fixLoadAbove")}</p>
          ) : favoritosAngrenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("explorar.noHighRating")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favoritosAngrenses.map((barco) => (
                <BoatCard
                  key={barco.id}
                  barco={barco}
                  isFavorited={favoriteIds.has(barco.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Explorar;
