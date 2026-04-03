import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import type { ServerResponse } from "http";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf-8")) as { version: string };
let gitCommit = "";
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: __dirname, encoding: "utf-8" }).trim();
} catch {
  /* build sem .git (ex.: tarball) */
}

const apiProxyTarget = "http://127.0.0.1:3001";

const apiProxyOptions = {
  target: apiProxyTarget,
  changeOrigin: true,
  timeout: 120_000,
  proxyTimeout: 120_000,
  configure(proxy: import("http-proxy").Server) {
    proxy.on("error", (err, _req, res) => {
      const code = err && typeof err === "object" && "code" in err ? String((err as NodeJS.ErrnoException).code) : "";
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn(
        `[vite] Proxy /api → :3001 (${code || msg}). ` +
          "A API pode ter reiniciado (node --watch) ou estar parada — npm.cmd run dev:server:stable evita reinícios ao editar o server."
      );
      const r = res as ServerResponse | undefined;
      if (r && typeof r.writeHead === "function" && !r.headersSent) {
        r.writeHead(502, { "Content-Type": "application/json" });
        r.end(
          JSON.stringify({
            ok: false,
            error: "API offline na porta 3001. Num terminal: npm.cmd run dev:server (ou dev:server:stable).",
          })
        );
      }
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
  server: {
    host: "::",
    port: 8080,
    // Permite hostnames de túneis (localtunnel, ngrok, Cloudflare, etc.)
    allowedHosts: true,
    proxy: {
      "/api": apiProxyOptions,
    },
    hmr: {
      overlay: false,
    },
  },
  // Mesmo proxy em `vite preview` (build local); se não houver, /api não chega à API.
  preview: {
    proxy: {
      "/api": apiProxyOptions,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
