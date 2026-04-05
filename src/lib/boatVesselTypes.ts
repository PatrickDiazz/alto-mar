import type { TFunction } from "i18next";

/** Valor guardado em `boats.type` (PT-BR canónico). */
export const MOTO_AQUATICA_TIPO = "Moto aquática";

/** Lista fechada de tipos no registo — alinhada ao explorar e ao seed. */
export const BOAT_VESSEL_TYPES = [
  "Lancha",
  "Veleiro",
  "Catamarã",
  "Iate",
  "Escuna",
  MOTO_AQUATICA_TIPO,
  "Saveiro",
  "Lancha inflável",
] as const;

export type BoatVesselTypeId = (typeof BOAT_VESSEL_TYPES)[number];

const I18N_KEYS: Record<BoatVesselTypeId, string> = {
  Lancha: "lancha",
  Veleiro: "veleiro",
  Catamarã: "catamara",
  Iate: "iate",
  Escuna: "escuna",
  [MOTO_AQUATICA_TIPO]: "motoAquatica",
  Saveiro: "saveiro",
  "Lancha inflável": "lanchaInflavel",
};

/** Normaliza valores antigos (ex.: filtro "Jetsky") para o tipo canónico. */
export function normalizeVesselTipo(tipo: string): string {
  const t = tipo?.trim() || "";
  if (t === "Jetsky" || t.toLowerCase() === "jetsky") return MOTO_AQUATICA_TIPO;
  return t;
}

export function isMotoAquaticaVessel(tipo: string): boolean {
  return normalizeVesselTipo(tipo) === MOTO_AQUATICA_TIPO;
}

export function vesselTypeLabel(t: TFunction, dbValue: string): string {
  const n = normalizeVesselTipo(dbValue);
  const entry = BOAT_VESSEL_TYPES.find((x) => x === n);
  if (!entry) return dbValue;
  const key = I18N_KEYS[entry];
  return t(`marinheiro.vesselTypes.${key}`);
}
