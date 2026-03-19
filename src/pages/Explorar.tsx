import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import BoatCard from "@/components/BoatCard";
import FilterBar from "@/components/FilterBar";
import { useBarcos } from "@/hooks/useBarcos";

const Explorar = () => {
  const navigate = useNavigate();
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const listaBarcos = useBarcos();

  const listaExibida = useMemo(() => {
    return listaBarcos.filter((barco) => {
      if (filtroAtivo === "Verificados" || filtroAtivo === "Tipo")
        return barco.verificado;
      if (filtroAtivo === "Preço") {
        const valor = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
        return valor < 3000;
      }
      return true;
    });
  }, [filtroAtivo, listaBarcos]);

  const verificados = useMemo(
    () => listaBarcos.filter((b) => b.verificado),
    [listaBarcos]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Explorar</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 border border-border rounded-full px-4 py-3 shadow-card bg-card">
            <Search className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground text-sm">
              Para onde vamos?
            </span>
          </div>
        </div>

        <FilterBar filtroAtivo={filtroAtivo} onFiltroChange={setFiltroAtivo} />

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {verificados.map((barco) => (
              <BoatCard key={barco.id} barco={barco} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Explorar;
