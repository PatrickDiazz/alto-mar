import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

console.log("Alto Mar app starting...");
createRoot(document.getElementById("root")!).render(<App />);
