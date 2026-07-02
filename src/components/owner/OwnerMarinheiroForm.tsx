import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OwnerBoatRecord } from "@/lib/ownerBoats";
import {
  defaultMarinheiroForm,
  MARINHEIRO_FUNCOES,
  type MarinheiroFormState,
  type MarinheiroRecord,
} from "@/lib/marinheiroTypes";
import { marinheiroFuncaoLabel, marinheiroStatusLabel, marinheiroStatusVariant } from "@/lib/marinheiroLabels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type OwnerMarinheiroFormProps = {
  mode: "create" | "edit";
  boats: OwnerBoatRecord[];
  initial?: Partial<MarinheiroFormState>;
  record?: MarinheiroRecord | null;
  saving?: boolean;
  onSubmit: (form: MarinheiroFormState) => Promise<void>;
  onCancel: () => void;
};

export function OwnerMarinheiroForm({
  mode,
  boats,
  initial,
  record,
  saving = false,
  onSubmit,
  onCancel,
}: OwnerMarinheiroFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<MarinheiroFormState>(() => ({
    ...defaultMarinheiroForm(boats[0] ? [boats[0].id] : []),
    ...initial,
  }));

  useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial }));
  }, [initial]);

  const toggleBoat = (boatId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      boatIds: checked ? [...new Set([...prev.boatIds, boatId])] : prev.boatIds.filter((id) => id !== boatId),
    }));
  };

  const handleFile = async (field: keyof MarinheiroFormState, file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("crew.fileTooLarge"));
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch {
      toast.error(t("crew.fileReadFail"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.phone.trim()) {
      toast.error(t("crew.requiredFields"));
      return;
    }
    if (mode === "create" && (!form.email.trim() || form.password.length < 6)) {
      toast.error(t("crew.accountRequired"));
      return;
    }
    if (!form.photoUrl || !form.identityDocUrl || !form.nauticalCertUrl) {
      toast.error(t("crew.docsRequired"));
      return;
    }
    if (form.funcao === "OUTRA" && !form.funcaoCustom.trim()) {
      toast.error(t("crew.customRoleRequired"));
      return;
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {record ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", marinheiroStatusVariant(record.approvalStatus))}>
            {marinheiroStatusLabel(t, record.approvalStatus)}
          </span>
          {record.documentsExpired ? (
            <span className="text-xs text-destructive">{t("crew.docsExpired")}</span>
          ) : null}
          {record.reviewNotes ? (
            <p className="w-full text-xs text-muted-foreground">{record.reviewNotes}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("common.name")}</Label>
          <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required />
        </div>
        {mode === "create" ? (
          <>
            <div className="space-y-2">
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("crew.initialPassword")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">{t("crew.initialPasswordHint")}</p>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>{t("common.email")}</Label>
            <Input value={record?.email ?? form.email} disabled />
          </div>
        )}
        <div className="space-y-2">
          <Label>{t("crew.cpf")}</Label>
          <Input
            value={form.cpf}
            onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
            disabled={mode === "edit"}
            required={mode === "create"}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("crew.birthDate")}</Label>
          <Input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
            disabled={mode === "edit"}
            required={mode === "create"}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("crew.phone")}</Label>
          <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>{t("crew.role")}</Label>
          <Select value={form.funcao} onValueChange={(v) => setForm((p) => ({ ...p, funcao: v as MarinheiroFormState["funcao"] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARINHEIRO_FUNCOES.map((f) => (
                <SelectItem key={f} value={f}>
                  {marinheiroFuncaoLabel(t, f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.funcao === "OUTRA" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("crew.customRole")}</Label>
            <Input
              value={form.funcaoCustom}
              onChange={(e) => setForm((p) => ({ ...p, funcaoCustom: e.target.value }))}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("crew.photo")}</Label>
          <Input type="file" accept="image/*" onChange={(e) => void handleFile("photoUrl", e.target.files?.[0])} />
          {form.photoUrl ? (
            <img src={form.photoUrl} alt="" className="mt-2 h-20 w-20 rounded-full object-cover" />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>{t("crew.identityDoc")}</Label>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => void handleFile("identityDocUrl", e.target.files?.[0])} />
          <Input
            type="date"
            value={form.identityDocExpiresAt}
            onChange={(e) => setForm((p) => ({ ...p, identityDocExpiresAt: e.target.value }))}
            placeholder={t("crew.expiresAt")}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t("crew.nauticalCert")}</Label>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => void handleFile("nauticalCertUrl", e.target.files?.[0])} />
          <Input
            type="date"
            value={form.nauticalCertExpiresAt}
            onChange={(e) => setForm((p) => ({ ...p, nauticalCertExpiresAt: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("crew.bio")}</Label>
        <Textarea
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          rows={3}
          maxLength={500}
          placeholder={t("crew.bioPh")}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-on-boat"
          checked={form.showOnBoatDetail}
          onCheckedChange={(v) => setForm((p) => ({ ...p, showOnBoatDetail: v === true }))}
        />
        <Label htmlFor="show-on-boat" className="font-normal">
          {t("crew.showOnBoatDetail")}
        </Label>
      </div>

      {boats.length ? (
        <div className="space-y-2">
          <Label>{t("crew.linkedBoats")}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {boats.map((b) => (
              <label key={b.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
                <Checkbox
                  checked={form.boatIds.includes(b.id)}
                  onCheckedChange={(v) => toggleBoat(b.id, v === true)}
                />
                <span className="truncate">{b.nome}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
