/**
 * Gera docs/CHAT-ARCHITECTURE.pdf a partir de docs/CHAT-ARCHITECTURE.md
 * Uso: node scripts/generate-chat-architecture-pdf.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { marked } from "marked";
import puppeteer from "puppeteer-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mdPath = join(root, "docs", "CHAT-ARCHITECTURE.md");
const cssPath = join(root, "docs", "chat-architecture-pdf.css");
const pdfPath = join(root, "docs", "CHAT-ARCHITECTURE.pdf");

const BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function resolveBrowser() {
  for (const p of BROWSER_CANDIDATES) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error("Chrome ou Edge não encontrado para gerar PDF.");
}

const md = readFileSync(mdPath, "utf8");
const css = readFileSync(cssPath, "utf8");
const bodyHtml = marked.parse(md, { gfm: true, breaks: false });

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>Alto Mar — Arquitetura do chat</title>
  <style>${css}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

const tmpHtml = join(tmpdir(), `chat-architecture-${Date.now()}.html`);
writeFileSync(tmpHtml, html, "utf8");

const executablePath = resolveBrowser();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.goto(`file:///${tmpHtml.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "22mm", left: "18mm", right: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:9px;color:#64748b;text-align:center;padding:0 18mm;">Alto Mar · Arquitetura do chat · <span class="pageNumber"></span></div>',
  });
  console.log(`PDF gerado: ${pdfPath}`);
} finally {
  await browser.close();
  try {
    unlinkSync(tmpHtml);
  } catch {
    /* ignore */
  }
}
