export type OwnerPanelTab = "inicio" | "reservas" | "embarcacoes" | "perfil";

export type OwnerPanelNavId =
  | "home"
  | "bookings"
  | "agenda"
  | "boats"
  | "optionals"
  | "revenue"
  | "profile";

const VALID: OwnerPanelTab[] = ["inicio", "reservas", "embarcacoes", "perfil"];

export function parseOwnerPanelTab(raw: string | null): OwnerPanelTab {
  if (raw && VALID.includes(raw as OwnerPanelTab)) return raw as OwnerPanelTab;
  return "inicio";
}

export function ownerPanelNavFromPath(pathname: string): OwnerPanelNavId {
  if (pathname.startsWith("/marinheiro/reservas")) return "bookings";
  if (pathname.startsWith("/marinheiro/agenda")) return "agenda";
  if (pathname.startsWith("/marinheiro/embarcacoes")) return "boats";
  if (pathname.startsWith("/marinheiro/opcionais")) return "optionals";
  if (pathname.startsWith("/marinheiro/faturamento")) return "revenue";
  if (pathname.startsWith("/marinheiro/perfil")) return "profile";
  return "home";
}

export function ownerPanelNavPath(id: OwnerPanelNavId): string {
  if (id === "home") return "/marinheiro";
  if (id === "bookings") return "/marinheiro/reservas";
  if (id === "agenda") return "/marinheiro/agenda";
  if (id === "boats") return "/marinheiro/embarcacoes";
  if (id === "optionals") return "/marinheiro/opcionais";
  if (id === "revenue") return "/marinheiro/faturamento";
  return "/marinheiro/perfil";
}

export function ownerPanelTabFromPath(pathname: string): OwnerPanelTab {
  if (pathname.startsWith("/marinheiro/reservas")) return "reservas";
  if (pathname.startsWith("/marinheiro/agenda")) return "reservas";
  if (pathname.startsWith("/marinheiro/embarcacoes")) return "embarcacoes";
  if (pathname.startsWith("/marinheiro/opcionais")) return "embarcacoes";
  if (pathname.startsWith("/marinheiro/perfil")) return "perfil";
  return "inicio";
}

/** Destino do botão «Voltar» no header do painel; `null` = início (ocultar). */
export function ownerPanelBackTarget(pathname: string): string | null {
  if (pathname === "/marinheiro" || pathname === "/marinheiro/") return null;

  if (pathname === "/marinheiro/embarcacoes/novo") return "/marinheiro/embarcacoes";
  if (pathname === "/marinheiro/opcionais/novo") return "/marinheiro/opcionais";

  const boatsDetail = pathname.match(/^\/marinheiro\/embarcacoes\/[^/]+$/);
  if (boatsDetail) return "/marinheiro/embarcacoes";

  if (pathname.startsWith("/marinheiro/opcionais/")) return "/marinheiro/opcionais";

  const bookingDetail = pathname.match(/^\/marinheiro\/reservas\/[^/]+$/);
  if (bookingDetail) return "/marinheiro/reservas";

  if (
    pathname === "/marinheiro/reservas" ||
    pathname === "/marinheiro/agenda" ||
    pathname === "/marinheiro/faturamento" ||
    pathname === "/marinheiro/embarcacoes" ||
    pathname === "/marinheiro/opcionais" ||
    pathname === "/marinheiro/perfil"
  ) {
    return "/marinheiro";
  }

  return "/marinheiro";
}
