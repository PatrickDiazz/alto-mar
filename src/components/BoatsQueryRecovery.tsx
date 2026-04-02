import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const BOATS_KEY = ["boats"] as const;

/**
 * Se a lista de barcos estiver em erro, volta a pedir ao utilizador tornar o separador visível
 * ou quando a rede volta — sem depender só do clique em "Tentar de novo".
 */
export function BoatsQueryRecovery() {
  const qc = useQueryClient();

  useEffect(() => {
    const bumpIfBoatsFailed = () => {
      const state = qc.getQueryState(BOATS_KEY);
      if (state?.status !== "error") return;
      void qc.invalidateQueries({ queryKey: BOATS_KEY });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") bumpIfBoatsFailed();
    };

    window.addEventListener("online", bumpIfBoatsFailed);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", bumpIfBoatsFailed);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [qc]);

  return null;
}
