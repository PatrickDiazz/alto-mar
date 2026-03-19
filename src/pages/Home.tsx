import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-altomar.png";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <img src={logo} alt="Alto Mar" className="h-64 mb-8" />
      <h1 className="text-2xl font-bold text-foreground mb-8">
        Seja bem-vindo. Você é?
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate("/explorar")}
        >
          SOU BANHISTA
        </Button>
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate("/marinheiro")}
        >
          SOU MARINHEIRO
        </Button>
      </div>
    </div>
  );
};

export default Home;
