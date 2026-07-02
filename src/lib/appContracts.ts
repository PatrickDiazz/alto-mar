/** Documentos legais oficiais (PDF estático em /public/documents). */

export type AppContractSlug =
  | "termos"
  | "privacidade"
  | "cancelamento"
  | "stripe"
  | "parceria";

export type AppContract = {
  slug: AppContractSlug;
  pdfUrl: string;
  titleKey: string;
  updatedKey: string;
  descKey: string;
  /** Exibido na listagem principal da central de ajuda. */
  showInHelpIndex: boolean;
  /** Destaque na seção de locadores. */
  ownerSection?: boolean;
  /** Obrigatório no cadastro de banhista. */
  guestSignup?: boolean;
  /** Obrigatório no cadastro de locador. */
  ownerSignup?: boolean;
};

export const APP_CONTRACTS: AppContract[] = [
  {
    slug: "termos",
    pdfUrl: "/documents/termos-condicoes-clientes.pdf",
    titleKey: "ajuda.contracts.termos.title",
    updatedKey: "ajuda.contracts.termos.updated",
    descKey: "ajuda.contracts.termos.desc",
    showInHelpIndex: true,
    guestSignup: true,
    ownerSignup: false,
  },
  {
    slug: "privacidade",
    pdfUrl: "/documents/politica-privacidade-protecao-dados.pdf",
    titleKey: "ajuda.contracts.privacidade.title",
    updatedKey: "ajuda.contracts.privacidade.updated",
    descKey: "ajuda.contracts.privacidade.desc",
    showInHelpIndex: true,
    guestSignup: true,
    ownerSignup: true,
  },
  {
    slug: "cancelamento",
    pdfUrl: "/documents/politica-cancelamento-reembolso.pdf",
    titleKey: "ajuda.contracts.cancelamento.title",
    updatedKey: "ajuda.contracts.cancelamento.updated",
    descKey: "ajuda.contracts.cancelamento.desc",
    showInHelpIndex: true,
    guestSignup: true,
    ownerSignup: true,
  },
  {
    slug: "stripe",
    pdfUrl: "/documents/termos-pagamento-gateway-stripe.pdf",
    titleKey: "ajuda.contracts.stripe.title",
    updatedKey: "ajuda.contracts.stripe.updated",
    descKey: "ajuda.contracts.stripe.desc",
    showInHelpIndex: true,
    guestSignup: true,
    ownerSignup: true,
  },
  {
    slug: "parceria",
    pdfUrl: "/documents/contrato-parceria-marinheiros-operadores.pdf",
    titleKey: "ajuda.contracts.parceria.title",
    updatedKey: "ajuda.contracts.parceria.updated",
    descKey: "ajuda.contracts.parceria.desc",
    showInHelpIndex: false,
    ownerSection: true,
    guestSignup: false,
    ownerSignup: true,
  },
];

export const SIGNUP_ACCEPT_API_KEY: Record<AppContractSlug, string> = {
  termos: "acceptTerms",
  privacidade: "acceptPrivacy",
  cancelamento: "acceptCancellation",
  stripe: "acceptStripe",
  parceria: "acceptPartnership",
};

export function isAppContractSlug(value: string | undefined): value is AppContractSlug {
  return APP_CONTRACTS.some((c) => c.slug === value);
}

export function getAppContract(slug: string | undefined): AppContract | undefined {
  return APP_CONTRACTS.find((c) => c.slug === slug);
}

export function helpIndexContracts(): AppContract[] {
  return APP_CONTRACTS.filter((c) => c.showInHelpIndex);
}

export function ownerHelpContracts(): AppContract[] {
  return APP_CONTRACTS.filter((c) => c.ownerSection);
}

export function guestSignupContracts(): AppContract[] {
  const order: AppContractSlug[] = ["termos", "privacidade", "cancelamento", "stripe"];
  return order.map((slug) => getAppContract(slug)).filter((c): c is AppContract => Boolean(c));
}

export function ownerSignupContracts(): AppContract[] {
  const order: AppContractSlug[] = ["parceria", "privacidade", "cancelamento", "stripe"];
  return order.map((slug) => getAppContract(slug)).filter((c): c is AppContract => Boolean(c));
}

/** @deprecated Use getAppContract("parceria")?.pdfUrl */
export const OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_URL =
  "/documents/contrato-parceria-marinheiros-operadores.pdf";

export const OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_TITLE =
  "CONTRATO DE PARCERIA PARA MARINHEIROS E OPERADORES";
