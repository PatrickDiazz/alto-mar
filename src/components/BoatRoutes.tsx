import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type BoatRoutesProps = {
  boatId: string;
  locationText: string;
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

function getRoutesForBoat(boatId: string, locationText: string): RouteItem[] {
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

function routeCoordinates(boatId: string, locationText: string, route: RouteItem): LatLng[] {
  const base = getBaseCoord(locationText);
  const coords: LatLng[] = [base];
  route.stops.forEach((s, idx) => {
    const u = hashToUnit(`${boatId}:${route.nome}:${s.ilha}:${idx}`);
    const angle = (idx / Math.max(1, route.stops.length - 1)) * Math.PI * 1.25 + u * 0.7;
    const radius = 0.02 + idx * 0.01 + u * 0.006;
    coords.push({
      lat: base.lat + Math.sin(angle) * radius,
      lng: base.lng + Math.cos(angle) * radius,
    });
  });
  return coords;
}

function bearingDeg(a: LatLng, b: LatLng) {
  const y = b.lng - a.lng;
  const x = b.lat - a.lat;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
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

function makeArrowIcon(deg: number) {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;display:grid;place-items:center;
      color:#2563eb;font-size:16px;font-weight:700;
      transform: rotate(${deg}deg);
      text-shadow:0 1px 2px rgba(255,255,255,.9);
    ">➤</div>`,
  });
}

export function BoatRoutes({ boatId, locationText }: BoatRoutesProps) {
  const routes = getRoutesForBoat(boatId, locationText);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = routes[selectedIdx] || routes[0];
  const coords = useMemo(
    () => routeCoordinates(boatId, locationText, selected),
    [boatId, locationText, selected]
  );

  const arrows = useMemo(() => {
    const items: { pos: LatLng; deg: number }[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      items.push({
        pos: midpoint(coords[i], coords[i + 1]),
        deg: bearingDeg(coords[i], coords[i + 1]),
      });
    }
    return items;
  }, [coords]);

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground">Roteiros sugeridos</h3>
        <p className="text-xs text-muted-foreground">
          Rotas fictícias com navegação de ilha em ilha para este passeio.
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={coords.map((c) => [c.lat, c.lng])}
            pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }}
          />
          {coords.slice(1).map((p, i) => (
            <Marker key={`stop-${i}`} position={[p.lat, p.lng]} icon={makeStopIcon(i + 1)}>
              <Popup>
                {selected.stops[i]?.ilha} • parada ~{selected.stops[i]?.paradaMin}min
              </Popup>
            </Marker>
          ))}
          {arrows.map((a, i) => (
            <Marker key={`arrow-${i}`} position={[a.pos.lat, a.pos.lng]} icon={makeArrowIcon(a.deg)} />
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

