import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import type { PublicCrewMember } from "@/lib/marinheiroTypes";
import { formatPlatformTenure, marinheiroFuncaoLabel } from "@/lib/marinheiroLabels";
import { cn } from "@/lib/utils";

type Props = {
  tripulacao?: PublicCrewMember[];
  className?: string;
};

export function BoatCrewSection({ tripulacao, className }: Props) {
  const { t } = useTranslation();

  if (!tripulacao?.length) return null;

  const member = tripulacao[0];

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-lg font-bold text-foreground">{t("crew.sectionTitle")}</h2>
      <div
        className="surface-elevated flex gap-3 rounded-xl border border-border/40 p-3"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.nome}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserRound className="h-6 w-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-semibold text-foreground">{member.nome}</p>
          <p className="text-sm text-muted-foreground">
            {t("crew.roleLabel")}: {marinheiroFuncaoLabel(t, member.funcao, member.funcaoLabel)}
          </p>
          {member.bio ? (
            <p className="text-xs text-foreground/80 line-clamp-2">{member.bio}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {formatPlatformTenure(t, member.platformTenureMonths ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
