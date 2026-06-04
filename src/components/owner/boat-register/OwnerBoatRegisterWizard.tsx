import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Flame, Waves } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CIDADES_LITORAL_RJ } from "@/data/praiasBrasil";
import {
  BOAT_VESSEL_TYPES,
  isMotoAquaticaVessel,
  MOTO_AQUATICA_MAX_CAPACITY,
  normalizeVesselTipo,
  vesselTypeLabel,
} from "@/lib/boatVesselTypes";
import { formRowsToStoredRouteIslands } from "@/lib/routeIslandsParse";
import {
  defaultOwnerBbqKitItems,
  isKitChurrascoAmenityName,
  KIT_CHURRASCO_CENTS,
  normalizeBbqKitItems,
  ownerBbqKitItemsValid,
  type BbqKitItemConfig,
} from "@/lib/trip-optionals";
import {
  emptyOwnerBoatForm,
  splitCommaList,
  fileToDataUrl,
  numberFieldDisplay,
  parsePositiveIntField,
  parseReaisToCents,
  reaisDisplayFromCents,
  type OwnerBoatFormState,
} from "@/lib/ownerBoatForm";
import {
  canAdvanceOwnerBoatRegisterStep,
  canSubmitOwnerBoatRegister,
  ownerBoatRegisterStepIndex,
  ownerBoatRegisterStepsForTipo,
  type OwnerBoatRegisterStepId,
} from "@/lib/ownerBoatRegisterSteps";
import { authFetch, apiUrl } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { OwnerBbqKitItemsEditor } from "@/components/optionals/OwnerBbqKitItemsEditor";
import { OwnerCustomOptionalsEditor } from "@/components/optionals/OwnerCustomOptionalsEditor";
import { OwnerBoatRegisterPreview } from "@/components/owner/boat-register/OwnerBoatRegisterPreview";
import { OwnerBoatRegisterStepper } from "@/components/owner/boat-register/OwnerBoatRegisterStepper";
import { OwnerBoatImageUploadZone } from "@/components/owner/boat-register/OwnerBoatImageUploadZone";
import { OwnerBoatRegisterConfirmStep } from "@/components/owner/boat-register/OwnerBoatRegisterConfirmStep";
import { OwnerBoatRegisterSubmitted } from "@/components/owner/boat-register/OwnerBoatRegisterSubmitted";
import {
  emptyOwnerBoatRegisterConfirm,
  type OwnerBoatRegisterConfirmState,
} from "@/lib/ownerBoatRegisterConfirm";
import { cn } from "@/lib/utils";
import type { CustomOptional } from "@/lib/types";

export type OwnerBoatRegisterWizardProps = {
  onSuccess: (boatId?: string) => void;
  onCancel: () => void;
};

