import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { patchOwnerBoatActive, parseOwnerBoatRating } from "@/lib/ownerBoats";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { BOAT_VESSEL_TYPES, vesselTypeLabel } from "@/lib/boatVesselTypes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";

type BoatEditForm = {
  nome: string;
  distancia: string;
  precoCents: number;
  tamanhoPes: number;
  capacidade: number;
  tipo: string;
  descricao: string;
  tieDocumentUrl: string;
  tiemDocumentUrl: string;
  videoUrl: string;
  imagens: string[];
  locaisEmbarque: string;
  horariosEmbarque: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function OwnerBoatDetailPage() {
  const { boatId } = useParams<{ boatId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { boats, reloadBoats } = useOwnerPanel();
  const [toggling, setToggling] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const boat = useMemo(() => boats.find((b) => b.id === boatId), [boats, boatId]);
  const [form, setForm] = useState<BoatEditForm | null>(null);

  if (!boat) {
    return (
      <OwnerPanelPage bodyLayout="stack-tight">
        <p className="text-sm text-muted-foreground">{t("ownerPanel.boatNotFound")}</p>
      </OwnerPanelPage>
    );
  }

  useEffect(() => {
    setForm({
      nome: boat.nome,
      distancia: boat.distancia,
      precoCents: boat.precoCents,
      tamanhoPes: boat.tamanhoPes,
      capacidade: boat.capacidade,
      tipo: boat.tipo,
      descricao: boat.descricao,
      tieDocumentUrl: String(boat.tieDocumentUrl || ""),
      tiemDocumentUrl: String(boat.tiemDocumentUrl || ""),
      videoUrl: String(boat.videoUrl || ""),
      imagens: [...(boat.imagens || [])],
      locaisEmbarque: (boat.locaisEmbarque || []).join(", "),
      horariosEmbarque: (boat.horariosEmbarque || []).join(", "),
    });
  }, [boat]);

  const rating = parseOwnerBoatRating(boat);

  const toggleActive = async (ativo: boolean) => {
    setToggling(true);
    try {
      await patchOwnerBoatActive(boat.id, ativo);
      await reloadBoats();
      toast.success(ativo ? t("ownerPanel.boatActivated") : t("ownerPanel.boatDeactivated"));
    } catch {
      toast.error(t("ownerPanel.boatStatusFail"));
    } finally {
      setToggling(false);
    }
  };

  const salvarEdicao = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        distancia: form.distancia,
        precoCents: form.precoCents,
        tamanhoPes: form.tamanhoPes,
        capacidade: form.capacidade,
        tipo: form.tipo,
        descricao: form.descricao,
        verificado: boat.verificado,
        tieDocumentUrl: form.tieDocumentUrl || null,
        tiemDocumentUrl: form.tiemDocumentUrl || null,
        videoUrl: form.videoUrl || null,
        imagens: form.imagens,
        locaisEmbarque: form.locaisEmbarque
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        horariosEmbarque: form.horariosEmbarque
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        routeIslands: boat.routeIslands ?? [],
        routeIslandImages: boat.routeIslandImages ?? {},
        bbqOffered: boat.bbqOffered ?? true,
        bbqKitItems: boat.bbqKitItems ?? [],
        bbqKitPriceCents: boat.bbqKitPriceCents ?? 25000,
        jetSkiOffered: boat.jetSkiOffered ?? false,
        jetSkiPriceCents: boat.jetSkiPriceCents ?? 0,
        jetSkiImageUrls: boat.jetSkiImageUrls ?? [],
        jetSkiDocumentUrl: boat.jetSkiDocumentUrl ?? null,
        customOptionals: boat.customOptionals ?? [],
      };
      const resp = await authFetch(`/api/owner/boats/${boat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastSave")));
      }
      await reloadBoats();
      toast.success(t("marinheiro.toastSave"));
      setEditingOpen(false);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastSaveFail")).trim();
      toast.error(m || t("marinheiro.toastSaveFail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OwnerPanelPage
      title={boat.nome}
      subtitle={boat.distancia}
      meta={
        rating > 0 ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <Star className="h-4 w-4 fill-amber-500" aria-hidden />
            {rating.toFixed(1).replace(".", ",")}
          </span>
        ) : null
      }
      bodyLayout="stack-tight"
    >
      <OwnerSurface className="overflow-hidden">
        <div className="aspect-[16/10] w-full bg-muted">
          {boat.imagens[0] ? (
            <img src={boat.imagens[0]} alt={boat.nome} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
            <Label htmlFor="boat-active" className="text-sm font-medium">
              {boat.ativo ? t("ownerPanel.boatActive") : t("ownerPanel.boatInactive")}
            </Label>
            <Switch id="boat-active" checked={boat.ativo} disabled={toggling} onCheckedChange={(v) => void toggleActive(v)} />
          </div>

          <p className="text-sm text-muted-foreground">{boat.descricao}</p>
          <p className="text-base font-semibold text-foreground">{boat.preco}</p>

          <Button
            type="button"
            className="w-full"
            onClick={() => setEditingOpen((v) => !v)}
          >
            {editingOpen ? t("common.cancel") : t("ownerPanel.editBoatFull")}
          </Button>
        </div>
      </OwnerSurface>

      <div
        className={cn(
          "grid transition-all duration-500 ease-out",
          editingOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <OwnerSurface className="overflow-hidden">
          <div className="space-y-3 p-4">
            <h2 className="text-base font-semibold text-foreground">{t("ownerPanel.editBoatFull")}</h2>
            {form ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("marinheiro.boatName")}</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.type")}</Label>
                    <Select value={form.tipo} onValueChange={(tipo) => setForm({ ...form, tipo })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("marinheiro.selectVesselType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {BOAT_VESSEL_TYPES.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {vesselTypeLabel(t, tipo)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("marinheiro.location")}</Label>
                    <Input value={form.distancia} onChange={(e) => setForm({ ...form, distancia: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.priceBase")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={Math.max(1, Math.round(form.precoCents / 100))}
                      onChange={(e) => setForm({ ...form, precoCents: Math.max(1, Number(e.target.value || 1)) * 100 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.sizeLabel")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={Math.max(1, form.tamanhoPes)}
                      onChange={(e) => setForm({ ...form, tamanhoPes: Math.max(1, Number(e.target.value || 1)) })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("marinheiro.capacity")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={Math.max(1, form.capacidade)}
                      onChange={(e) => setForm({ ...form, capacidade: Math.max(1, Number(e.target.value || 1)) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>{t("marinheiro.descriptionPh")}</Label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("marinheiro.tie")}</Label>
                    <Input value={form.tieDocumentUrl} onChange={(e) => setForm({ ...form, tieDocumentUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.tiem")}</Label>
                    <Input value={form.tiemDocumentUrl} onChange={(e) => setForm({ ...form, tiemDocumentUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("marinheiro.video")}</Label>
                    <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>{t("marinheiro.photosEdit")}</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      const urls = await Promise.all(files.map(fileToDataUrl));
                      setForm((prev) => (prev ? { ...prev, imagens: [...prev.imagens, ...urls] } : prev));
                      e.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{t("marinheiro.photoCountEdit", { n: form.imagens.length })}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("marinheiro.embarkLocationsLabel")}</Label>
                    <Input value={form.locaisEmbarque} onChange={(e) => setForm({ ...form, locaisEmbarque: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.embarkTimesLabel")}</Label>
                    <Input value={form.horariosEmbarque} onChange={(e) => setForm({ ...form, horariosEmbarque: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" className="flex-1" disabled={saving} onClick={() => void salvarEdicao()}>
                    {saving ? t("marinheiro.loading") : t("common.save")}
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingOpen(false)} disabled={saving}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </OwnerSurface>
      </div>

      <OwnerSurface id="owner-agenda-calendar" className="scroll-mt-24 space-y-3 p-4">
        <h2 className="text-base font-semibold text-foreground">{t("calendar.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("calendar.panelHint")}</p>
        <BoatCalendarPanel variant="owner" boatId={boat.id} onSaved={() => void reloadBoats()} />
      </OwnerSurface>

      <OwnerSurface className="p-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">{t("ownerPanel.boatOptionalsLinked")}</h2>
        <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/marinheiro/opcionais")}>
          {t("ownerPanel.manageOptionals")}
        </Button>
      </OwnerSurface>
    </OwnerPanelPage>
  );
}
