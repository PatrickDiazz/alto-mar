import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { initCapacitorNative } from "@/lib/capacitorNative";

console.log("Alto Mar app starting...");
void initCapacitorNative();
createRoot(document.getElementById("root")!).render(<App />);
