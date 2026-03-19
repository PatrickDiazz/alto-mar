import boatExterior from "@/assets/boat-exterior.jpg";
import boatInterior from "@/assets/boat-interior.jpg";
import boatBathroom from "@/assets/boat-bathroom.jpg";

export interface Marinheiro {
  nome: string;
  documentoOk: boolean;
}

export interface Amenidade {
  nome: string;
  incluido: boolean;
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
  amenidades: Amenidade[];
  locaisEmbarque: string[];
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

const amenidadesPadrao: Amenidade[] = [
  { nome: "Carvão", incluido: true },
  { nome: "Gelo", incluido: true },
  { nome: "Banho com água doce", incluido: true },
  { nome: "Cooler", incluido: true },
  { nome: "Som Bluetooth", incluido: true },
  { nome: "Coletes salva-vidas", incluido: true },
];

const amenidadesBasicas: Amenidade[] = [
  { nome: "Carvão", incluido: false },
  { nome: "Gelo", incluido: true },
  { nome: "Banho com água doce", incluido: false },
  { nome: "Cooler", incluido: true },
  { nome: "Som Bluetooth", incluido: false },
  { nome: "Coletes salva-vidas", incluido: true },
];

const locaisPadrao = ["Marina de Angra", "Cais de Santa Luzia", "Pier do Frade"];
const locaisParaty = ["Marina de Paraty", "Cais do Porto"];

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
    amenidades: amenidadesPadrao,
    locaisEmbarque: locaisPadrao,
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
    amenidades: amenidadesBasicas,
    locaisEmbarque: locaisParaty,
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
    amenidades: amenidadesPadrao,
    locaisEmbarque: locaisPadrao,
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
    amenidades: amenidadesBasicas,
    locaisEmbarque: locaisPadrao,
  },
  // Barcos fictícios adicionais (até 30)
  ...Array.from({ length: 26 }, (_, idx) => {
    const n = idx + 5;
    const tipos = ["Lancha", "Veleiro", "Catamarã", "Iate", "Escuna"] as const;
    const tipo = tipos[idx % tipos.length];
    const regioes = [
      { distancia: "Angra dos Reis/RJ", locais: locaisPadrao },
      { distancia: "Paraty/RJ", locais: locaisParaty },
      { distancia: "Ilha Grande/RJ", locais: locaisPadrao },
      { distancia: "Mangaratiba/RJ", locais: locaisPadrao },
      { distancia: "Ubatuba/SP", locais: ["Saco da Ribeira", "Marina do Itaguá"] },
    ] as const;
    const reg = regioes[idx % regioes.length];

    const capacidade = [6, 8, 10, 12, 16][idx % 5];
    const pes = [22, 25, 28, 32, 36][idx % 5];
    const precoNumero = 1800 + (idx % 9) * 350 + (tipo === "Iate" ? 1200 : 0);
    const nota = (4.1 + (idx % 8) * 0.1).toFixed(1).replace(".", ",");

    const hasMarinheiro = idx % 3 !== 0;
    const docMarinheiroOk = idx % 5 !== 0;
    const docBarcoOk = idx % 4 !== 0;
    const marinheiro = hasMarinheiro
      ? { nome: ["Rafael", "Mariana", "Bruno", "Fernanda", "Diego", "Camila"][idx % 6] + " " + ["Lima", "Souza", "Pereira", "Alves", "Costa"][idx % 5], documentoOk: docMarinheiroOk }
      : undefined;

    const barco: Embarcacao = {
      id: String(n),
      nome:
        tipo === "Lancha"
          ? `Lancha Maré ${n}`
          : tipo === "Veleiro"
            ? `Veleiro Brisa ${n}`
            : tipo === "Catamarã"
              ? `Catamarã Atlântico ${n}`
              : tipo === "Iate"
                ? `Iate Aurora ${n}`
                : `Escuna Encanto ${n}`,
      distancia: reg.distancia,
      preco: `R$ ${precoNumero.toLocaleString("pt-BR")}`,
      nota,
      imagens:
        idx % 2 === 0
          ? [boatExterior, boatInterior]
          : [boatBathroom, boatExterior, boatInterior],
      descricao:
        "Embarcação fictícia para demonstração. Inclui itens básicos e roteiro personalizado conforme o clima.",
      verificado: false, // será recalculado abaixo
      tamanho: `${pes} pés`,
      capacidade,
      tipo,
      documentacaoBarco: docBarcoOk,
      marinheiro,
      amenidades: idx % 2 === 0 ? amenidadesPadrao : amenidadesBasicas,
      locaisEmbarque: [...reg.locais],
    };

    barco.verificado = calcularVerificado(barco);
    return barco;
  }),
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
