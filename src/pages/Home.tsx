import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import logo from "@/assets/logo-altomar.png";
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

  const heroLogo = resolvedTheme === "dark" ? logoDark : logo;

  return (
    <div className="min-h-screen flex flex-col bg-background px-4">
      <div className="absolute top-4 right-4">
        <HeaderSettingsMenu />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
      <img
        src={heroLogo}
        alt="Alto Mar"
        className="h-64 w-auto max-w-[min(100%,20rem)] mb-8 bg-transparent object-contain"
        width={320}
        height={256}
        sizes="(max-width: 640px) 85vw, 320px"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
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
      <div className="flex shrink-0 justify-center pb-4 pt-2">
        <AppVersionStamp />
      </div>
    </div>
  );
};

export default Home;
