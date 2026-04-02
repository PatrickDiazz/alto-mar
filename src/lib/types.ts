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
  routeIslands?: string[];
  /** URLs de imagens por nome da parada (praias do roteiro) */
  routeIslandImages?: Record<string, string[]>;
};

