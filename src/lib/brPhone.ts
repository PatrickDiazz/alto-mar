/** DDDs inexistentes ou não atribuídos no Brasil (Anatel). */
const INVALID_BR_DDDS = new Set([
  20, 23, 25, 26, 29, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78, 80, 90,
]);

export type BrPhoneValidationReason = "length" | "ddd" | "mobile" | "landline";

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBrPhoneDigits(raw: string) {
  let digits = phoneDigits(raw);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

/** Máscara brasileira: (DD) NNNNN-NNNN ou (DD) NNNN-NNNN */
export function formatBrPhoneInput(raw: string) {
  const digits = normalizeBrPhoneDigits(raw).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatBrPhoneDisplay(value: string) {
  const digits = normalizeBrPhoneDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function validateBrPhone(raw: string):
  | { ok: true; digits: string }
  | { ok: false; reason: BrPhoneValidationReason } {
  const digits = normalizeBrPhoneDigits(raw);
  if (digits.length !== 10 && digits.length !== 11) {
    return { ok: false, reason: "length" };
  }

  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99 || INVALID_BR_DDDS.has(ddd)) {
    return { ok: false, reason: "ddd" };
  }

  if (digits.length === 11) {
    if (digits[2] !== "9") {
      return { ok: false, reason: "mobile" };
    }
    return { ok: true, digits };
  }

  if (!/[2-5]/.test(digits[2] ?? "")) {
    return { ok: false, reason: "landline" };
  }
  return { ok: true, digits };
}

export function brPhoneErrorKey(reason: BrPhoneValidationReason) {
  switch (reason) {
    case "ddd":
      return "signup.phoneInvalidDdd";
    case "mobile":
      return "signup.phoneMobileNine";
    case "landline":
      return "signup.phoneInvalidLandline";
    default:
      return "signup.phoneInvalid";
  }
}
