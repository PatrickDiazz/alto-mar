import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  BadgeCheck,
  AlertTriangle,
  Ship,
  Users,
  Ruler,
  Trash2,
  Pencil,
  X,
  Anchor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBarcos } from "@/hooks/useBarcos";
import {
  barcosStore,
  getPendencias,
  type Embarcacao,
  type Marinheiro,
} from "@/data/embarcacoes";
import boatExterior from "@/assets/boat-exterior.jpg";

const emptyForm = {
  nome: "",
  distancia: "",
  preco: "",
  descricao: "",
  tamanho: "",
  capacidade: "",
  tipo: "Lancha",
  documentacaoBarco: false,
  marinheiroNome: "",
  marinheiroDoc: false,
};

const Marinheiro_Page = () => {
  const navigate = useNavigate();
  const barcos = useBarcos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Embarcacao) => {
    setForm({
      nome: b.nome,
      distancia: b.distancia,
      preco: b.preco,
      descricao: b.descricao,
      tamanho: b.tamanho,
      capacidade: String(b.capacidade),
      tipo: b.tipo,
      documentacaoBarco: b.documentacaoBarco,
      marinheiroNome: b.marinheiro?.nome ?? "",
      marinheiroDoc: b.marinheiro?.documentoOk ?? false,
    });
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const marinheiro: Marinheiro | undefined = form.marinheiroNome
      ? { nome: form.marinheiroNome, documentoOk: form.marinheiroDoc }
      : undefined;

    const data: Omit<Embarcacao, "id" | "verificado"> = {
      nome: form.nome,
      distancia: form.distancia,
      preco: form.preco,
      nota: "0,0",
      imagens: [boatExterior],
      descricao: form.descricao,
      tamanho: form.tamanho,
      capacidade: Number(form.capacidade) || 0,
      tipo: form.tipo,
      documentacaoBarco: form.documentacaoBarco,
      marinheiro,
    };

    if (editingId) {
      barcosStore.update(editingId, data);
    } else {
      barcosStore.add({
        ...data,
        id: String(Date.now()),
        verificado: false,
      });
    }
    setDialogOpen(false);
  };

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
              Painel do Marinheiro
            </h1>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Barco
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {barcos.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Nenhum barco cadastrado ainda.
          </p>
        )}

        {barcos.map((barco) => {
          const pendencias = getPendencias(barco);
          return (
            <div
              key={barco.id}
              className="flex gap-4 border border-border rounded-lg p-4 bg-card shadow-card animate-fade-in"
            >
              <img
                src={barco.imagens[0]}
                alt={barco.nome}
                className="w-24 h-24 rounded-md object-cover shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {barco.nome}
                  </h3>
                  {barco.verificado ? (
                    <Badge
                      variant="default"
                      className="bg-verified text-verified-foreground text-[10px] gap-1"
                    >
                      <BadgeCheck className="w-3 h-3" /> Validado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-accent border-accent text-[10px] gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" /> Pendente
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ship className="w-3.5 h-3.5" /> {barco.tipo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" /> {barco.tamanho}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {barco.capacidade} pessoas
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {barco.preco}
                </p>
                {barco.marinheiro && (
                  <p className="text-xs text-muted-foreground">
                    Marinheiro: {barco.marinheiro.nome}
                    {barco.marinheiro.documentoOk ? " ✓" : " (doc. pendente)"}
                  </p>
                )}
                {pendencias.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pendencias.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(barco)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => barcosStore.remove(barco.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Barco" : "Adicionar Barco"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da embarcação e do marinheiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nome do barco</Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Lancha Malou Blue"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Input
                  value={form.tipo}
                  onChange={(e) => set("tipo", e.target.value)}
                  placeholder="Lancha, Veleiro..."
                />
              </div>
              <div className="space-y-1">
                <Label>Tamanho</Label>
                <Input
                  value={form.tamanho}
                  onChange={(e) => set("tamanho", e.target.value)}
                  placeholder="Ex: 32 pés"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Capacidade (pessoas)</Label>
                <Input
                  type="number"
                  value={form.capacidade}
                  onChange={(e) => set("capacidade", e.target.value)}
                  placeholder="12"
                />
              </div>
              <div className="space-y-1">
                <Label>Preço (diária)</Label>
                <Input
                  value={form.preco}
                  onChange={(e) => set("preco", e.target.value)}
                  placeholder="R$ 3.500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Localização</Label>
              <Input
                value={form.distancia}
                onChange={(e) => set("distancia", e.target.value)}
                placeholder="Angra dos Reis/RJ"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                placeholder="Descreva a embarcação..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Documentação do barco OK?</Label>
              <Switch
                checked={form.documentacaoBarco}
                onCheckedChange={(v) => set("documentacaoBarco", v)}
              />
            </div>

            <hr className="border-border" />

            <h3 className="text-sm font-semibold text-foreground">
              Marinheiro
            </h3>
            <div className="space-y-1">
              <Label>Nome do marinheiro</Label>
              <Input
                value={form.marinheiroNome}
                onChange={(e) => set("marinheiroNome", e.target.value)}
                placeholder="Ex: Carlos Silva"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Documentação do marinheiro OK?</Label>
              <Switch
                checked={form.marinheiroDoc}
                onCheckedChange={(v) => set("marinheiroDoc", v)}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={!form.nome}>
              {editingId ? "Salvar alterações" : "Adicionar barco"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marinheiro_Page;
