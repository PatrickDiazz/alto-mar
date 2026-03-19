import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  Ship,
  Ruler,
  Users,
  Flame,
  CreditCard,
  QrCode,
  MapPin,
  Baby,
  UtensilsCrossed,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBarcos } from "@/hooks/useBarcos";
import { toast } from "sonner";

const KIT_CHURRASCO_PRECO = 250;

const Reservar = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const barcos = useBarcos();
  const barco = barcos.find((b) => b.id === id);

  const [pessoas, setPessoas] = useState(1);
  const [criancas, setCriancas] = useState(0);
  const [temCriancas, setTemCriancas] = useState(false);
  const [kitChurrasco, setKitChurrasco] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [localEmbarque, setLocalEmbarque] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Embarcação não encontrada.</p>
      </div>
    );
  }

  const precoBase = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
  const total = precoBase + (kitChurrasco ? KIT_CHURRASCO_PRECO : 0);

  const handleConfirmar = () => {
    if (!nomeCompleto.trim() || !cpf.trim() || !telefone.trim()) {
      toast.error("Preencha todos os dados pessoais.");
      return;
    }
    if (!localEmbarque) {
      toast.error("Selecione o local de embarque.");
      return;
    }
    if (pessoas + criancas > barco.capacidade) {
      toast.error(`Capacidade máxima: ${barco.capacidade} pessoas.`);
      return;
    }

    toast.success("Reserva confirmada! Você receberá os detalhes por WhatsApp.", {
      duration: 4000,
    });

    const msg = encodeURIComponent(
      `Olá! Gostaria de confirmar a reserva:\n` +
        `Barco: ${barco.nome}\n` +
        `Pessoas: ${pessoas} adultos${temCriancas ? ` + ${criancas} crianças` : ""}\n` +
        `Local: ${localEmbarque}\n` +
        `Kit Churrasco: ${kitChurrasco ? "Sim" : "Não"}\n` +
        `Pagamento: ${metodoPagamento === "pix" ? "PIX" : "Cartão"}\n` +
        `Total: R$ ${total.toLocaleString("pt-BR")}\n` +
        `Nome: ${nomeCompleto}\nCPF: ${cpf}\nTel: ${telefone}`
    );
    window.open(`https://wa.me/5524999999999?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Reservar</h1>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-32">
        {/* Boat summary */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={barco.imagens[0]}
              alt={barco.nome}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-foreground">{barco.nome}</h2>
              <p className="text-sm text-muted-foreground">{barco.distancia}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Ship className="w-3.5 h-3.5" /> {barco.tipo}
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5" /> {barco.tamanho}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Até {barco.capacidade}
                </span>
              </div>
            </div>
          </div>

          {/* Amenidades */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">O que está incluso</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {barco.amenidades.map((a) => (
                <div
                  key={a.nome}
                  className="flex items-center gap-1.5 text-sm"
                >
                  {a.incluido ? (
                    <Check className="w-4 h-4 text-verified shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <span className={a.incluido ? "text-foreground" : "text-muted-foreground line-through"}>
                    {a.nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Dados pessoais</h3>
          <div className="space-y-2">
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Seu nome"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  maxLength={14}
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  maxLength={15}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Local de embarque */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Local de embarque
          </h3>
          <Select value={localEmbarque} onValueChange={setLocalEmbarque}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o local" />
            </SelectTrigger>
            <SelectContent>
              {barco.locaisEmbarque.map((local) => (
                <SelectItem key={local} value={local}>
                  {local}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Pessoas */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Passageiros
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Adultos</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPessoas((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-foreground font-semibold w-6 text-center">{pessoas}</span>
              <button
                onClick={() => setPessoas((p) => Math.min(barco.capacidade, p + 1))}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Baby className="w-4 h-4" /> Vai levar crianças?
            </span>
            <Switch checked={temCriancas} onCheckedChange={(v) => { setTemCriancas(v); if (!v) setCriancas(0); }} />
          </div>

          {temCriancas && (
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">Crianças</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCriancas((c) => Math.max(0, c - 1))}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-foreground font-semibold w-6 text-center">{criancas}</span>
                <button
                  onClick={() => setCriancas((c) => Math.min(barco.capacidade - pessoas, c + 1))}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Capacidade máxima: {barco.capacidade} pessoas
          </p>
        </section>

        {/* Kit Churrasco */}
        <section className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-accent" />
              <div>
                <span className="text-sm font-bold text-foreground">Kit Churrasco</span>
                <p className="text-xs text-muted-foreground">
                  Carne, linguiça, pão de alho, carvão extra e temperos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-accent">
                + R$ {KIT_CHURRASCO_PRECO}
              </span>
              <Switch checked={kitChurrasco} onCheckedChange={setKitChurrasco} />
            </div>
          </div>
        </section>

        {/* Pagamento */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Forma de pagamento
          </h3>
          <RadioGroup value={metodoPagamento} onValueChange={setMetodoPagamento} className="space-y-2">
            <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="pix" id="pix" />
              <QrCode className="w-5 h-5 text-verified" />
              <div>
                <span className="text-sm font-semibold text-foreground">PIX</span>
                <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
              </div>
            </label>
            <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="cartao" id="cartao" />
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <span className="text-sm font-semibold text-foreground">Cartão de crédito</span>
                <p className="text-xs text-muted-foreground">Até 12x sem juros</p>
              </div>
            </label>
          </RadioGroup>
        </section>
      </div>

      {/* Footer fixo */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <span className="text-xl font-bold text-foreground">
              R$ {total.toLocaleString("pt-BR")}
            </span>
          </div>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
            onClick={handleConfirmar}
          >
            Confirmar reserva
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reservar;
