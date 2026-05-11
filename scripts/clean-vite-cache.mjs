/**
 * Remove `dist/` e a cache do Vite em `node_modules/.vite` para forçar rebuild
 * e evitar PNG antigos presos em cache no dev server.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function rm(p) {
  const abs = path.join(root, p);
  if (!fs.existsSync(abs)) {
    // eslint-disable-next-line no-console
    console.log("skip (não existe):", p);
    return;
  }
  fs.rmSync(abs, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log("removido:", p);
}

rm("dist");
rm("node_modules/.vite");
