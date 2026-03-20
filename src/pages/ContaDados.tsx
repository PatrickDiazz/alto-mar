import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authFetch, getStoredUser } from "@/lib/auth";

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "banhista" | "locatario";
    created_at: string;
  };
};

const ContaDados = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const currentUser = getStoredUser();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/conta/dados" }, replace: true });
      return;
    }
    (async () => {
      try {
        const resp = await authFetch("/api/me");
        if (!resp.ok) throw new Error(await resp.text());
        const data = (await resp.json()) as MeResponse;
        setMe(data.user);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar dados da conta.");
      }
    })();
  }, [currentUser?.id, navigate]);

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    const visible = name.slice(0, 2);
    const stars = "*".repeat(Math.max(2, name.length - 2));
    return `${visible}${stars}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Dados da conta</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Nome: </span>
            <span className="text-foreground font-semibold">{me?.name || currentUser?.name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            <span className="text-foreground">{maskEmail(me?.email || currentUser?.email || "")}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Perfil: </span>
            <span className="text-foreground">{me?.role === "locatario" ? "Locatário" : "Banhista"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Conta criada em: </span>
            <span className="text-foreground">
              {me?.created_at ? new Date(me.created_at).toLocaleDateString("pt-BR") : "-"}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ContaDados;

