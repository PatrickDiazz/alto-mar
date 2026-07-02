import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Baby, Flame, Minus, Plus, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";
import {
  RESCHEDULE_REASONS,
  type RescheduleReason,
  rescheduleReasonI18nKey,
} from "@/lib/rescheduleReasons";
import { cn } from "@/lib/utils";
import type { RenterBooking } from "./renterBookingTypes";
import {
  RENTER_CALENDAR_WRAP,
  RENTER_CARD,
  RENTER_CARD_COMPACT,
  RENTER_OPTIONAL_CHECKED,
  RENTER_OPTIONAL_DEFAULT,
  RENTER_PROGRESS_FILL,
  RENTER_PROGRESS_TRACK,
  RENTER_RADIO_LABEL,
  RENTER_RESCHEDULE_CARD,
  RENTER_SELECT_TRIGGER,
  RENTER_STEPPER_BTN,
  RENTER_SURFACE_ROW,
  RENTER_TEXT_ACCENT,
  RENTER_TEXT_BODY,
  RENTER_TEXT_LABEL,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_SUBBODY,
  RENTER_TEXT_TITLE,
} from "./renterBookingUi";
import { RenterBookingAlert } from "./RenterBookingAlert";
import { RenterBookingRouteTimeline } from "./RenterBookingRouteTimeline";
import { Info, AlertTriangle } from "lucide-react";

const BANHISTA_BOOKING_LEAD_DAYS = 2;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className={cn("text-sm font-semibold", RENTER_TEXT_TITLE)}>{children}</h4>;
}

function StepperButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={RENTER_STEPPER_BTN}
    >
      {children}
    </button>
  );
}

type Props = {
  booking: RenterBooking;
  editing: boolean;
  editDraft: Partial<RenterBooking> | null;
  setEditDraft?: Dispatch<SetStateAction<Partial<RenterBooking> | null>>;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
  compact?: boolean;
  /** Mobile accordion: render only one read-only section */
  mobileSection?: "trip" | "embark" | "extras" | "route";
};