export function OwnerBoatRegisterWizard({ onSuccess, onCancel }: OwnerBoatRegisterWizardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<OwnerBoatRegisterStepId>("basics");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [boatForm, setBoatForm] = useState<OwnerBoatFormState>(emptyOwnerBoatForm);
  const [routeIslandRows, setRouteIslandRows] = useState<string[]>([""]);
  const [embarkLocsText, setEmbarkLocsText] = useState("");
  const [embarkTimesText, setEmbarkTimesText] = useState("");
  const [catalogAmenities, setCatalogAmenities] = useState<Array<{ id: string; name: string }>>([]);
  const [amenityInc, setAmenityInc] = useState<Record<string, boolean>>({});
  const [bbqKitItems, setBbqKitItems] = useState<BbqKitItemConfig[]>([]);
  const [uploadRoutePhotos, setUploadRoutePhotos] = useState(false);
  const [routePhotoRights, setRoutePhotoRights] = useState(false);
  const [routeIslandImages, setRouteIslandImages] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState<OwnerBoatRegisterConfirmState>(emptyOwnerBoatRegisterConfirm);
  const [submittedBoatId, setSubmittedBoatId] = useState<string | null>(null);

  const isMoto = isMotoAquaticaVessel(boatForm.tipo);
  const steps = useMemo(() => ownerBoatRegisterStepsForTipo(boatForm.tipo), [boatForm.tipo]);
  const stepIndex = ownerBoatRegisterStepIndex(steps, step);
  const isLastStep = stepIndex >= steps.length - 1;

  const validationCtx = useMemo(
    () => ({
      boatForm,
      uploadRoutePhotos,
      routePhotoRights,
      catalogAmenities,
      amenityInc,
      bbqKitItems,
      confirm,
      routeIslandRows,
      embarkLocsText,
      routeIslandImages,
    }),
    [
      boatForm,
      uploadRoutePhotos,
      routePhotoRights,
      catalogAmenities,
      amenityInc,
      bbqKitItems,
      confirm,
      routeIslandRows,
      embarkLocsText,
      routeIslandImages,
    ]
  );

  const canAdvance = canAdvanceOwnerBoatRegisterStep(step, validationCtx);
  const canSubmit = canSubmitOwnerBoatRegister(validationCtx);

  const coastalCityOptions = useMemo(
    () => [...CIDADES_LITORAL_RJ].sort((a, b) => a.localeCompare(b, "pt")),
    []
  );

  const storedIslands = boatForm.routeIslands ?? [];
  const catalogAmenitiesIncluded = useMemo(
    () => catalogAmenities.filter((a) => !isKitChurrascoAmenityName(a.name)),
    [catalogAmenities]
  );
  const kitChurrascoAmenity = useMemo(
    () => catalogAmenities.find((a) => isKitChurrascoAmenityName(a.name)),
    [catalogAmenities]
  );

  const setBbqOffered = (on: boolean) => {
    setBoatForm((prev) => ({ ...prev, bbqOffered: on }));
    if (on && bbqKitItems.length === 0) setBbqKitItems(defaultOwnerBbqKitItems());
    if (!on) setBbqKitItems([]);
    if (kitChurrascoAmenity) {
      setAmenityInc((prev) => ({ ...prev, [kitChurrascoAmenity.id]: on }));
    }
  };

  useEffect(() => {
    if (!steps.includes(step)) {
      setStep(steps[0] ?? "basics");
    }
  }, [steps, step]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/amenities"));
        if (!r.ok) return;
        const d = (await r.json()) as { amenities?: Array<{ id: string; name: string }> };
        const list = d.amenities || [];
        if (!active) return;
        setCatalogAmenities(list);
        const init: Record<string, boolean> = {};
        list.forEach((a) => {
          init[a.id] = false;
        });
        setAmenityInc(init);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = useCallback(() => {
    setBoatForm(emptyOwnerBoatForm);
    setRouteIslandRows([""]);
    setEmbarkLocsText("");
    setEmbarkTimesText("");
    setUploadRoutePhotos(false);
    setRoutePhotoRights(false);
    setRouteIslandImages({});
    setBbqKitItems([]);
    setConfirm(emptyOwnerBoatRegisterConfirm);
    setSubmittedBoatId(null);
    setStep("basics");
    setAmenityInc((prev) => {
      const o = { ...prev };
      Object.keys(o).forEach((k) => {
        o[k] = false;
      });
      return o;
    });
  }, []);

  const goNext = () => {
    if (!canAdvance) {
      toast.error(t(`marinheiro.registerBlocked.${step}`));
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) {
      setDirection(1);
      setStep(next);
    }
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) {
      setDirection(-1);
      setStep(prev);
    }
  };

  const skipRoutePhotos = () => {
    setUploadRoutePhotos(false);
    setRoutePhotoRights(false);
    const next = steps[stepIndex + 1];
    if (next) {
      setDirection(1);
      setStep(next);
    }
  };

  const registrarEmbarcacao = async () => {
    if (!canSubmit) {
      toast.error(t("marinheiro.newBoatBlocked"));
      return;
    }
    const regMoto = isMotoAquaticaVessel(boatForm.tipo);
    const bbqOn = !regMoto && Boolean(boatForm.bbqOffered);
    if (bbqOn && !ownerBbqKitItemsValid(bbqKitItems)) {
      toast.error(t("marinheiro.bbqKitToastRequired"));
      return;
    }
    if (bbqOn && (boatForm.bbqKitPriceCents ?? 0) < 100) {
      toast.error(t("marinheiro.bbqKitToastPrice"));
      return;
    }
    setLoading(true);
    try {
      const customOptionals = (boatForm.customOptionals ?? []).filter(
        (o: CustomOptional) => o.title.trim().length >= 2 && (o.imageUrls?.length ?? 0) >= 1
      );
      const payload = {
        ...boatForm,
        capacidade: regMoto ? MOTO_AQUATICA_MAX_CAPACITY : boatForm.capacidade,
        tipo: normalizeVesselTipo(boatForm.tipo),
        routeIslandImages: regMoto ? {} : uploadRoutePhotos && routePhotoRights ? routeIslandImages : {},
        tieDocumentUrl: boatForm.tieDocumentUrl?.trim() ? boatForm.tieDocumentUrl.trim() : null,
        tiemDocumentUrl: boatForm.tiemDocumentUrl?.trim() ? boatForm.tiemDocumentUrl.trim() : null,
        videoUrl: boatForm.videoUrl?.trim() ? boatForm.videoUrl.trim() : null,
        locaisEmbarque: splitCommaList(embarkLocsText),
        horariosEmbarque: splitCommaList(embarkTimesText),
        jetSkiOffered: regMoto ? false : Boolean(boatForm.jetSkiOffered),
        jetSkiPriceCents: regMoto ? 0 : Number(boatForm.jetSkiPriceCents ?? 0),
        jetSkiImageUrls: regMoto ? [] : boatForm.jetSkiImageUrls ?? [],
        jetSkiDocumentUrl: regMoto
          ? null
          : boatForm.jetSkiDocumentUrl?.trim()
            ? boatForm.jetSkiDocumentUrl.trim()
            : null,
        bbqOffered: bbqOn,
        bbqKitItems: bbqOn ? normalizeBbqKitItems(bbqKitItems) : [],
        bbqKitPriceCents: bbqOn ? Number(boatForm.bbqKitPriceCents ?? KIT_CHURRASCO_CENTS) : 0,
        customOptionals,
      };
      const resp = await authFetch("/api/owner/boats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastRegisterFail")));
      }
      const data = (await resp.json()) as { boat?: { id: string } };
      const boatId = data.boat?.id;
      if (boatId && catalogAmenities.length > 0) {
        const pairs = catalogAmenities.map((a) => ({
          amenityId: a.id,
          included: regMoto
            ? false
            : isKitChurrascoAmenityName(a.name)
              ? bbqOn
              : Boolean(amenityInc[a.id]),
        }));
        const amResp = await authFetch(`/api/owner/boats/${boatId}/amenities`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairs }),
        });
        if (!amResp.ok) {
          throw new Error(await readResponseErrorMessage(amResp, t("marinheiro.toastAmenitiesFail")));
        }
      }
      setSubmittedBoatId(boatId ?? "");
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastRegisterFail")).trim();
      toast.error(m || t("marinheiro.toastRegisterFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const stepAnimClass =
    direction === 1
      ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300"
      : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-4 motion-safe:duration-300";

  if (submittedBoatId !== null) {
    const id = submittedBoatId || undefined;
    return (
      <OwnerBoatRegisterSubmitted
        boatName={boatForm.nome}
        onViewBoats={() => {
          resetForm();
          onSuccess();
        }}
        onViewBoat={
          id
            ? () => {
                resetForm();
                onSuccess(id);
              }
            : undefined
        }
      />
    );
  }

  return (
    <>
      <datalist id="owner-boat-register-cidades-rj">
        {coastalCityOptions.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
        <div className="min-w-0 space-y-3">
          <OwnerBoatRegisterStepper steps={steps} current={step} />

          <div className="lg:hidden">
            <OwnerBoatRegisterPreview boatForm={boatForm} step={step} />
          </div>

          <div
            key={step}
            className={cn("surface-elevated rounded-xl p-4 sm:p-6", stepAnimClass, "motion-reduce:animate-none")}
          >
            {step === "basics" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.mainData")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.registerBasicsLead")}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("marinheiro.boatName")}</Label>
                    <Input
                      placeholder={t("marinheiro.boatNamePh")}
                      value={boatForm.nome}
                      onChange={(e) => setBoatForm({ ...boatForm, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("marinheiro.type")}</Label>
                    <Select
                      value={boatForm.tipo}
                      onValueChange={(v) => {
                        const moto = isMotoAquaticaVessel(v);
                        setBoatForm((prev) => ({
                          ...prev,
                          tipo: v,
                          ...(moto
                            ? {
                                capacidade: MOTO_AQUATICA_MAX_CAPACITY,
                                jetSkiOffered: false,
                                jetSkiPriceCents: 0,
                                jetSkiImageUrls: [],
                                jetSkiDocumentUrl: "",
                              }
                            : {}),
                        }));
                        if (moto) {
                          setUploadRoutePhotos(false);
                          setRoutePhotoRights(false);
                          setRouteIslandImages({});
                        }
                      }}
                    >
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
                    <Label className="text-xs">{t("marinheiro.location")}</Label>
                    <Input
                      list="owner-boat-register-cidades-rj"
                      placeholder={t("marinheiro.locationPh")}
                      value={boatForm.distancia}
                      onChange={(e) => setBoatForm({ ...boatForm, distancia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("marinheiro.priceBase")}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {t("common.currency")}
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-10"
                        placeholder="0"
                        value={reaisDisplayFromCents(boatForm.precoCents)}
                        onChange={(e) =>
                          setBoatForm({
                            ...boatForm,
                            precoCents: parseReaisToCents(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("marinheiro.sizeLabel")}</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pr-12"
                        placeholder={t("marinheiro.sizePh")}
                        value={numberFieldDisplay(boatForm.tamanhoPes)}
                        onChange={(e) =>
                          setBoatForm({
                            ...boatForm,
                            tamanhoPes: parsePositiveIntField(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {t("common.feet")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{t("marinheiro.capacity")}</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pr-16"
                        placeholder={t("marinheiro.capacityPh")}
                        disabled={isMoto}
                        value={numberFieldDisplay(
                          isMoto ? MOTO_AQUATICA_MAX_CAPACITY : boatForm.capacidade
                        )}
                        onChange={(e) =>
                          setBoatForm({
                            ...boatForm,
                            capacidade: parsePositiveIntField(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {t("common.people")}
                      </span>
                    </div>
                    {isMoto ? (
                      <p className="text-[11px] text-muted-foreground">
                        {t("marinheiro.motoAquaticaCapacityLocked")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("marinheiro.descriptionPh")}</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder={t("marinheiro.descriptionPh")}
                    value={boatForm.descricao}
                    onChange={(e) => setBoatForm({ ...boatForm, descricao: e.target.value })}
                  />
                </div>
              </div>
            ) : null}

            {step === "photos" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.photos")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.registerPhotosLead")}</p>
                </div>
                <OwnerBoatImageUploadZone
                  images={boatForm.imagens}
                  disclaimer={t("marinheiro.registerPhotosDisclaimer")}
                  onAdd={(urls) => setBoatForm((prev) => ({ ...prev, imagens: [...prev.imagens, ...urls] }))}
                  onRemove={(index) =>
                    setBoatForm((prev) => ({
                      ...prev,
                      imagens: prev.imagens.filter((_, i) => i !== index),
                    }))
                  }
                />
              </div>
            ) : null}

            {step === "routes" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.routes")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.routesHint")}</p>
                </div>
                {routeIslandRows.map((row, i) => (
                  <div key={`route-${i}`} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder={t("marinheiro.routeIslandRowPh")}
                      value={row}
                      onChange={(e) => {
                        const next = [...routeIslandRows];
                        next[i] = e.target.value;
                        setRouteIslandRows(next);
                        setBoatForm({ ...boatForm, routeIslands: formRowsToStoredRouteIslands(next) });
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRouteIslandRows((prev) => [...prev, ""])}
                >
                  {t("marinheiro.routeIslandAdd")}
                </Button>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">{t("marinheiro.embarkLocationsLabel")}</Label>
                  <Input
                    placeholder={t("marinheiro.routesPh")}
                    value={embarkLocsText}
                    onChange={(e) => setEmbarkLocsText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("marinheiro.embarkLocationsHint")}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">{t("marinheiro.embarkTimesLabel")}</Label>
                  <Input
                    placeholder="08:00, 10:30"
                    value={embarkTimesText}
                    onChange={(e) => setEmbarkTimesText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("marinheiro.embarkTimesHint")}</p>
                </div>
              </div>
            ) : null}

            {step === "routePhotos" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.routePhotosTitle")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.registerRoutePhotosLead")}</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-sm">
                  <Checkbox
                    checked={uploadRoutePhotos}
                    onCheckedChange={(c) => {
                      const on = c === true;
                      setUploadRoutePhotos(on);
                      if (!on) setRoutePhotoRights(false);
                    }}
                  />
                  <span>{t("marinheiro.routePhotosEnable")}</span>
                </label>
                {uploadRoutePhotos ? (
                  <>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                      <Checkbox
                        checked={routePhotoRights}
                        onCheckedChange={(c) => setRoutePhotoRights(c === true)}
                        className="mt-0.5"
                      />
                      <span>{t("marinheiro.routePhotosDisclaimer")}</span>
                    </label>
                    {storedIslands.length > 0 ? (
                      <div className="space-y-3">
                        {storedIslands.map((island) => (
                          <div key={island} className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                            <Label className="text-sm font-medium text-foreground">{island}</Label>
                            <OwnerBoatImageUploadZone
                              images={routeIslandImages[island] ?? []}
                              multiple
                              disabled={!routePhotoRights}
                              onAdd={(urls) =>
                                setRouteIslandImages((prev) => ({
                                  ...prev,
                                  [island]: [...(prev[island] ?? []), ...urls],
                                }))
                              }
                              onRemove={(index) =>
                                setRouteIslandImages((prev) => ({
                                  ...prev,
                                  [island]: (prev[island] ?? []).filter((_, i) => i !== index),
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("marinheiro.registerRoutePhotosNoStops")}</p>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}

            {step === "optionals" && !isMoto ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.registerOptionalsTitle")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.registerOptionalsLead")}</p>
                </div>
                {catalogAmenitiesIncluded.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("marinheiro.amenitiesHeading")}</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {catalogAmenitiesIncluded.map((a) => (
                        <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={Boolean(amenityInc[a.id])}
                            onCheckedChange={(c) =>
                              setAmenityInc((prev) => ({ ...prev, [a.id]: c === true }))
                            }
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" aria-hidden />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t("marinheiro.bbqKitHeading")}</span>
                      <Switch checked={Boolean(boatForm.bbqOffered)} onCheckedChange={setBbqOffered} />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("marinheiro.bbqKitHint")}</p>
                  {boatForm.bbqOffered ? (
                    <OwnerBbqKitItemsEditor
                      items={bbqKitItems}
                      onChange={setBbqKitItems}
                      priceCents={boatForm.bbqKitPriceCents ?? KIT_CHURRASCO_CENTS}
                      onPriceCentsChange={(c) => setBoatForm({ ...boatForm, bbqKitPriceCents: c })}
                    />
                  ) : null}
                </div>
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-primary" aria-hidden />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t("marinheiro.jetSkiHeading")}</span>
                      <Switch
                        checked={Boolean(boatForm.jetSkiOffered)}
                        onCheckedChange={(v) =>
                          setBoatForm({
                            ...boatForm,
                            jetSkiOffered: v,
                            ...(!v ? { jetSkiPriceCents: 0, jetSkiImageUrls: [], jetSkiDocumentUrl: "" } : {}),
                          })
                        }
                      />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("marinheiro.jetSkiHint")}</p>
                  {boatForm.jetSkiOffered ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>{t("marinheiro.jetSkiPrice")}</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="max-w-xs"
                          placeholder="0"
                          value={reaisDisplayFromCents(boatForm.jetSkiPriceCents ?? 0)}
                          onChange={(e) =>
                            setBoatForm({
                              ...boatForm,
                              jetSkiPriceCents: parseReaisToCents(e.target.value),
                            })
                          }
                        />
                      </div>
                      <OwnerBoatImageUploadZone
                        images={boatForm.jetSkiImageUrls ?? []}
                        onAdd={(urls) =>
                          setBoatForm((prev) => ({
                            ...prev,
                            jetSkiImageUrls: [...(prev.jetSkiImageUrls ?? []), ...urls],
                          }))
                        }
                        onRemove={(index) =>
                          setBoatForm((prev) => ({
                            ...prev,
                            jetSkiImageUrls: (prev.jetSkiImageUrls ?? []).filter((_, i) => i !== index),
                          }))
                        }
                      />
                      <div className="space-y-1">
                        <Label>{t("marinheiro.jetSkiDoc")}</Label>
                        <Input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await fileToDataUrl(f);
                            setBoatForm({ ...boatForm, jetSkiDocumentUrl: url });
                          }}
                        />
                        <Input
                          placeholder={t("marinheiro.jetSkiDocUrlPh")}
                          value={
                            boatForm.jetSkiDocumentUrl?.startsWith("data:") ? "" : boatForm.jetSkiDocumentUrl || ""
                          }
                          onChange={(e) => setBoatForm({ ...boatForm, jetSkiDocumentUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <OwnerCustomOptionalsEditor
                  value={boatForm.customOptionals ?? []}
                  onChange={(customOptionals) => setBoatForm({ ...boatForm, customOptionals })}
                />
              </div>
            ) : null}

            {step === "media" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t("marinheiro.registerMediaTitle")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marinheiro.registerMediaLead")}</p>
                </div>
                <div className="space-y-1">
                  <Label>{t("marinheiro.video")}</Label>
                  <Input
                    placeholder={t("marinheiro.videoPh")}
                    value={boatForm.videoUrl || ""}
                    onChange={(e) => setBoatForm({ ...boatForm, videoUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">{t("marinheiro.docs")}</Label>
                  <p className="text-xs text-muted-foreground">{t("marinheiro.registerDocsHint")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("marinheiro.tie")}</Label>
                      <Input
                        placeholder={t("marinheiro.tie")}
                        value={boatForm.tieDocumentUrl || ""}
                        onChange={(e) => setBoatForm({ ...boatForm, tieDocumentUrl: e.target.value })}
                      />
                      <Input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="text-xs"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setBoatForm({ ...boatForm, tieDocumentUrl: await fileToDataUrl(f) });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("marinheiro.tiem")}</Label>
                      <Input
                        placeholder={t("marinheiro.tiem")}
                        value={boatForm.tiemDocumentUrl || ""}
                        onChange={(e) => setBoatForm({ ...boatForm, tiemDocumentUrl: e.target.value })}
                      />
                      <Input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="text-xs"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setBoatForm({ ...boatForm, tiemDocumentUrl: await fileToDataUrl(f) });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === "confirm" ? (
              <OwnerBoatRegisterConfirmStep value={confirm} onChange={setConfirm} />
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {stepIndex > 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={loading}>
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                    {t("marinheiro.registerBack")}
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
                    {t("common.cancel")}
                  </Button>
                )}
                {step === "routePhotos" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={skipRoutePhotos} disabled={loading}>
                    {t("marinheiro.registerSkip")}
                  </Button>
                ) : null}
              </div>
              {isLastStep ? (
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={loading || !canAdvance || !canSubmit}
                  onClick={() => void registrarEmbarcacao()}
                >
                  {step === "confirm" ? t("marinheiro.registerFinish") : t("marinheiro.saveBoat")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={loading || !canAdvance}
                  onClick={goNext}
                >
                  {t("marinheiro.registerNext")}
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))]">
            <OwnerBoatRegisterPreview boatForm={boatForm} step={step} />
          </div>
        </aside>
      </div>
    </>
  );
}
