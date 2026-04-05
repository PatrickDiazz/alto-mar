export type Amenidade = {
  nome: string;
  incluido: boolean;
  id?: string;
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
  /** Locador oferece moto aquática opcional na reserva */
  jetSkiOffered?: boolean;
  jetSkiPriceCents?: number;
  jetSkiImageUrls?: string[];
  jetSkiDocumentUrl?: string | null;
};

