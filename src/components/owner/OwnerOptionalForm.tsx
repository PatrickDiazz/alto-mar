import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OwnerBbqKitItemsEditor } from "@/components/optionals/OwnerBbqKitItemsEditor";
import type { OwnerBoatRecord } from "@/lib/ownerBoats";
import type { OwnerOptionalKind } from "@/lib/ownerOptionalsCatalog";
import type { OptionalFormState } from "@/lib/ownerOptionalSaveTypes";
import { defaultOwnerBbqKitItems, ownerBbqKitItemsValid } from "@/lib/trip-optionals";
import { toast } from "sonner";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type OwnerOptionalFormProps = {
  mode: "create" | "edit";
  boats: OwnerBoatRecord[];
  initial?: Partial<OptionalFormState>;
  saving?: boolean;
  onSubmit: (form: OptionalFormState) => Promise<void>;
  onCancel: () => void;
};

function defaultForm(boats: OwnerBoatRecord[]): OptionalFormState {
  return {
    kind: "bbq",
    title: "",
    description: "",
    priceCents: 25000,
    imageUrls: [],
    boatIds: boats[0] ? [boats[0].id] : [],
    vehicleDocumentUrl: "",
    bbqKitItems: defaultOwnerBbqKitItems(),
  };
}

export function OwnerOptionalForm({
  mode,
  boats,
  initial,
  saving = false,
  onSubmit,
  onCancel,
}: OwnerOptionalFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<OptionalFormState>(() => ({
    ...defaultForm(boats),
    ...initial,
  }));

  useEffect(() => {
    if (initial) {
      setForm({
        ...defaultForm(boats),
        ...initial,
        bbqKitItems: initial.bbqKitItems?.length ? initial.bbqKitItems : defaultOwnerBbqKitItems(),
      });
    }
  }, [initial, boats]);

  const toggleBoat = (id: string, on: boolean) => {
    setForm((f) => ({
      ...f,
      boatIds: on ? [...new Set([...f.boatIds, id])] : f.boatIds.filter((x) => x !== id),
    }));
  };

  const setKind = (kind: OwnerOptionalKind) => {
    setForm((f) => ({
      ...f,
      kind,
      title:
        kind === "bbq"
          ? t("ownerPanel.optionalBbqTitle")
          : kind === "vehicle"
            ? t("ownerPanel.optionalJetTitle")
            : f.title,
      description:
        kind === "bbq"
          ? t("ownerPanel.optionalBbqDesc")
          : kind === "vehicle"
            ? t("ownerPanel.optionalJetDesc")
            : f.description,
    }));
  };

  const validate = (): boolean => {
    if (!form.boatIds.length) {
      toast.error(t("ownerPanel.optionalNeedBoat"));
      return false;
    }
    if (form.title.trim().length < 2) {
      toast.error(t("ownerPanel.optionalTitleRequired"));
      return false;
    }
    if (form.kind === "bbq") {
      if (!ownerBbqKitItemsValid(form.bbqKitItems)) {
        toast.error(t("marinheiro.bbqKitToastRequired"));
        return false;
      }
      if (form.imageUrls.length < 1) {
        toast.error(t("ownerPanel.optionalImagesRequired"));
        return false;
      }
      return true;
    }
    if (form.kind === "vehicle") {
      if (form.imageUrls.length < 1) {
        toast.error(t("marinheiro.jetSkiPhotosRequired"));
        return false;
      }
      if (!form.vehicleDocumentUrl.trim()) {
        toast.error(t("marinheiro.jetSkiDocRequired"));
        return false;
      }
      return true;
    }
    if (form.imageUrls.length < 1) {
      toast.error(t("ownerPanel.optionalImagesRequired"));
      return false;
    }
    if (form.priceCents < 100) {
      toast.error(t("ownerPanel.optionalPriceRequired"));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <div className="space-y-4">
      {mode === "create" ? (
        <div className="space-y-1">
          <Label className="text-sm font-semibold">{t("ownerPanel.optionalType")}</Label>
          <Select value={form.kind} onValueChange={(v) => setKind(v as OwnerOptionalKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bbq">{t("ownerPanel.optionalTypeBbq")}</SelectItem>
              <SelectItem value="vehicle">{t("ownerPanel.optionalTypeVehicle")}</SelectItem>
              <SelectItem value="other">{t("ownerPanel.optionalTypeOther")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label>{t("optionals.ownerCustomName")}</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={
            form.kind === "bbq"
              ? t("ownerPanel.optionalBbqTitle")
              : form.kind === "vehicle"
                ? t("ownerPanel.optionalJetTitle")
                : t("optionals.floatingMatShort")
          }
        />
      </div>

      <div className="space-y-1">
        <Label>{t("optionals.ownerCustomDesc")}</Label>
        <Textarea
          className="min-h-[72px] resize-y text-sm"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t("optionals.ownerCustomDesc")}
        />
      </div>

      {form.kind === "bbq" ? (
        <OwnerBbqKitItemsEditor
          items={form.bbqKitItems}
          onChange={(bbqKitItems) => setForm((f) => ({ ...f, bbqKitItems }))}
          priceCents={form.priceCents}
          onPriceCentsChange={(priceCents) => setForm((f) => ({ ...f, priceCents }))}
        />
      ) : null}

      {form.kind === "vehicle" ? (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-3 dark:bg-muted/10">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-foreground">{t("marinheiro.jetSkiHeading")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("marinheiro.jetSkiHint")}</p>
          <div className="space-y-1">
            <Label>{t("marinheiro.jetSkiPrice")}</Label>
            <div className="relative w-full max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t("common.currency")}
              </span>
              <Input
                type="number"
                min={1}
                step={1}
                className="pl-10"
                value={Math.max(1, Math.round(form.priceCents / 100))}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceCents: Math.max(100, Number(e.target.value || 1)) * 100,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("marinheiro.jetSkiPhotos")}</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                const urls = await Promise.all(files.map(fileToDataUrl));
                setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls] }));
                e.target.value = "";
              }}
            />
            {form.imageUrls.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("marinheiro.jetSkiPhotosCount", { n: form.imageUrls.length })}
              </p>
            ) : (
              <p className="text-xs text-destructive">{t("marinheiro.jetSkiPhotosRequired")}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>{t("marinheiro.jetSkiDoc")}</Label>
            <p className="text-[11px] text-muted-foreground">{t("ownerPanel.vehicleCredentialHint")}</p>
            <Input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = await fileToDataUrl(f);
                setForm((prev) => ({ ...prev, vehicleDocumentUrl: url }));
                e.target.value = "";
              }}
            />
            <Input
              placeholder={t("marinheiro.jetSkiDocUrlPh")}
              value={form.vehicleDocumentUrl.startsWith("data:") ? "" : form.vehicleDocumentUrl}
              onChange={(e) => setForm((f) => ({ ...f, vehicleDocumentUrl: e.target.value }))}
            />
            {!form.vehicleDocumentUrl.trim() ? (
              <p className="text-xs text-destructive">{t("marinheiro.jetSkiDocRequired")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {form.kind === "other" ? (
        <>
          <div className="space-y-1">
            <Label>{t("marinheiro.jetSkiPrice")}</Label>
            <div className="relative w-full max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t("common.currency")}
              </span>
              <Input
                type="number"
                min={1}
                step={1}
                className="pl-10"
                value={Math.max(1, Math.round(form.priceCents / 100))}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceCents: Math.max(100, Number(e.target.value || 1)) * 100,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("marinheiro.jetSkiPhotos")}</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                const urls = await Promise.all(files.map(fileToDataUrl));
                setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls] }));
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("marinheiro.jetSkiPhotosCount", { n: form.imageUrls.length })}
            </p>
          </div>
        </>
      ) : null}

      {form.kind === "bbq" ? (
        <div className="space-y-1">
          <Label>{t("marinheiro.jetSkiPhotos")}</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;
              const urls = await Promise.all(files.map(fileToDataUrl));
              setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls] }));
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t("marinheiro.jetSkiPhotosCount", { n: form.imageUrls.length })}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{t("ownerPanel.optionalBoatsHint")}</p>

      <div className="space-y-2 rounded-xl border border-border/50 p-3">
        <Label className="text-sm font-semibold">{t("ownerPanel.optionalBoatsLabel")}</Label>
        {boats.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("ownerPanel.noBoatsYet")}</p>
        ) : (
          boats.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.boatIds.includes(b.id)}
                onCheckedChange={(c) => toggleBoat(b.id, c === true)}
              />
              <span>{b.nome}</span>
            </label>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="w-full sm:flex-1" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? t("marinheiro.loading") : t("common.save")}
        </Button>
        <Button type="button" variant="secondary" className="w-full sm:flex-1" disabled={saving} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
