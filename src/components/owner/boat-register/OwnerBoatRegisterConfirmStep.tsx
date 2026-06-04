import { useTranslation } from "react-i18next";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  OWNER_BOAT_REGISTER_CONFIRM_KEYS,
  type OwnerBoatRegisterConfirmKey,
  type OwnerBoatRegisterConfirmState,
} from "@/lib/ownerBoatRegisterConfirm";
import {
  OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_TITLE,
  OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_URL,
} from "@/lib/ownerPartnershipContract";

export function OwnerBoatRegisterConfirmStep({
  value,
  onChange,
}: {
  value: OwnerBoatRegisterConfirmState;
  onChange: (next: OwnerBoatRegisterConfirmState) => void;
}) {
  const { t } = useTranslation();

  const toggle = (key: OwnerBoatRegisterConfirmKey, on: boolean) => {
    onChange({ ...value, [key]: on });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("marinheiro.registerConfirmTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("marinheiro.registerConfirmLead")}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_TITLE}
            </p>
            <a
              href={OWNER_MARINHEIRO_PARTNERSHIP_CONTRACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("marinheiro.registerConfirmContractLink")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <ul className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3 sm:p-4">
        {OWNER_BOAT_REGISTER_CONFIRM_KEYS.map((key) => (
          <li key={key}>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
              <Checkbox
                checked={value[key]}
                onCheckedChange={(c) => toggle(key, c === true)}
                className="mt-0.5"
              />
              <span className="text-foreground">{t(`marinheiro.registerConfirm.${key}`)}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("marinheiro.registerConfirmFootnote")}</p>
    </div>
  );
}
