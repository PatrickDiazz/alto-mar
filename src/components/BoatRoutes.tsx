import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type BoatRoutesProps = {
  boatId: string;
  locationText: string;
  routeIslands?: string[];
};

type RouteStop = {
  ilha: string;
  paradaMin: number;
};

type RouteItem = {
  nome: string;
  duracaoHoras: number;
  stops: RouteStop[];
};

type LatLng = {
  lat: number;
  lng: number;
};

const ROUTES_BY_REGION: Record<string, RouteItem[]> = {
  "Angra dos Reis/RJ": [
    {
      nome: "Roteiro Ilhas Clássicas",
      duracaoHoras: 6,
      stops: [
        { ilha: "Ilha de Cataguases", paradaMin: 45 },
        { ilha: "Ilha da Gipóia", paradaMin: 90 },
        { ilha: "Praia do Dentista", paradaMin: 60 },
      ],
    },
    {
      nome: "Roteiro Azul de Angra",
      duracaoHoras: 8,
      stops: [
        { ilha: "Ilhas Botinas", paradaMin: 50 },
        { ilha: "Ilha de Paquetá", paradaMin: 70 },
        { ilha: "Lagoa Azul", paradaMin: 90 },
      ],
    },
  ],
  "Paraty/RJ": [
    {
      nome: "Roteiro Baía de Paraty",
      duracaoHoras: 6,
      stops: [
        { ilha: "Ilha Comprida", paradaMin: 50 },
        { ilha: "Praia da Lula", paradaMin: 70 },
        { ilha: "Praia Vermelha", paradaMin: 60 },
      ],
    },
    {
      nome: "Roteiro Trindade Mar",
      duracaoHoras: 7,
      stops: [
        { ilha: "Ilha do Algodão", paradaMin: 45 },
        { ilha: "Saco do Mamanguá", paradaMin: 80 },
        { ilha: "Parada de mergulho", paradaMin: 60 },
      ],
    },
  ],
  "Ilha Grande/RJ": [
    {
      nome: "Roteiro Volta da Ilha",
      duracaoHoras: 8,
      stops: [
        { ilha: "Lagoa Verde", paradaMin: 60 },
        { ilha: "Praia de Aventureiro", paradaMin: 80 },
        { ilha: "Praia de Lopes Mendes", paradaMin: 70 },
      ],
    },
    {
      nome: "Roteiro Enseadas Calmas",
      duracaoHoras: 6,
      stops: [
        { ilha: "Saco do Céu", paradaMin: 60 },
        { ilha: "Freguesia de Santana", paradaMin: 50 },
        { ilha: "Praia do Amor", paradaMin: 60 },
      ],
    },
  ],
  "Mangaratiba/RJ": [
    {
      nome: "Roteiro Mangaratiba Premium",
      duracaoHoras: 6,
      stops: [
        { ilha: "Ilha de Itacuruçá", paradaMin: 60 },
        { ilha: "Ilha de Jaguanum", paradaMin: 80 },
        { ilha: "Praia de Muriqui", paradaMin: 45 },
      ],
    },
  ],
  "Ubatuba/SP": [
    {
      nome: "Roteiro Ilhas de Ubatuba",
      duracaoHoras: 6,
      stops: [
        { ilha: "Ilha Anchieta", paradaMin: 90 },
        { ilha: "Ilha das Couves", paradaMin: 70 },
        { ilha: "Ilhote do Prumirim", paradaMin: 45 },
      ],
    },
  ],
};

