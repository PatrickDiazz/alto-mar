import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import Explorar from "./pages/Explorar";
import DetalhesBarco from "./pages/DetalhesBarco";
import Marinheiro from "./pages/Marinheiro";
import Reservar from "./pages/Reservar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import ContaUsuario from "./pages/ContaUsuario";
import ContaReservas from "./pages/ContaReservas";
import ContaDados from "./pages/ContaDados";
import AjudaTeste from "./pages/AjudaTeste";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "@/components/RequireAuth";
import { BoatsQueryRecovery } from "@/components/BoatsQueryRecovery";

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
            <Route
              path="/explorar"
              element={
                <RequireAuth>
                  <Explorar />
                </RequireAuth>
              }
            />
            <Route
              path="/barco/:id"
              element={
                <RequireAuth>
                  <DetalhesBarco />
                </RequireAuth>
              }
            />
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
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
