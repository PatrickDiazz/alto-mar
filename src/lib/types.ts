import type { BbqKitItemConfig } from "@/lib/trip-optionals";

export type Amenidade = {
  nome: string;
  incluido: boolean;
  id?: string;
};

/** Opcional personalizado cadastrado pelo locador na embarcação */
export type CustomOptional = {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  imageUrls: string[];
};

/** Tripulação exibida na página pública do barco */
export type PublicCrewMember = {
  id: string;
  nome: string;
  photoUrl: string;
  funcao: string;
  funcaoLabel: string;
  bio?: string | null;
  platformTenureMonths?: number;
  approvalStatus?: string;
};

export type Boat = {
  id: string;
  nome: string;
  distancia: string;
  preco: string;
  nota: string;
  imagens: string[];
  descricao: string;
  verificado: boolean;
  tamanho: string;
  capacidade: number;
  tipo: string;
  amenidades: Amenidade[];
  locaisEmbarque: string[];
  /** Horários de embarque oferecidos pelo locador (HH:MM). Vazio = a combinar na reserva. */
  horariosEmbarque?: string[];
  routeIslands?: string[];
  /** URLs de imagens por nome da parada (praias do roteiro) */
  routeIslandImages?: Record<string, string[]>;
  /** Locador oferece kit churrasco na reserva (padrão: sim) */
  bbqOffered?: boolean;
  /** Composição do kit definida pelo locador (item + quantidade + unidade). */
  bbqKitItems?: BbqKitItemConfig[];
  /** Preço do opcional kit churrasco em centavos (padrão R$ 250). */
  bbqKitPriceCents?: number;
  /** Locador oferece moto aquática opcional na reserva */
  jetSkiOffered?: boolean;
  jetSkiPriceCents?: number;
  jetSkiImageUrls?: string[];
  jetSkiDocumentUrl?: string | null;
  /** Opcionais extras definidos pelo locador (título, preço, fotos) */
  customOptionals?: CustomOptional[];
  /** Tripulação aprovada vinculada à embarcação */
  tripulacao?: PublicCrewMember[];
};

