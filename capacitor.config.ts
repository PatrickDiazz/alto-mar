import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.altomar.app",
  appName: "Alto Mar",
  webDir: "dist",
  bundledWebRuntime: false,
  // WebView usa https://localhost; API local é http — sem isto o fetch para 10.0.2.2 é bloqueado (mixed content).
  android: {
    allowMixedContent: true,
    backgroundColor: "#0a0f1a",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Geolocation: {
      // Pedido em runtime via capacitorNative.ts — não ao abrir o app.
    },
  },
};

export default config;

