import { Ship, Ruler, Users, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filtroAtivo: string;
  onFiltroChange: (filtro: string) => void;
}

interface FiltroItem {
  icon: LucideIcon;
  label: string;
}

const filtros: FiltroItem[] = [
  { icon: Ship, label: "Tipo" },
  { icon: Ruler, label: "Tam." },
  { icon: Users, label: "Vagas" },
  { icon: Tag, label: "Preço" },
];

const FilterBar = ({ filtroAtivo, onFiltroChange }: FilterBarProps) => {
  return (
    <div className="mx-auto max-w-md border border-border rounded-lg bg-card p-3">
      <div className="flex justify-around">
        {filtros.map(({ icon: Icon, label }) => {
          const isActive = filtroAtivo === label;
          return (
            <button
              key={label}
              onClick={() => onFiltroChange(isActive ? "Todos" : label)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-md transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
