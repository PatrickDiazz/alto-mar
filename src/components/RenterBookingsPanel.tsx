import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Info, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  RESCHEDULE_REASONS,
  type RescheduleReason,
  rescheduleReasonI18nKey,
} from "@/lib/rescheduleReasons";

type RenterBooking = {
  id: string;
  status: string;
  createdAt: string;
  bookingDate?: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  jetSki?: boolean;
  embarkLocation: string | null;
  embarkTime?: string | null;
  embarkLocationOptions?: string[];
  embarkTimeOptions?: string[];
  totalCents: number;
  routeIslands: string[];
  boat: {
    id: string;
    nome: string;
    distancia: string;
    capacidade?: number;
    jetSkiOffered?: boolean;
    jetSkiPriceCents?: number;
  };
  ratingBoat?: { stars: number; comment: string | null; ratedAt: string } | null;
  rescheduleReason?: RescheduleReason | null;
  rescheduleTitle?: string | null;
  rescheduleNote?: string | null;
  rescheduleAttachments?: string[];
};

const KIT_CHURRASCO_PRECO = 250;
const BANHISTA_BOOKING_LEAD_DAYS = 2;

/** Intervalo para alinhar lista com o servidor (aceite/recusa do locador, etc.). */
const RENTER_BOOKINGS_POLL_MS = 5_000;

