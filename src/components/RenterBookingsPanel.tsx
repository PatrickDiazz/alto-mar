import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  ratingBoat?: { stars: number; comment: string | null; ratedAt: string } | null;
};

const KIT_CHURRASCO_PRECO = 250;
const BANHISTA_BOOKING_LEAD_DAYS = 2;

export function RenterBookingsPanel() {
  const { t, i18n } = useTranslation();
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    if (!user || user.role !== "banhista") return;
    void load();
  }, [user?.id, user?.role]);

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

  const requestCancelBooking = (bookingId: string) => {
    if (!window.confirm(t("reservasConta.cancelConfirm"))) return;
    void (async () => {
      setCancellingId(bookingId);
      try {
        const resp = await authFetch(`/api/renter/bookings/${bookingId}/cancel`, { method: "POST" });
        if (resp.status === 401) return;
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.cancelFail")));
        toast.success(t("reservasConta.cancelOk"));
        if (editingId === bookingId) {
          setEditingId(null);
          setEditDraft(null);
        }
        await load();
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("reservasConta.cancelFail")).trim();
        toast.error(m || t("reservasConta.cancelFail"));
      } finally {
        setCancellingId(null);
      }
    })();
  };

  if (!user || user.role !== "banhista") return null;

  return (
    <div className="space-y-8">
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
                    onCancelBooking={() => requestCancelBooking(b.id)}
                    cancellingId={cancellingId}
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
                    onCancelBooking={() => requestCancelBooking(b.id)}
                    cancellingId={cancellingId}
                  />
                ))
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t("reservasConta.sectionDone")}</h2>
              {done.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("reservasConta.emptyDone")}</p>
              ) : (
                done.map((b) => (
                  <BookingCard key={b.id} b={b} currencyFmt={currencyFmt} t={t} readOnly onRated={load} />
                ))
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
  );
}

function RateBoatForm({
  bookingId,
  t,
  onDone,
}: {
  bookingId: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (stars < 1) {
      toast.error(t("reservasConta.rateBoatPickStars"));
      return;
    }
    setSubmitting(true);
    try {
      const resp = await authFetch(`/api/renter/bookings/${bookingId}/rate-boat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.rateBoatFail")));
      toast.success(t("reservasConta.rateBoatOk"));
      onDone();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.rateBoatFail")).trim();
      toast.error(m || t("reservasConta.rateBoatFail"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-3 mt-2 border-t border-border space-y-2">
      <p className="text-xs font-medium text-foreground">{t("reservasConta.rateBoatTitle")}</p>
      <p className="text-[11px] text-muted-foreground">{t("reservasConta.rateBoatHint")}</p>
      <div className="flex items-center gap-1" role="group" aria-label={t("reservasConta.rateBoatTitle")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="p-0.5 rounded hover:bg-secondary disabled:opacity-50"
            disabled={submitting}
            onClick={() => setStars(n)}
            aria-pressed={stars >= n}
          >
            <Star
              className={`w-7 h-7 ${n <= stars ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <div>
        <Label className="text-xs">{t("reservasConta.rateBoatComment")}</Label>
        <Input
          className="mt-1 h-9 text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <Button size="sm" onClick={() => void submit()} disabled={submitting}>
        {submitting ? t("reservasConta.rateBoatSubmitting") : t("reservasConta.rateBoatSubmit")}
      </Button>
    </div>
  );
}

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
  onRated,
  onCancelBooking,
  cancellingId,
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
  onRated?: () => void;
  onCancelBooking?: () => void;
  cancellingId?: string | null;
}) {
  const { i18n } = useTranslation();
  const dateFnsLocale = i18n.language.startsWith("pt") ? ptBR : i18n.language.startsWith("es") ? es : enUS;
  const d = editing && editDraft ? editDraft : b;
  const canEdit = !readOnly && b.status !== "COMPLETED" && b.status !== "DECLINED" && b.status !== "CANCELLED";
  const canCancelBooking =
    Boolean(onCancelBooking) &&
    !readOnly &&
    !editing &&
    (b.status === "PENDING" || b.status === "ACCEPTED");
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

      {b.status === "COMPLETED" && b.ratingBoat ? (
        <p className="text-xs text-foreground flex items-center gap-1.5 pt-1">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          {t("reservasConta.rateBoatRecorded", { n: b.ratingBoat.stars })}
        </p>
      ) : null}
      {b.status === "COMPLETED" && !b.ratingBoat && readOnly && onRated ? (
        <RateBoatForm bookingId={b.id} t={t} onDone={onRated} />
      ) : null}

      {editing && editDraft && setEditDraft ? (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("reservar.tripDate")}</Label>
            <p className="text-xs text-muted-foreground">{t("reservar.tripDateMinLead")}</p>
            <BoatCalendarPanel
              variant="picker"
              boatId={b.boat.id}
              selectedDate={editDraft.bookingDate ?? null}
              onSelectDate={(iso) => setEditDraft({ ...editDraft, bookingDate: iso })}
              excludeBookingId={b.id}
              bookingLeadDays={BANHISTA_BOOKING_LEAD_DAYS}
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
      ) : canCancelBooking || (canEdit && onEdit) ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {canCancelBooking ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              disabled={cancellingId === b.id}
              onClick={onCancelBooking}
            >
              {cancellingId === b.id ? t("reservasConta.cancelSubmitting") : t("reservasConta.cancelBooking")}
            </Button>
          ) : null}
          {canEdit && onEdit ? (
            <Button size="sm" variant="secondary" onClick={onEdit} disabled={Boolean(cancellingId)}>
              {t("reservasConta.edit")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
