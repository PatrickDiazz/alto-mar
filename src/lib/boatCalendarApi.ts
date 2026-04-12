import { apiUrl } from "@/lib/auth";

export type BoatCalendarBooking = { id: string; date: string; status: string };

export type BoatCalendarResponse = {
  dateLocks: string[];
  weekdayLocks: number[];
  bookings: BoatCalendarBooking[];
};

/** Garante chave YYYY-MM-DD (API ou drivers podem devolver ISO com hora). */
function ymdKey(d: string): string {
  const s = String(d).trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function normalizeCalendarPayload(raw: BoatCalendarResponse): BoatCalendarResponse {
  return {
    dateLocks: [...new Set((raw.dateLocks ?? []).map(ymdKey))].sort(),
    weekdayLocks: [...new Set((raw.weekdayLocks ?? []).map((w) => Number(w)))].sort((a, b) => a - b),
    bookings: (raw.bookings ?? []).map((b) => ({ ...b, date: ymdKey(b.date) })),
  };
}

export async function fetchBoatCalendar(boatId: string, from: string, to: string): Promise<BoatCalendarResponse> {
  const url = `${apiUrl(`/api/boats/${boatId}/calendar`)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "calendar");
  }
  const json = (await r.json()) as BoatCalendarResponse;
  return normalizeCalendarPayload(json);
}
