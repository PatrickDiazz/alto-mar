/** Reserva nestes estados ocupa a diária (bloqueia nova reserva no mesmo barco/dia). */
export const BOOKING_SLOT_OCCUPIED_STATUSES = ["ACCEPTED", "COMPLETED"];

/**
 * Reserva `PENDING` só entra no painel do locador com pagamento aprovado.
 * @param {string} [tableAlias] prefixo SQL, ex. `bk`
 */
export function sqlOwnerVisibleBookingClause(tableAlias = "bk") {
  const t = tableAlias;
  return `(${t}.status <> 'PENDING' OR p.status = 'APPROVED')`;
}
