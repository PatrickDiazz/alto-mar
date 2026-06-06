import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import type { OwnerBookingDetailResponse, OwnerBookingRow } from "@/lib/ownerBookingTypes";

/** Monta resposta de detalhe a partir da linha já carregada na lista (fallback). */
export function ownerBookingDetailFromRow(
  booking: OwnerBookingRow,
  stripeEnabled: boolean
): OwnerBookingDetailResponse {
  return {
    booking,
    payment: booking.paymentProvider
      ? {
          id: booking.id,
          provider: booking.paymentProvider,
          status: booking.paymentStatus,
          amountCents: booking.totalCents,
          paidAt: null,
          stripePaymentIntentId: null,
          stripeChargeId: null,
          receiptUrl: null,
          transferStatus: null,
          transferPaidAt: null,
        }
      : null,
    stripeEnabled,
  };
}

export async function fetchOwnerBookingDetail(bookingId: string): Promise<OwnerBookingDetailResponse> {
  const id = decodeURIComponent(bookingId).trim();
  const resp = await authFetch(`/api/owner/bookings/${encodeURIComponent(id)}`);
  if (resp.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao carregar reserva."));
  }
  return (await resp.json()) as OwnerBookingDetailResponse;
}
