import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/auth";

const RecuperarSenha = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || "Não foi possível enviar o pedido.");
      }
      toast.success(
        "Se esse email estiver cadastrado, geramos um link de recuperação. Em desenvolvimento, o link aparece no terminal onde a API está rodando."
      );
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <Link
          to="/login"
          state={location.state}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <div>
          <h1 className="text-xl font-bold text-foreground">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Informe o email da sua conta. Se ele existir, você poderá redefinir a senha pelo link gerado.
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
          <strong>Dica:</strong> com a API rodando no seu PC, abra o terminal do servidor Node após enviar — o link completo
          para criar uma senha nova é impresso lá (válido por 1 hora).
        </p>
      </div>
    </div>
  );
};

export default RecuperarSenha;
