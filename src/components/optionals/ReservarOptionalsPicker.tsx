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
import { BbqKitOptionalCard } from "@/components/optionals/BbqKitOptionalCard";
import { TripOptionalCard } from "@/components/optionals/TripOptionalCard";
import { FilterChipScrollMat } from "@/components/FilterChipScrollMat";

type ReservarOptionalsPickerProps = {
  barco: Boat;
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

export function ReservarOptionalsPicker({
  barco,
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

  if (!boatHasAnyOptionals(barco)) return null;

  const toggleCustom = (id: string, checked: boolean) => {
    onCustomSelectedIdsChange(
      checked ? [...customSelectedIds, id] : customSelectedIds.filter((x) => x !== id)
    );
  };

  return (
    <section className="space-y-4">
      <h3 className="text-base font-bold text-foreground">{t("optionals.sectionTitle")}</h3>
      <FilterChipScrollMat
        layoutKey={`${barco.id}:${custom.length}:${jetReais}:${showBbq}:${kitChurrasco}:${motoAquatica}`}
        maxHeightClass="max-h-[min(70vh,32rem)]"
      >
      <div className="space-y-4">
      {showBbq ? (
        <BbqKitOptionalCard
          compact
          currencyFmt={currencyFmt}
          badge={t("optionals.optionalBadge")}
          kitItems={barco.bbqKitItems}
          actions={<Switch checked={kitChurrasco} onCheckedChange={onKitChurrascoChange} />}
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
          description={t("reservar.jetSkiDesc")}
          priceLabel={`+ ${currencyFmt.format(jetReais)}`}
          badge={t("optionals.optionalBadge")}
          actions={<Switch checked={motoAquatica} onCheckedChange={onMotoAquaticaChange} />}
        />
      ) : null}

      {custom.map((opt) => {
        const title = customOptionalDisplayTitle(opt.title, t);
        return (
        <TripOptionalCard
          key={opt.id}
          compact
          imageUrl={customOptionalCoverImage(opt)}
          imageAlt={title}
          title={title}
          description={opt.description}
          priceLabel={`+ ${currencyFmt.format(Math.max(0, opt.priceCents) / 100)}`}
          badge={t("optionals.customBadge")}
          actions={
            <Checkbox
              checked={customSelectedIds.includes(opt.id)}
              onCheckedChange={(c) => toggleCustom(opt.id, c === true)}
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
