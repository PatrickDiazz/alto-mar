import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type BoatOptionalsSectionProps = {
  barco: Boat;
  currencyFmt: Intl.NumberFormat;
};

type OptionalSlide = { key: string; node: ReactNode };

export function BoatOptionalsSection({ barco, currencyFmt }: BoatOptionalsSectionProps) {
  const { t } = useTranslation();
  const jetReais = jetSkiPriceReais(barco);
  const custom = barco.customOptionals ?? [];
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = useMemo((): OptionalSlide[] => {
    const list: OptionalSlide[] = [];
    if (boatOffersBbq(barco)) {
      list.push({
        key: "bbq",
        node: (
          <BbqKitOptionalCard
            barco={barco}
            currencyFmt={currencyFmt}
            badge={t("optionals.optionalBadge")}
            kitItems={barco.bbqKitItems}
            compact
          />
        ),
      });
    }
    if (jetReais > 0) {
      list.push({
        key: "jet",
        node: (
          <TripOptionalCard
            compact
            imageUrl={jetSkiPublicCoverImage(barco)}
            imageAlt={t("reservar.jetSkiTitle")}
            title={t("reservar.jetSkiTitle")}
            description={t("detalhes.jetSkiIntro")}
            priceLabel={`+ ${currencyFmt.format(jetReais)}`}
            badge={t("optionals.optionalBadge")}
          />
        ),
      });
    }
    for (const opt of custom) {
      const title = customOptionalDisplayTitle(opt.title, t);
      list.push({
        key: opt.id,
        node: (
          <TripOptionalCard
            compact
            imageUrl={customOptionalCoverImage(opt)}
            imageAlt={title}
            title={title}
            description={opt.description}
            priceLabel={`+ ${currencyFmt.format(Math.max(0, opt.priceCents) / 100)}`}
            badge={t("optionals.customBadge")}
          />
        ),
      });
    }
    return list;
  }, [barco, currencyFmt, custom, jetReais, t]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSlideIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  if (!boatHasAnyOptionals(barco)) return null;

  return (
    <div className="surface-elevated space-y-4 rounded-xl p-4">
      <h3 className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
        {t("optionals.sectionTitle")}
      </h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("optionals.sectionHint")}</p>

      {/* Mobile: carrossel horizontal */}
      <div className="md:hidden">
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "center", loop: false, containScroll: false }}
          className="relative w-full"
          aria-label={t("optionals.carouselAria")}
        >
          <CarouselContent className="-ml-2">
            {slides.map((slide) => (
              <CarouselItem key={slide.key} className="basis-[76%] pl-2 sm:basis-[72%]">
                {slide.node}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {slides.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label={t("optionals.carouselDotsAria")}>
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                role="tab"
                aria-selected={i === slideIndex}
                aria-label={t("optionals.carouselDotLabel", { n: i + 1, total: slides.length })}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === slideIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/35"
                )}
                onClick={() => carouselApi?.scrollTo(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop: lista vertical */}
      <div className="hidden space-y-4 md:block">{slides.map((slide) => <div key={slide.key}>{slide.node}</div>)}</div>
    </div>
  );
}
