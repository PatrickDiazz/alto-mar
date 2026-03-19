import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiUrl, setSession, type UserRole } from "@/lib/auth";

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("banhista");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || "Falha ao criar conta.");
      }
      const data = (await resp.json()) as { token: string; user: any };
      setSession(data.token, data.user);
      toast.success("Conta criada.");
      navigate(from || "/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Escolha seu perfil e comece.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>
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
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Você é</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as UserRole)} className="space-y-2">
              <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="banhista" id="banhista" />
                <div>
                  <span className="text-sm font-semibold text-foreground">Banhista</span>
                  <p className="text-xs text-muted-foreground">Quero reservar embarcações</p>
                </div>
              </label>
              <label className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="locatario" id="locatario" />
                <div>
                  <span className="text-sm font-semibold text-foreground">Locatário</span>
                  <p className="text-xs text-muted-foreground">Tenho barcos e recebo reservas</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link className="text-primary font-semibold hover:underline" to="/login" state={location.state}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;

