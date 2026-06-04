export type OwnerPanelTab = "inicio" | "reservas" | "embarcacoes" | "perfil";

const VALID: OwnerPanelTab[] = ["inicio", "reservas", "embarcacoes", "perfil"];

export function parseOwnerPanelTab(raw: string | null): OwnerPanelTab {
  if (raw && VALID.includes(raw as OwnerPanelTab)) return raw as OwnerPanelTab;
  return "inicio";
}

export function ownerPanelTabFromPath(pathname: string): OwnerPanelTab {
  if (pathname.startsWith("/marinheiro/reservas")) return "reservas";
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
