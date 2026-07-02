/** DDDs inexistentes ou não atribuídos no Brasil (Anatel). */
const INVALID_BR_DDDS = new Set([
  20, 23, 25, 26, 29, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78, 80, 90,
]);

function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeBrPhoneDigits(raw) {
  let digits = phoneDigits(raw);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

export function normalizeSignupPhone(raw) {
  const digits = normalizeBrPhoneDigits(raw);
  if (digits.length !== 10 && digits.length !== 11) {
    throw new Error("Telefone inválido. Informe DDD + número com 10 ou 11 dígitos.");
  }

  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99 || INVALID_BR_DDDS.has(ddd)) {
    throw new Error("DDD inválido. Informe um código de área brasileiro válido.");
  }

  if (digits.length === 11) {
    if (digits[2] !== "9") {
      throw new Error("Celular inválido. O número deve começar com 9 após o DDD.");
    }
    return digits;
  }

  if (!/[2-5]/.test(digits[2] ?? "")) {
    throw new Error("Telefone fixo inválido. O número local deve começar com 2, 3, 4 ou 5.");
  }
  return digits;
}
