import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

const htmlLang: Record<string, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "pt",
    supportedLngs: ["pt", "en", "es"],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "alto_mar_lang",
    },
  });

i18n.on("languageChanged", (lng) => {
  const base = (lng || "pt").split("-")[0];
  document.documentElement.lang = htmlLang[base] ?? "pt-BR";
});

if (typeof document !== "undefined") {
  const base = (i18n.language || "pt").split("-")[0];
  document.documentElement.lang = htmlLang[base] ?? "pt-BR";
}

export default i18n;
