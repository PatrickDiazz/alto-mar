import { format, parseISO } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo-altomar.png";
import type { RenterBooking } from "@/components/renter/booking/renterBookingTypes";
import { financialBreakdown, paymentMethodLabel } from "@/components/renter/booking/renterBookingUi";
import { parseOwnerRouteIslands } from "@/lib/routeIslandsParse";
import { bbqKitPriceReais } from "@/lib/trip-optionals";

const PDF_FONT = "NotoSans";

const PAGE_BG: [number, number, number] = [247, 249, 252];
const PRIMARY: [number, number, number] = [37, 99, 235];
const TITLE: [number, number, number] = [15, 23, 42];
const BODY: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];
const WHITE: [number, number, number] = [255, 255, 255];

export type ReceiptLabels = {
  title: string;
  issuedAt: string;
  bookingRef: string;
  tripSection: string;
  paymentSection: string;
  boat: string;
  location: string;
  tripDate: string;
  passengers: string;
  adults: string;
  kids: string;
  embark: string;
  embarkTime: string;
  route: string;
  tripValue: string;
  extras: string;
  bbq: string;
  jetSki: string;
  total: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
  paid: string;
  embarkToArrange: string;
  embarkTimeToArrange: string;
};

type FontFiles = { regular: string; bold: string };

let fontFilesPromise: Promise<FontFiles> | null = null;

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadFontFiles(): Promise<FontFiles> {
  if (!fontFilesPromise) {
    fontFilesPromise = (async () => {
      const [regularRes, boldRes] = await Promise.all([
        fetch("/fonts/NotoSans-Regular.ttf"),
        fetch("/fonts/NotoSans-Bold.ttf"),
      ]);
      if (!regularRes.ok || !boldRes.ok) {
        throw new Error("Font load failed");
      }
      const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
      return {
        regular: arrayBufferToBase64(regularBuf),
        bold: arrayBufferToBase64(boldBuf),
      };
    })();
  }
  return fontFilesPromise;
}

function registerFonts(doc: jsPDF, fonts: FontFiles) {
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
}

async function loadImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImageMeta(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const dataUrl = await loadImageDataUrl(url);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitInBox(naturalW: number, naturalH: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return { w: naturalW * scale, h: naturalH * scale };
}

function fmtDate(iso: string | null | undefined, lang: string, pattern = "d MMMM yyyy") {
  if (!iso) return "—";
  try {
    const d = iso.includes("T") ? parseISO(iso) : parseISO(`${iso}T12:00:00`);
    return format(d, pattern, { locale: localeForLang(lang) });
  } catch {
    return "—";
  }
}

function fmtDateTime(iso: string | null | undefined, lang: string) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: localeForLang(lang) });
  } catch {
    return "—";
  }
}

function formatRouteStops(routeIslands: string[]): string {
  const parsed = parseOwnerRouteIslands(routeIslands);
  const stops = parsed.kind === "single" ? parsed.stops : parsed.routes.flat();
  if (stops.length === 0) return "—";
  return stops.join(" → ");
}

type Row = { label: string; value: string };

function drawSection(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: Row[]
): number {
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TITLE);
  doc.text(title, x, y);

  let cy = y + 6;
  doc.setFontSize(9);

  for (const row of rows) {
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...MUTED);
    doc.text(row.label, x, cy);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(row.value, w - 52);
    doc.text(lines, x + 48, cy);
    cy += Math.max(5.5, lines.length * 4.2);
  }

  return cy + 4;
}

