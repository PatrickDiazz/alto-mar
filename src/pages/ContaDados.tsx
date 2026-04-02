import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const currentUser = getStoredUser();
  const locale = bcp47FromAppLang(i18n.language);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/conta/dados" }, replace: true });
      return;
    }
    (async () => {
      try {
        const resp = await authFetch("/api/me");
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("contaDados.toastLoad")));
        }
        const data = (await resp.json()) as MeResponse;
        setMe(data.user);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("contaDados.toastLoad")).trim();
        toast.error(m || t("contaDados.toastLoad"));
      }
    })();
  }, [currentUser?.id, navigate, t]);

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
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("contaDados.title")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("contaDados.name")} </span>
            <span className="text-foreground font-semibold">{me?.name || currentUser?.name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("contaDados.email")} </span>
            <span className="text-foreground">{maskEmail(me?.email || currentUser?.email || "")}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("contaDados.profile")} </span>
            <span className="text-foreground">
              {me?.role === "locatario" ? t("contaDados.roleRenter") : t("contaDados.roleGuest")}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("contaDados.created")} </span>
            <span className="text-foreground">
              {me?.created_at ? new Date(me.created_at).toLocaleDateString(locale) : "-"}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ContaDados;
