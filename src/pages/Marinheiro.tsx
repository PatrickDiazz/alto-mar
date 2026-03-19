import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Anchor,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";

type OwnerBoat = {
  id: string;
  nome: string;
  distancia: string;
  precoCents: number;
  preco: string;
  nota: string;
  rating: number;
  tamanhoPes: number;
  tamanho: string;
  capacidade: number;
  tipo: string;
  descricao: string;
  verificado: boolean;
};

const Marinheiro_Page = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [boats, setBoats] = useState<OwnerBoat[]>([]);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [boatForm, setBoatForm] = useState<OwnerBoat | null>(null);

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

  const carregarMeusBarcos = async () => {
    try {
      const resp = await authFetch("/api/owner/boats");
      if (!resp.ok) throw new Error(await resp.text());
      const data = (await resp.json()) as { boats: OwnerBoat[] };
      setBoats(data.boats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar barcos.");
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

  const iniciarEdicao = (boat: OwnerBoat) => {
    setEditingBoatId(boat.id);
    setBoatForm({ ...boat });
  };

  const salvarEdicao = async () => {
    if (!editingBoatId || !boatForm) return;
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/boats/${editingBoatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: boatForm.nome,
          distancia: boatForm.distancia,
          precoCents: Number(boatForm.precoCents),
          rating: Number(boatForm.rating),
          tamanhoPes: Number(boatForm.tamanhoPes),
          capacidade: Number(boatForm.capacidade),
          tipo: boatForm.tipo,
          descricao: boatForm.descricao,
          verificado: Boolean(boatForm.verificado),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Barco atualizado.");
      setEditingBoatId(null);
      setBoatForm(null);
      await carregarMeusBarcos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar barco.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLocatario) return;
    carregarMeusBarcos();
    carregarPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocatario]);

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
            <Button
              size="sm"
              onClick={() => {
                carregarMeusBarcos();
                carregarPendentes();
              }}
              disabled={loading || !isLocatario}
            >
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
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Meus barcos</h2>
                <Badge variant="outline">{boats.length}</Badge>
              </div>

              {boats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum barco vinculado à sua conta.</p>
              ) : (
                <div className="space-y-3">
                  {boats.map((boat) => {
                    const editing = editingBoatId === boat.id && boatForm;
                    return (
                      <div key={boat.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                        {!editing ? (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{boat.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {boat.tipo} • {boat.tamanho} • {boat.capacidade} pessoas
                                </p>
                                <p className="text-xs text-muted-foreground">{boat.distancia}</p>
                                <p className="text-xs text-muted-foreground">
                                  {boat.preco} • Nota {boat.nota}
                                </p>
                              </div>
                              <Button variant="secondary" size="sm" onClick={() => iniciarEdicao(boat)}>
                                <Pencil className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{boat.descricao}</p>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Nome</Label>
                                <Input value={boatForm.nome} onChange={(e) => setBoatForm({ ...boatForm, nome: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>Tipo</Label>
                                <Input value={boatForm.tipo} onChange={(e) => setBoatForm({ ...boatForm, tipo: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>Localização</Label>
                                <Input value={boatForm.distancia} onChange={(e) => setBoatForm({ ...boatForm, distancia: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>Preço (R$)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={Math.round((boatForm.precoCents || 0) / 100)}
                                  onChange={(e) =>
                                    setBoatForm({ ...boatForm, precoCents: Number(e.target.value || 0) * 100 })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Tamanho (pés)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={boatForm.tamanhoPes}
                                  onChange={(e) => setBoatForm({ ...boatForm, tamanhoPes: Number(e.target.value || 1) })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Capacidade</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={boatForm.capacidade}
                                  onChange={(e) => setBoatForm({ ...boatForm, capacidade: Number(e.target.value || 1) })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Nota (0-5)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={5}
                                  value={boatForm.rating}
                                  onChange={(e) => setBoatForm({ ...boatForm, rating: Number(e.target.value || 0) })}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Descrição</Label>
                              <Textarea
                                rows={3}
                                value={boatForm.descricao}
                                onChange={(e) => setBoatForm({ ...boatForm, descricao: e.target.value })}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={salvarEdicao} disabled={loading}>
                                Salvar edição
                              </Button>
                              <Button
                                className="flex-1"
                                variant="secondary"
                                onClick={() => {
                                  setEditingBoatId(null);
                                  setBoatForm(null);
                                }}
                                disabled={loading}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

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
          </>
        )}
      </div>
    </div>
  );
};

export default Marinheiro_Page;
