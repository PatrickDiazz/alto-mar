import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, LogOut, Trash2, UserRound, CircleHelp, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBoats, setFavoriteBoats] = useState<Array<{ id: string; nome: string; distancia: string; preco: string }>>([]);
  const [loading, setLoading] = useState(false);

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    const visible = name.slice(0, 2);
    const stars = "*".repeat(Math.max(2, name.length - 2));
    return `${visible}${stars}@${domain}`;
  };

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
        const favData = (await favResp.json()) as {
          boatIds: string[];
          boats?: Array<{ id: string; nome: string; distancia: string; preco: string }>;
        };
        if (!active) return;
        setMe(meData.user);
        const ids = Array.isArray(favData.boatIds) ? favData.boatIds : [];
        setFavoriteIds(new Set(ids));
        setFavoriteBoats(favData.boats || []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("conta.toastLoad"));
      }
    };
    run();
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
      if (!resp.ok) throw new Error(await resp.text());
      if (has) {
        setFavoriteBoats((prev) => prev.filter((b) => b.id !== boatId));
      }
    } catch (e) {
      setFavoriteIds(before);
      toast.error(e instanceof Error ? e.message : t("conta.toastFav"));
    }
  };

  const logout = () => {
    clearSession();
    const goHome = window.confirm(t("conta.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  const deleteAccount = async () => {
    const ok = window.confirm(t("conta.deleteConfirm"));
    if (!ok) return;
    setLoading(true);
    try {
      const resp = await authFetch("/api/me", { method: "DELETE" });
      if (!resp.ok) throw new Error(await resp.text());
      clearSession();
      toast.success(t("conta.toastDeleted"));
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("conta.toastDeleteFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("conta.title")}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HeaderSettingsMenu />
            <Button size="sm" variant="secondary" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />
              {t("conta.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div className="text-sm text-foreground">
            <p className="font-semibold">{me?.name || currentUser?.name}</p>
            <p className="text-muted-foreground">{maskEmail(me?.email || currentUser?.email || "")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => navigate("/conta/dados")}>
              <UserRound className="w-4 h-4 mr-1" />
              {t("conta.accountData")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/conta/ajuda-teste")}>
              <CircleHelp className="w-4 h-4 mr-1" />
              {t("conta.helpTest")}
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">{t("conta.favorites")}</h2>
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
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-1">{t("conta.helpSectionTitle")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("conta.helpSectionDesc")}</p>
          <Button variant="secondary" onClick={() => navigate("/conta/ajuda-teste")}>
            <CircleHelp className="w-4 h-4 mr-1" />
            {t("conta.openHelp")}
          </Button>
        </section>

        <section className="rounded-xl border border-red-200/50 bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-1">{t("conta.riskTitle")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("conta.riskDesc")}</p>
          <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-1" />
            {loading ? t("conta.deleting") : t("conta.delete")}
          </Button>
        </section>
      </div>
    </div>
  );
};

export default ContaUsuario;
