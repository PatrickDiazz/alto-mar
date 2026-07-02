import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppContract, AppContractSlug } from "@/lib/appContracts";
import { SIGNUP_ACCEPT_API_KEY } from "@/lib/appContracts";

type SignupContractCheckboxesProps = {
  contracts: AppContract[];
  accepted: Partial<Record<AppContractSlug, boolean>>;
  onChange: (slug: AppContractSlug, checked: boolean) => void;
  disabled?: boolean;
};

export function SignupContractCheckboxes({
  contracts,
  accepted,
  onChange,
  disabled,
}: SignupContractCheckboxesProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/20 p-3">
      {contracts.map((contract) => (
        <label
          key={contract.slug}
          className="flex cursor-pointer items-start gap-3 text-sm leading-snug"
        >
          <Checkbox
            checked={accepted[contract.slug] === true}
            onCheckedChange={(c) => onChange(contract.slug, c === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="text-foreground">
            {t("signup.acceptPrefix")}{" "}
            <Link
              to={`/ajuda/${contract.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {t(contract.titleKey)}
            </Link>
          </span>
        </label>
      ))}
    </div>
  );
}

export function allContractsAccepted(
  contracts: AppContract[],
  accepted: Partial<Record<AppContractSlug, boolean>>
): boolean {
  return contracts.every((c) => accepted[c.slug] === true);
}

export function emptyContractAcceptance(
  contracts: AppContract[]
): Partial<Record<AppContractSlug, boolean>> {
  return Object.fromEntries(contracts.map((c) => [c.slug, false])) as Partial<
    Record<AppContractSlug, boolean>
  >;
}

export function contractAcceptPayload(
  contracts: AppContract[],
  accepted: Partial<Record<AppContractSlug, boolean>>
) {
  const payload: Record<string, boolean> = {};
  for (const c of contracts) {
    payload[SIGNUP_ACCEPT_API_KEY[c.slug]] = accepted[c.slug] === true;
  }
  return payload;
}
