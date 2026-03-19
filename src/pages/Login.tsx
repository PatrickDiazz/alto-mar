import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl, setSession } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/";
  const isMarinheiroLogin = from === "/marinheiro";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || "Falha no login.");
      }
      const data = (await resp.json()) as { token: string; user: any };
      setSession(data.token, data.user);
      toast.success("Login realizado.");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            {isMarinheiroLogin ? "Área do locatário — acesse seu painel de reservas." : "Acesse sua conta."}
          </p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-sm text-center">
          <Link
            className="text-primary font-semibold hover:underline"
            to="/recuperar-senha"
            state={location.state}
          >
            Esqueci minha senha
          </Link>
        </p>

        <p className="text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link className="text-primary font-semibold hover:underline" to="/signup" state={location.state}>
            {isMarinheiroLogin ? "Criar conta como locatário" : "Criar conta"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

