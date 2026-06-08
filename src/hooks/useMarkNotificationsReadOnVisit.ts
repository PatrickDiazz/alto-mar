import { useEffect } from "react";
import { useNotificationsOptional } from "@/contexts/NotificationsContext";

/** Marca notificações como lidas quando o utilizador visita a página relacionada. */
export function useMarkNotificationsReadOnVisit(pathname: string) {
  const ctx = useNotificationsOptional();

  useEffect(() => {
    if (!ctx) return;
    void ctx.markReadForVisit(pathname);
  }, [pathname, ctx?.markReadForVisit]);
}
