import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Anchor, Compass } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  filterBookingsByTab,
  type RenterBookingsTab,
  useRenterBookings,
} from "@/hooks/useRenterBookings";
import { RenterBookingMobileHeader } from "@/components/renter/mobile/RenterBookingMobileHeader";
import { RenterBookingMobileListCard } from "@/components/renter/mobile/RenterBookingMobileCards";
import { RenterBookingPanelDivider } from "@/components/renter/booking/RenterBookingPanelDivider";
import {
  RENTER_BTN_PRIMARY,
  RENTER_EMPTY_STATE,
  RENTER_PAGE_BG,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_SUBBODY,
} from "@/components/renter/booking/renterBookingUi";
import { cn } from "@/lib/utils";

type Props = {
  autoOpenChatBookingId?: string | null;
  autoOpenChatPeerLabel?: string;
  autoOpenChatSubtitle?: string;
};

export function RenterBookingsMobileList({
  autoOpenChatBookingId = null,
  autoOpenChatPeerLabel,
  autoOpenChatSubtitle,
}: Props) {
  const { t, i18n, currencyFmt, list, loading, refreshing, boatImages, load } = useRenterBookings({
    autoOpenChatBookingId,
  });
  const navigate = useNavigate();
  const [tab, setTab] = useState<RenterBookingsTab>("active");

  useEffect(() => {
    if (!autoOpenChatBookingId || loading) return;
    if (!list.some((b) => b.id === autoOpenChatBookingId)) return;
    navigate(`/conta/reservas/${autoOpenChatBookingId}`, {
      replace: true,
      state: {
        openChatBookingId: autoOpenChatBookingId,
        peerLabel: autoOpenChatPeerLabel,
        subtitle: autoOpenChatSubtitle,
      },
    });
  }, [autoOpenChatBookingId, autoOpenChatPeerLabel, autoOpenChatSubtitle, list, loading, navigate]);

  const counts = useMemo(
    () => ({
      active: filterBookingsByTab(list, "active").length,
      done: filterBookingsByTab(list, "done").length,
      cancelled: filterBookingsByTab(list, "cancelled").length,
    }),
    [list]
  );

  const emptyByTab: Record<RenterBookingsTab, string> = {
    active: "reservasConta.emptyProgress",
    done: "reservasConta.emptyDone",
    cancelled: "reservasConta.emptyCancelled",
  };

  return (
    <div className={cn("flex min-h-[100dvh] flex-col", RENTER_PAGE_BG)}>
      <RenterBookingMobileHeader
        title={t("reservasConta.title")}
        onBack={() => navigate("/conta")}
        onRefresh={() => void load({ manual: true })}
        refreshing={refreshing}
      />

      <div className="flex-1 px-4 pb-24 pt-2">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-none" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className={cn(RENTER_EMPTY_STATE, "mt-8")}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB]/10">
              <Anchor className="h-8 w-8 text-[#2563EB]" />
            </div>
            <p className={cn("text-base font-semibold", RENTER_TEXT_SUBBODY)}>{t("reservasConta.emptyAll")}</p>
            <p className={cn("mt-2 text-sm", RENTER_TEXT_MUTED)}>{t("reservasConta.emptyAllHint")}</p>
            <Button asChild className={cn("mt-6 rounded-xl", RENTER_BTN_PRIMARY)}>
              <Link to="/explorar">
                <Compass className="mr-2 h-4 w-4" />
                {t("reservasConta.exploreBoats")}
              </Link>
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as RenterBookingsTab)} className="w-full">
            <TabsList className="mb-4 grid h-11 w-full grid-cols-3 rounded-2xl bg-white p-1 shadow-sm dark:bg-card">
              {(
                [
                  ["active", t("reservasConta.tabActive")],
                  ["done", t("reservasConta.tabDone")],
                  ["cancelled", t("reservasConta.tabCancelled")],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-xl text-xs font-semibold transition-all duration-200 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  {label}
                  {counts[value] > 0 ? (
                    <span className="ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-black/10 px-1 text-[10px] font-bold data-[state=active]:bg-white/20">
                      {counts[value]}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>

            {(["active", "done", "cancelled"] as const).map((tabKey) => (
              <TabsContent key={tabKey} value={tabKey} className="mt-0 focus-visible:outline-none">
                {filterBookingsByTab(list, tabKey).length === 0 ? (
                  <p className={cn("py-12 text-center text-sm", RENTER_TEXT_MUTED)}>{t(emptyByTab[tabKey])}</p>
                ) : (
                  <div>
                    {filterBookingsByTab(list, tabKey).map((b, idx, arr) => (
                      <div key={b.id}>
                        <RenterBookingMobileListCard
                          booking={b}
                          boatImage={boatImages[b.boat.id]}
                          currencyFmt={currencyFmt}
                          t={t}
                          lang={i18n.language}
                          to={`/conta/reservas/${b.id}`}
                        />
                        {idx < arr.length - 1 ? <RenterBookingPanelDivider orientation="horizontal" /> : null}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
