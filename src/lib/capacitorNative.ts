import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";

/** Limitações conhecidas do app Android (Capacitor WebView). */
export const ANDROID_APP_LIMITATIONS = {
  /** WebView — não é app 100% nativo; gestos/OS dependem do Chrome System WebView. */
  webViewShell: true,
  /** API: emulador usa 10.0.2.2; telefone físico exige VITE_API_BASE_URL no build. */
  apiRequiresEnvOnDevice: true,
  /** Push (FCM) exige google-services.json em android/app/. */
  pushRequiresFirebase: true,
  /** Localização em background não está activa — só permissões declaradas para uso futuro. */
  backgroundLocationDisabled: true,
  /** Pagamentos Stripe Checkout abrem browser / Custom Tabs — não in-app nativo. */
  stripeExternalBrowser: true,
  /** Sem offline-first: reservas exigem rede. */
  requiresNetwork: true,
  minSdk: 24,
  targetSdk: 36,
} as const;

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Pedir permissão de localização (precisa) quando o user usar mapas/GPS. */
export async function requestLocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted" || status.coarseLocation === "granted") return true;
    const asked = await Geolocation.requestPermissions();
    return asked.location === "granted" || asked.coarseLocation === "granted";
  } catch {
    return false;
  }
}

/** Posição actual (requer permissão). Devolve null se negada ou indisponível. */
export async function getCurrentPositionNative() {
  if (!Capacitor.isNativePlatform()) return null;
  const ok = await requestLocationPermission();
  if (!ok) return null;
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
    return pos.coords;
  } catch {
    return null;
  }
}

let pushListenersRegistered = false;

function registerPushListeners(onToken?: (token: string) => void) {
  if (pushListenersRegistered || !Capacitor.isNativePlatform()) return;
  pushListenersRegistered = true;

  void PushNotifications.addListener("registration", (t: Token) => {
    if (t.value && onToken) onToken(t.value);
    // eslint-disable-next-line no-console
    console.info("[push] token registado (enviar ao backend quando existir endpoint).");
  });

  void PushNotifications.addListener("registrationError", (err) => {
    // eslint-disable-next-line no-console
    console.warn("[push] erro de registo:", err);
  });

  void PushNotifications.addListener("pushNotificationReceived", (n: PushNotificationSchema) => {
    window.dispatchEvent(
      new CustomEvent("alto-mar-push-received", {
        detail: { title: n.title, body: n.body },
      })
    );
  });

  void PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data = action.notification.data as Record<string, string> | undefined;
    const path = data?.path;
    if (path && typeof window !== "undefined") {
      window.location.hash = "";
      window.history.pushState({}, "", path.startsWith("/") ? path : `/${path}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  });
}

function isNativePushEnabled(): boolean {
  const v = import.meta.env.VITE_NATIVE_PUSH;
  return v === "1" || v === "true";
}

/** Pedir permissão de notificações (Android 13+ POST_NOTIFICATIONS) e registar FCM. */
export async function initPushNotifications(onToken?: (token: string) => void): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  // Sem google-services.json, PushNotifications.register() crasha nativamente (FirebaseApp não inicializado).
  if (!isNativePushEnabled()) {
    return false;
  }

  registerPushListeners(onToken);
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return false;
    await PushNotifications.register();
    return true;
  } catch (e) {
    // Sem google-services.json o registo falha — esperado em dev local.
    // eslint-disable-next-line no-console
    console.warn("[push] init falhou (FCM configurado?):", e);
    return false;
  }
}

/** Mede env(safe-area-inset-*) e aplica fallback no Android quando o WebView devolve 0. */
export function applySafeAreaInsets() {
  if (!Capacitor.isNativePlatform()) return;

  const root = document.documentElement;
  root.classList.add("cap-native", `cap-${Capacitor.getPlatform()}`);

  const measure = () => {
    if (!document.body) return;
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    let top = parseFloat(cs.paddingTop) || 0;
    let bottom = parseFloat(cs.paddingBottom) || 0;
    probe.remove();

    if (Capacitor.getPlatform() === "android" && top < 8) {
      top = 40;
    }
    if (Capacitor.getPlatform() === "ios" && top < 8) {
      top = 47;
    }

    root.style.setProperty("--safe-area-top", `${top}px`);
    root.style.setProperty("--safe-area-bottom", `${Math.max(bottom, 0)}px`);
  };

  if (document.body) {
    measure();
  } else {
    document.addEventListener("DOMContentLoaded", measure, { once: true });
  }
  window.visualViewport?.addEventListener("resize", measure);
  window.addEventListener("orientationchange", () => window.setTimeout(measure, 150));
}

/** Inicialização nativa: permissões diferidas + lifecycle. */
export async function initCapacitorNative() {
  if (!Capacitor.isNativePlatform()) return;

  applySafeAreaInsets();
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      // eslint-disable-next-line no-console
      console.debug("[app] foreground");
    }
  });

  void App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}
