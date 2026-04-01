import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  Ship,
  Ruler,
  Users,
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
import { apiUrl, authFetch, getStoredUser } from "@/lib/auth";

const KIT_CHURRASCO_PRECO = 250;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);

  if (digits.length <= 3) return p1;
  if (digits.length <= 6) return `${p1}.${p2}`;
  if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

function formatTelefoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) return digits;

  // 11 dígitos (celular): (DD) 9XXXX-XXXX
  if (digits.length >= 11) {
    const p1 = rest.slice(0, 5);
    const p2 = rest.slice(5, 9);
    return `(${ddd}) ${p1}-${p2}`;
  }

  // 10 dígitos (fixo): (DD) XXXX-XXXX
  const p1 = rest.slice(0, 4);
  const p2 = rest.slice(4, 8);
  if (rest.length <= 4) return `(${ddd}) ${p1}`;
  return `(${ddd}) ${p1}-${p2}`;
}

async function criarPreferenciaMercadoPago(input: {
  titulo: string;
  valor: number;
  metodoPagamento: "pix" | "cartao";
  nome: string;
  cpf: string;
  telefone: string;
  externalReference: string;
  bookingId: string;
}) {
  const resp = await fetch(apiUrl("/api/mercadopago/preference"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "Falha ao criar preferência de pagamento.");
  }

  return (await resp.json()) as { init_point?: string; sandbox_init_point?: string };
}

async function criarReserva(input: {
  boatId: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  embarkLocation: string;
  totalCents: number;
}) {
  const resp = await authFetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "Falha ao criar reserva.");
  }
  return (await resp.json()) as { booking: { id: string; status: string; ownerUserId: string } };
}

const Reservar = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { boats: barcos, isLoading: barcosLoading, isError: barcosError, error: barcosErr } = useBarcos();
  const barco = barcos.find((b) => b.id === id);
  const user = getStoredUser();

  useEffect(() => {
    if (id && !user) {
      navigate("/login", { state: { from: `/reservar/${id}` }, replace: true });
    }
  }, [id, user, navigate]);

  const [pessoas, setPessoas] = useState(1);
  const [criancas, setCriancas] = useState(0);
  const [temCriancas, setTemCriancas] = useState(false);
  const [kitChurrasco, setKitChurrasco] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [localEmbarque, setLocalEmbarque] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pagando, setPagando] = useState(false);

  if (!user && id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecionando para login...</p>
      </div>
    );
  }

  if (barcosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (barcosError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-3 text-center">
        <p className="text-destructive font-medium">Não foi possível carregar os barcos.</p>
        <p className="text-sm text-muted-foreground max-w-md">{barcosErr?.message}</p>
      </div>
    );
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Embarcação não encontrada.</p>
      </div>
    );
  }

  const locaisDisponiveis =
    barco.locaisEmbarque && barco.locaisEmbarque.length > 0
      ? barco.locaisEmbarque
      : [barco.distancia || "Local a combinar"];

  const precoBase = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
  const total = precoBase + (kitChurrasco ? KIT_CHURRASCO_PRECO : 0);

  useEffect(() => {
    if (!localEmbarque && locaisDisponiveis.length > 0) {
      setLocalEmbarque(locaisDisponiveis[0]);
    }
  }, [localEmbarque, locaisDisponiveis]);

  const handleConfirmar = async () => {
    const user = getStoredUser();
    if (!user) {
      toast.error("Faça login para reservar.");
      navigate("/login", { state: { from: `/reservar/${barco.id}` } });
      return;
    }
    if (user.role !== "banhista") {
      toast.error("Apenas banhistas podem reservar.");
      return;
    }
    if (!nomeCompleto.trim() || !cpf.trim() || !telefone.trim()) {
      toast.error("Preencha todos os dados pessoais.");
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits.length !== 11) {
      toast.error("CPF inválido. Confira e tente novamente.");
      return;
    }
    const telDigits = onlyDigits(telefone);
    if (telDigits.length !== 10 && telDigits.length !== 11) {
      toast.error("Telefone inválido. Use DDD + número.");
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

    setPagando(true);
    try {
      const totalCents = total * 100;
      const booking = await criarReserva({
        boatId: barco.id,
        passengersAdults: pessoas,
        passengersChildren: criancas,
        hasKids: temCriancas,
        bbqKit: kitChurrasco,
        embarkLocation: localEmbarque,
        totalCents,
      });

      const externalReference = booking.booking.id;
      const pref = await criarPreferenciaMercadoPago({
        titulo: `Reserva: ${barco.nome}`,
        valor: total,
        metodoPagamento: metodoPagamento === "pix" ? "pix" : "cartao",
        nome: nomeCompleto,
        cpf: cpfDigits,
        telefone: telDigits,
        externalReference,
        bookingId: booking.booking.id,
      });

      const paymentUrl = pref.init_point || pref.sandbox_init_point;
      if (!paymentUrl) {
        throw new Error("Não foi possível obter o link de pagamento.");
      }

      toast.success("Pagamento gerado! Abrindo checkout do Mercado Pago…", { duration: 3000 });
      window.open(paymentUrl, "_blank", "noopener,noreferrer");

      const msg = encodeURIComponent(
        `Olá! Gostaria de confirmar a reserva:\n` +
          `Barco: ${barco.nome}\n` +
          `Pessoas: ${pessoas} adultos${temCriancas ? ` + ${criancas} crianças` : ""}\n` +
          `Local: ${localEmbarque}\n` +
          `Kit Churrasco: ${kitChurrasco ? "Sim" : "Não"}\n` +
          `Pagamento: ${metodoPagamento === "pix" ? "PIX" : "Cartão"}\n` +
          `Total: R$ ${total.toLocaleString("pt-BR")}\n` +
          `Nome: ${nomeCompleto}\nCPF: ${formatCpf(cpfDigits)}\nTel: ${formatTelefoneBR(telDigits)}\n` +
          `Link de pagamento: ${paymentUrl}\n` +
          `Reserva: ${booking.booking.id}`
      );
      window.open(`https://wa.me/5524999999999?text=${msg}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao iniciar pagamento.";
      toast.error(message);
    } finally {
      setPagando(false);
    }
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
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  maxLength={14}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
                  maxLength={15}
                  inputMode="tel"
                  autoComplete="tel"
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
              {locaisDisponiveis.map((local) => (
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
            disabled={pagando}
          >
            {pagando ? "Gerando pagamento..." : "Confirmar reserva"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reservar;
