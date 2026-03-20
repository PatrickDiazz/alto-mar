import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BoatCard from "@/components/BoatCard";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";
import { useBarcos } from "@/hooks/useBarcos";

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "banhista" | "locatario";
    created_at: string;
  };
};

const ContaUsuario = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const barcos = useBarcos();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const favoritos = useMemo(
    () => barcos.filter((b) => favoriteIds.has(b.id)),
    [barcos, favoriteIds]
  );

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/conta" }, replace: true });
      return;
    }
    let active = true;
    const run = async () => {
      try {
        const [meResp, favResp] = await Promise.all([authFetch("/api/me"), authFetch("/api/favorites")]);
        if (!meResp.ok) throw new Error(await meResp.text());
        if (!favResp.ok) throw new Error(await favResp.text());
        const meData = (await meResp.json()) as MeResponse;
        const favData = (await favResp.json()) as { boatIds: string[] };
        if (!active) return;
        setMe(meData.user);
        setFavoriteIds(new Set(favData.boatIds));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar conta.");
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [currentUser?.id, navigate]);

  const toggleFavorite = async (boatId: string) => {
    const has = favoriteIds.has(boatId);
    const next = new Set(favoriteIds);
    if (has) next.delete(boatId);
    else next.add(boatId);
    setFavoriteIds(next);
    try {
      const resp = await authFetch(`/api/favorites/${boatId}`, { method: has ? "DELETE" : "POST" });
      if (!resp.ok) throw new Error(await resp.text());
    } catch (e) {
      setFavoriteIds(new Set(favoriteIds));
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar favorito.");
    }
  };

  const logout = () => {
    clearSession();
    navigate("/explorar", { replace: true });
  };

  const deleteAccount = async () => {
    const ok = window.confirm(
      "Tem certeza que deseja excluir sua conta? Esta ação remove sua conta e não pode ser desfeita."
    );
    if (!ok) return;
    setLoading(true);
    try {
      const resp = await authFetch("/api/me", { method: "DELETE" });
      if (!resp.ok) throw new Error(await resp.text());
      clearSession();
      toast.success("Conta excluída.");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Minha conta</h1>
          </div>
          <Button size="sm" variant="secondary" onClick={logout}>
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-3">Dados da conta</h2>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="text-muted-foreground">Nome: </span>
              {me?.name || currentUser?.name}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Email: </span>
              {me?.email || currentUser?.email}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Perfil: </span>
              {me?.role === "locatario" ? "Locatário" : "Banhista"}
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Meus favoritos</h2>
            <span className="text-xs text-muted-foreground">{favoritos.length} barco(s)</span>
          </div>
          {favoritos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Você ainda não favoritou nenhum barco.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favoritos.map((barco) => (
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

        <section className="rounded-xl border border-red-200/50 bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-1">Zona de risco</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Excluir conta remove seus dados de acesso e não pode ser desfeito.
          </p>
          <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-1" />
            {loading ? "Excluindo..." : "Deletar conta"}
          </Button>
        </section>
      </div>
    </div>
  );
};

export default ContaUsuario;

