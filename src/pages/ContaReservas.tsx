import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";

type RenterBooking = {
  id: string;
  status: string;
  createdAt: string;
  bookingDate?: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  embarkLocation: string;
  totalCents: number;
  routeIslands: string[];
  boat: { id: string; nome: string; distancia: string; capacidade?: number };
};

const KIT_CHURRASCO_PRECO = 250;

const ContaReservas = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const locale = bcp47FromAppLang(i18n.language);
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const [list, setList] = useState<RenterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RenterBooking> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await authFetch("/api/renter/bookings");
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.loadFail")));
      const data = (await resp.json()) as { bookings: RenterBooking[] };
      setList(data.bookings || []);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.loadFail")).trim();
      toast.error(m || t("reservasConta.loadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "banhista") {
      navigate("/conta", { replace: true });
      return;
    }
    void load();
  }, [user?.id, navigate]);

  const pending = useMemo(() => list.filter((b) => b.status === "PENDING"), [list]);
  const inProgress = useMemo(() => list.filter((b) => b.status === "ACCEPTED"), [list]);
  const done = useMemo(() => list.filter((b) => b.status === "COMPLETED"), [list]);
  const other = useMemo(
    () => list.filter((b) => !["PENDING", "ACCEPTED", "COMPLETED"].includes(b.status)),
    [list]
  );

  const startEdit = (b: RenterBooking) => {
    if (b.status === "DECLINED" || b.status === "CANCELLED" || b.status === "COMPLETED") return;
    setEditingId(b.id);
    setEditDraft({ ...b });
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    const original = list.find((x) => x.id === editingId);
    if (!original) return;
    const cap = original.boat.capacidade ?? 99;
    const adults = editDraft.passengersAdults ?? original.passengersAdults;
    const children = editDraft.passengersChildren ?? original.passengersChildren;
    if (adults + children > cap) {
      toast.error(t("reservar.toastCapacity", { n: cap }));
      return;
    }
    if (!editDraft.bookingDate?.trim()) {
      toast.error(t("reservar.toastDate"));
      return;
    }
    try {
      const oldR = original.totalCents / 100;
      const base = oldR - (original.bbqKit ? KIT_CHURRASCO_PRECO : 0);
      const newTotalReais = base + (editDraft.bbqKit ? KIT_CHURRASCO_PRECO : 0);
      const resp = await authFetch(`/api/renter/bookings/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengersAdults: editDraft.passengersAdults,
          passengersChildren: editDraft.passengersChildren,
          hasKids: editDraft.hasKids,
          bbqKit: editDraft.bbqKit,
          embarkLocation: editDraft.embarkLocation,
          totalCents: Math.round(newTotalReais * 100),
          routeIslands: editDraft.routeIslands,
          bookingDate: editDraft.bookingDate,
        }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.saveFail")));
      toast.success(t("reservasConta.saveOk"));
      setEditingId(null);
      setEditDraft(null);
      await load();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.saveFail")).trim();
      toast.error(m || t("reservasConta.saveFail"));
    }
  };

  if (!user || user.role !== "banhista") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => navigate("/conta")} className="text-foreground hover:text-primary shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("reservasConta.title")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-8">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t("reservasConta.sectionPending")}</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("reservasConta.emptyPending")}</p>
              ) : (
                pending.map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    currencyFmt={currencyFmt}
                    t={t}
                    onEdit={() => startEdit(b)}
                    editing={editingId === b.id}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    onSave={saveEdit}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                  />
                ))
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t("reservasConta.sectionProgress")}</h2>
              {inProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("reservasConta.emptyProgress")}</p>
              ) : (
                inProgress.map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    currencyFmt={currencyFmt}
                    t={t}
                    onEdit={() => startEdit(b)}
                    editing={editingId === b.id}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    onSave={saveEdit}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                  />
                ))
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t("reservasConta.sectionDone")}</h2>
              {done.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("reservasConta.emptyDone")}</p>
              ) : (
                done.map((b) => <BookingCard key={b.id} b={b} currencyFmt={currencyFmt} t={t} readOnly />)
              )}
            </section>

            {other.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">{t("reservasConta.sectionOther")}</h2>
                {other.map((b) => (
                  <BookingCard key={b.id} b={b} currencyFmt={currencyFmt} t={t} readOnly />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

function BookingCard({
  b,
  currencyFmt,
  t,
  onEdit,
  editing,
  editDraft,
  setEditDraft,
  onSave,
  onCancelEdit,
  readOnly,
}: {
  b: RenterBooking;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  onEdit?: () => void;
  editing?: boolean;
  editDraft?: Partial<RenterBooking> | null;
  setEditDraft?: (v: Partial<RenterBooking> | null) => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
  readOnly?: boolean;
}) {
  const { i18n } = useTranslation();
  const dateFnsLocale = i18n.language.startsWith("pt") ? ptBR : i18n.language.startsWith("es") ? es : enUS;
  const d = editing && editDraft ? editDraft : b;
  const canEdit = !readOnly && b.status !== "COMPLETED" && b.status !== "DECLINED" && b.status !== "CANCELLED";
  const cap = b.boat.capacidade ?? 99;
  const showDate = d.bookingDate;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{b.boat.nome}</p>
          <p className="text-xs text-muted-foreground">{b.boat.distancia}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground shrink-0">{b.status}</span>
      </div>
      {showDate ? (
        <p className="text-xs text-foreground">
          {t("reservasConta.bookingDate")}:{" "}
          {format(new Date(`${showDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("reservasConta.route")}: {(d.routeIslands || []).length ? (d.routeIslands || []).join(", ") : "—"}
      </p>
      <p>
        {currencyFmt.format((d.totalCents || 0) / 100)} · {d.embarkLocation}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("reservar.passengers")}: {d.passengersAdults} {t("reservar.adults")}
        {d.hasKids ? ` + ${d.passengersChildren} ${t("reservar.kids")}` : ""} · {t("reservar.maxCap", { n: cap })}
      </p>

      {editing && editDraft && setEditDraft ? (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("reservar.tripDate")}</Label>
            <BoatCalendarPanel
              variant="picker"
              boatId={b.boat.id}
              selectedDate={editDraft.bookingDate ?? null}
              onSelectDate={(iso) => setEditDraft({ ...editDraft, bookingDate: iso })}
              excludeBookingId={b.id}
            />
          </div>
          <div>
            <Label>{t("reservar.passengers")}</Label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm">{t("reservar.adults")}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                  onClick={() =>
                    setEditDraft({
                      ...editDraft,
                      passengersAdults: Math.max(1, (editDraft.passengersAdults ?? 1) - 1),
                    })
                  }
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-medium">{editDraft.passengersAdults ?? 1}</span>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                  onClick={() =>
                    setEditDraft({
                      ...editDraft,
                      passengersAdults: Math.min(
                        cap - (editDraft.passengersChildren ?? 0),
                        (editDraft.passengersAdults ?? 1) + 1
                      ),
                    })
                  }
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">{t("reservar.kidsQuestion")}</span>
              <Switch
                checked={Boolean(editDraft.hasKids)}
                onCheckedChange={(v) =>
                  setEditDraft({
                    ...editDraft,
                    hasKids: v,
                    passengersChildren: v ? (editDraft.passengersChildren ?? 0) : 0,
                  })
                }
              />
            </div>
            {editDraft.hasKids ? (
              <div className="flex items-center justify-between mt-2 pl-1">
                <span className="text-sm text-muted-foreground">{t("reservar.kids")}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                    onClick={() =>
                      setEditDraft({
                        ...editDraft,
                        passengersChildren: Math.max(0, (editDraft.passengersChildren ?? 0) - 1),
                      })
                    }
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-medium">{editDraft.passengersChildren ?? 0}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                    onClick={() =>
                      setEditDraft({
                        ...editDraft,
                        passengersChildren: Math.min(
                          cap - (editDraft.passengersAdults ?? 1),
                          (editDraft.passengersChildren ?? 0) + 1
                        ),
                      })
                    }
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <Label>{t("reservar.embark")}</Label>
            <Input
              value={editDraft.embarkLocation || ""}
              onChange={(e) => setEditDraft({ ...editDraft, embarkLocation: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>{t("reservar.bbqTitle")}</Label>
            <Switch
              checked={Boolean(editDraft.bbqKit)}
              onCheckedChange={(v) => setEditDraft({ ...editDraft, bbqKit: v })}
            />
          </div>
          <div>
            <Label>{t("reservasConta.routeStops")}</Label>
            <Input
              value={(editDraft.routeIslands || []).join(", ")}
              onChange={(e) =>
                setEditDraft({
                  ...editDraft,
                  routeIslands: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>
              {t("reservasConta.save")}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancelEdit}>
              {t("common.cancel")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("reservasConta.editHint")}</p>
        </div>
      ) : canEdit && onEdit ? (
        <Button size="sm" variant="secondary" onClick={onEdit}>
          {t("reservasConta.edit")}
        </Button>
      ) : null}
    </div>
  );
}

export default ContaReservas;