export function RenterBookingDetailSections({
  booking,
  editing,
  editDraft,
  setEditDraft,
  currencyFmt,
  t,
  lang,
  compact = false,
  mobileSection,
}: Props) {
  const b = booking;
  const d = editing && editDraft ? editDraft : b;
  const cap = b.boat.capacidade ?? 99;
  const dateFnsLocale = localeForLang(lang);
  const passengers = (d.passengersAdults ?? 0) + (d.hasKids ? d.passengersChildren ?? 0 : 0);
  const capacityPct = cap > 0 ? Math.min(100, (passengers / cap) * 100) : 0;

  const origDate = b.bookingDate ?? "";
  const draftDate = editDraft?.bookingDate ?? "";
  const canChangeTripDate = b.status === "ACCEPTED" || b.status === "PENDING";
  const isRescheduling = Boolean(
    editing && editDraft && b.status === "ACCEPTED" && draftDate !== origDate
  );

  const locOpts = b.embarkLocationOptions ?? [];
  const timeOpts = b.embarkTimeOptions ?? [];

  const bbqPrice = b.boat.bbqKitPriceCents
    ? currencyFmt.format(Number(b.boat.bbqKitPriceCents) / 100)
    : null;
  const jetPrice =
    b.boat.jetSkiOffered && b.boat.jetSkiPriceCents
      ? currencyFmt.format(Number(b.boat.jetSkiPriceCents) / 100)
      : null;

  const cardClass = compact ? RENTER_CARD_COMPACT : RENTER_CARD;
  const sectionGap = compact ? "space-y-4" : "space-y-6";
  const innerGap = compact ? "space-y-4" : "space-y-6";

  if (compact && !editing) {
    const routeText = (b.routeIslands || []).length ? b.routeIslands.join(" → ") : "—";
    return (
      <div>
        <SectionTitle>{t("reservasConta.sectionTripData")}</SectionTitle>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          {d.bookingDate ? (
            <div>
              <dt className={RENTER_TEXT_LABEL}>{t("reservar.tripDate")}</dt>
              <dd className={cn("mt-0.5 font-medium", RENTER_TEXT_BODY)}>
                {format(new Date(`${d.bookingDate}T12:00:00`), "d MMM yyyy", { locale: dateFnsLocale })}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className={RENTER_TEXT_LABEL}>{t("reservar.passengers")}</dt>
            <dd className={cn("mt-0.5 font-medium", RENTER_TEXT_BODY)}>
              {d.passengersAdults} {t("reservar.adults")}
              {d.hasKids ? ` · ${d.passengersChildren} ${t("reservar.kids")}` : ""}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className={RENTER_TEXT_LABEL}>{t("reservar.embark")}</dt>
            <dd className={cn("mt-0.5 font-medium", RENTER_TEXT_BODY)}>
              {d.embarkLocation || t("reservar.embarkLocationToArrange")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className={RENTER_TEXT_LABEL}>{t("reservar.embarkTime")}</dt>
            <dd className={cn("mt-0.5 font-medium", RENTER_TEXT_BODY)}>
              {d.embarkTime || t("reservar.embarkTimeToArrange")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className={RENTER_TEXT_LABEL}>{t("reservasConta.routeStops")}</dt>
            <dd className={cn("mt-0.5 font-medium leading-relaxed", RENTER_TEXT_BODY)}>{routeText}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (editing && editDraft && setEditDraft) {
    return (
      <div className="space-y-4">
        <RenterBookingAlert variant="info" icon={Info}>
          {t("reservasConta.editScopeHint")}
        </RenterBookingAlert>
        {b.status === "ACCEPTED" ? (
          <RenterBookingAlert variant="warning" icon={AlertTriangle}>
            {t("reservasConta.editHint")}
          </RenterBookingAlert>
        ) : null}

        <div className={cardClass}>
          <SectionTitle>{t("reservasConta.sectionTripData")}</SectionTitle>
          <div className={cn("mt-3", innerGap)}>
            <div>
              <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("reservar.tripDate")}
              </p>
              {canChangeTripDate ? (
                <>
                  <div className={RENTER_CALENDAR_WRAP}>
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
                            bookingDate: iso ?? undefined,
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
                  </div>
                  <div className={cn("mt-3 flex flex-wrap gap-3 text-xs", RENTER_TEXT_MUTED)}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-muted-foreground/40" />
                      {t("reservasConta.legendUnavailable")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" />
                      {t("reservasConta.legendBooked")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/40" />
                      {t("reservasConta.legendPending")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#2563EB] dark:bg-blue-500" />
                      {t("reservasConta.legendSelected")}
                    </span>
                  </div>
                </>
              ) : d.bookingDate ? (
                <p className={cn("text-base font-semibold", RENTER_TEXT_TITLE)}>
                  {format(new Date(`${d.bookingDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
                </p>
              ) : (
                <p className={cn("text-sm", RENTER_TEXT_MUTED)}>—</p>
              )}
            </div>

            <div>
              <p className={cn("mb-3 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("reservar.passengers")}
              </p>
              <div className="space-y-4">
                <div className={cn("flex items-center justify-between", RENTER_SURFACE_ROW)}>
                  <span className={cn("text-sm font-medium", RENTER_TEXT_SUBBODY)}>{t("reservar.adults")}</span>
                  <div className="flex items-center gap-3">
                    <StepperButton
                      onClick={() =>
                        setEditDraft({
                          ...editDraft,
                          passengersAdults: Math.max(1, (editDraft.passengersAdults ?? 1) - 1),
                        })
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </StepperButton>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">
                      {editDraft.passengersAdults ?? 1}
                    </span>
                    <StepperButton
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
                      <Plus className="h-4 w-4" />
                    </StepperButton>
                  </div>
                </div>
                <div className={cn("flex items-center justify-between", RENTER_SURFACE_ROW)}>
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium", RENTER_TEXT_SUBBODY)}>
                    <Baby className={cn("h-4 w-4", RENTER_TEXT_LABEL)} />
                    {t("reservar.kidsQuestion")}
                  </span>
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
                  <div className={cn("flex items-center justify-between pl-8", RENTER_SURFACE_ROW)}>
                    <span className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("reservar.kids")}</span>
                    <div className="flex items-center gap-3">
                      <StepperButton
                        onClick={() =>
                          setEditDraft({
                            ...editDraft,
                            passengersChildren: Math.max(0, (editDraft.passengersChildren ?? 0) - 1),
                          })
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </StepperButton>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {editDraft.passengersChildren ?? 0}
                      </span>
                      <StepperButton
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
                        <Plus className="h-4 w-4" />
                      </StepperButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isRescheduling ? (
          <div className={cn(cardClass, RENTER_RESCHEDULE_CARD)}>
            <SectionTitle>{t("reservasConta.rescheduleSectionTitle")}</SectionTitle>
            <p className={cn("mt-1 text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.rescheduleSectionHint")}</p>
            <div className="mt-4 space-y-4">
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
                    <label key={r} className={RENTER_RADIO_LABEL}>
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
                  className="rounded-xl"
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
                  className="rounded-xl"
                  placeholder={t("reservasConta.rescheduleNotePh")}
                  value={editDraft.rescheduleNote ?? ""}
                  maxLength={4000}
                  rows={4}
                  onChange={(e) => setEditDraft({ ...editDraft, rescheduleNote: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ra-${b.id}`}>{t("reservasConta.rescheduleAttachmentsLabel")}</Label>
                <p className={cn("text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.rescheduleAttachmentsHint")}</p>
                <Input
                  id={`ra-${b.id}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="cursor-pointer rounded-xl"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const urls = await Promise.all(files.map(fileToDataUrl));
                    const merged = [...(editDraft.rescheduleAttachments ?? []), ...urls].slice(0, 8);
                    setEditDraft({ ...editDraft, rescheduleAttachments: merged });
                    e.target.value = "";
                  }}
                />
                {(editDraft.rescheduleAttachments ?? []).length > 0 ? (
                  <p className={cn("text-xs", RENTER_TEXT_MUTED)}>
                    {(editDraft.rescheduleAttachments ?? []).length} / 8
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (mobileSection && !editing) {
    if (mobileSection === "trip") {
      return (
        <div className="space-y-4">
          {d.bookingDate ? (
            <div>
              <p className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("reservar.tripDate")}
              </p>
              <p className={cn("mt-1 text-base font-semibold", RENTER_TEXT_TITLE)}>
                {format(new Date(`${d.bookingDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
              </p>
            </div>
          ) : null}
          <div>
            <p className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.passengers")}
            </p>
            <p className={cn("mt-1 text-sm font-medium", RENTER_TEXT_BODY)}>
              {d.passengersAdults} {t("reservar.adults")}
              {d.hasKids ? ` · ${d.passengersChildren} ${t("reservar.kids")}` : ""}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={RENTER_TEXT_MUTED}>{t("reservasConta.capacityUsage")}</span>
              <span className={cn("font-semibold tabular-nums", RENTER_TEXT_TITLE)}>
                {passengers} / {cap} {t("reservar.passengers").toLowerCase()}
              </span>
            </div>
            <div className={cn("h-2 overflow-hidden rounded-full", RENTER_PROGRESS_TRACK)}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  capacityPct >= 100 ? "bg-amber-500" : RENTER_PROGRESS_FILL
                )}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (mobileSection === "embark") {
      return (
        <div className="space-y-4">
          <div>
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.embark")}
            </p>
            {locOpts.length > 0 ? (
              <p className={cn("text-sm font-medium", RENTER_TEXT_BODY)}>{d.embarkLocation || "—"}</p>
            ) : (
              <RenterBookingAlert variant="info" icon={Info} className="!rounded-xl">
                {t("reservar.embarkLocationToArrange")}
              </RenterBookingAlert>
            )}
          </div>
          <div>
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.embarkTime")}
            </p>
            {timeOpts.length > 0 ? (
              <p className={cn("text-sm font-medium", RENTER_TEXT_BODY)}>{d.embarkTime || "—"}</p>
            ) : (
              <RenterBookingAlert variant="info" icon={Info} className="!rounded-xl">
                {t("reservar.embarkTimeToArrange")}
              </RenterBookingAlert>
            )}
          </div>
        </div>
      );
    }

    if (mobileSection === "extras") {
      if (!bbqPrice && !(b.boat.jetSkiOffered && jetPrice) && !d.bbqKit && !d.jetSki) {
        return <p className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("reservasConta.noExtras")}</p>;
      }
      return (
        <div className="grid gap-2">
          {bbqPrice ? (
            <OptionalCard
              icon={<Flame className="h-5 w-5 text-orange-500" />}
              title={t("reservar.bbqTitle")}
              description={t("reservar.bbqDesc")}
              price={bbqPrice}
              checked={Boolean(d.bbqKit)}
              editing={false}
            />
          ) : null}
          {b.boat.jetSkiOffered && jetPrice ? (
            <OptionalCard
              icon={<Waves className="h-5 w-5 text-[#2563EB] dark:text-blue-400" />}
              title={t("reservar.jetSkiTitle")}
              description={t("reservar.jetSkiDesc")}
              price={jetPrice}
              checked={Boolean(d.jetSki)}
              editing={false}
            />
          ) : null}
        </div>
      );
    }

    if (mobileSection === "route") {
      return (
        <RenterBookingRouteTimeline
          stops={b.routeIslands || []}
          t={t}
          readOnlyHint={t("reservasConta.routeStopsReadOnly")}
        />
      );
    }
  }

  return (
    <div className={sectionGap}>
      {editing && b.status === "ACCEPTED" ? (
        <RenterBookingAlert variant="warning" icon={AlertTriangle}>
          {t("reservasConta.editHint")}
        </RenterBookingAlert>
      ) : null}

      {/* 1. Trip data */}
      <div className={cardClass}>
        <SectionTitle>{t("reservasConta.sectionTripData")}</SectionTitle>

        <div className={cn("mt-3", innerGap)}>
          <div>
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.tripDate")}
            </p>
            {editing && editDraft && setEditDraft && canChangeTripDate ? (
              <>
                <div className={RENTER_CALENDAR_WRAP}>
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
                          bookingDate: iso ?? undefined,
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
                </div>
                <div className={cn("mt-3 flex flex-wrap gap-3 text-xs", RENTER_TEXT_MUTED)}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-muted-foreground/40" />
                    {t("reservasConta.legendUnavailable")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" />
                    {t("reservasConta.legendBooked")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/40" />
                    {t("reservasConta.legendPending")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#2563EB] dark:bg-blue-500" />
                    {t("reservasConta.legendSelected")}
                  </span>
                </div>
              </>
            ) : d.bookingDate ? (
              <p className={cn("text-base font-semibold", RENTER_TEXT_TITLE)}>
                {format(new Date(`${d.bookingDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
              </p>
            ) : (
              <p className={cn("text-sm", RENTER_TEXT_MUTED)}>—</p>
            )}
          </div>

          <div>
            <p className={cn("mb-3 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.passengers")}
            </p>
            {editing && editDraft && setEditDraft ? (
              <div className="space-y-4">
                <div className={cn("flex items-center justify-between", RENTER_SURFACE_ROW)}>
                  <span className={cn("text-sm font-medium", RENTER_TEXT_SUBBODY)}>{t("reservar.adults")}</span>
                  <div className="flex items-center gap-3">
                    <StepperButton
                      onClick={() =>
                        setEditDraft({
                          ...editDraft,
                          passengersAdults: Math.max(1, (editDraft.passengersAdults ?? 1) - 1),
                        })
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </StepperButton>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">
                      {editDraft.passengersAdults ?? 1}
                    </span>
                    <StepperButton
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
                      <Plus className="h-4 w-4" />
                    </StepperButton>
                  </div>
                </div>
                <div className={cn("flex items-center justify-between", RENTER_SURFACE_ROW)}>
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium", RENTER_TEXT_SUBBODY)}>
                    <Baby className={cn("h-4 w-4", RENTER_TEXT_LABEL)} />
                    {t("reservar.kidsQuestion")}
                  </span>
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
                  <div className={cn("flex items-center justify-between pl-8", RENTER_SURFACE_ROW)}>
                    <span className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("reservar.kids")}</span>
                    <div className="flex items-center gap-3">
                      <StepperButton
                        onClick={() =>
                          setEditDraft({
                            ...editDraft,
                            passengersChildren: Math.max(0, (editDraft.passengersChildren ?? 0) - 1),
                          })
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </StepperButton>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {editDraft.passengersChildren ?? 0}
                      </span>
                      <StepperButton
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
                        <Plus className="h-4 w-4" />
                      </StepperButton>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={cn("text-sm", RENTER_TEXT_SUBBODY)}>
                {d.passengersAdults} {t("reservar.adults")}
                {d.hasKids ? ` · ${d.passengersChildren} ${t("reservar.kids")}` : ""}
              </p>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={RENTER_TEXT_MUTED}>{t("reservasConta.capacityUsage")}</span>
                <span className={cn("font-semibold tabular-nums", RENTER_TEXT_TITLE)}>
                  {passengers} / {cap} {t("reservar.passengers").toLowerCase()}
                </span>
              </div>
              <div className={cn("h-2 overflow-hidden rounded-full", RENTER_PROGRESS_TRACK)}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    capacityPct >= 100 ? "bg-amber-500" : RENTER_PROGRESS_FILL
                  )}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Embark */}
      <div className={cardClass}>
        <SectionTitle>{t("reservar.embark")}</SectionTitle>
        <div className={cn("mt-3", compact ? "space-y-3" : "space-y-5")}>
          <div>
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.embark")}
            </p>
            {editing && editDraft && setEditDraft && locOpts.length > 0 ? (
              <Select
                value={editDraft.embarkLocation || ""}
                onValueChange={(v) => setEditDraft({ ...editDraft, embarkLocation: v })}
              >
                <SelectTrigger className={RENTER_SELECT_TRIGGER}>
                  <SelectValue placeholder={t("reservar.selectPlace")} />
                </SelectTrigger>
                <SelectContent>
                  {locOpts.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : locOpts.length > 0 ? (
              <p className={cn("text-sm font-medium", RENTER_TEXT_BODY)}>{d.embarkLocation || "—"}</p>
            ) : (
              <RenterBookingAlert variant="info" icon={Info} className="!rounded-xl">
                {t("reservar.embarkLocationToArrange")}
              </RenterBookingAlert>
            )}
          </div>
          <div>
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
              {t("reservar.embarkTime")}
            </p>
            {editing && editDraft && setEditDraft && timeOpts.length > 0 ? (
              <Select
                value={editDraft.embarkTime || ""}
                onValueChange={(v) => setEditDraft({ ...editDraft, embarkTime: v })}
              >
                <SelectTrigger className={RENTER_SELECT_TRIGGER}>
                  <SelectValue placeholder={t("reservar.selectTime")} />
                </SelectTrigger>
                <SelectContent>
                  {timeOpts.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : timeOpts.length > 0 ? (
              <p className={cn("text-sm font-medium", RENTER_TEXT_BODY)}>{d.embarkTime || "—"}</p>
            ) : (
              <RenterBookingAlert variant="info" icon={Info} className="!rounded-xl">
                {t("reservar.embarkTimeToArrange")}
              </RenterBookingAlert>
            )}
          </div>
        </div>
      </div>

      {/* 3. Extras */}
      {bbqPrice || (b.boat.jetSkiOffered && jetPrice) || d.bbqKit || d.jetSki ? (
        <div className={cardClass}>
          <SectionTitle>{t("reservasConta.sectionExtras")}</SectionTitle>
          <div className={cn("mt-3 grid gap-2", compact ? "grid-cols-1" : "gap-3 sm:grid-cols-2")}>
            {bbqPrice ? (
              <OptionalCard
                icon={<Flame className="h-5 w-5 text-orange-500" />}
                title={t("reservar.bbqTitle")}
                description={t("reservar.bbqDesc")}
                price={bbqPrice}
                checked={Boolean(d.bbqKit)}
                editing={editing && Boolean(setEditDraft)}
                onCheckedChange={
                  editing && editDraft && setEditDraft
                    ? (v) => setEditDraft({ ...editDraft, bbqKit: v })
                    : undefined
                }
              />
            ) : null}
            {b.boat.jetSkiOffered && jetPrice ? (
              <OptionalCard
                icon={<Waves className="h-5 w-5 text-[#2563EB] dark:text-blue-400" />}
                title={t("reservar.jetSkiTitle")}
                description={t("reservar.jetSkiDesc")}
                price={jetPrice}
                checked={Boolean(d.jetSki)}
                editing={editing && Boolean(setEditDraft)}
                onCheckedChange={
                  editing && editDraft && setEditDraft
                    ? (v) => setEditDraft({ ...editDraft, jetSki: v })
                    : undefined
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 4. Route */}
      {!compact ? (
      <div className={cardClass}>
        <RenterBookingRouteTimeline
          stops={b.routeIslands || []}
          t={t}
          readOnlyHint={t("reservasConta.routeStopsReadOnly")}
        />
      </div>
      ) : null}

      {/* Reschedule form */}
      {editing && editDraft && setEditDraft && isRescheduling ? (
        <div className={cn(cardClass, RENTER_RESCHEDULE_CARD)}>
          <SectionTitle>{t("reservasConta.rescheduleSectionTitle")}</SectionTitle>
          <p className={cn("mt-1 text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.rescheduleSectionHint")}</p>
          <div className="mt-4 space-y-4">
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
                  <label
                    key={r}
                    className={RENTER_RADIO_LABEL}
                  >
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
                className="rounded-xl"
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
                className="rounded-xl"
                placeholder={t("reservasConta.rescheduleNotePh")}
                value={editDraft.rescheduleNote ?? ""}
                maxLength={4000}
                rows={4}
                onChange={(e) => setEditDraft({ ...editDraft, rescheduleNote: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ra-${b.id}`}>{t("reservasConta.rescheduleAttachmentsLabel")}</Label>
              <p className={cn("text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.rescheduleAttachmentsHint")}</p>
              <Input
                id={`ra-${b.id}`}
                type="file"
                accept="image/*"
                multiple
                className="cursor-pointer rounded-xl"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const urls = await Promise.all(files.map(fileToDataUrl));
                  const merged = [...(editDraft.rescheduleAttachments ?? []), ...urls].slice(0, 8);
                  setEditDraft({ ...editDraft, rescheduleAttachments: merged });
                  e.target.value = "";
                }}
              />
              {(editDraft.rescheduleAttachments ?? []).length > 0 ? (
                <p className={cn("text-xs", RENTER_TEXT_MUTED)}>
                  {(editDraft.rescheduleAttachments ?? []).length} / 8
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OptionalCard({
  icon,
  title,
  description,
  price,
  checked,
  editing,
  onCheckedChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  price: string;
  checked: boolean;
  editing: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
        checked
          ? RENTER_OPTIONAL_CHECKED
          : RENTER_OPTIONAL_DEFAULT,
        !editing && "cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn("text-sm font-semibold", RENTER_TEXT_TITLE)}>{title}</span>
        </div>
        {editing && onCheckedChange ? (
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        ) : checked ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{description ? "✓" : ""}</span>
        ) : null}
      </div>
      {description ? <p className={cn("text-xs leading-relaxed", RENTER_TEXT_MUTED)}>{description}</p> : null}
      <p className={cn("text-sm font-bold tabular-nums", RENTER_TEXT_ACCENT)}>+ {price}</p>
    </label>
  );
}
