import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

export function useMatchMediaMdUp(): boolean {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  }, []);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", onStoreChange);
      return () => m.removeEventListener("change", onStoreChange);
    },
    getSnapshot,
    getServerSnapshot
  );
}
