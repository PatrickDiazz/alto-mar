/**
 * Remove matte escuro ligado **à borda** da imagem (flood 4-vizinhança).
 * Sementes em **todo o perímetro** (topo, base, esquerda, direita), não só cantos.
 * `MATTE_MAX` um pouco maior apanha JPEG; `fringeOnce` limpa o anel escuro junto do recorte.
 *
 * npm run fix:seja-locador-alpha
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Propagação do flood: preto e quase-preto do fundo (compressão JPEG). */
const MATTE_MAX = 18;

/** Uma passagem: remove anel escuro junto de pixels já transparentes (max RGB um pouco maior). */
const FRINGE_MAX = 26;

function pos(x, y, w) {
  return y * w + x;
}

function idx(x, y, w) {
  return (y * w + x) * 4;
}

function isMatte(r, g, b, cap = MATTE_MAX) {
  return Math.max(r, g, b) <= cap;
}

function pushEdgeSeeds(stack, buf, w, h) {
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = idx(x, y, w);
      if (isMatte(buf[i], buf[i + 1], buf[i + 2])) stack.push([x, y]);
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = idx(x, y, w);
      if (isMatte(buf[i], buf[i + 1], buf[i + 2])) stack.push([x, y]);
    }
  }
}

function floodFromStack(buf, w, h, matteCap) {
  const visited = new Uint8Array(w * h);
  const stack = [];
  pushEdgeSeeds(stack, buf, w, h);

  while (stack.length) {
    const [x, y] = stack.pop();
    const p = pos(x, y, w);
    if (visited[p]) continue;
    const i = idx(x, y, w);
    if (!isMatte(buf[i], buf[i + 1], buf[i + 2], matteCap)) continue;
    visited[p] = 1;
    buf[i + 3] = 0;

    const nbs = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of nbs) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const np = pos(nx, ny, w);
      if (visited[np]) continue;
      const ni = idx(nx, ny, w);
      if (!isMatte(buf[ni], buf[ni + 1], buf[ni + 2], matteCap)) continue;
      stack.push([nx, ny]);
    }
  }
}

/** Remove 1 camada de “sujidade” escura colada à zona já transparente. */
function fringeOnce(buf, w, h) {
  const alphas = new Uint8Array(w * h);
  for (let p = 0, i = 3; p < w * h; p++, i += 4) {
    alphas[p] = buf[i];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pos(x, y, w);
      if (alphas[p] < 20) continue;
      const ii = idx(x, y, w);
      if (!isMatte(buf[ii], buf[ii + 1], buf[ii + 2], FRINGE_MAX)) continue;
      let nearHole = false;
      const nbs = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of nbs) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (alphas[pos(nx, ny, w)] < 20) {
          nearHole = true;
          break;
        }
      }
      if (nearHole) {
        buf[ii + 3] = 0;
      }
    }
  }
}

async function edgeMatteToPng(rel) {
  const srcPath = path.join(root, rel);
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA raw, got ${channels} channels`);

  const buf = Buffer.from(data);

  for (let i = 3; i < buf.length; i += 4) {
    buf[i] = 255;
  }

  floodFromStack(buf, w, h, MATTE_MAX);
  fringeOnce(buf, w, h);

  const tmpPath = `${srcPath}.tmp.png`;
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(tmpPath);
  await fs.rename(tmpPath, srcPath);
  const meta = await sharp(srcPath).metadata();
  // eslint-disable-next-line no-console
  console.log("OK", rel, "→", meta.format, "hasAlpha=", meta.hasAlpha, `${meta.width}x${meta.height}`, "(matte borda + fringe)");
}

const files =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["src/assets/seja-locador-captain.png", "src/assets/seja-locador-yacht.png"];

for (const f of files) {
  await edgeMatteToPng(f);
}
