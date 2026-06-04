export const OWNER_BOAT_REGISTER_CONFIRM_KEYS = [
  "readyForUse",
  "safetyLegal",
  "accurateInfo",
] as const;

export type OwnerBoatRegisterConfirmKey = (typeof OWNER_BOAT_REGISTER_CONFIRM_KEYS)[number];

export type OwnerBoatRegisterConfirmState = Record<OwnerBoatRegisterConfirmKey, boolean>;

export const emptyOwnerBoatRegisterConfirm: OwnerBoatRegisterConfirmState = {
  readyForUse: false,
  safetyLegal: false,
  accurateInfo: false,
};

export function ownerBoatRegisterConfirmComplete(state: OwnerBoatRegisterConfirmState): boolean {
  return OWNER_BOAT_REGISTER_CONFIRM_KEYS.every((k) => state[k]);
}
