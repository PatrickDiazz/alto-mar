import type { TFunction } from "i18next";
import type { MarinheiroApprovalStatus, MarinheiroFuncao } from "@/lib/marinheiroTypes";

export function marinheiroFuncaoLabel(t: TFunction, funcao: MarinheiroFuncao, custom?: string | null) {
  if (funcao === "OUTRA" && custom?.trim()) return custom.trim();
  return t(`crew.funcao.${funcao}`);
}

export function marinheiroStatusLabel(t: TFunction, status: MarinheiroApprovalStatus) {
  return t(`crew.status.${status}`);
}

export function marinheiroStatusVariant(status: MarinheiroApprovalStatus): string {
  if (status === "APROVADO") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "PENDENTE") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (status === "REPROVADO") return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function formatPlatformTenure(t: TFunction, months: number) {
  if (months <= 0) return t("crew.tenureNew");
  if (months < 12) return t("crew.tenureMonths", { count: months });
  const years = Math.floor(months / 12);
  return t("crew.tenureYears", { count: years });
}
