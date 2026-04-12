import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";

const AjudaTeste = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate">{t("ajudaTeste.title")}</h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full flex-1 px-4 py-5 space-y-3 text-sm">
        <section className="surface-elevated rounded-xl p-4">
          <h2 className="font-semibold text-foreground mb-2">{t("ajudaTeste.checklistTitle")}</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>{t("ajudaTeste.l1")}</li>
            <li>{t("ajudaTeste.l2")}</li>
            <li>{t("ajudaTeste.l3")}</li>
            <li>{t("ajudaTeste.l4")}</li>
            <li>{t("ajudaTeste.l5")}</li>
          </ul>
        </section>

        <section className="surface-elevated rounded-xl p-4">
          <h2 className="font-semibold text-foreground mb-2">{t("ajudaTeste.accountsTitle")}</h2>
          <p className="text-muted-foreground">{t("ajudaTeste.demoRenter")}</p>
          <p className="text-muted-foreground">{t("ajudaTeste.demoGuest")}</p>
        </section>
      </div>
      <div className="flex shrink-0 justify-center pb-4 pt-2">
        <AppVersionStamp />
      </div>
    </div>
  );
};

export default AjudaTeste;
