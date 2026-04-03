/**
 * Incrementa patch (semver) no cliente, servidor, lockfiles, Android, CHANGELOG.
 * Uso: npm run release:patch
 * Depois: edita o bloco novo no CHANGELOG, commit e push.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function bumpPatch(version) {
  const parts = version.trim().split(".");
  if (parts.length !== 3) throw new Error(`Versão inválida: ${version}`);
  const patch = Number(parts[2]);
  if (!Number.isFinite(patch)) throw new Error(`Patch inválido: ${parts[2]}`);
  return `${parts[0]}.${parts[1]}.${patch + 1}`;
}

function todayLocalYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeJson(p, obj) {
  writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, "utf-8");
}

const pkgPath = path.join(root, "package.json");
const serverPkgPath = path.join(root, "server", "package.json");
const lockPath = path.join(root, "package-lock.json");
const serverLockPath = path.join(root, "server", "package-lock.json");
const changelogPath = path.join(root, "CHANGELOG.md");
const gradlePath = path.join(root, "android", "app", "build.gradle");

const pkg = readJson(pkgPath);
const current = pkg.version;
const next = bumpPatch(current);

pkg.version = next;
writeJson(pkgPath, pkg);

const serverPkg = readJson(serverPkgPath);
serverPkg.version = next;
writeJson(serverPkgPath, serverPkg);

for (const lp of [lockPath, serverLockPath]) {
  try {
    const lock = readJson(lp);
    lock.version = next;
    if (lock.packages && lock.packages[""]) {
      lock.packages[""].version = next;
    }
    writeJson(lp, lock);
  } catch {
    /* ignore missing lock */
  }
}

let gradle = readFileSync(gradlePath, "utf-8");
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${next}"`);
gradle = gradle.replace(/versionCode (\d+)/, (_, n) => `versionCode ${Number(n) + 1}`);
writeFileSync(gradlePath, gradle, "utf-8");

let changelog = readFileSync(changelogPath, "utf-8");
const anchor = `## [${current}]`;
const idx = changelog.indexOf(anchor);
if (idx === -1) {
  throw new Error(`CHANGELOG.md: não encontrei a secção "## [${current}]". Actualiza manualmente ou corrige a versão em package.json.`);
}

const block = `## [${next}] — ${todayLocalYmd()}

### Alterado

- _(edita as notas deste release antes de \`git commit\`.)_

---

`;
changelog = changelog.slice(0, idx) + block + changelog.slice(idx);

const tagEsc = current.replace(/\./g, "\\.");
changelog = changelog.replace(
  new RegExp(`\\*\\*\`v${tagEsc}\`\\*\\*`, "g"),
  `**\`v${next}\`**`
);

writeFileSync(changelogPath, changelog, "utf-8");

// eslint-disable-next-line no-console
console.log(`Release patch: ${current} → ${next}`);
// eslint-disable-next-line no-console
console.log("Seguinte: edita o bloco [", next, "] no CHANGELOG, depois git add / commit / push.");
