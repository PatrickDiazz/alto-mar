/**
 * Live reload Android: app carrega o Vite (porta 8080) em vez do bundle estático.
 *
 * Uso:
 *   npm run android:live          # telefone físico (mesma Wi‑Fi)
 *   npm run android:live:emu      # emulador Android
 *   npm run android:live:full     # sobe Vite + API e abre no dispositivo
 *
 * Pré-requisito sem --with-servers: noutro terminal `npm run dev:all`
 */
import net from "node:net";
import { existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.VITE_PORT || "8080", 10);

const emulator = process.argv.includes("--emulator");
const withServers = process.argv.includes("--with-servers");

function adbPath() {
  const candidates = [
    process.env.ANDROID_HOME && `${process.env.ANDROID_HOME}\\platform-tools\\adb.exe`,
    process.env.ANDROID_SDK_ROOT && `${process.env.ANDROID_SDK_ROOT}\\platform-tools\\adb.exe`,
    `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`,
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "adb";
}

/** @returns {string | null} serial do dispositivo adb (emulator-* ou USB) */
function pickAdbTarget(preferEmulator) {
  const adb = adbPath();
  let out = "";
  try {
    out = execSync(`"${adb}" devices`, { encoding: "utf-8", timeout: 10_000 });
  } catch {
    return null;
  }
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("List of devices"));
  const online = lines
    .filter((l) => l.endsWith("\tdevice") || l.endsWith(" device"))
    .map((l) => l.split(/\s+/)[0])
    .filter(Boolean);
  if (online.length === 0) return null;
  if (preferEmulator) {
    return online.find((id) => id.startsWith("emulator-")) ?? online[0];
  }
  return online.find((id) => !id.startsWith("emulator-")) ?? online[0];
}

function parseTargetArg() {
  const idx = process.argv.indexOf("--target");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.ANDROID_TARGET?.trim() || null;
}

function lanIpv4() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const cfg of entries ?? []) {
      if (cfg.family === "IPv4" && !cfg.internal) return cfg.address;
    }
  }
  return null;
}

function ensureJavaHome(env) {
  if (env.JAVA_HOME) return env;
  const jbr = "C:\\Program Files\\Android\\Android Studio\\jbr";
  if (existsSync(jbr)) {
    env.JAVA_HOME = jbr;
    env.Path = `${jbr}\\bin;${env.Path || env.PATH || ""}`;
  }
  return env;
}

async function waitForPort(host, port, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const s = net.connect({ host, port }, () => {
          s.end();
          resolve();
        });
        s.setTimeout(1500);
        s.on("error", reject);
        s.on("timeout", () => {
          s.destroy();
          reject(new Error("timeout"));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return false;
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
    child.on("error", reject);
  });
}

const ip = lanIpv4();
/** Host que o telefone/emulador usa para falar com o Vite no PC. */
const liveHost = emulator ? "127.0.0.1" : ip;
/** Host anunciado ao cliente HMR do Vite (WebSocket). */
const hmrHost = emulator ? "127.0.0.1" : ip;

if (!emulator && !ip) {
  // eslint-disable-next-line no-console
  console.error(
    "[android-live] Não encontrei IP na rede local. Use --emulator ou ligue o PC ao Wi‑Fi."
  );
  process.exit(1);
}

let env = { ...process.env, VITE_HMR_HOST: hmrHost || "127.0.0.1" };
env = ensureJavaHome(env);

// eslint-disable-next-line no-console
console.log(`
[android-live] Modo: ${emulator ? "emulador" : "telefone físico"}
[android-live] Vite: http://${liveHost}:${PORT}
[android-live] HMR host: ${env.VITE_HMR_HOST}
[android-live] API: pedidos /api → proxy Vite → localhost:3001 (npm run dev:all)
`);

if (withServers) {
  // eslint-disable-next-line no-console
  console.log("[android-live] A iniciar Vite + API…");
  spawn("npm", ["run", "dev:all"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
    detached: false,
  });
  const ok = await waitForPort("127.0.0.1", PORT);
  if (!ok) {
    // eslint-disable-next-line no-console
    console.error(`[android-live] Vite não respondeu na porta ${PORT} a tempo.`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log("[android-live] Vite pronto.");
} else {
  // eslint-disable-next-line no-console
  console.log(
    `[android-live] Certifique-se de que \`npm run dev:all\` está a correr (VITE_HMR_HOST=${env.VITE_HMR_HOST}).\n`
  );
  const ok = await waitForPort("127.0.0.1", PORT, 8_000);
  if (!ok) {
    // eslint-disable-next-line no-console
    console.warn(
      `[android-live] Porta ${PORT} ainda não responde — inicie \`npm run dev:all\` ou use npm run android:live:full`
    );
  }
}

const capArgs = [
  "cap",
  "run",
  "android",
  "-l",
  "--port",
  String(PORT),
  "--host",
  liveHost,
];
if (emulator) {
  capArgs.push("--forwardPorts", `${PORT}:${PORT}`);
}

const explicitTarget = parseTargetArg();
const adbTarget = explicitTarget ?? pickAdbTarget(emulator);
if (adbTarget) {
  capArgs.push("--target", adbTarget);
  // eslint-disable-next-line no-console
  console.log(`[android-live] Dispositivo ADB: ${adbTarget}`);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[android-live] Nenhum dispositivo ADB online — ligue o telefone (USB + depuração) ou inicie um emulador no Android Studio."
  );
}

try {
  await run("npx", capArgs, env);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  // eslint-disable-next-line no-console
  console.error("[android-live] Falhou:", msg);
  process.exit(1);
}
