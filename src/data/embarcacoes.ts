import boatExterior from "@/assets/boat-exterior.jpg";
import boatInterior from "@/assets/boat-interior.jpg";
import boatBathroom from "@/assets/boat-bathroom.jpg";

export interface Embarcacao {
  id: string;
  nome: string;
  distancia: string;
  preco: string;
  nota: string;
  imagens: string[];
  descricao: string;
  verificado: boolean;
}

export const listaBarcos: Embarcacao[] = [
  {
    id: "1",
    nome: "Lancha Malou Blue",
    distancia: "Angra dos Reis/RJ",
    preco: "R$ 3.500",
    nota: "4,9",
    verificado: true,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao:
      "Luxo e conforto em Angra. Inclui marinheiro experiente, combustível e cooler com gelo.",
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
  },
  {
    id: "3",
    nome: "Phantom 300 Gold",
    distancia: "Ilha Grande/RJ",
    preco: "R$ 4.200",
    nota: "3,2",
    verificado: true,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao:
      "A lancha mais rápida da região, ideal para grupos de 10 pessoas.",
  },
  {
    id: "4",
    nome: "Urubu do Pix",
    distancia: "Ilha Grande/RJ",
    preco: "R$ 2.360",
    nota: "4,5",
    verificado: false,
    imagens: [boatBathroom, boatExterior, boatInterior],
    descricao:
      "A lancha mais rápida da região, ideal para grupos de 10 pessoas.",
  },
];