function hashToUnit(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function estimateDurationHours(locationText: string, route: RouteItem, boatId: string) {
  const avgKmh = 33; // ~18 knots
  const pts = routeCoordinates(boatId, locationText, route);
  let sailKm = 0;
  for (let i = 1; i < pts.length; i++) sailKm += haversineKm(pts[i - 1], pts[i]);
  const sailHours = sailKm / avgKmh;
  const stopHours = route.stops.reduce((acc, s) => acc + s.paradaMin, 0) / 60;
  return Math.max(1, Math.round((sailHours + stopHours) * 10) / 10);
}

function customRouteFromIslands(routeIslands: string[] | undefined, locationText: string, boatId: string): RouteItem | null {
  const stops = (routeIslands || []).map((ilha) => ilha.trim()).filter(Boolean).map((ilha) => ({ ilha, paradaMin: 40 }));
  if (stops.length === 0) return null;
  const custom: RouteItem = { nome: "Roteiro personalizado do locatário", duracaoHoras: 0, stops };
  custom.duracaoHoras = estimateDurationHours(locationText, custom, boatId);
  return custom;
}

function getRoutesForBoat(boatId: string, locationText: string, routeIslands?: string[]): RouteItem[] {
  const custom = customRouteFromIslands(routeIslands, locationText, boatId);
  if (custom) return [custom];
  const base = ROUTES_BY_REGION[locationText] || ROUTES_BY_REGION["Angra dos Reis/RJ"];
  if (base.length <= 1) return base;
  const rotateBy = Math.floor(hashToUnit(boatId) * base.length);
  return [...base.slice(rotateBy), ...base.slice(0, rotateBy)];
}

function getBaseCoord(locationText: string): LatLng {
  const map: Record<string, LatLng> = {
    "Angra dos Reis/RJ": { lat: -23.01, lng: -44.32 },
    "Paraty/RJ": { lat: -23.22, lng: -44.71 },
    "Ilha Grande/RJ": { lat: -23.15, lng: -44.24 },
    "Mangaratiba/RJ": { lat: -22.96, lng: -44.04 },
    "Ubatuba/SP": { lat: -23.44, lng: -45.08 },
  };
  return map[locationText] || map["Angra dos Reis/RJ"];
}

const KNOWN_ISLANDS: Record<string, LatLng> = {
  "ilha de cataguases": { lat: -23.008, lng: -44.314 },
  "ilha da gipoia": { lat: -23.034, lng: -44.329 },
  "praia do dentista": { lat: -23.033, lng: -44.325 },
  "ilhas botinas": { lat: -23.031, lng: -44.318 },
  "ilha de paquetá": { lat: -23.02, lng: -44.295 },
  "lagoa azul": { lat: -23.167, lng: -44.248 },
  "ilha comprida": { lat: -23.199, lng: -44.664 },
  "praia da lula": { lat: -23.214, lng: -44.687 },
  "praia vermelha": { lat: -23.228, lng: -44.675 },
  "ilha do algodao": { lat: -23.225, lng: -44.676 },
  "saco do mamangua": { lat: -23.227, lng: -44.63 },
  "lagoa verde": { lat: -23.145, lng: -44.236 },
  "praia de aventureiro": { lat: -23.191, lng: -44.317 },
  "praia de lopes mendes": { lat: -23.176, lng: -44.143 },
  "saco do ceu": { lat: -23.132, lng: -44.249 },
  "freguesia de santana": { lat: -23.106, lng: -44.207 },
  "ilha de itacuruca": { lat: -22.93, lng: -43.89 },
  "ilha de jaguanum": { lat: -22.952, lng: -43.998 },
  "ilha anchieta": { lat: -23.548, lng: -45.065 },
  "ilha das couves": { lat: -23.424, lng: -44.855 },
};

function normalizeIslandName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(sa));
}

function routeCoordinates(boatId: string, locationText: string, route: RouteItem): LatLng[] {
  const base = getBaseCoord(locationText);
  const coords: LatLng[] = [base];
  route.stops.forEach((s, idx) => {
    const known = KNOWN_ISLANDS[normalizeIslandName(s.ilha)];
    if (known) {
      coords.push(known);
      return;
    }
    const u = hashToUnit(`${boatId}:${route.nome}:${s.ilha}:${idx}`);
    const angle = (idx / Math.max(1, route.stops.length - 1)) * Math.PI * 1.25 + u * 0.7;
    const radius = 0.02 + idx * 0.01 + u * 0.006;
    coords.push({ lat: base.lat + Math.sin(angle) * radius, lng: base.lng + Math.cos(angle) * radius });
  });
  return coords;
}


function makeStopIcon(n: number) {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="
      width:26px;height:26px;border-radius:9999px;
      background:#0ea5e9;color:white;font-weight:700;font-size:12px;
      display:grid;place-items:center;border:2px solid rgba(255,255,255,0.95);
      box-shadow:0 4px 10px rgba(2,8,23,.25);
    ">${n}</div>`,
  });
}

export function BoatRoutes({ boatId, locationText, routeIslands }: BoatRoutesProps) {
  const routes = getRoutesForBoat(boatId, locationText, routeIslands);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = routes[selectedIdx] || routes[0];
  const coords = useMemo(
    () => routeCoordinates(boatId, locationText, selected),
    [boatId, locationText, selected]
  );

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground">Roteiros sugeridos</h3>
        <p className="text-xs text-muted-foreground">
          Rotas fictícias com navegação de ilha em ilha para este passeio.
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Trajeto marítimo estimado, podendo contornar costa e ilhas durante a navegação.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[coords[0].lat, coords[0].lng]}
          zoom={11}
          scrollWheelZoom={false}
          className="h-64 w-full relative z-0"
        >
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {coords.slice(1).map((p, i) => (
            <Marker key={`stop-${i}`} position={[p.lat, p.lng]} icon={makeStopIcon(i + 1)}>
              <Popup>
                {selected.stops[i]?.ilha} • parada ~{selected.stops[i]?.paradaMin}min
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="space-y-3">
        {routes.map((route, idx) => (
          <article
            key={route.nome}
            className={`rounded-lg border p-3 cursor-pointer transition ${
              idx === selectedIdx ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => setSelectedIdx(idx)}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-foreground">{route.nome}</h4>
              <span className="text-xs text-muted-foreground">{route.duracaoHoras}h</span>
            </div>

            <div className="space-y-2">
              {route.stops.map((stop, idx) => (
                <div key={`${route.nome}-${stop.ilha}`} className="flex items-center gap-2 text-xs">
                  <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-foreground">{stop.ilha}</span>
                  <span className="text-muted-foreground">• parada ~{stop.paradaMin}min</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

