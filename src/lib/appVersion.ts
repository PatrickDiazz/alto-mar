/** Injetados em build (vite.config.ts): semver do package.json + git rev-parse --short. */
export const APP_VERSION = __APP_VERSION__;
export const GIT_COMMIT = __GIT_COMMIT__;

/** Ex.: "v0.10.3 · a1b2c3d" ou "v0.10.3" se não houver git no ambiente de build. */
export function getAppVersionLabel(): string {
  return GIT_COMMIT ? `v${APP_VERSION} · ${GIT_COMMIT}` : `v${APP_VERSION}`;
}
