import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ArrowLeft, LogIn, UserPlus, LogOut } from "lucide-react";
import BoatCard from "@/components/BoatCard";
import FilterBar from "@/components/FilterBar";
import { useBarcos } from "@/hooks/useBarcos";
import { getStoredUser, clearSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Explorar = () => {
  const navigate = useNavigate();
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [tamFiltro, setTamFiltro] = useState<string>("Todos");
  const [vagasFiltro, setVagasFiltro] = useState<string>("Todos");
  const [precoFiltro, setPrecoFiltro] = useState<string>("Todos");
  const listaBarcos = useBarcos();

  const tiposDisponiveis = useMemo(() => {
    const set = new Set(listaBarcos.map((b) => b.tipo).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [listaBarcos]);

  const listaExibida = useMemo(() => {
    return listaBarcos.filter((barco) => {
      const q = busca.trim().toLowerCase();
      if (q) {
        const hay = `${barco.nome} ${barco.tipo} ${barco.distancia}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Tipo
      if (tipoFiltro !== "Todos" && barco.tipo !== tipoFiltro) return false;

      // Tamanho (em pés, vindo de "32 pés")
      if (tamFiltro !== "Todos") {
        const pes = parseInt(barco.tamanho.replace(/[^0-9]/g, ""), 10);
        if (tamFiltro === "Até 25 pés" && !(pes <= 25)) return false;
        if (tamFiltro === "26–30 pés" && !(pes >= 26 && pes <= 30)) return false;
        if (tamFiltro === "31+ pés" && !(pes >= 31)) return false;
      }

      // Vagas (capacidade)
      if (vagasFiltro !== "Todos") {
        const cap = barco.capacidade;
        if (vagasFiltro === "Até 6" && !(cap <= 6)) return false;
        if (vagasFiltro === "7–10" && !(cap >= 7 && cap <= 10)) return false;
        if (vagasFiltro === "11–16" && !(cap >= 11 && cap <= 16)) return false;
        if (vagasFiltro === "17+" && !(cap >= 17)) return false;
      }

      // Preço
      if (precoFiltro !== "Todos") {
        const valor = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
        if (precoFiltro === "Até R$ 2.000" && !(valor <= 2000)) return false;
        if (precoFiltro === "R$ 2.001–3.000" && !(valor >= 2001 && valor <= 3000)) return false;
        if (precoFiltro === "R$ 3.001–4.500" && !(valor >= 3001 && valor <= 4500)) return false;
        if (precoFiltro === "R$ 4.501+" && !(valor >= 4501)) return false;
      }

      return true;
    });
  }, [busca, listaBarcos, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro]);

  /** Nota no formato "4,8" (pt-BR) — só barcos com avaliação acima de 4,5 */
  const favoritosAngrenses = useMemo(
    () =>
      listaBarcos.filter((b) => {
        const n = parseFloat(String(b.nota).replace(",", ".").trim());
        return !Number.isNaN(n) && n > 4.5;
      }),
    [listaBarcos]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Explorar</h1>
          </div>
          {getStoredUser() ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground max-w-[120px] truncate" title={getStoredUser()?.name}>
                {getStoredUser()?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearSession();
                  navigate("/explorar");
                }}
                className="text-muted-foreground"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" state={{ from: "/explorar" }}>
                  <LogIn className="w-4 h-4 mr-1" />
                  Entrar
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup" state={{ from: "/explorar" }}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Criar conta
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 border border-border rounded-full px-4 py-3 shadow-card bg-card">
            <Search className="w-5 h-5 text-primary" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Explorar barcos"
              className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              aria-label="Explorar barcos"
            />
          </div>
        </div>

        <FilterBar filtroAtivo={filtroAtivo} onFiltroChange={setFiltroAtivo} />

        {filtroAtivo !== "Todos" && (
          <div className="mx-auto max-w-md">
            {filtroAtivo === "Tipo" && (
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {tiposDisponiveis.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filtroAtivo === "Tam." && (
              <Select value={tamFiltro} onValueChange={setTamFiltro}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Até 25 pés">Até 25 pés</SelectItem>
                  <SelectItem value="26–30 pés">26–30 pés</SelectItem>
                  <SelectItem value="31+ pés">31+ pés</SelectItem>
                </SelectContent>
              </Select>
            )}

            {filtroAtivo === "Vagas" && (
              <Select value={vagasFiltro} onValueChange={setVagasFiltro}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione as vagas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Até 6">Até 6</SelectItem>
                  <SelectItem value="7–10">7–10</SelectItem>
                  <SelectItem value="11–16">11–16</SelectItem>
                  <SelectItem value="17+">17+</SelectItem>
                </SelectContent>
              </Select>
            )}

            {filtroAtivo === "Preço" && (
              <Select value={precoFiltro} onValueChange={setPrecoFiltro}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione o preço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Até R$ 2.000">Até R$ 2.000</SelectItem>
                  <SelectItem value="R$ 2.001–3.000">R$ 2.001–3.000</SelectItem>
                  <SelectItem value="R$ 3.001–4.500">R$ 3.001–4.500</SelectItem>
                  <SelectItem value="R$ 4.501+">R$ 4.501+</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Encontre o barco ideal
          </h2>
          {listaExibida.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum barco encontrado para este filtro.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listaExibida.map((barco) => (
                <BoatCard key={barco.id} barco={barco} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Favorito dos angrenses
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Barcos com avaliação acima de 4,5
          </p>
          {favoritosAngrenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum barco com nota acima de 4,5 no momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favoritosAngrenses.map((barco) => (
                <BoatCard key={barco.id} barco={barco} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Explorar;
