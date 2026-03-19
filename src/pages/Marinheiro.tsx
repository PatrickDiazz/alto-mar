import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Anchor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";

const Marinheiro_Page = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  const isLocatario = user?.role === "locatario";

  const pendentes = useMemo(
    () => bookings.filter((b) => b.status === "PENDING"),
    [bookings]
  );

  const carregarPendentes = async () => {
    setLoading(true);
    try {
      const resp = await authFetch("/api/owner/bookings?status=PENDING");
      if (!resp.ok) throw new Error(await resp.text());
      const data = (await resp.json()) as { bookings: any[] };
      setBookings(data.bookings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar reservas.");
    } finally {
      setLoading(false);
    }
  };

  const decidir = async (id: string, action: "accept" | "decline") => {
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/bookings/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteById[id] || "" }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success(action === "accept" ? "Reserva aceita." : "Reserva recusada.");
      await carregarPendentes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar reserva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Anchor className="w-5 h-5 text-primary" />
              Painel do Locatário
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => { clearSession(); navigate("/"); }}>
              Sair
            </Button>
            <Button size="sm" onClick={carregarPendentes} disabled={loading || !isLocatario}>
              {loading ? "Carregando..." : "Atualizar"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {!isLocatario ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <p className="text-sm text-muted-foreground">
              Você precisa estar logado como <span className="font-semibold text-foreground">Locatário</span> para ver reservas.
            </p>
            <Button className="mt-4" onClick={() => navigate("/login", { state: { from: "/marinheiro" } })}>
              Ir para login
            </Button>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Reservas pendentes</h2>
              <Badge variant="outline">{pendentes.length}</Badge>
            </div>

            {pendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhuma reserva pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((b) => (
                  <div key={b.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{b.boat.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Cliente: {b.renter.nome} ({b.renter.email})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Embarque: {b.embarkLocation} • Total: R$ {(b.totalCents / 100).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Passageiros: {b.passengersAdults} adultos
                          {b.hasKids ? ` + ${b.passengersChildren} crianças` : ""}
                          {b.bbqKit ? " • Kit churrasco" : ""}
                        </p>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">Pendente</Badge>
                    </div>

                    <div className="space-y-1">
                      <Label>Observação (opcional)</Label>
                      <Textarea
                        value={noteById[b.id] || ""}
                        onChange={(e) => setNoteById((p) => ({ ...p, [b.id]: e.target.value }))}
                        placeholder="Ex: Confirmado, horário de embarque às 09:00."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => decidir(b.id, "accept")} disabled={loading}>
                        Aceitar
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => decidir(b.id, "decline")}
                        disabled={loading}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Marinheiro_Page;
