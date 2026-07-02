import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";

type BookingRow = {
  id: string;
  status: string;
  bookingDate: string;
  embarkTime: string | null;
  embarkLocation: string | null;
  boat: { id: string; nome: string };
  renter: { nome: string };
};

export default function TripulanteAgendaPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authFetch("/api/marinheiro/bookings")
      .then(async (resp) => {
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.loadFail")));
        const data = (await resp.json()) as { bookings: BookingRow[] };
        if (active) setBookings(data.bookings ?? []);
      })
      .catch(() => {
        if (active) setBookings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-foreground">{t("crew.portalTitle")}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/tripulante/perfil">{t("crew.portalProfile")}</Link>
          </Button>
          <HeaderSettingsMenu />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-3 px-4 py-4">
        <p className="text-sm text-muted-foreground">{t("crew.portalAgendaHint")}</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("crew.portalNoBookings")}
          </p>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="rounded-xl border border-border/50 bg-card p-3 text-sm">
              <p className="font-semibold text-foreground">{b.boat.nome}</p>
              <p className="text-muted-foreground">
                {b.bookingDate}
                {b.embarkTime ? ` · ${b.embarkTime}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("crew.portalClient")}: {b.renter.nome}
              </p>
              <p className="mt-1 text-xs font-medium text-primary">{b.status}</p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