export async function downloadRenterBookingReceiptPdf(input: {
  booking: RenterBooking;
  currencyFmt: Intl.NumberFormat;
  lang: string;
  labels: ReceiptLabels;
  paymentMethod: string;
}) {
  const { booking: b, currencyFmt, lang, labels, paymentMethod } = input;
  const { tripReais, extrasReais, totalReais } = financialBreakdown(b);
  const passengers = b.passengersAdults + (b.hasKids ? b.passengersChildren : 0);
  const cap = b.boat.capacidade ?? "—";
  const routeText = formatRouteStops(b.routeIslands || []);
  const embarkLoc = b.embarkLocation?.trim() || labels.embarkToArrange;
  const embarkTime = b.embarkTime?.trim() || labels.embarkTimeToArrange;

  const passengerText = b.hasKids
    ? `${b.passengersAdults} ${labels.adults} · ${b.passengersChildren} ${labels.kids} (${passengers}/${cap})`
    : `${b.passengersAdults} ${labels.adults} (${passengers}/${cap})`;

  const extraLines: string[] = [];
  if (b.bbqKit) {
    const bbq = bbqKitPriceReais({ bbqOffered: true, bbqKitPriceCents: b.boat.bbqKitPriceCents });
    extraLines.push(`${labels.bbq}: ${currencyFmt.format(bbq)}`);
  }
  if (b.jetSki && b.boat.jetSkiOffered) {
    extraLines.push(
      `${labels.jetSki}: ${currencyFmt.format(Number(b.boat.jetSkiPriceCents || 0) / 100)}`
    );
  }

  const [logo, fonts] = await Promise.all([loadImageMeta(logoUrl), loadFontFiles()]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerFonts(doc, fonts);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const cardX = margin;
  const cardW = pageW - margin * 2;
  const cardY = 18;
  const cardH = pageH - 36;
  const headerH = 22;

  doc.setFillColor(...PAGE_BG);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "FD");

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(cardX, cardY, cardW, headerH, 4, 4, "F");
  doc.rect(cardX, cardY + headerH - 4, cardW, 4, "F");

  const logoMaxW = 44;
  const logoMaxH = 14;
  const { w: logoW, h: logoH } = fitInBox(logo.width, logo.height, logoMaxW, logoMaxH);
  const logoY = cardY + (headerH - logoH) / 2;
  doc.addImage(logo.dataUrl, "PNG", cardX + 8, logoY, logoW, logoH);

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(labels.title, cardX + cardW - 8, cardY + 13, { align: "right" });

  const refShort = b.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  let y = cardY + 30;

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...MUTED);
  doc.text(`${labels.bookingRef}: ${refShort}`, cardX + 10, y);
  doc.text(`${labels.issuedAt}: ${fmtDateTime(new Date().toISOString(), lang)}`, cardX + cardW - 10, y, {
    align: "right",
  });

  y += 10;
  doc.setDrawColor(...BORDER);
  doc.line(cardX + 10, y, cardX + cardW - 10, y);
  y += 8;

  y = drawSection(doc, cardX + 10, y, cardW - 20, labels.tripSection, [
    { label: labels.boat, value: b.boat.nome },
    { label: labels.location, value: b.boat.distancia },
    { label: labels.tripDate, value: fmtDate(b.bookingDate, lang, "PPP") },
    { label: labels.passengers, value: passengerText },
    { label: labels.embark, value: embarkLoc },
    { label: labels.embarkTime, value: embarkTime },
    { label: labels.route, value: routeText },
  ]);

  y += 2;
  doc.setDrawColor(...BORDER);
  doc.line(cardX + 10, y, cardX + cardW - 10, y);
  y += 8;

  const paymentRows: Row[] = [
    { label: labels.tripValue, value: currencyFmt.format(tripReais + extrasReais) },
  ];
  if (extrasReais > 0) {
    paymentRows.push({
      label: labels.extras,
      value: extraLines.length ? extraLines.join(" · ") : currencyFmt.format(extrasReais),
    });
  }
  paymentRows.push(
    { label: labels.total, value: currencyFmt.format(totalReais) },
    { label: labels.paymentStatus, value: labels.paid },
    { label: labels.paymentMethod, value: paymentMethod },
    { label: labels.paymentDate, value: fmtDateTime(b.paidAt ?? b.createdAt, lang) }
  );

  y = drawSection(doc, cardX + 10, y, cardW - 20, labels.paymentSection, paymentRows);

  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...MUTED);
  doc.text("Alto Mar", pageW / 2, pageH - 10, { align: "center" });

  doc.save(`recibo-altomar-${refShort.toLowerCase()}.pdf`);
}

export function buildReceiptLabels(t: (key: string) => string): ReceiptLabels {
  return {
    title: t("reservasConta.receiptTitle"),
    issuedAt: t("reservasConta.receiptIssuedAt"),
    bookingRef: t("reservasConta.receiptBookingRef"),
    tripSection: t("reservasConta.receiptTripSection"),
    paymentSection: t("reservasConta.receiptPaymentSection"),
    boat: t("reservasConta.receiptBoat"),
    location: t("reservasConta.receiptLocation"),
    tripDate: t("reservasConta.bookingDate"),
    passengers: t("reservar.passengers"),
    adults: t("reservar.adults"),
    kids: t("reservar.kids"),
    embark: t("reservar.embark"),
    embarkTime: t("reservar.embarkTime"),
    route: t("reservasConta.routeStops"),
    tripValue: t("reservasConta.tripValue"),
    extras: t("reservasConta.extrasIncluded"),
    bbq: t("reservar.bbqTitle"),
    jetSki: t("reservar.jetSkiTitle"),
    total: t("common.total"),
    paymentStatus: t("reservasConta.paymentStatus"),
    paymentMethod: t("reservasConta.paymentMethod"),
    paymentDate: t("reservasConta.receiptPaymentDate"),
    paid: t("reservasConta.paymentApproved"),
    embarkToArrange: t("reservar.embarkLocationToArrange"),
    embarkTimeToArrange: t("reservar.embarkTimeToArrange"),
  };
}

export function receiptPaymentMethodLabel(booking: RenterBooking, t: (key: string) => string) {
  return paymentMethodLabel(booking, t);
}
