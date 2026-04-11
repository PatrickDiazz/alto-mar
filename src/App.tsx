import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import Home from "./pages/Home";
import { RequireAuth } from "@/components/RequireAuth";
import { BoatsQueryRecovery } from "@/components/BoatsQueryRecovery";
import { MobileNavHost } from "@/components/MobileNavHost";

const Explorar = lazy(() => import("./pages/Explorar"));
const DetalhesBarco = lazy(() => import("./pages/DetalhesBarco"));
const Marinheiro = lazy(() => import("./pages/Marinheiro"));
const Reservar = lazy(() => import("./pages/Reservar"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const ContaUsuario = lazy(() => import("./pages/ContaUsuario"));
const ContaReservas = lazy(() => import("./pages/ContaReservas"));
const ContaFavoritos = lazy(() => import("./pages/ContaFavoritos"));
const ContaDados = lazy(() => import("./pages/ContaDados"));
const AjudaTeste = lazy(() => import("./pages/AjudaTeste"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      /** Em dev, menos retentativas — API/Postgres parados não devem bloquear a UI por minutos. */
      retry: import.meta.env.DEV ? 1 : 3,
      retryDelay: (i) =>
        import.meta.env.DEV ? Math.min(600, 150 + 150 * i) : Math.min(3000, 400 + 500 * 2 ** i),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: "online",
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BoatsQueryRecovery />
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="alto-mar-theme" disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MobileNavHost>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                <Route
                  path="/conta"
                  element={
                    <RequireAuth>
                      <ContaUsuario />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/conta/reservas"
                  element={
                    <RequireAuth>
                      <ContaReservas />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/conta/favoritos"
                  element={
                    <RequireAuth>
                      <ContaFavoritos />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/conta/dados"
                  element={
                    <RequireAuth>
                      <ContaDados />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/conta/ajuda-teste"
                  element={
                    <RequireAuth>
                      <AjudaTeste />
                    </RequireAuth>
                  }
                />
                <Route path="/explorar" element={<Explorar />} />
                <Route path="/barco/:id" element={<DetalhesBarco />} />
                <Route
                  path="/reservar/:id"
                  element={
                    <RequireAuth>
                      <Reservar />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/marinheiro"
                  element={
                    <RequireAuth>
                      <Marinheiro />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </MobileNavHost>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
