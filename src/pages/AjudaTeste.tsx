import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AjudaTeste = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Ajuda de teste</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3 text-sm">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-semibold text-foreground mb-2">Checklist rápido</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Login como banhista e como locatário.</li>
            <li>Favoritar/desfavoritar barco e recarregar a página para validar persistência.</li>
            <li>Criar reserva com banhista e aprovar/recusar no painel do locatário.</li>
            <li>Editar barco no painel do locatário e confirmar no Explorar.</li>
            <li>Testar fluxo de recuperação de senha.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-semibold text-foreground mb-2">Contas úteis</h2>
          <p className="text-muted-foreground">Locatário demo: locatario@demo.com / 123456</p>
          <p className="text-muted-foreground">Banhista: criar conta pela tela de cadastro.</p>
        </section>
      </div>
    </div>
  );
};

export default AjudaTeste;

