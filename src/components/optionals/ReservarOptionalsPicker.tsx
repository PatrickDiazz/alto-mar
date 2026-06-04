import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Boat } from "@/lib/types";
import {
  boatOffersBbq,
  boatHasAnyOptionals,
  jetSkiPublicCoverImage,
  jetSkiPriceReais,
  customOptionalCoverImage,
  customOptionalDisplayTitle,
  type BbqVariant,
} from "@/lib/trip-optionals";
import { fetchBoatOptionalAvailability, type OptionalAvailabilityByDate } from "@/lib/ownerOptionalsApi";
import { BbqKitOptionalCard } from "@/components/optionals/BbqKitOptionalCard";
import { TripOptionalCard } from "@/components/optionals/TripOptionalCard";
import { FilterChipScrollMat } from "@/components/FilterChipScrollMat";

type ReservarOptionalsPickerProps = {
  barco: Boat;
  tripDates: string[];
  currencyFmt: Intl.NumberFormat;
  kitChurrasco: boolean;
  onKitChurrascoChange: (v: boolean) => void;
  bbqVariant: BbqVariant;
  onBbqVariantChange: (v: BbqVariant) => void;
  motoAquatica: boolean;
  onMotoAquaticaChange: (v: boolean) => void;
  customSelectedIds: string[];
  onCustomSelectedIdsChange: (ids: string[]) => void;
};

function isAvailableOnAllDates(
  byDate: OptionalAvailabilityByDate,
  dates: string[],
  check: (day: { jetSki: boolean; bbq: boolean; custom: Record<string, boolean> }) => boolean
) {
  if (!dates.length) return true;
  return dates.every((d) => {
    const day = byDate[d];
    if (!day) return true;
    return check(day);
  });
}

export function ReservarOptionalsPicker({
  barco,
  tripDates,
  currencyFmt,
  kitChurrasco,
  onKitChurrascoChange,
  bbqVariant,
  onBbqVariantChange,
  motoAquatica,
  onMotoAquaticaChange,
  customSelectedIds,
  onCustomSelectedIdsChange,
}: ReservarOptionalsPickerProps) {
  const { t } = useTranslation();
  const jetReais = jetSkiPriceReais(barco);
  const showBbq = boatOffersBbq(barco);
  const custom = barco.customOptionals ?? [];
  const [availability, setAvailability] = useState<OptionalAvailabilityByDate>({});

  useEffect(() => {
    if (!barco.id || !tripDates.length) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    void fetchBoatOptionalAvailability(barco.id, tripDates).then((byDate) => {
      if (!cancelled) setAvailability(byDate);
    });
    return () => {
      cancelled = true;
    };
  }, [barco.id, tripDates.join(",")]);

  const jetAvailable = useMemo(
    () => isAvailableOnAllDates(availability, tripDates, (d) => d.jetSki),
    [availability, tripDates]
  );
  const bbqAvailable = useMemo(
    () => isAvailableOnAllDates(availability, tripDates, (d) => d.bbq),
    [availability, tripDates]
  );

  useEffect(() => {
    if (!jetAvailable && motoAquatica) onMotoAquaticaChange(false);
  }, [jetAvailable, motoAquatica, onMotoAquaticaChange]);

  useEffect(() => {
    if (!bbqAvailable && kitChurrasco) onKitChurrascoChange(false);
  }, [bbqAvailable, kitChurrasco, onKitChurrascoChange]);

  useEffect(() => {
    const blocked = custom.filter(
      (opt) => !isAvailableOnAllDates(availability, tripDates, (d) => d.custom[opt.id] !== false)
    );
    if (!blocked.length) return;
    const blockedIds = new Set(blocked.map((o) => o.id));
    const next = customSelectedIds.filter((id) => !blockedIds.has(id));
    if (next.length !== customSelectedIds.length) onCustomSelectedIdsChange(next);
  }, [availability, tripDates, custom, customSelectedIds, onCustomSelectedIdsChange]);

  if (!boatHasAnyOptionals(barco)) return null;

  const toggleCustom = (id: string, checked: boolean) => {
    onCustomSelectedIdsChange(
      checked ? [...customSelectedIds, id] : customSelectedIds.filter((x) => x !== id)
    );
  };

  const unavailableNote = t("optionals.unavailableOnSelectedDates");

  return (
    <section className="space-y-4">
      <h3 className="text-base font-bold text-foreground">{t("optionals.sectionTitle")}</h3>
      <FilterChipScrollMat
        layoutKey={`${barco.id}:${custom.length}:${jetReais}:${showBbq}:${kitChurrasco}:${motoAquatica}:${tripDates.join(",")}`}
        maxHeightClass="max-h-[min(70vh,32rem)]"
      >
      <div className="space-y-4">
      {showBbq ? (
        <BbqKitOptionalCard
          barco={barco}
          compact
          currencyFmt={currencyFmt}
          badge={t("optionals.optionalBadge")}
          kitItems={barco.bbqKitItems}
          actions={
            <Switch
              checked={kitChurrasco}
              onCheckedChange={onKitChurrascoChange}
              disabled={!bbqAvailable}
            />
          }
          trailing={
            kitChurrasco ? (
              <RadioGroup
                value={bbqVariant}
                onValueChange={(v) => onBbqVariantChange(v as BbqVariant)}
                className="gap-2 pt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="full" id="bbq-full" />
                  <Label htmlFor="bbq-full" className="text-xs font-normal cursor-pointer">
                    {t("optionals.bbqFullKit")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="non_alcoholic" id="bbq-soft" />
                  <Label htmlFor="bbq-soft" className="text-xs font-normal cursor-pointer">
                    {t("optionals.bbqNonAlcoholicOnly")}
                  </Label>
                </div>
              </RadioGroup>
            ) : !bbqAvailable ? (
              <p className="text-xs text-muted-foreground">{unavailableNote}</p>
            ) : null
          }
        />
      ) : null}

      {jetReais > 0 ? (
        <TripOptionalCard
          compact
          imageUrl={jetSkiPublicCoverImage(barco)}
          imageAlt={t("reservar.jetSkiTitle")}
          title={t("reservar.jetSkiTitle")}
          description={
            !jetAvailable ? `${t("reservar.jetSkiDesc")} — ${unavailableNote}` : t("reservar.jetSkiDesc")
          }
          priceLabel={`+ ${currencyFmt.format(jetReais)}`}
          badge={t("optionals.optionalBadge")}
          actions={
            <Switch
              checked={motoAquatica}
              onCheckedChange={onMotoAquaticaChange}
              disabled={!jetAvailable}
            />
          }
        />
      ) : null}

      {custom.map((opt) => {
        const title = customOptionalDisplayTitle(opt.title, t);
        const customAvail = isAvailableOnAllDates(availability, tripDates, (d) => d.custom[opt.id] !== false);
        return (
        <TripOptionalCard
          key={opt.id}
          compact
          imageUrl={customOptionalCoverImage(opt)}
          imageAlt={title}
          title={title}
          description={
            !customAvail && opt.description
              ? `${opt.description} — ${unavailableNote}`
              : !customAvail
                ? unavailableNote
                : opt.description
          }
          priceLabel={`+ ${currencyFmt.format(Math.max(0, opt.priceCents) / 100)}`}
          badge={t("optionals.customBadge")}
          actions={
            <Checkbox
              checked={customSelectedIds.includes(opt.id)}
              onCheckedChange={(c) => toggleCustom(opt.id, c === true)}
              disabled={!customAvail}
            />
          }
        />
      );
      })}
      </div>
      </FilterChipScrollMat>
    </section>
  );
}
