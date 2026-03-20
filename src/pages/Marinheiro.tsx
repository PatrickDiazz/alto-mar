import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Anchor, Pencil, Plus } from "lucide-react";
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
  tamanhoPes: number;
  tamanho: string;
  capacidade: number;
  tipo: string;
  descricao: string;
  verificado: boolean;
  tieDocumentUrl?: string | null;
  tiemDocumentUrl?: string | null;
  videoUrl?: string | null;
  routeIslands?: string[];
  imagens: string[];
};

const emptyBoatForm: Omit<OwnerBoat, "id" | "preco" | "nota" | "tamanho"> = {
  nome: "",
  distancia: "",
  precoCents: 0,
  tamanhoPes: 25,
  capacidade: 6,
  tipo: "Lancha",
  descricao: "",
  verificado: false,
  tieDocumentUrl: "",
  tiemDocumentUrl: "",
  videoUrl: "",
  routeIslands: [],
  imagens: [],
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Marinheiro_Page = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [boats, setBoats] = useState<OwnerBoat[]>([]);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [boatForm, setBoatForm] = useState<OwnerBoat | null>(null);
  const [registering, setRegistering] = useState(false);
  const [newBoatForm, setNewBoatForm] = useState(emptyBoatForm);
  const [newRouteIslandsText, setNewRouteIslandsText] = useState("");
  const [editRouteIslandsText, setEditRouteIslandsText] = useState("");

  const isLocatario = user?.role === "locatario";
  const pendentes = useMemo(() => bookings.filter((b) => b.status === "PENDING"), [bookings]);
  const precoPreview = useMemo(() => {
    return `R$ ${Math.max(0, Math.round((newBoatForm.precoCents || 0) / 100)).toLocaleString("pt-BR")}`;
  }, [newBoatForm.precoCents]);

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(
      "Você saiu da conta. Clique em OK para ir à tela inicial ou Cancelar para ficar no Explorar."
    );
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

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
    setEditRouteIslandsText((boat.routeIslands || []).join(", "));
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
          tamanhoPes: Number(boatForm.tamanhoPes),
          capacidade: Number(boatForm.capacidade),
          tipo: boatForm.tipo,
          descricao: boatForm.descricao,
          routeIslands: boatForm.routeIslands || [],
          verificado: Boolean(boatForm.verificado),
          tieDocumentUrl: boatForm.tieDocumentUrl || null,
          tiemDocumentUrl: boatForm.tiemDocumentUrl || null,
          videoUrl: boatForm.videoUrl || null,
          imagens: boatForm.imagens || [],
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Embarcação atualizada.");
      setEditingBoatId(null);
      setBoatForm(null);
      setEditRouteIslandsText("");
      await carregarMeusBarcos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar embarcação.");
    } finally {
      setLoading(false);
    }
  };

  const registrarEmbarcacao = async () => {
    setLoading(true);
    try {
      const payload = {
        ...newBoatForm,
        tieDocumentUrl: newBoatForm.tieDocumentUrl?.trim() ? newBoatForm.tieDocumentUrl.trim() : null,
        tiemDocumentUrl: newBoatForm.tiemDocumentUrl?.trim() ? newBoatForm.tiemDocumentUrl.trim() : null,
        videoUrl: newBoatForm.videoUrl?.trim() ? newBoatForm.videoUrl.trim() : null,
      };
      const resp = await authFetch("/api/owner/boats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Embarcação registrada.");
      setRegistering(false);
      setNewBoatForm(emptyBoatForm);
      setNewRouteIslandsText("");
      await carregarMeusBarcos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar embarcação.");
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
            <button onClick={() => navigate("/")} className="text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Anchor className="w-5 h-5 text-primary" />
              Painel do Locatário
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleLogout}>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{boats.length}</Badge>
                  <Button size="sm" onClick={() => setRegistering((p) => !p)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Registrar embarcação
                  </Button>
                </div>
              </div>

              {registering && (
                <div className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                  <h3 className="font-semibold text-foreground">Nova embarcação</h3>
                  <p className="text-xs text-muted-foreground">
                    Organize os dados por etapas. A avaliação por estrelas vem dos usuários e não é editada aqui.
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground">Prévia do anúncio que será exibido</p>
                    <div className="grid grid-cols-[92px,1fr] gap-3 items-center">
                      <div className="h-20 w-[92px] overflow-hidden rounded-md border border-border bg-secondary">
                        {newBoatForm.imagens?.[0] ? (
                          <img src={newBoatForm.imagens[0]} alt={newBoatForm.nome || "Prévia"} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground truncate">{newBoatForm.nome || "Nome da embarcação"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(newBoatForm.tipo || "Tipo")} • {(newBoatForm.distancia || "Localização")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {newBoatForm.tamanhoPes || 0} pés • {newBoatForm.capacidade || 0} pessoas
                        </p>
                        <p className="text-sm font-semibold text-foreground">{precoPreview}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">Dados principais</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Nome da embarcação</Label>
                        <Input placeholder="Ex: Ventura 265" value={newBoatForm.nome} onChange={(e) => setNewBoatForm({ ...newBoatForm, nome: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Tipo</Label>
                        <Input placeholder="Ex: Lancha" value={newBoatForm.tipo} onChange={(e) => setNewBoatForm({ ...newBoatForm, tipo: e.target.value })} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Localização</Label>
                        <Input placeholder="Ex: Angra dos Reis/RJ" value={newBoatForm.distancia} onChange={(e) => setNewBoatForm({ ...newBoatForm, distancia: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Preço base do passeio</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pl-10"
                            placeholder="0"
                            value={Math.max(1, Math.round(newBoatForm.precoCents / 100))}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                precoCents: Math.max(1, Number(e.target.value || 1)) * 100,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Tamanho da embarcação</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pr-12"
                            placeholder="Ex: 25"
                            value={Math.max(1, newBoatForm.tamanhoPes)}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                tamanhoPes: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">pés</span>
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Capacidade máxima</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pr-16"
                            placeholder="Ex: 6"
                            value={Math.max(1, newBoatForm.capacidade)}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                capacidade: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">pessoas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Textarea placeholder="Descrição da embarcação" value={newBoatForm.descricao} onChange={(e) => setNewBoatForm({ ...newBoatForm, descricao: e.target.value })} />
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">Rotas disponíveis (ilhas)</Label>
                    <Input
                      placeholder="Ex: Ilhas Botinas, Ilha da Gipóia, Praia do Dentista"
                      value={newRouteIslandsText}
                      onChange={(e) => {
                        const text = e.target.value;
                        setNewRouteIslandsText(text);
                        setNewBoatForm({
                          ...newBoatForm,
                          routeIslands: text
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      O app reconhece os nomes e calcula tempo estimado do roteiro automaticamente.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Vídeo da embarcação (link)</Label>
                    <Input placeholder="https://youtube.com/..." value={newBoatForm.videoUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, videoUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fotos da embarcação (upload)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        const urls = await Promise.all(files.map(fileToDataUrl));
                        setNewBoatForm({ ...newBoatForm, imagens: [...newBoatForm.imagens, ...urls] });
                      }}
                    />
                    {newBoatForm.imagens.length > 0 && (
                      <p className="text-xs text-muted-foreground">{newBoatForm.imagens.length} foto(s) anexada(s)</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">Documentação da embarcação</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="TIE digital (link)" value={newBoatForm.tieDocumentUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, tieDocumentUrl: e.target.value })} />
                      <Input placeholder="TIEM digital (link)" value={newBoatForm.tiemDocumentUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, tiemDocumentUrl: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={registrarEmbarcacao} disabled={loading}>Salvar embarcação</Button>
                    <Button variant="secondary" onClick={() => { setRegistering(false); setNewBoatForm(emptyBoatForm); setNewRouteIslandsText(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

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
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pl-10"
                                    value={Math.max(1, Math.round((boatForm.precoCents || 0) / 100))}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        precoCents: Math.max(1, Number(e.target.value || 1)) * 100,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>Tamanho (pés)</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pr-12"
                                    value={Math.max(1, boatForm.tamanhoPes)}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        tamanhoPes: Math.max(1, Number(e.target.value || 1)),
                                      })
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">pés</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>Capacidade</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pr-16"
                                    value={Math.max(1, boatForm.capacidade)}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        capacidade: Math.max(1, Number(e.target.value || 1)),
                                      })
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">pessoas</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Descrição</Label>
                              <Textarea rows={3} value={boatForm.descricao} onChange={(e) => setBoatForm({ ...boatForm, descricao: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label>Rotas disponíveis (ilhas)</Label>
                              <Input
                                placeholder="Ex: Ilhas Botinas, Ilha da Gipóia, Praia do Dentista"
                                value={editRouteIslandsText}
                                onChange={(e) =>
                                  {
                                    const text = e.target.value;
                                    setEditRouteIslandsText(text);
                                    setBoatForm({
                                      ...boatForm,
                                      routeIslands: text
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    });
                                  }
                                }
                              />
                              <p className="text-xs text-muted-foreground">Avaliações são geradas pelos usuários após as reservas.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input placeholder="TIE digital (link)" value={boatForm.tieDocumentUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, tieDocumentUrl: e.target.value })} />
                              <Input placeholder="TIEM digital (link)" value={boatForm.tiemDocumentUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, tiemDocumentUrl: e.target.value })} />
                            </div>
                            <Input placeholder="Vídeo da embarcação (link)" value={boatForm.videoUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, videoUrl: e.target.value })} />
                            <div className="space-y-1">
                              <Label>Fotos da embarcação</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  const urls = await Promise.all(files.map(fileToDataUrl));
                                  setBoatForm({ ...boatForm, imagens: [...(boatForm.imagens || []), ...urls] });
                                }}
                              />
                              <p className="text-xs text-muted-foreground">{(boatForm.imagens || []).length} foto(s)</p>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={salvarEdicao} disabled={loading}>
                                Salvar edição
                              </Button>
                              <Button className="flex-1" variant="secondary" onClick={() => { setEditingBoatId(null); setBoatForm(null); setEditRouteIslandsText(""); }} disabled={loading}>
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
                        <Button className="flex-1" variant="destructive" onClick={() => decidir(b.id, "decline")} disabled={loading}>
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
