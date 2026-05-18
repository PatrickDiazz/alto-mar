import { useTranslation } from "react-i18next";
import type { Boat } from "@/lib/types";
import {
  DEFAULT_BBQ_IMAGE,
  jetSkiPublicCoverImage,
  jetSkiPriceReais,
  customOptionalCoverImage,
  boatOffersBbq,
  type BbqVariant,
} from "@/lib/trip-optionals";

export type BookingOptionalPreviewItem = {
  key: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  priceLabel: string;
};

type BookingOptionalsPreviewProps = {
  items: BookingOptionalPreviewItem[];
};

export function BookingOptionalsPreview({ items }: BookingOptionalsPreviewProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <section className="surface-elevated rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t("optionals.paymentPreviewTitle")}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2"
          >
            <img
              src={item.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              {item.subtitle ? (
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-semibold text-accent tabular-nums">{item.priceLabel}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function buildBookingOptionalPreviewItems(input: {
  barco: Boat;
  currencyFmt: Intl.NumberFormat;
  kitChurrasco: boolean;
  bbqVariant: BbqVariant;
  motoAquatica: boolean;
  customSelectedIds: string[];
  t: (key: string) => string;
}): BookingOptionalPreviewItem[] {
  const { barco, currencyFmt, kitChurrasco, bbqVariant, motoAquatica, customSelectedIds, t } = input;
  const items: BookingOptionalPreviewItem[] = [];

  if (kitChurrasco && boatOffersBbq(barco)) {
    items.push({
      key: "bbq",
      title: t("reservar.bbqTitle"),
      subtitle:
        bbqVariant === "non_alcoholic"
          ? t("optionals.bbqNonAlcoholicOnly")
          : t("optionals.bbqFullKit"),
      imageUrl: DEFAULT_BBQ_IMAGE,
      priceLabel: `+ ${currencyFmt.format(250)}`,
    });
  }

  const jetReais = jetSkiPriceReais(barco);
  if (motoAquatica && jetReais > 0) {
    items.push({
      key: "jetSki",
      title: t("reservar.jetSkiTitle"),
      imageUrl: jetSkiPublicCoverImage(barco),
      priceLabel: `+ ${currencyFmt.format(jetReais)}`,
    });
  }

  const catalog = barco.customOptionals ?? [];
  for (const id of customSelectedIds) {
    const opt = catalog.find((o) => o.id === id);
    if (!opt) continue;
    items.push({
      key: `custom-${id}`,
      title: opt.title,
      subtitle: opt.description,
      imageUrl: customOptionalCoverImage(opt),
      priceLabel: `+ ${currencyFmt.format(Math.max(0, opt.priceCents) / 100)}`,
    });
  }

  return items;
}
