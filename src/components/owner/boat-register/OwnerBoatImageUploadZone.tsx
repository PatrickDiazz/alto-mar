import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OwnerBoatImageUploadZoneProps = {
  images: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (index: number) => void;
  disclaimer?: string;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
};

export function OwnerBoatImageUploadZone({
  images,
  onAdd,
  onRemove,
  disclaimer,
  className,
  multiple = true,
  disabled = false,
}: OwnerBoatImageUploadZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("space-y-4", className)}>
      {disclaimer ? (
        <p className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {disclaimer}
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 px-6 py-10 text-center transition-all",
          "hover:border-primary/55 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "motion-safe:duration-200"
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <ImagePlus className="h-7 w-7" aria-hidden />
        </span>
        <span className="text-base font-semibold text-foreground">{t("marinheiro.registerUploadCta")}</span>
        <span className="max-w-sm text-xs text-muted-foreground">{t("marinheiro.registerUploadHint")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (!files.length) return;
          const urls = await Promise.all(
            files.map(
              (file) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result ?? ""));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                })
            )
          );
          onAdd(urls);
          e.target.value = "";
        }}
      />
      {images.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("marinheiro.photosCount", { n: images.length })}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((url, i) => (
              <div key={`${url.slice(0, 24)}-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded-lg">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-1 top-1 h-7 w-7 opacity-90 shadow-sm"
                  onClick={() => onRemove(i)}
                  aria-label={t("marinheiro.routeIslandRemove")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
