export type Amenidade = {
  nome: string;
  incluido: boolean;
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
};

