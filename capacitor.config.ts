import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.altomar.app",
  appName: "Alto Mar",
  webDir: "dist",
  bundledWebRuntime: false,
  // WebView usa https://localhost; API local é http — sem isto o fetch para 10.0.2.2 é bloqueado (mixed content).
  android: {
    allowMixedContent: true,
  },
};

export default config;

