/** Locale BCP-47 para datas/números conforme idioma do app */
export function bcp47FromAppLang(lng: string): string {
  if (lng === "en") return "en-US";
  if (lng === "es") return "es-ES";
  return "pt-BR";
}
