import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const MAIN_ROUTE_PREFIXES = [
  "/explorar",
  "/barco/",
  "/reservar/",
  "/conta",
  "/marinheiro",
  "/seja-locador",
  "/login",
  "/signup",
  "/ajuda",
  "/confirmar-email",
  "/verificar-email",
];

function shouldAnimateRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return MAIN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

type PageTransitionProps = {
  children: ReactNode;
};

/** Fade/slide curto ao mudar de rota principal. */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();
  const animate = shouldAnimateRoute(pathname);

  return (
    <div
      key={pathname}
      className={cn(
        animate &&
          "motion-safe:animate-page-enter motion-reduce:animate-none min-h-0 flex flex-col flex-1"
      )}
    >
      {children}
    </div>
  );
}
