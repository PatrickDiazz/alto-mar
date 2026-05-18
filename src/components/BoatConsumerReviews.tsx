import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Star } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useBoatReviews } from "@/hooks/useBoatReviews";
import { cn } from "@/lib/utils";
import { bcp47FromAppLang } from "@/lib/localeFormat";

type BoatConsumerReviewsProps = {
  boatId: string;
  ratingLabel: string;
};

function formatReviewDate(iso: string | null, locale: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(bcp47FromAppLang(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StarRow({ stars, className }: { stars: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < stars ? "fill-accent text-accent" : "fill-muted/40 text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  );
}

export function BoatConsumerReviews({ boatId, ratingLabel }: BoatConsumerReviewsProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data, isPending, isError } = useBoatReviews(boatId);

  const reviews = data?.reviews ?? [];
  const count = data?.count ?? reviews.length;
  const hasReviews = reviews.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-accent text-accent" aria-hidden />
          <span className="text-lg font-semibold text-accent tabular-nums">{ratingLabel}</span>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "bbq-kit-expand-trigger inline-flex items-center gap-1.5 rounded-sm py-0.5 text-left text-xs font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            aria-expanded={open}
          >
            <span className="bbq-kit-expand-trigger__inner font-medium">
              {open
                ? t("detalhes.reviewsHide")
                : count > 0
                  ? t("detalhes.reviewsShow", { count })
                  : t("detalhes.reviewsShowEmpty")}
            </span>
            <ChevronDown
              className={cn(
                "bbq-kit-expand-trigger__icon h-4 w-4 shrink-0 transition-transform duration-300 ease-out",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent
        className={cn(
          "overflow-hidden motion-reduce:animate-none",
          "data-[state=closed]:animate-bbq-kit-collapsible-up data-[state=open]:animate-bbq-kit-collapsible-down"
        )}
      >
        <div className="space-y-2.5 pt-1">
          {isPending ? (
            <p className="text-sm text-muted-foreground">{t("detalhes.reviewsLoading")}</p>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">{t("detalhes.reviewsLoadError")}</p>
          ) : !hasReviews ? (
            <p className="text-sm text-muted-foreground">{t("detalhes.reviewsEmpty")}</p>
          ) : (
            <>
              {data?.demo ? (
                <p className="text-[11px] text-muted-foreground">{t("detalhes.reviewsDemoHint")}</p>
              ) : null}
              <ul className="space-y-2.5">
                {reviews.map((review, i) => (
                  <li
                    key={`${review.authorName}-${review.ratedAt ?? i}`}
                    className="rounded-lg border border-border/60 bg-muted/25 p-3 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{review.authorName}</p>
                        <StarRow stars={review.stars} />
                      </div>
                      {review.ratedAt ? (
                        <time
                          className="text-[11px] text-muted-foreground tabular-nums shrink-0"
                          dateTime={review.ratedAt}
                        >
                          {formatReviewDate(review.ratedAt, i18n.language)}
                        </time>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{review.comment}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
