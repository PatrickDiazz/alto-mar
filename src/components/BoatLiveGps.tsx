import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type BoatLiveGpsProps = {
  boatId: string;
  boatName: string;
};

function hashToUnit(seed: string) {
  // Determinístico (não criptográfico) para gerar coordenadas fictícias por barco
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function baseCoordinateFromBoatId(boatId: string) {
  // Região de Angra dos Reis (aprox) + offset determinístico
  const baseLat = -23.005;
  const baseLng = -44.318;
  const u1 = hashToUnit(`${boatId}:lat`);
  const u2 = hashToUnit(`${boatId}:lng`);
  const lat = baseLat + (u1 - 0.5) * 0.08;
  const lng = baseLng + (u2 - 0.5) * 0.10;
  return { lat, lng };
}

function metersPerSecondToKnots(ms: number) {
  return ms * 1.943844;
}

export function BoatLiveGps({ boatId, boatName }: BoatLiveGpsProps) {
  const iconReady = useRef(false);

  useEffect(() => {
    if (iconReady.current) return;
    // Corrige ícone padrão do Leaflet no bundler (Vite)
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
    iconReady.current = true;
  }, []);

  const boatIcon = useMemo(() => {
    // Ícone de barco (SVG) dentro de um "pin" circular
    return L.divIcon({
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 36],
      popupAnchor: [0, -34],
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.92);
          border: 2px solid rgba(14,165,233,0.85);
          box-shadow: 0 10px 25px rgba(2, 8, 23, 0.15);
          display: grid;
          place-items: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="rgba(14,165,233,1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 10.5V21" />
            <path d="M7 12.5l5-2 5 2" />
            <path d="M3.5 17c4.5 4 12.5 4 17 0" />
            <path d="M12 3l6 6H6l6-6z" />
          </svg>
        </div>
      `,
    });
  }, []);

  const base = useMemo(() => baseCoordinateFromBoatId(boatId), [boatId]);
  const [position, setPosition] = useState(() => base);
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const [speedMs, setSpeedMs] = useState<number>(2.4);
  const [headingDeg, setHeadingDeg] = useState<number>(90);

  useEffect(() => {
    // Simulação “tempo real”: pequena variação a cada 2s
    const tickMs = 2000;
    const id = window.setInterval(() => {
      setPosition((p) => {
        // Movimento suave em torno do ponto base
        const t = Date.now() / 1000;
        const driftLat = Math.sin(t / 9 + hashToUnit(boatId)) * 0.0012;
        const driftLng = Math.cos(t / 11 + hashToUnit(`${boatId}:b`)) * 0.0014;
        const next = {
          lat: base.lat + driftLat,
          lng: base.lng + driftLng,
        };

        // Estimar rumo/velocidade (fictício) a partir do delta
        const dLat = next.lat - p.lat;
        const dLng = next.lng - p.lng;
        const approxMeters =
          Math.sqrt((dLat * 111_320) ** 2 + (dLng * 101_000) ** 2) || 0;
        const ms = approxMeters / (tickMs / 1000);
        setSpeedMs(Math.min(8, Math.max(0.2, ms)));
        const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        setHeadingDeg((heading + 360) % 360);
        return next;
      });
      setLastUpdate(new Date());
    }, tickMs);

    return () => window.clearInterval(id);
  }, [base.lat, base.lng, boatId]);

  const googleMapsLink = useMemo(() => {
    const q = `${position.lat},${position.lng}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
  }, [position.lat, position.lng]);

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">GPS ao vivo</h3>
          <p className="text-xs text-muted-foreground">
            Localização fictícia, atualizando em tempo real (simulação).
          </p>
        </div>
        <span className="text-[11px] bg-verified/10 text-verified px-2 py-1 rounded-full">
          Atualizando
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Latitude</p>
          <p className="font-semibold text-foreground tabular-nums">
            {position.lat.toFixed(6)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Longitude</p>
          <p className="font-semibold text-foreground tabular-nums">
            {position.lng.toFixed(6)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Velocidade</p>
          <p className="font-semibold text-foreground tabular-nums">
            {metersPerSecondToKnots(speedMs).toFixed(1)} kn
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Rumo</p>
          <p className="font-semibold text-foreground tabular-nums">
            {Math.round(headingDeg)}°
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-64 w-full relative z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[position.lat, position.lng]} icon={boatIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{boatName}</p>
                <p className="text-xs">Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Última atualização: <span className="tabular-nums">{lastUpdate.toLocaleTimeString("pt-BR")}</span>
        </p>
        <a
          className="text-xs font-semibold text-primary hover:underline"
          href={googleMapsLink}
          target="_blank"
          rel="noreferrer"
        >
          Abrir no Maps
        </a>
      </div>
    </section>
  );
}

