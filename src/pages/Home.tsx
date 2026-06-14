import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AppVersionStamp } from "@/components/AppVersionStamp";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import logo from "@/assets/logo-altomar.png";
import { getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const enter = "motion-safe:animate-home-enter motion-reduce:animate-none opacity-0 [animation-fill-mode:forwards]";

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "locatario" ? "/marinheiro" : "/explorar", { replace: true });
  }, [navigate, user]);

  const goBanhista = () => {
    navigate("/explorar");
  };

  const goMarinheiro = () => {
    if (!getStoredUser()) {
      navigate("/seja-locador");
      return;
    }
    navigate("/marinheiro");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 pt-safe">
      <div className="absolute right-4 top-safe-4 motion-safe:animate-home-enter motion-safe:delay-500 motion-reduce:animate-none opacity-0 [animation-fill-mode:forwards]">
        <HeaderSettingsMenu />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
      <img
        src={logo}
        alt="Alto Mar"
        className={cn("h-64 w-auto max-w-[min(100%,20rem)] mb-8 bg-transparent object-contain", enter)}
        width={320}
        height={256}
        sizes="(max-width: 640px) 85vw, 320px"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <h1 className={cn("text-2xl font-bold text-foreground mb-8 text-center", enter, "motion-safe:delay-100")}>
        {t("home.welcome")}
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          size="lg"
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/90",
            enter,
            "motion-safe:delay-200"
          )}
          onClick={goBanhista}
        >
          {t("home.banhista")}
        </Button>
        <Button
          size="lg"
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/90",
            enter,
            "motion-safe:delay-300"
          )}
          onClick={goMarinheiro}
        >
          {t("home.marinheiro")}
        </Button>
      </div>
      </div>
      <div
        className={cn(
          "flex shrink-0 justify-center pb-4 pt-2",
          enter,
          "motion-safe:delay-500"
        )}
      >
        <AppVersionStamp />
      </div>
    </div>
  );
};

export default Home;
