import pkg from "../../package.json";

/** Semver do `package.json` (fonte única; o bundle reflecte a versão ao compilar). */
export const APP_VERSION = pkg.version;

/** Hash curto do Git, injectado no build/dev pelo Vite (`vite.config.ts`). */
export const GIT_COMMIT = __GIT_COMMIT__;

/** Ex.: "v0.10.5 · a1b2c3d" ou "v0.10.5" se não houver git no ambiente de build. */
export function getAppVersionLabel(): string {
  return GIT_COMMIT ? `v${APP_VERSION} · ${GIT_COMMIT}` : `v${APP_VERSION}`;
}
