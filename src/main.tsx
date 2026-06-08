import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { initCapacitorNative } from "@/lib/capacitorNative";
import { registerStripeCheckoutResumeListeners } from "@/lib/stripeCheckout";

console.log("Alto Mar app starting...");
void initCapacitorNative();
registerStripeCheckoutResumeListeners(() => {
  window.dispatchEvent(new Event("alto-mar-stripe-synced"));
});
createRoot(document.getElementById("root")!).render(<App />);
