export type BookingChatAudience = "renter" | "owner";

export function renterBookingChatPath(bookingId: string): string {
  return `/conta/reservas/${encodeURIComponent(bookingId)}/chat`;
}

export function ownerBookingChatPath(bookingId: string): string {
  return `/marinheiro/reservas/${encodeURIComponent(bookingId)}/chat`;
}

export function bookingChatPath(audience: BookingChatAudience, bookingId: string): string {
  return audience === "owner" ? ownerBookingChatPath(bookingId) : renterBookingChatPath(bookingId);
}

export function renterReservationsPath(): string {
  return "/conta/reservas";
}

export function ownerBookingDetailPath(bookingId: string): string {
  return `/marinheiro/reservas/${encodeURIComponent(bookingId)}`;
}

/** Legado: `#booking-{uuid}-chat` */
export function parseLegacyRenterChatHash(hash: string): string | null {
  const prefix = "#booking-";
  const suffix = "-chat";
  if (!hash.startsWith(prefix) || !hash.endsWith(suffix)) return null;
  const id = hash.slice(prefix.length, hash.length - suffix.length);
  return id || null;
}
