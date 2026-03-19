import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/auth";

const RedefinirSenha = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || token.length < 32) {
        setValid(false);
        setChecking(false);
        return;
      }
      try {
        const resp = await fetch(
          apiUrl(`/api/auth/reset-token-check?token=${encodeURIComponent(token)}`)
        );
        const data = (await resp.json()) as { valid?: boolean };
        if (!cancelled) setValid(Boolean(data.valid));
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || "Não foi possível redefinir a senha.");
      }
      toast.success("Senha alterada. Faça login com a nova senha.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Verificando link...</p>
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4 text-center">
          <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Solicite um novo link em &quot;Esqueci minha senha&quot; na tela de login.
          </p>
          <Button asChild className="w-full">
            <Link to="/recuperar-senha">Pedir novo link</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link to="/login">Ir para login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Escolha uma senha nova para sua conta.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="password">Nova senha</Label>
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
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="repita a senha"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>

        <Button variant="ghost" asChild className="w-full">
          <Link to="/login">Voltar ao login</Link>
        </Button>
      </div>
    </div>
  );
};

export default RedefinirSenha;
