import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import logoLight from "@/assets/logo-altomar-light.png";
import logoDark from "@/assets/logo-altomar-dark.png";
import { getStoredUser } from "@/lib/auth";

const Home = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "locatario" ? "/marinheiro" : "/explorar", { replace: true });
  }, [navigate, user]);

  const goBanhista = () => {
    if (!getStoredUser()) {
      navigate("/login", { state: { from: "/explorar" } });
      return;
    }
    navigate("/explorar");
  };

  const goMarinheiro = () => {
    if (!getStoredUser()) {
      navigate("/login", { state: { from: "/marinheiro" } });
      return;
    }
    navigate("/marinheiro");
  };

  const heroLogo = resolvedTheme === "dark" ? logoDark : logoLight;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <img src={heroLogo} alt="Alto Mar" className="h-64 mb-8 bg-transparent object-contain" />
      <h1 className="text-2xl font-bold text-foreground mb-8 text-center">{t("home.welcome")}</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={goBanhista}
        >
          {t("home.banhista")}
        </Button>
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={goMarinheiro}
        >
          {t("home.marinheiro")}
        </Button>
      </div>
    </div>
  );
};

export default Home;
