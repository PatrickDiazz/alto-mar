import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomOptional } from "@/lib/types";

type OwnerCustomOptionalsEditorProps = {
  value: CustomOptional[];
  onChange: (next: CustomOptional[]) => void;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function OwnerCustomOptionalsEditor({ value, onChange }: OwnerCustomOptionalsEditorProps) {
  const { t } = useTranslation();

  const add = () => {
    onChange([
      ...value,
      { id: crypto.randomUUID(), title: "", description: "", priceCents: 10000, imageUrls: [] },
    ]);
  };

  const update = (id: string, patch: Partial<CustomOptional>) => {
    onChange(value.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const remove = (id: string) => {
    onChange(value.filter((o) => o.id !== id));
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 p-3">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">{t("optionals.ownerCustomTitle")}</Label>
        <p className="text-xs text-muted-foreground">{t("optionals.ownerCustomHint")}</p>
      </div>
      {value.map((opt) => (
        <div key={opt.id} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{t("optionals.customBadge")}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(opt.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("optionals.ownerCustomName")}</Label>
              <Input value={opt.title} onChange={(e) => update(opt.id, { title: e.target.value })} maxLength={80} />
            </div>
            <div className="space-y-1">
              <Label>{t("marinheiro.jetSkiPrice")}</Label>
              <Input
                type="number"
                min={1}
                value={Math.max(1, Math.round(opt.priceCents / 100))}
                onChange={(e) => update(opt.id, { priceCents: Math.max(100, Number(e.target.value || 1)) * 100 })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("optionals.ownerCustomDesc")}</Label>
            <Input value={opt.description ?? ""} onChange={(e) => update(opt.id, { description: e.target.value })} maxLength={400} />
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
                update(opt.id, { imageUrls: [...(opt.imageUrls ?? []), ...urls] });
                e.target.value = "";
              }}
            />
            {(opt.imageUrls?.length ?? 0) > 0 ? (
              <p className="text-xs text-muted-foreground">{t("marinheiro.jetSkiPhotosCount", { n: opt.imageUrls.length })}</p>
            ) : (
              <p className="text-xs text-destructive">{t("marinheiro.jetSkiPhotosRequired")}</p>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus className="mr-1 h-4 w-4" />
        {t("optionals.ownerCustomAdd")}
      </Button>
    </div>
  );
}
