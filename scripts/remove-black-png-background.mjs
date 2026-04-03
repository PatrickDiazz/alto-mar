/**
 * Converte pixels pretos (ou quase pretos) em transparência em PNGs de logo.
 * Resolve exportações com fundo preto opaco em vez de alpha verdadeiro.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Pixels com R,G,B abaixo disto passam a totalmente transparentes. */
const BLACK_THRESHOLD = 36;

async function removeNearBlack(srcRel) {
  const srcPath = path.join(root, srcRel);
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  const outPath = `${srcPath}.tmp.png`;
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
  await fs.rename(outPath, srcPath);
  // eslint-disable-next-line no-console
  console.log("OK", srcRel);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  await removeNearBlack("src/assets/logo-altomar-light.png");
  await removeNearBlack("src/assets/logo-altomar-dark.png");
} else {
  for (const f of files) await removeNearBlack(f);
}
