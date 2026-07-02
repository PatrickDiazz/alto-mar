export type MarinheiroApprovalStatus = "PENDENTE" | "APROVADO" | "REPROVADO" | "SUSPENSO";

export type MarinheiroFuncao =
  | "CAPITAO"
  | "MARINHEIRO"
  | "MESTRE"
  | "CONDUTOR"
  | "IMEDIATO"
  | "TRIPULANTE"
  | "GUIA_NAUTICO"
  | "OUTRA";

export type MarinheiroRecord = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  cpf: string;
  birthDate: string;
  phone: string;
  photoUrl: string;
  funcao: MarinheiroFuncao;
  funcaoCustom: string | null;
  funcaoLabel: string;
  identityDocUrl: string;
  identityDocExpiresAt: string | null;
  nauticalCertUrl: string;
  nauticalCertExpiresAt: string | null;
  approvalStatus: MarinheiroApprovalStatus;
  suspensionReason: string | null;
  bio: string | null;
  showOnBoatDetail: boolean;
  reviewNotes: string | null;
  documentsExpired: boolean;
  platformTenureMonths: number;
  boatIds: string[];
  boatNames: string[];
  createdAt?: string;
};

export type PublicCrewMember = {
  id: string;
  nome: string;
  photoUrl: string;
  funcao: MarinheiroFuncao;
  funcaoLabel: string;
  bio: string | null;
  platformTenureMonths: number;
  approvalStatus: MarinheiroApprovalStatus;
};

export type MarinheiroFormState = {
  nome: string;
  email: string;
  password: string;
  cpf: string;
  birthDate: string;
  phone: string;
  photoUrl: string;
  funcao: MarinheiroFuncao;
  funcaoCustom: string;
  identityDocUrl: string;
  identityDocExpiresAt: string;
  nauticalCertUrl: string;
  nauticalCertExpiresAt: string;
  bio: string;
  showOnBoatDetail: boolean;
  boatIds: string[];
};

export const MARINHEIRO_FUNCOES: MarinheiroFuncao[] = [
  "CAPITAO",
  "MARINHEIRO",
  "MESTRE",
  "CONDUTOR",
  "IMEDIATO",
  "TRIPULANTE",
  "GUIA_NAUTICO",
  "OUTRA",
];

export function defaultMarinheiroForm(boatIds: string[] = []): MarinheiroFormState {
  return {
    nome: "",
    email: "",
    password: "",
    cpf: "",
    birthDate: "",
    phone: "",
    photoUrl: "",
    funcao: "MARINHEIRO",
    funcaoCustom: "",
    identityDocUrl: "",
    identityDocExpiresAt: "",
    nauticalCertUrl: "",
    nauticalCertExpiresAt: "",
    bio: "",
    showOnBoatDetail: true,
    boatIds,
  };
}
