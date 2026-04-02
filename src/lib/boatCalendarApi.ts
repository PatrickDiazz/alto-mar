import { apiUrl } from "@/lib/auth";

export type BoatCalendarBooking = { id: string; date: string; status: string };

export type BoatCalendarResponse = {
  dateLocks: string[];
  weekdayLocks: number[];
  bookings: BoatCalendarBooking[];
};

export async function fetchBoatCalendar(boatId: string, from: string, to: string): Promise<BoatCalendarResponse> {
  const url = `${apiUrl(`/api/boats/${boatId}/calendar`)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "calendar");
  }
  return r.json() as Promise<BoatCalendarResponse>;
}
