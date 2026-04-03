import { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfDay, parseISO, isBefore } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { useBarcos } from "@/hooks/useBarcos";
import { toast } from "sonner";
import i18n from "@/i18n";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { apiUrl, authFetch, getStoredUser } from "@/lib/auth";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";

const KIT_CHURRASCO_PRECO = 250;
/** Primeira data permitida para reserva do banhista = hoje + N dias corridos */
const BANHISTA_BOOKING_LEAD_DAYS = 2;

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

  if (digits.length >= 11) {
    const p1 = rest.slice(0, 5);
    const p2 = rest.slice(5, 9);
    return `(${ddd}) ${p1}-${p2}`;
  }

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
    throw new Error(text || i18n.t("reservar.prefFail"));
  }

  return (await resp.json()) as { init_point?: string; sandbox_init_point?: string };
}

async function criarReserva(input: {
  boatId: string;
  bookingDate: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  embarkLocation: string;
  totalCents: number;
  routeIslands: string[];
}) {
  const resp = await authFetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || i18n.t("reservar.bookingFail"));
  }
  return (await resp.json()) as { booking: { id: string; status: string; ownerUserId: string } };
}

const Reservar = () => {
  const { t, i18n: i18nReact } = useTranslation();
  const locale = bcp47FromAppLang(i18nReact.language);
  const dateFnsLocale =
    i18nReact.language.startsWith("pt") ? ptBR : i18nReact.language.startsWith("es") ? es : enUS;
  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
      }),
    [locale]
  );

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    boats: barcos,
    isLoading: barcosLoading,
    isError: barcosError,
    refetch: refetchBarcos,
    isRefetching: barcosRefetching,
  } = useBarcos();
  const barco = barcos.find((b) => b.id === id);
  const user = getStoredUser();

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
  /** Paradas do roteiro selecionadas para o passeio */
  const [paradasRoteiro, setParadasRoteiro] = useState<string[]>([]);
  /** Data do passeio (YYYY-MM-DD) */
  const [dataPasseio, setDataPasseio] = useState<string | null>(null);

  useEffect(() => {
    if (!barco) return;
    const locais =
      barco.locaisEmbarque && barco.locaisEmbarque.length > 0
        ? barco.locaisEmbarque
        : [barco.distancia || t("reservar.locationFallback")];
    if (!localEmbarque && locais.length > 0) {
      setLocalEmbarque(locais[0]);
    }
  }, [barco, localEmbarque, t]);

  useEffect(() => {
    if (!barco) return;
    const stops =
      barco.routeIslands && barco.routeIslands.length > 0
        ? [...barco.routeIslands]
        : [barco.distancia || t("reservar.routeFallback")];
    setParadasRoteiro(stops);
  }, [barco, t]);

  useEffect(() => {
    if (!dataPasseio) return;
    const min = addDays(startOfDay(new Date()), BANHISTA_BOOKING_LEAD_DAYS);
    const d = startOfDay(parseISO(`${dataPasseio}T12:00:00`));
    if (isBefore(d, min)) setDataPasseio(null);
  }, [barco?.id, dataPasseio]);

  if (!user) {
    return null;
  }

  if (barcosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (barcosError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4 text-center">
        <p className="text-foreground font-medium">{t("reservar.loadError")}</p>
        <p className="text-sm text-muted-foreground max-w-md">{t("common.boatsUnavailable")}</p>
        <Button
          type="button"
          variant="secondary"
          disabled={barcosRefetching}
          onClick={() => void refetchBarcos()}
        >
          {barcosRefetching ? t("common.loading") : t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("reservar.notFound")}</p>
      </div>
    );
  }

  const locaisDisponiveis =
    barco.locaisEmbarque && barco.locaisEmbarque.length > 0
      ? barco.locaisEmbarque
      : [barco.distancia || t("reservar.locationFallback")];

  const precoBase = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
  const total = precoBase + (kitChurrasco ? KIT_CHURRASCO_PRECO : 0);

  const handleConfirmar = async () => {
    const u = getStoredUser();
    if (!u) {
      toast.error(t("reservar.toastLogin"));
      navigate("/login", { state: { from: `/reservar/${barco.id}` } });
      return;
    }
    if (u.role !== "banhista") {
      toast.error(t("reservar.toastRenterOnly"));
      return;
    }
    if (!nomeCompleto.trim() || !cpf.trim() || !telefone.trim()) {
      toast.error(t("reservar.toastFill"));
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits.length !== 11) {
      toast.error(t("reservar.toastCpf"));
      return;
    }
    const telDigits = onlyDigits(telefone);
    if (telDigits.length !== 10 && telDigits.length !== 11) {
      toast.error(t("reservar.toastPhone"));
      return;
    }
    if (!localEmbarque) {
      toast.error(t("reservar.toastEmbark"));
      return;
    }
    if (paradasRoteiro.length === 0) {
      toast.error(t("reservar.toastRoute"));
      return;
    }
    if (!dataPasseio) {
      toast.error(t("reservar.toastDate"));
      return;
    }
    const minBook = addDays(startOfDay(new Date()), BANHISTA_BOOKING_LEAD_DAYS);
    const chosen = startOfDay(parseISO(`${dataPasseio}T12:00:00`));
    if (isBefore(chosen, minBook)) {
      toast.error(t("reservar.toastDateMinLead"));
      return;
    }
    if (pessoas + criancas > barco.capacidade) {
      toast.error(t("reservar.toastCapacity", { n: barco.capacidade }));
      return;
    }

    setPagando(true);
    try {
      const totalCents = total * 100;
      const booking = await criarReserva({
        boatId: barco.id,
        bookingDate: dataPasseio,
        passengersAdults: pessoas,
        passengersChildren: criancas,
        hasKids: temCriancas,
        bbqKit: kitChurrasco,
        embarkLocation: localEmbarque,
        totalCents,
        routeIslands: paradasRoteiro,
      });

      const externalReference = booking.booking.id;
      const pref = await criarPreferenciaMercadoPago({
        titulo: t("reservar.mpTitle", { name: barco.nome }),
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
        throw new Error(t("reservar.payLinkError"));
      }

      toast.success(t("reservar.toastPayOk"), { duration: 3000 });
      window.open(paymentUrl, "_blank", "noopener,noreferrer");

      const peopleLine =
        `${t("reservar.waPeople")} ${pessoas} ${t("reservar.waAdults")}` +
        (temCriancas ? ` + ${criancas} ${t("reservar.waKids")}` : "");

      const payLabel = metodoPagamento === "pix" ? t("reservar.pix") : t("reservar.card");

      const msg = encodeURIComponent(
        `${t("reservar.waIntro")}\n` +
          `${t("reservar.waBoat")} ${barco.nome}\n` +
          `${peopleLine}\n` +
          `${t("reservar.waPlace")} ${localEmbarque}\n` +
          `${t("reservar.waBbq")} ${kitChurrasco ? t("common.yes") : t("common.no")}\n` +
          `${t("reservar.waPay")} ${payLabel}\n` +
          `${t("reservar.waTotal")} ${currencyFmt.format(total)}\n` +
          `${t("reservar.waName")} ${nomeCompleto}\n${t("reservar.waCpf")} ${formatCpf(cpfDigits)}\n${t("reservar.waTel")} ${formatTelefoneBR(telDigits)}\n` +
          `${t("reservar.waPaymentLink")} ${paymentUrl}\n` +
          `${t("reservar.waBooking")} ${booking.booking.id}`
      );
      window.open(`https://wa.me/5524999999999?text=${msg}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      const message = (e instanceof Error ? e.message : t("reservar.payFail")).trim();
      toast.error(message || t("reservar.payFail"));
    } finally {
      setPagando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="text-foreground hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("reservar.title")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-32">
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
                  <Users className="w-3.5 h-3.5" /> {t("reservar.upToCapacity", { n: barco.capacidade })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{t("reservar.included")}</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {barco.amenidades.map((a) => (
                <div key={a.nome} className="flex items-center gap-1.5 text-sm">
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

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">{t("reservar.personal")}</h3>
          <div className="space-y-2">
            <div>
              <Label htmlFor="nome">{t("reservar.fullName")}</Label>
              <Input
                id="nome"
                placeholder={t("reservar.namePh")}
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cpf">{t("reservar.cpf")}</Label>
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
                <Label htmlFor="telefone">{t("reservar.phone")}</Label>
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

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">{t("reservar.routeStops")}</h3>
          <p className="text-xs text-muted-foreground">{t("reservar.routeStopsHint")}</p>
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            {(barco.routeIslands && barco.routeIslands.length > 0
              ? barco.routeIslands
              : [barco.distancia]
            ).map((stop) => (
              <label key={stop} className="flex items-center gap-3 text-sm cursor-pointer">
                <Checkbox
                  checked={paradasRoteiro.includes(stop)}
                  onCheckedChange={(c) => {
                    if (c === true) {
                      setParadasRoteiro((prev) => (prev.includes(stop) ? prev : [...prev, stop]));
                    } else {
                      setParadasRoteiro((prev) => prev.filter((s) => s !== stop));
                    }
                  }}
                />
                <span>{stop}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-foreground">{t("reservar.tripDate")}</h3>
          <p className="text-xs text-muted-foreground">{t("reservar.tripDateHint")}</p>
          <p className="text-xs text-muted-foreground">{t("reservar.tripDateMinLead")}</p>
          <BoatCalendarPanel
            variant="picker"
            boatId={barco.id}
            selectedDate={dataPasseio}
            onSelectDate={setDataPasseio}
            bookingLeadDays={BANHISTA_BOOKING_LEAD_DAYS}
          />
        </section>

        <section className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t("reservar.reviewTitle")}</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>
              <strong className="text-foreground">{t("reservar.reviewDate")}</strong>{" "}
              {dataPasseio
                ? format(new Date(`${dataPasseio}T12:00:00`), "PPP", { locale: dateFnsLocale })
                : "—"}
            </li>
            <li>
              <strong className="text-foreground">{t("reservar.reviewRoute")}</strong>{" "}
              {paradasRoteiro.length ? paradasRoteiro.join(", ") : "—"}
            </li>
            <li>
              <strong className="text-foreground">{t("reservar.embark")}</strong> {localEmbarque || "—"}
            </li>
            <li>
              <strong className="text-foreground">{t("reservar.passengers")}</strong>{" "}
              {pessoas} + {criancas}
            </li>
            <li>
              <strong className="text-foreground">{t("reservar.bbqTitle")}</strong>{" "}
              {kitChurrasco ? t("common.yes") : t("common.no")}
            </li>
            <li>
              <strong className="text-foreground">{t("common.total")}</strong> {currencyFmt.format(total)}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> {t("reservar.embark")}
          </h3>
          <Select value={localEmbarque} onValueChange={setLocalEmbarque}>
            <SelectTrigger>
              <SelectValue placeholder={t("reservar.selectPlace")} />
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

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {t("reservar.passengers")}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{t("reservar.adults")}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPessoas((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-foreground font-semibold w-6 text-center">{pessoas}</span>
              <button
                type="button"
                onClick={() => setPessoas((p) => Math.min(barco.capacidade, p + 1))}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Baby className="w-4 h-4" /> {t("reservar.kidsQuestion")}
            </span>
            <Switch
              checked={temCriancas}
              onCheckedChange={(v) => {
                setTemCriancas(v);
                if (!v) setCriancas(0);
              }}
            />
          </div>

          {temCriancas && (
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">{t("reservar.kids")}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCriancas((c) => Math.max(0, c - 1))}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-foreground font-semibold w-6 text-center">{criancas}</span>
                <button
                  type="button"
                  onClick={() => setCriancas((c) => Math.min(barco.capacidade - pessoas, c + 1))}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t("reservar.maxCap", { n: barco.capacidade })}
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-accent" />
              <div>
                <span className="text-sm font-bold text-foreground">{t("reservar.bbqTitle")}</span>
                <p className="text-xs text-muted-foreground">{t("reservar.bbqDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-accent">
                + {currencyFmt.format(KIT_CHURRASCO_PRECO)}
              </span>
              <Switch checked={kitChurrasco} onCheckedChange={setKitChurrasco} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> {t("reservar.payment")}
          </h3>
          <RadioGroup value={metodoPagamento} onValueChange={setMetodoPagamento} className="space-y-2">
            <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="pix" id="pix" />
              <QrCode className="w-5 h-5 text-verified" />
              <div>
                <span className="text-sm font-semibold text-foreground">{t("reservar.pix")}</span>
                <p className="text-xs text-muted-foreground">{t("reservar.pixHint")}</p>
              </div>
            </label>
            <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="cartao" id="cartao" />
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <span className="text-sm font-semibold text-foreground">{t("reservar.card")}</span>
                <p className="text-xs text-muted-foreground">{t("reservar.cardHint")}</p>
              </div>
            </label>
          </RadioGroup>
        </section>
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t("common.total")}</p>
            <span className="text-xl font-bold text-foreground">{currencyFmt.format(total)}</span>
          </div>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
            onClick={handleConfirmar}
            disabled={pagando}
          >
            {pagando ? t("reservar.payGenerating") : t("reservar.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reservar;
