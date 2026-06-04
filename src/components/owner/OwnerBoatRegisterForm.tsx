import { OwnerBoatRegisterWizard } from "@/components/owner/boat-register/OwnerBoatRegisterWizard";

export type OwnerBoatRegisterFormProps = {
  onSuccess: (boatId?: string) => void;
  onCancel: () => void;
};

/** @deprecated Use OwnerBoatRegisterWizard directly */
export function OwnerBoatRegisterForm(props: OwnerBoatRegisterFormProps) {
  return <OwnerBoatRegisterWizard {...props} />;
}
