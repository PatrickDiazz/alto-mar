import { useTranslation } from "react-i18next";
import type { Boat } from "@/lib/types";
import {
  boatOffersBbq,
  boatHasAnyOptionals,
  jetSkiPublicCoverImage,
  jetSkiPriceReais,
  customOptionalCoverImage,
  customOptionalDisplayTitle,
} from "@/lib/trip-optionals";
import { BbqKitOptionalCard } from "@/components/optionals/BbqKitOptionalCard";
import { TripOptionalCard } from "@/components/optionals/TripOptionalCard";
import { FilterChipScrollMat } from "@/components/FilterChipScrollMat";

type BoatOptionalsSectionProps = {
  barco: Boat;
  currencyFmt: Intl.NumberFormat;
};

export function BoatOptionalsSection({ barco, currencyFmt }: BoatOptionalsSectionProps) {
  const { t } = useTranslation();
  const jetReais = jetSkiPriceReais(barco);
  const custom = barco.customOptionals ?? [];

  if (!boatHasAnyOptionals(barco)) return null;

  return (
    <div className="surface-elevated rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-primary bg-primary/10 inline-flex items-center rounded-md px-2 py-1">
        {t("optionals.sectionTitle")}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{t("optionals.sectionHint")}</p>

      <FilterChipScrollMat
        layoutKey={`${barco.id}:${custom.length}:${jetReais}:${boatOffersBbq(barco)}`}
        maxHeightClass="max-h-[min(70vh,32rem)]"
      >
      <div className="space-y-4">
      {boatOffersBbq(barco) ? (
        <BbqKitOptionalCard
          barco={barco}
          currencyFmt={currencyFmt}
          badge={t("optionals.optionalBadge")}
          kitItems={barco.bbqKitItems}
        />
      ) : null}

      {jetReais > 0 ? (
        <TripOptionalCard
          imageUrl={jetSkiPublicCoverImage(barco)}
          imageAlt={t("reservar.jetSkiTitle")}
          title={t("reservar.jetSkiTitle")}
          description={t("detalhes.jetSkiIntro")}
          priceLabel={`+ ${currencyFmt.format(jetReais)}`}
          badge={t("optionals.optionalBadge")}
        />
      ) : null}

      {custom.map((opt) => {
        const title = customOptionalDisplayTitle(opt.title, t);
        return (
        <TripOptionalCard
          key={opt.id}
          imageUrl={customOptionalCoverImage(opt)}
          imageAlt={title}
          title={title}
          description={opt.description}
          priceLabel={`+ ${currencyFmt.format(Math.max(0, opt.priceCents) / 100)}`}
          badge={t("optionals.customBadge")}
        />
      );
      })}
      </div>
      </FilterChipScrollMat>
    </div>
  );
}
