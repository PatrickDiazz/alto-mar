import boatExterior from "@/assets/boat-exterior.jpg";
import boatInterior from "@/assets/boat-interior.jpg";
import boatBathroom from "@/assets/boat-bathroom.jpg";

export interface Marinheiro {
  nome: string;
  documentoOk: boolean;
}

export interface Embarcacao {
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
  marinheiro?: Marinheiro;
  documentacaoBarco: boolean;
}

// Derivar verificado: barco + marinheiro docs ok
export function calcularVerificado(barco: Embarcacao): boolean {
  return barco.documentacaoBarco && (barco.marinheiro?.documentoOk ?? false);
}

export function getPendencias(barco: Embarcacao): string[] {
  const pendencias: string[] = [];
  if (!barco.documentacaoBarco) pendencias.push("Documentação do barco");
  if (!barco.marinheiro) pendencias.push("Marinheiro não atribuído");
  else if (!barco.marinheiro.documentoOk) pendencias.push("Documentação do marinheiro");
  return pendencias;
}

export const listaBarcosPadrao: Embarcacao[] = [
  {
    id: "1",
    nome: "Lancha Malou Blue",
    distancia: "Angra dos Reis/RJ",
    preco: "R$ 3.500",
    nota: "4,9",
    verificado: true,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao: "Luxo e conforto em Angra. Inclui marinheiro experiente, combustível e cooler com gelo.",
    tamanho: "32 pés",
    capacidade: 12,
    tipo: "Lancha",
    documentacaoBarco: true,
    marinheiro: { nome: "Carlos Silva", documentoOk: true },
  },
  {
    id: "2",
    nome: "Veleiro Ocean One",
    distancia: "Paraty/RJ",
    preco: "R$ 2.100",
    nota: "4,8",
    verificado: false,
    imagens: [boatExterior, boatInterior],
    descricao: "Passeio clássico e silencioso pelas águas de Paraty.",
    tamanho: "28 pés",
    capacidade: 6,
    tipo: "Veleiro",
    documentacaoBarco: true,
    marinheiro: { nome: "João Mendes", documentoOk: false },
  },
  {
    id: "3",
    nome: "Phantom 300 Gold",
    distancia: "Ilha Grande/RJ",
    preco: "R$ 4.200",
    nota: "3,2",
    verificado: true,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao: "A lancha mais rápida da região, ideal para grupos de 10 pessoas.",
    tamanho: "30 pés",
    capacidade: 10,
    tipo: "Lancha",
    documentacaoBarco: true,
    marinheiro: { nome: "Pedro Santos", documentoOk: true },
  },
  {
    id: "4",
    nome: "Urubu do Pix",
    distancia: "Ilha Grande/RJ",
    preco: "R$ 2.360",
    nota: "4,5",
    verificado: false,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao: "A lancha mais rápida da região, ideal para grupos de 10 pessoas.",
    tamanho: "25 pés",
    capacidade: 8,
    tipo: "Lancha",
    documentacaoBarco: false,
  },
];

// Shared state store (simple module-level for now)
let _barcos: Embarcacao[] = [...listaBarcosPadrao];
let _listeners: (() => void)[] = [];

export const barcosStore = {
  get: () => _barcos,
  add: (barco: Embarcacao) => {
    barco.verificado = calcularVerificado(barco);
    _barcos = [..._barcos, barco];
    _listeners.forEach((l) => l());
  },
  update: (id: string, updates: Partial<Embarcacao>) => {
    _barcos = _barcos.map((b) => {
      if (b.id !== id) return b;
      const updated = { ...b, ...updates };
      updated.verificado = calcularVerificado(updated);
      return updated;
    });
    _listeners.forEach((l) => l());
  },
  remove: (id: string) => {
    _barcos = _barcos.filter((b) => b.id !== id);
    _listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  },
};
