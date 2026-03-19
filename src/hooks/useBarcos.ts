import { useSyncExternalStore } from "react";
import { barcosStore } from "@/data/embarcacoes";

export function useBarcos() {
  return useSyncExternalStore(barcosStore.subscribe, barcosStore.get);
}