function readOnlyStatusBadgeLabel(
  status: string,
  t: (k: string, o?: Record<string, unknown>) => string
) {
  if (status === "COMPLETED") return t("reservasConta.statusDoneBadge");
  if (status === "CANCELLED") return t("reservasConta.statusCancelledBadge");
  if (status === "DECLINED") return t("reservasConta.statusDeclinedBadge");
  return status;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) setLoading(true);
      try {
        const resp = await authFetch("/api/renter/bookings");
        if (resp.status === 401) return;
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.loadFail")));
        const data = (await resp.json()) as { bookings: RenterBooking[] };
        setList(data.bookings || []);
      } catch (e) {
        if (!silent) {
          const m = (e instanceof Error ? e.message : t("reservasConta.loadFail")).trim();
          toast.error(m || t("reservasConta.loadFail"));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    void load();
  }, [user?.id, user?.role, load]);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    const tick = () => void load({ silent: true });
    const interval = window.setInterval(tick, RENTER_BOOKINGS_POLL_MS);
    const onVisibleOrFocus = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, [user?.id, user?.role, load]);

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
    const origDate = original.bookingDate ?? "";
    const newDate = editDraft.bookingDate ?? "";
    const isRescheduling = newDate !== origDate && original.status === "ACCEPTED";
    if (isRescheduling) {
      if (!editDraft.rescheduleReason) {
        toast.error(t("reservasConta.reschedulePickReason"));
        return;
      }
      const title = (editDraft.rescheduleTitle ?? "").trim();
      const note = (editDraft.rescheduleNote ?? "").trim();
      if (title.length < 3) {
        toast.error(t("reservasConta.rescheduleNeedTitle"));
        return;
      }
      if (note.length < 10) {
        toast.error(t("reservasConta.rescheduleNeedNote"));
        return;
      }
    }
    try {
      const oldR = original.totalCents / 100;
      const jetCents = original.boat.jetSkiOffered ? Number(original.boat.jetSkiPriceCents || 0) : 0;
      const jetReais = jetCents / 100;
      const base =
        oldR -
        (original.bbqKit ? KIT_CHURRASCO_PRECO : 0) -
        (original.jetSki && jetCents > 0 ? jetReais : 0);
      const newTotalReais =
        base +
        (editDraft.bbqKit ? KIT_CHURRASCO_PRECO : 0) +
        (editDraft.jetSki && jetCents > 0 ? jetReais : 0);
      const locOpts = original.embarkLocationOptions ?? [];
      const timeOpts = original.embarkTimeOptions ?? [];
      const payload: Record<string, unknown> = {
        passengersAdults: editDraft.passengersAdults,
        passengersChildren: editDraft.passengersChildren,
        hasKids: editDraft.hasKids,
        bbqKit: editDraft.bbqKit,
        jetSki: editDraft.jetSki ?? original.jetSki ?? false,
        embarkLocation: locOpts.length > 0 ? (editDraft.embarkLocation ?? null) : null,
        embarkTime: timeOpts.length > 0 ? (editDraft.embarkTime ?? null) : null,
        totalCents: Math.round(newTotalReais * 100),
        routeIslands: editDraft.routeIslands,
        bookingDate: editDraft.bookingDate,
      };
      if (isRescheduling && editDraft.rescheduleReason) {
        payload.rescheduleReason = editDraft.rescheduleReason;
        payload.rescheduleTitle = (editDraft.rescheduleTitle ?? "").trim();
        payload.rescheduleNote = (editDraft.rescheduleNote ?? "").trim();
        payload.rescheduleAttachments = editDraft.rescheduleAttachments ?? [];
      }
      const resp = await authFetch(`/api/renter/bookings/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.saveFail")));
      toast.success(t("reservasConta.saveOk"));
      setEditingId(null);
      setEditDraft(null);
      await load({ silent: true });
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
        await load({ silent: true });
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
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2.5">
                {inProgress.length > 0 ? (
                  <span className="relative inline-flex h-2.5 w-2.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                ) : null}
                {t("reservasConta.sectionProgress")}
              </h2>
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
                  <BookingCard
                    key={b.id}
                    b={b}
                    currencyFmt={currencyFmt}
                    t={t}
                    readOnly
                    onRated={() => void load({ silent: true })}
                  />
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
  setEditDraft?: Dispatch<SetStateAction<Partial<RenterBooking> | null>>;
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
  const origDate = b.bookingDate ?? "";
  const draftDate = editDraft?.bookingDate ?? "";
  const canChangeTripDate = b.status === "ACCEPTED" || b.status === "PENDING";
  const isRescheduling = Boolean(
    editing && editDraft && b.status === "ACCEPTED" && draftDate !== origDate
  );

  const isCompactableReadOnly = Boolean(readOnly && !["PENDING", "ACCEPTED"].includes(b.status));
  const [readOnlyExpanded, setReadOnlyExpanded] = useState(false);

  useEffect(() => {
    setReadOnlyExpanded(false);
  }, [b.id]);

  const compactReadOnly = isCompactableReadOnly && !readOnlyExpanded;

  return (
    <div
      className={`rounded-xl border text-sm transition-[box-shadow,border-color] ${
        compactReadOnly
          ? "border-border/50 bg-muted/20 p-1 shadow-sm hover:border-border/70 hover:shadow-md"
          : "border-border bg-card p-4 space-y-2.5 shadow-sm"
      }`}
    >
      {compactReadOnly ? (
        <button
          type="button"
          onClick={() => setReadOnlyExpanded(true)}
          className="group w-full rounded-[10px] px-3 py-3 text-left transition-colors hover:bg-background/70 active:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          aria-expanded="false"
          aria-label={t("reservasConta.expandBookingDetails")}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-semibold leading-snug tracking-tight text-foreground">
                {b.boat.nome}
              </p>
              <p className="truncate text-[11px] leading-snug text-muted-foreground">
                {b.boat.distancia}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs">
                <span className="inline-flex items-center rounded-md border border-border/60 bg-background/50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {readOnlyStatusBadgeLabel(b.status, t)}
                </span>
                {showDate ? (
                  <>
                    <time
                      dateTime={showDate}
                      className="tabular-nums text-muted-foreground"
                    >
                      {format(new Date(`${showDate}T12:00:00`), "d MMM yyyy", {
                        locale: dateFnsLocale,
                      })}
                    </time>
                    <span className="text-muted-foreground/40" aria-hidden>
                      ·
                    </span>
                  </>
                ) : null}
                <span className="font-medium tabular-nums text-foreground">
                  {currencyFmt.format((d.totalCents || 0) / 100)}
                </span>
              </div>
              {!b.ratingBoat && onRated ? (
                <span className="mt-1.5 inline-flex rounded-full border border-amber-500/20 bg-amber-500/[0.07] px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-400">
                  {t("reservasConta.ratePendingBadge")}
                </span>
              ) : null}
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-[border-color,background-color,color,box-shadow] group-hover:border-primary/25 group-hover:bg-background group-hover:text-foreground group-hover:shadow"
              aria-hidden
            >
              <ChevronDown className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
            </span>
          </div>
        </button>
      ) : (
        <>
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold leading-snug text-foreground">{b.boat.nome}</p>
              <p className="text-xs text-muted-foreground">{b.boat.distancia}</p>
            </div>
            {isCompactableReadOnly ? (
              <div className="flex shrink-0 items-start gap-2">
                <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {readOnlyStatusBadgeLabel(b.status, t)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm hover:bg-background hover:text-foreground"
                  onClick={() => setReadOnlyExpanded(false)}
                  aria-expanded="true"
                  aria-label={t("reservasConta.collapseDone")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{b.status}</span>
            )}
          </div>
          {showDate ? (
            <p className="text-xs text-foreground">
              {t("reservasConta.bookingDate")}:{" "}
              {format(new Date(`${showDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("reservasConta.route")}:{" "}
            {(d.routeIslands || []).length ? (d.routeIslands || []).join(", ") : "—"}
          </p>
          <p className="tabular-nums">
            {currencyFmt.format((d.totalCents || 0) / 100)} ·{" "}
            {[d.embarkLocation, d.embarkTime].filter(Boolean).join(" · ") ||
              t("reservar.embarkToArrangeShort")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("reservar.passengers")}: {d.passengersAdults} {t("reservar.adults")}
            {d.hasKids ? ` + ${d.passengersChildren} ${t("reservar.kids")}` : ""} ·{" "}
            {t("reservar.maxCap", { n: cap })}
          </p>
          {d.bbqKit || (Boolean(d.jetSki) && b.boat.jetSkiOffered) ? (
            <p className="text-xs text-muted-foreground">
              {d.bbqKit ? t("reservar.bbqTitle") : ""}
              {d.bbqKit && Boolean(d.jetSki) && b.boat.jetSkiOffered ? " · " : ""}
              {Boolean(d.jetSki) && b.boat.jetSkiOffered ? t("reservar.jetSkiTitle") : ""}
            </p>
          ) : null}

          {b.status === "ACCEPTED" ? (
            <div
              className="flex gap-2 rounded-lg border border-primary/35 bg-primary/5 px-3 py-2 text-xs text-foreground leading-snug"
              role="note"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{t("reservasConta.arriveEarlyNotice")}</span>
            </div>
          ) : null}

          {b.status === "COMPLETED" && b.ratingBoat ? (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-foreground">
              <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
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
            {canChangeTripDate ? (
              <>
                <p className="text-xs text-muted-foreground">{t("reservar.tripDateMinLead")}</p>
                <BoatCalendarPanel
                  variant="picker"
                  boatId={b.boat.id}
                  selectedDate={editDraft.bookingDate ?? null}
                  onSelectDate={(iso) =>
                    setEditDraft((prev) => {
                      if (!prev) return prev;
                      const sameAsOriginal = iso === (b.bookingDate ?? "");
                      const clearReschedule = b.status === "PENDING" || sameAsOriginal;
                      return {
                        ...prev,
                        bookingDate: iso,
                        ...(clearReschedule
                          ? {
                              rescheduleReason: undefined,
                              rescheduleTitle: "",
                              rescheduleNote: "",
                              rescheduleAttachments: [],
                            }
                          : {}),
                      };
                    })
                  }
                  excludeBookingId={b.id}
                  bookingLeadDays={BANHISTA_BOOKING_LEAD_DAYS}
                />
              </>
            ) : (
              <p className="text-sm text-foreground">
                {editDraft.bookingDate
                  ? format(new Date(`${editDraft.bookingDate}T12:00:00`), "PPP", {
                      locale: dateFnsLocale,
                    })
                  : "—"}
              </p>
            )}
          </div>
          {isRescheduling ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold text-foreground">{t("reservasConta.rescheduleSectionTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("reservasConta.rescheduleSectionHint")}</p>
              <div className="space-y-2">
                <Label>{t("reservasConta.rescheduleReasonLabel")}</Label>
                <RadioGroup
                  value={editDraft.rescheduleReason ?? ""}
                  onValueChange={(v) =>
                    setEditDraft({ ...editDraft, rescheduleReason: v as RescheduleReason })
                  }
                  className="space-y-2"
                >
                  {RESCHEDULE_REASONS.map((r) => (
                    <label key={r} className="flex items-start gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value={r} id={`rr-${b.id}-${r}`} className="mt-0.5" />
                      <span>{t(rescheduleReasonI18nKey(r))}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`rt-${b.id}`}>{t("reservasConta.rescheduleTitleLabel")}</Label>
                <Input
                  id={`rt-${b.id}`}
                  placeholder={t("reservasConta.rescheduleTitlePh")}
                  value={editDraft.rescheduleTitle ?? ""}
                  maxLength={200}
                  onChange={(e) => setEditDraft({ ...editDraft, rescheduleTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`rn-${b.id}`}>{t("reservasConta.rescheduleNoteLabel")}</Label>
                <Textarea
                  id={`rn-${b.id}`}
                  placeholder={t("reservasConta.rescheduleNotePh")}
                  value={editDraft.rescheduleNote ?? ""}
                  maxLength={4000}
                  rows={4}
                  onChange={(e) => setEditDraft({ ...editDraft, rescheduleNote: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ra-${b.id}`}>{t("reservasConta.rescheduleAttachmentsLabel")}</Label>
                <p className="text-xs text-muted-foreground">{t("reservasConta.rescheduleAttachmentsHint")}</p>
                <Input
                  id={`ra-${b.id}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="cursor-pointer"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const urls = await Promise.all(files.map(fileToDataUrl));
                    const merged = [...(editDraft.rescheduleAttachments ?? []), ...urls].slice(0, 8);
                    setEditDraft({ ...editDraft, rescheduleAttachments: merged });
                    e.target.value = "";
                  }}
                />
                {(editDraft.rescheduleAttachments ?? []).length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {(editDraft.rescheduleAttachments ?? []).length} / 8
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
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
            {(b.embarkLocationOptions ?? []).length > 0 ? (
              <Select
                value={editDraft.embarkLocation || ""}
                onValueChange={(v) => setEditDraft({ ...editDraft, embarkLocation: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("reservar.selectPlace")} />
                </SelectTrigger>
                <SelectContent>
                  {(b.embarkLocationOptions ?? []).map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{t("reservar.embarkLocationToArrange")}</p>
            )}
          </div>
          <div>
            <Label>{t("reservar.embarkTime")}</Label>
            {(b.embarkTimeOptions ?? []).length > 0 ? (
              <Select
                value={editDraft.embarkTime || ""}
                onValueChange={(v) => setEditDraft({ ...editDraft, embarkTime: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("reservar.selectTime")} />
                </SelectTrigger>
                <SelectContent>
                  {(b.embarkTimeOptions ?? []).map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{t("reservar.embarkTimeToArrange")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label>{t("reservar.bbqTitle")}</Label>
            <Switch
              checked={Boolean(editDraft.bbqKit)}
              onCheckedChange={(v) => setEditDraft({ ...editDraft, bbqKit: v })}
            />
          </div>
          {b.boat.jetSkiOffered ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label>{t("reservar.jetSkiTitle")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("reservar.jetSkiDesc")}</p>
                {b.boat.jetSkiPriceCents ? (
                  <p className="text-xs font-medium text-foreground">
                    + {currencyFmt.format(b.boat.jetSkiPriceCents / 100)}
                  </p>
                ) : null}
              </div>
              <Switch
                checked={Boolean(editDraft.jetSki)}
                onCheckedChange={(v) => setEditDraft({ ...editDraft, jetSki: v })}
              />
            </div>
          ) : null}
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
        </>
      )}
    </div>
  );
}
