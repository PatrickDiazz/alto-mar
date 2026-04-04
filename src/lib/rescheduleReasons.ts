/** Motivos permitidos ao banhista remarcar (alinhado à API). */
export type RescheduleReason =
  | "BAD_WEATHER"
  | "NAVIGATION_RISK"
  | "OPERATIONAL_IMPEDIMENT"
  | "AUTHORITY_ORDER"
  | "SAFETY_FACTOR"
  | "OTHER";

export const RESCHEDULE_REASONS: RescheduleReason[] = [
  "BAD_WEATHER",
  "NAVIGATION_RISK",
  "OPERATIONAL_IMPEDIMENT",
  "AUTHORITY_ORDER",
  "SAFETY_FACTOR",
  "OTHER",
];

export function rescheduleReasonI18nKey(reason: RescheduleReason): string {
  return `reservasConta.rescheduleReason_${reason}`;
}
