import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Anchor, Pencil, Plus, ClipboardList, Trash2, Star, Waves } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { authFetch, clearSession, getStoredUser, apiUrl } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { readResponseErrorMessage } from "@/lib/responseError";
import { BoatCalendarPanel } from "@/components/BoatCalendarPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CIDADES_LITORAL_RJ } from "@/data/praiasBrasil";
import {
  RESCHEDULE_REASONS,
  type RescheduleReason,
  rescheduleReasonI18nKey,
} from "@/lib/rescheduleReasons";
import {
  BOAT_VESSEL_TYPES,
  type BoatVesselTypeId,
  isMotoAquaticaVessel,
  normalizeVesselTipo,
  vesselTypeLabel,
} from "@/lib/boatVesselTypes";
import { formRowsToStoredRouteIslands, storedRouteIslandsToFormRows } from "@/lib/routeIslandsParse";

function translateRescheduleReason(
  tr: (k: string) => string,
  reason: string | null | undefined
): string {
  if (!reason) return "";
  if (RESCHEDULE_REASONS.includes(reason as RescheduleReason)) {
    return tr(rescheduleReasonI18nKey(reason as RescheduleReason));
  }
  return reason;
}

type OwnerBoat = {
  id: string;
  nome: string;
  distancia: string;
  precoCents: number;
  preco: string;
  nota: string;
  tamanhoPes: number;
  tamanho: string;
  capacidade: number;
  tipo: string;
  descricao: string;
  verificado: boolean;
  tieDocumentUrl?: string | null;
  tiemDocumentUrl?: string | null;
  videoUrl?: string | null;
  routeIslands?: string[];
  routeIslandImages?: Record<string, string[]>;
  imagens: string[];
  amenidades?: Array<{ id: string; nome: string; incluido: boolean }>;
  locaisEmbarque?: string[];
  horariosEmbarque?: string[];
  jetSkiOffered?: boolean;
  jetSkiPriceCents?: number;
  jetSkiImageUrls?: string[];
  jetSkiDocumentUrl?: string | null;
};

type OwnerBookingRow = {
  id: string;
  status: string;
  bookingDate?: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  jetSki?: boolean;
  embarkLocation: string | null;
  embarkTime?: string | null;
  totalCents: number;
  routeIslands?: string[];
  boat: { id: string; nome: string; jetSkiOffered?: boolean; jetSkiPriceCents?: number };
  renter: { id: string; nome: string; email: string };
  ratingRenter?: { stars: number; comment: string | null; ratedAt: string } | null;
  rescheduleReason?: string | null;
  rescheduleTitle?: string | null;
  rescheduleNote?: string | null;
  rescheduleAttachments?: string[];
};

function OwnerRescheduleJustification({
  b,
  t,
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  if (!b.rescheduleTitle) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
      <p className="font-semibold text-foreground">{t("marinheiro.rescheduleJustificationHeading")}</p>
      {b.rescheduleReason ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{t("reservasConta.rescheduleReasonLabel")}: </span>
          {translateRescheduleReason(t, b.rescheduleReason)}
        </p>
      ) : null}
      <p className="font-medium text-foreground">{b.rescheduleTitle}</p>
      {b.rescheduleNote ? <p className="text-muted-foreground whitespace-pre-wrap">{b.rescheduleNote}</p> : null}
      {(b.rescheduleAttachments ?? []).length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t("marinheiro.rescheduleImages")}</p>
          <div className="flex flex-wrap gap-2">
            {(b.rescheduleAttachments ?? []).map((url, i) => (
              <a key={`${b.id}-att-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={url} alt="" className="h-20 w-auto max-w-[120px] rounded border object-cover" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const emptyBoatForm: Omit<OwnerBoat, "id" | "preco" | "nota" | "tamanho"> = {
  nome: "",
  distancia: "",
  precoCents: 0,
  tamanhoPes: 25,
  capacidade: 6,
  tipo: "Lancha",
  descricao: "",
  verificado: false,
  tieDocumentUrl: "",
  tiemDocumentUrl: "",
  videoUrl: "",
  routeIslands: [],
  routeIslandImages: {},
  imagens: [],
  jetSkiOffered: false,
  jetSkiPriceCents: 0,
  jetSkiImageUrls: [],
  jetSkiDocumentUrl: "",
};

function splitCommaList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function RateRenterForm({
  bookingId,
  t,
  onDone,
}: {
  bookingId: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (stars < 1) {
      toast.error(t("marinheiro.rateRenterPickStars"));
      return;
    }
    setSubmitting(true);
    try {
      const resp = await authFetch(`/api/owner/bookings/${bookingId}/rate-renter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("marinheiro.rateRenterFail")));
      toast.success(t("marinheiro.rateRenterOk"));
      onDone();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.rateRenterFail")).trim();
      toast.error(m || t("marinheiro.rateRenterFail"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border">
      <p className="text-xs font-medium text-foreground">{t("marinheiro.rateRenterTitle")}</p>
      <p className="text-[11px] text-muted-foreground">{t("marinheiro.rateRenterHint")}</p>
      <div className="flex items-center gap-1" role="group" aria-label={t("marinheiro.rateRenterTitle")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="p-0.5 rounded hover:bg-secondary disabled:opacity-50"
            disabled={submitting}
            onClick={() => setStars(n)}
            aria-pressed={stars >= n}
          >
            <Star
              className={`w-7 h-7 ${n <= stars ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <div>
        <Label className="text-xs">{t("marinheiro.rateRenterComment")}</Label>
        <Input
          className="mt-1 h-9 text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <Button size="sm" onClick={() => void submit()} disabled={submitting}>
        {submitting ? t("marinheiro.rateRenterSubmitting") : t("marinheiro.rateRenterSubmit")}
      </Button>
    </div>
  );
}

const Marinheiro_Page = () => {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const navigate = useNavigate();
  const user = getStoredUser();
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<OwnerBookingRow[]>([]);
  const [boats, setBoats] = useState<OwnerBoat[]>([]);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [boatForm, setBoatForm] = useState<OwnerBoat | null>(null);
  const [registering, setRegistering] = useState(false);
  const [newBoatForm, setNewBoatForm] = useState(emptyBoatForm);
  const [newRouteIslandRows, setNewRouteIslandRows] = useState<string[]>([""]);
  const [editRouteIslandRows, setEditRouteIslandRows] = useState<string[]>([""]);
  const [newEmbarkLocsText, setNewEmbarkLocsText] = useState("");
  const [newEmbarkTimesText, setNewEmbarkTimesText] = useState("");
  const [editEmbarkLocsText, setEditEmbarkLocsText] = useState("");
  const [editEmbarkTimesText, setEditEmbarkTimesText] = useState("");
  const [catalogAmenities, setCatalogAmenities] = useState<Array<{ id: string; name: string }>>([]);
  const [amenityIncNew, setAmenityIncNew] = useState<Record<string, boolean>>({});
  const [amenityIncEdit, setAmenityIncEdit] = useState<Record<string, boolean>>({});
  const [uploadRoutePhotos, setUploadRoutePhotos] = useState(false);
  const [routePhotoRights, setRoutePhotoRights] = useState(false);
  const [routeIslandImagesNew, setRouteIslandImagesNew] = useState<Record<string, string[]>>({});
  const [calendarBoatId, setCalendarBoatId] = useState<string | null>(null);
  const [boatPendingDelete, setBoatPendingDelete] = useState<OwnerBoat | null>(null);

  const isLocatario = user?.role === "locatario";
  const pendentes = useMemo(() => bookings.filter((b) => b.status === "PENDING"), [bookings]);
  const aceitas = useMemo(() => bookings.filter((b) => b.status === "ACCEPTED"), [bookings]);
  const concluidas = useMemo(() => bookings.filter((b) => b.status === "COMPLETED"), [bookings]);
  const coastalCityOptions = useMemo(() => [...CIDADES_LITORAL_RJ].sort((a, b) => a.localeCompare(b, "pt")), []);

  const editVesselTypeOptions = useMemo(() => {
    if (!boatForm) return [...BOAT_VESSEL_TYPES];
    const raw = (boatForm.tipo || "").trim();
    const n = normalizeVesselTipo(raw);
    if (BOAT_VESSEL_TYPES.includes(n as BoatVesselTypeId)) return [...BOAT_VESSEL_TYPES];
    if (raw && !BOAT_VESSEL_TYPES.includes(raw as BoatVesselTypeId)) return [raw, ...BOAT_VESSEL_TYPES];
    return [...BOAT_VESSEL_TYPES];
  }, [boatForm]);

  const newBoatReady = useMemo(() => {
    const f = newBoatForm;
    const isMoto = isMotoAquaticaVessel(f.tipo);
    const base =
      f.nome.trim().length >= 2 &&
      f.distancia.trim().length >= 2 &&
      f.tipo.trim().length >= 2 &&
      f.descricao.trim().length >= 5 &&
      f.precoCents >= 100 &&
      f.tamanhoPes >= 1 &&
      f.capacidade >= 1 &&
      f.imagens.length >= 1;
    const routeOk = isMoto || !uploadRoutePhotos || routePhotoRights;
    const jetOk =
      isMoto ||
      !newBoatForm.jetSkiOffered ||
      ((newBoatForm.jetSkiPriceCents ?? 0) >= 100 &&
        (newBoatForm.jetSkiImageUrls?.length ?? 0) >= 1 &&
        String(newBoatForm.jetSkiDocumentUrl || "").trim().length > 0);
    return base && routeOk && jetOk;
  }, [newBoatForm, uploadRoutePhotos, routePhotoRights]);
  const precoPreview = useMemo(() => {
    const n = Math.max(0, Math.round((newBoatForm.precoCents || 0) / 100));
    return currencyFmt.format(n);
  }, [newBoatForm.precoCents, currencyFmt]);

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(t("marinheiro.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  const carregarPendentes = async () => {
    setLoading(true);
    try {
      const resp = await authFetch("/api/owner/bookings");
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookings")));
      }
      const data = (await resp.json()) as { bookings: OwnerBookingRow[] };
      const list = data.bookings || [];
      setBookings(list);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBookings")).trim();
      toast.error(m || t("marinheiro.toastBookings"), { id: "owner-bookings" });
    } finally {
      setLoading(false);
    }
  };

  const concluirReserva = async (bookingId: string) => {
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/bookings/${bookingId}/complete`, { method: "POST" });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastCompleteFail")));
      }
      toast.success(t("marinheiro.toastCompleteOk"));
      await carregarPendentes();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastCompleteFail")).trim();
      toast.error(m || t("marinheiro.toastCompleteFail"));
    } finally {
      setLoading(false);
    }
  };

  const carregarMeusBarcos = async () => {
    try {
      const resp = await authFetch("/api/owner/boats");
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBoats")));
      }
      const data = (await resp.json()) as { boats: OwnerBoat[] };
      setBoats(data.boats);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBoats")).trim();
      toast.error(m || t("marinheiro.toastBoats"), { id: "owner-boats" });
    }
  };

  const decidir = async (id: string, action: "accept" | "decline") => {
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/bookings/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteById[id] || "" }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookingUpdate")));
      }
      toast.success(action === "accept" ? t("marinheiro.toastAccept") : t("marinheiro.toastDecline"));
      await carregarPendentes();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBookingUpdate")).trim();
      toast.error(m || t("marinheiro.toastBookingUpdate"));
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (boat: OwnerBoat) => {
    setEditingBoatId(boat.id);
    setBoatForm({ ...boat, tipo: normalizeVesselTipo(boat.tipo) });
    setEditRouteIslandRows(storedRouteIslandsToFormRows(boat.routeIslands));
    setEditEmbarkLocsText((boat.locaisEmbarque || []).join(", "));
    setEditEmbarkTimesText((boat.horariosEmbarque || []).join(", "));
    const m: Record<string, boolean> = {};
    catalogAmenities.forEach((a) => {
      const found = boat.amenidades?.find((x) => x.id === a.id);
      m[a.id] = found ? found.incluido : false;
    });
    setAmenityIncEdit(m);
  };

  const confirmarExclusaoEmbarcacao = async () => {
    if (!boatPendingDelete) return;
    const deletedId = boatPendingDelete.id;
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/boats/${deletedId}`, { method: "DELETE" });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastDeleteFail")));
      }
      toast.success(t("marinheiro.toastDeleteOk"));
      setBoatPendingDelete(null);
      if (editingBoatId === deletedId) {
        setEditingBoatId(null);
        setBoatForm(null);
        setEditRouteIslandRows([""]);
        setEditEmbarkLocsText("");
        setEditEmbarkTimesText("");
      }
      if (calendarBoatId === deletedId) setCalendarBoatId(null);
      await carregarMeusBarcos();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastDeleteFail")).trim();
      toast.error(m || t("marinheiro.toastDeleteFail"));
    } finally {
      setLoading(false);
    }
  };

  const salvarEdicao = async () => {
    if (!editingBoatId || !boatForm) return;
    const editMoto = isMotoAquaticaVessel(boatForm.tipo);
    if (!editMoto && boatForm.jetSkiOffered) {
      if ((boatForm.jetSkiPriceCents ?? 0) < 100) {
        toast.error(t("marinheiro.jetSkiToastPrice"));
        return;
      }
      if ((boatForm.jetSkiImageUrls?.length ?? 0) < 1) {
        toast.error(t("marinheiro.jetSkiToastPhotos"));
        return;
      }
      if (!String(boatForm.jetSkiDocumentUrl || "").trim()) {
        toast.error(t("marinheiro.jetSkiToastDoc"));
        return;
      }
    }
    setLoading(true);
    try {
      const resp = await authFetch(`/api/owner/boats/${editingBoatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: boatForm.nome,
          distancia: boatForm.distancia,
          precoCents: Number(boatForm.precoCents),
          tamanhoPes: Number(boatForm.tamanhoPes),
          capacidade: Number(boatForm.capacidade),
          tipo: normalizeVesselTipo(boatForm.tipo),
          descricao: boatForm.descricao,
          routeIslands: boatForm.routeIslands || [],
          routeIslandImages: editMoto ? {} : boatForm.routeIslandImages || {},
          verificado: Boolean(boatForm.verificado),
          tieDocumentUrl: boatForm.tieDocumentUrl?.trim() ? boatForm.tieDocumentUrl.trim() : null,
          tiemDocumentUrl: boatForm.tiemDocumentUrl?.trim() ? boatForm.tiemDocumentUrl.trim() : null,
          videoUrl: boatForm.videoUrl || null,
          imagens: boatForm.imagens || [],
          locaisEmbarque: splitCommaList(editEmbarkLocsText),
          horariosEmbarque: splitCommaList(editEmbarkTimesText),
          jetSkiOffered: editMoto ? false : Boolean(boatForm.jetSkiOffered),
          jetSkiPriceCents: editMoto ? 0 : Number(boatForm.jetSkiPriceCents ?? 0),
          jetSkiImageUrls: editMoto ? [] : boatForm.jetSkiImageUrls ?? [],
          jetSkiDocumentUrl: editMoto ? null : boatForm.jetSkiDocumentUrl?.trim() ? boatForm.jetSkiDocumentUrl.trim() : null,
        }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastUpdateFail")));
      }
      const pairs = catalogAmenities.map((a) => ({
        amenityId: a.id,
        included: editMoto ? false : Boolean(amenityIncEdit[a.id]),
      }));
      const amResp = await authFetch(`/api/owner/boats/${editingBoatId}/amenities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs }),
      });
      if (!amResp.ok) {
        throw new Error(await readResponseErrorMessage(amResp, t("marinheiro.toastAmenitiesFail")));
      }
      toast.success(t("marinheiro.toastUpdate"));
      setEditingBoatId(null);
      setBoatForm(null);
      setEditRouteIslandRows([""]);
      setEditEmbarkLocsText("");
      setEditEmbarkTimesText("");
      await carregarMeusBarcos();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastUpdateFail")).trim();
      toast.error(m || t("marinheiro.toastUpdateFail"));
    } finally {
      setLoading(false);
    }
  };

  const registrarEmbarcacao = async () => {
    if (!newBoatReady) {
      toast.error(t("marinheiro.newBoatBlocked"));
      return;
    }
    setLoading(true);
    try {
      const regMoto = isMotoAquaticaVessel(newBoatForm.tipo);
      const payload = {
        ...newBoatForm,
        tipo: normalizeVesselTipo(newBoatForm.tipo),
        routeIslandImages: regMoto ? {} : uploadRoutePhotos && routePhotoRights ? routeIslandImagesNew : {},
        tieDocumentUrl: newBoatForm.tieDocumentUrl?.trim() ? newBoatForm.tieDocumentUrl.trim() : null,
        tiemDocumentUrl: newBoatForm.tiemDocumentUrl?.trim() ? newBoatForm.tiemDocumentUrl.trim() : null,
        videoUrl: newBoatForm.videoUrl?.trim() ? newBoatForm.videoUrl.trim() : null,
        locaisEmbarque: splitCommaList(newEmbarkLocsText),
        horariosEmbarque: splitCommaList(newEmbarkTimesText),
        jetSkiOffered: regMoto ? false : Boolean(newBoatForm.jetSkiOffered),
        jetSkiPriceCents: regMoto ? 0 : Number(newBoatForm.jetSkiPriceCents ?? 0),
        jetSkiImageUrls: regMoto ? [] : newBoatForm.jetSkiImageUrls ?? [],
        jetSkiDocumentUrl: regMoto ? null : newBoatForm.jetSkiDocumentUrl?.trim() ? newBoatForm.jetSkiDocumentUrl.trim() : null,
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
          included: regMoto ? false : Boolean(amenityIncNew[a.id]),
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
      toast.success(t("marinheiro.toastRegister"));
      setRegistering(false);
      setNewBoatForm(emptyBoatForm);
      setNewRouteIslandRows([""]);
      setNewEmbarkLocsText("");
      setNewEmbarkTimesText("");
      setUploadRoutePhotos(false);
      setRoutePhotoRights(false);
      setRouteIslandImagesNew({});
      await carregarMeusBarcos();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastRegisterFail")).trim();
      toast.error(m || t("marinheiro.toastRegisterFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLocatario) return;
    carregarMeusBarcos();
    carregarPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocatario]);

  useEffect(() => {
    if (boats.length > 0 && !calendarBoatId) setCalendarBoatId(boats[0].id);
  }, [boats, calendarBoatId]);

  useEffect(() => {
    if (!isLocatario) return;
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
        setAmenityIncNew(init);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [isLocatario]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2 min-w-0 truncate">
              <Anchor className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">{t("marinheiro.title")}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HeaderSettingsMenu />
            <Button size="sm" variant="secondary" onClick={handleLogout}>
              {t("marinheiro.logout")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                carregarMeusBarcos();
                carregarPendentes();
              }}
              disabled={loading || !isLocatario}
            >
              {loading ? t("marinheiro.loading") : t("marinheiro.refresh")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <datalist id="marinheiro-cidades-rj">
          {coastalCityOptions.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        {!isLocatario ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <p className="text-sm text-muted-foreground">
              {t("marinheiro.needRole", { role: t("marinheiro.roleName") })}
            </p>
            <Button className="mt-4" onClick={() => navigate("/login", { state: { from: "/marinheiro" } })}>
              {t("marinheiro.goLogin")}
            </Button>
          </div>
        ) : (
          <>
            <section id="marinheiro-reservas" className="space-y-5 rounded-xl border border-primary/25 bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardList className="w-5 h-5 text-primary shrink-0" />
                  <h2 className="text-lg font-semibold text-foreground truncate">{t("marinheiro.bookingsHubTitle")}</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">{t("marinheiro.bookingsHubHint")}</p>

              <div id="marinheiro-reservas-pendente" className="space-y-3 scroll-mt-24">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{t("marinheiro.pendingTitle")}</h3>
                  <Badge variant="outline">{pendentes.length}</Badge>
                </div>

                {pendentes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("marinheiro.noPending")}</p>
                ) : (
                  <div className="space-y-3">
                    {pendentes.map((b) => (
                      <div key={b.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{b.boat.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.client")} {b.renter.nome} ({b.renter.email})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.embark")}{" "}
                              {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
                                t("reservar.embarkToArrangeShort")}{" "}
                              • {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
                            </p>
                            {b.bookingDate ? (
                              <p className="text-xs font-medium text-foreground">
                                {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.passengers")} {b.passengersAdults} {t("marinheiro.adults")}
                              {b.hasKids ? ` + ${b.passengersChildren} ${t("marinheiro.kids")}` : ""}
                              {b.bbqKit ? ` • ${t("marinheiro.bbq")}` : ""}
                              {b.jetSki ? ` • ${t("marinheiro.jetSkiShort")}` : ""}
                            </p>
                            {b.routeIslands && b.routeIslands.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {t("marinheiro.bookingRoute")}: {b.routeIslands.join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <Badge className="bg-accent text-accent-foreground">{t("marinheiro.pendingBadge")}</Badge>
                        </div>

                        <OwnerRescheduleJustification b={b} t={t} />

                        <div className="space-y-1">
                          <Label>{t("marinheiro.noteLabel")}</Label>
                          <Textarea
                            value={noteById[b.id] || ""}
                            onChange={(e) => setNoteById((p) => ({ ...p, [b.id]: e.target.value }))}
                            placeholder={t("marinheiro.notePh")}
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button className="flex-1" onClick={() => decidir(b.id, "accept")} disabled={loading}>
                            {t("marinheiro.accept")}
                          </Button>
                          <Button className="flex-1" variant="destructive" onClick={() => decidir(b.id, "decline")} disabled={loading}>
                            {t("marinheiro.decline")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="marinheiro-reservas-curso" className="space-y-3 border-t border-border pt-4 scroll-mt-24">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{t("marinheiro.acceptedTitle")}</h3>
                  <Badge variant="outline">{aceitas.length}</Badge>
                </div>
                {aceitas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">{t("marinheiro.noAccepted")}</p>
                ) : (
                  <div className="space-y-3">
                    {aceitas.map((b) => (
                      <div key={b.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{b.boat.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.client")} {b.renter.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
                            </p>
                            {b.bookingDate ? (
                              <p className="text-xs font-medium text-foreground">
                                {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.embark")}{" "}
                              {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
                                t("reservar.embarkToArrangeShort")}
                            </p>
                            {b.routeIslands && b.routeIslands.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {t("marinheiro.bookingRoute")}: {b.routeIslands.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <OwnerRescheduleJustification b={b} t={t} />
                        <Button onClick={() => concluirReserva(b.id)} disabled={loading} className="w-full">
                          {t("marinheiro.completeBooking")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="marinheiro-reservas-concluidas" className="space-y-3 border-t border-border pt-4 scroll-mt-24">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{t("marinheiro.completedTitle")}</h3>
                  <Badge variant="outline">{concluidas.length}</Badge>
                </div>
                {concluidas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">{t("marinheiro.noCompleted")}</p>
                ) : (
                  <div className="space-y-3">
                    {concluidas.map((b) => (
                      <div key={b.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{b.boat.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.client")} {b.renter.nome} ({b.renter.email})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
                            </p>
                            {b.bookingDate ? (
                              <p className="text-xs font-medium text-foreground">
                                {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant="secondary">{t("marinheiro.completedBadge")}</Badge>
                        </div>
                        {b.ratingRenter ? (
                          <p className="text-xs text-foreground flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                            {t("marinheiro.rateRenterRecorded", { n: b.ratingRenter.stars })}
                          </p>
                        ) : (
                          <RateRenterForm
                            bookingId={b.id}
                            t={t}
                            onDone={() => void carregarPendentes()}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("marinheiro.myBoats")}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{boats.length}</Badge>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRegistering((wasOpen) => {
                        if (wasOpen) return false;
                        setNewBoatForm(emptyBoatForm);
                        setNewRouteIslandRows([""]);
                        setNewEmbarkLocsText("");
                        setNewEmbarkTimesText("");
                        setUploadRoutePhotos(false);
                        setRoutePhotoRights(false);
                        setRouteIslandImagesNew({});
                        setAmenityIncNew((prev) => {
                          const o = { ...prev };
                          Object.keys(o).forEach((k) => {
                            o[k] = false;
                          });
                          return o;
                        });
                        return true;
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("marinheiro.registerBoat")}
                  </Button>
                </div>
              </div>

              {registering && (
                <div className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                  <h3 className="font-semibold text-foreground">{t("marinheiro.newBoat")}</h3>
                  <p className="text-xs text-muted-foreground">{t("marinheiro.stepsHint")}</p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground">{t("marinheiro.previewTitle")}</p>
                    <div className="grid grid-cols-[92px,1fr] gap-3 items-center">
                      <div className="h-20 w-[92px] overflow-hidden rounded-md border border-border bg-secondary">
                        {newBoatForm.imagens?.[0] ? (
                          <img src={newBoatForm.imagens[0]} alt={newBoatForm.nome || t("marinheiro.previewAlt")} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground truncate">{newBoatForm.nome || t("marinheiro.previewName")}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(newBoatForm.tipo ? vesselTypeLabel(t, newBoatForm.tipo) : t("marinheiro.previewType"))} •{" "}
                          {(newBoatForm.distancia || t("marinheiro.previewLoc"))}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {newBoatForm.tamanhoPes || 0} {t("common.feet")} • {newBoatForm.capacidade || 0} {t("common.people")}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{precoPreview}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.mainData")}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>{t("marinheiro.boatName")}</Label>
                        <Input placeholder={t("marinheiro.boatNamePh")} value={newBoatForm.nome} onChange={(e) => setNewBoatForm({ ...newBoatForm, nome: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>{t("marinheiro.type")}</Label>
                        <Select
                          value={newBoatForm.tipo}
                          onValueChange={(v) => {
                            const moto = isMotoAquaticaVessel(v);
                            setNewBoatForm((prev) => ({
                              ...prev,
                              tipo: v,
                              ...(moto
                                ? {
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
                              setRouteIslandImagesNew({});
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
                        <Label>{t("marinheiro.location")}</Label>
                        <Input
                          list="marinheiro-cidades-rj"
                          placeholder={t("marinheiro.locationPh")}
                          value={newBoatForm.distancia}
                          onChange={(e) => setNewBoatForm({ ...newBoatForm, distancia: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t("marinheiro.priceBase")}</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{t("common.currency")}</span>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pl-10"
                            placeholder="0"
                            value={Math.max(1, Math.round(newBoatForm.precoCents / 100))}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                precoCents: Math.max(1, Number(e.target.value || 1)) * 100,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>{t("marinheiro.sizeLabel")}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pr-12"
                            placeholder={t("marinheiro.sizePh")}
                            value={Math.max(1, newBoatForm.tamanhoPes)}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                tamanhoPes: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("common.feet")}</span>
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>{t("marinheiro.capacity")}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="pr-16"
                            placeholder={t("marinheiro.capacityPh")}
                            value={Math.max(1, newBoatForm.capacidade)}
                            onChange={(e) =>
                              setNewBoatForm({
                                ...newBoatForm,
                                capacidade: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("common.people")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Textarea placeholder={t("marinheiro.descriptionPh")} value={newBoatForm.descricao} onChange={(e) => setNewBoatForm({ ...newBoatForm, descricao: e.target.value })} />
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.routes")}</Label>
                    {newRouteIslandRows.map((row, i) => (
                      <div key={`new-route-${i}`} className="flex gap-2 items-center">
                        <Input
                          className="flex-1"
                          placeholder={t("marinheiro.routesPh")}
                          value={row}
                          onChange={(e) => {
                            const next = [...newRouteIslandRows];
                            next[i] = e.target.value;
                            setNewRouteIslandRows(next);
                            setNewBoatForm({ ...newBoatForm, routeIslands: formRowsToStoredRouteIslands(next) });
                          }}
                        />
                        {newRouteIslandRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground"
                            onClick={() => {
                              const next = newRouteIslandRows.filter((_, j) => j !== i);
                              setNewRouteIslandRows(next);
                              setNewBoatForm({ ...newBoatForm, routeIslands: formRowsToStoredRouteIslands(next) });
                            }}
                            aria-label={t("marinheiro.routeIslandRemove")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewRouteIslandRows((prev) => [...prev, ""])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("marinheiro.routeIslandAdd")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("marinheiro.routesHint")}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.embarkLocationsLabel")}</Label>
                    <Input
                      placeholder={t("marinheiro.routesPh")}
                      value={newEmbarkLocsText}
                      onChange={(e) => setNewEmbarkLocsText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("marinheiro.embarkLocationsHint")}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.embarkTimesLabel")}</Label>
                    <Input
                      placeholder="08:00, 10:30"
                      value={newEmbarkTimesText}
                      onChange={(e) => setNewEmbarkTimesText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("marinheiro.embarkTimesHint")}</p>
                  </div>
                  {!isMotoAquaticaVessel(newBoatForm.tipo) ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t("marinheiro.amenitiesHeading")}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catalogAmenities.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={Boolean(amenityIncNew[a.id])}
                                onCheckedChange={(c) =>
                                  setAmenityIncNew((prev) => ({ ...prev, [a.id]: c === true }))
                                }
                              />
                              <span>{a.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2">
                          <Waves className="w-5 h-5 text-primary shrink-0" />
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{t("marinheiro.jetSkiHeading")}</span>
                            <Switch
                              checked={Boolean(newBoatForm.jetSkiOffered)}
                              onCheckedChange={(v) =>
                                setNewBoatForm({
                                  ...newBoatForm,
                                  jetSkiOffered: v,
                                  ...(!v
                                    ? { jetSkiPriceCents: 0, jetSkiImageUrls: [], jetSkiDocumentUrl: "" }
                                    : {}),
                                })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("marinheiro.jetSkiHint")}</p>
                        {newBoatForm.jetSkiOffered ? (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label>{t("marinheiro.jetSkiPrice")}</Label>
                              <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  {t("common.currency")}
                                </span>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  className="pl-10"
                                  value={Math.max(1, Math.round((newBoatForm.jetSkiPriceCents || 0) / 100))}
                                  onChange={(e) =>
                                    setNewBoatForm({
                                      ...newBoatForm,
                                      jetSkiPriceCents: Math.max(100, Number(e.target.value || 1)) * 100,
                                    })
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
                                  const files = Array.from(e.target.files || []);
                                  const urls = await Promise.all(files.map(fileToDataUrl));
                                  setNewBoatForm({
                                    ...newBoatForm,
                                    jetSkiImageUrls: [...(newBoatForm.jetSkiImageUrls || []), ...urls],
                                  });
                                }}
                              />
                              {(newBoatForm.jetSkiImageUrls?.length ?? 0) > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {t("marinheiro.jetSkiPhotosCount", { n: newBoatForm.jetSkiImageUrls?.length ?? 0 })}
                                </p>
                              ) : (
                                <p className="text-xs text-destructive">{t("marinheiro.jetSkiPhotosRequired")}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label>{t("marinheiro.jetSkiDoc")}</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  const url = await fileToDataUrl(f);
                                  setNewBoatForm({ ...newBoatForm, jetSkiDocumentUrl: url });
                                }}
                              />
                              <Input
                                placeholder={t("marinheiro.jetSkiDocUrlPh")}
                                value={
                                  newBoatForm.jetSkiDocumentUrl?.startsWith("data:")
                                    ? ""
                                    : newBoatForm.jetSkiDocumentUrl || ""
                                }
                                onChange={(e) =>
                                  setNewBoatForm({ ...newBoatForm, jetSkiDocumentUrl: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Checkbox checked={uploadRoutePhotos} onCheckedChange={(c) => setUploadRoutePhotos(c === true)} />
                          {t("marinheiro.routePhotosEnable")}
                        </label>
                        {uploadRoutePhotos ? (
                          <>
                            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                              <Checkbox
                                checked={routePhotoRights}
                                onCheckedChange={(c) => setRoutePhotoRights(c === true)}
                                className="mt-0.5"
                              />
                              <span>{t("marinheiro.routePhotosDisclaimer")}</span>
                            </label>
                            <p className="text-xs font-semibold text-foreground">{t("marinheiro.routePhotosTitle")}</p>
                            {(newBoatForm.routeIslands || []).map((island) => (
                              <div key={island} className="space-y-1">
                                <Label className="text-xs">{island}</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={!routePhotoRights}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    const urls = await Promise.all(files.map(fileToDataUrl));
                                    setRouteIslandImagesNew((prev) => ({ ...prev, [island]: urls }));
                                  }}
                                />
                              </div>
                            ))}
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-1">
                    <Label>{t("marinheiro.video")}</Label>
                    <Input placeholder={t("marinheiro.videoPh")} value={newBoatForm.videoUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, videoUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("marinheiro.photos")}</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        const urls = await Promise.all(files.map(fileToDataUrl));
                        setNewBoatForm({ ...newBoatForm, imagens: [...newBoatForm.imagens, ...urls] });
                      }}
                    />
                    {newBoatForm.imagens.length > 0 && (
                      <p className="text-xs text-muted-foreground">{t("marinheiro.photosCount", { n: newBoatForm.imagens.length })}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.docs")}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder={t("marinheiro.tie")}
                        value={newBoatForm.tieDocumentUrl || ""}
                        onChange={(e) => setNewBoatForm({ ...newBoatForm, tieDocumentUrl: e.target.value })}
                      />
                      <Input
                        placeholder={t("marinheiro.tiem")}
                        value={newBoatForm.tiemDocumentUrl || ""}
                        onChange={(e) => setNewBoatForm({ ...newBoatForm, tiemDocumentUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={registrarEmbarcacao} disabled={loading || !newBoatReady}>
                      {t("marinheiro.saveBoat")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRegistering(false);
                        setNewBoatForm(emptyBoatForm);
                        setNewRouteIslandRows([""]);
                        setNewEmbarkLocsText("");
                        setNewEmbarkTimesText("");
                        setUploadRoutePhotos(false);
                        setRoutePhotoRights(false);
                        setRouteIslandImagesNew({});
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {boats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("marinheiro.noBoats")}</p>
              ) : (
                <div className="space-y-3">
                  {boats.map((boat) => {
                    const editing = editingBoatId === boat.id && boatForm;
                    return (
                      <div key={boat.id} className="border border-border rounded-xl bg-card p-4 shadow-card space-y-3">
                        {!editing ? (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{boat.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {vesselTypeLabel(t, boat.tipo)} • {boat.tamanho} • {boat.capacidade}{" "}
                                  {t("common.people")}
                                </p>
                                <p className="text-xs text-muted-foreground">{boat.distancia}</p>
                                <p className="text-xs text-muted-foreground">
                                  {boat.preco} • {t("marinheiro.ratingLabel")} {boat.nota}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <Button variant="secondary" size="sm" onClick={() => iniciarEdicao(boat)}>
                                  <Pencil className="w-4 h-4 mr-1" />
                                  {t("marinheiro.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setBoatPendingDelete(boat)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {t("marinheiro.deleteBoat")}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{boat.descricao}</p>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>{t("common.name")}</Label>
                                <Input value={boatForm.nome} onChange={(e) => setBoatForm({ ...boatForm, nome: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.type")}</Label>
                                <Select
                                  value={boatForm.tipo}
                                  onValueChange={(v) => {
                                    const moto = isMotoAquaticaVessel(v);
                                    setBoatForm((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            tipo: v,
                                            ...(moto
                                              ? {
                                                  jetSkiOffered: false,
                                                  jetSkiPriceCents: 0,
                                                  jetSkiImageUrls: [],
                                                  jetSkiDocumentUrl: "",
                                                  routeIslandImages: {},
                                                }
                                              : {}),
                                          }
                                        : null
                                    );
                                    if (moto) {
                                      setAmenityIncEdit((prev) => {
                                        const o = { ...prev };
                                        Object.keys(o).forEach((k) => {
                                          o[k] = false;
                                        });
                                        return o;
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("marinheiro.selectVesselType")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {editVesselTypeOptions.map((tipo) => (
                                      <SelectItem key={tipo} value={tipo}>
                                        {BOAT_VESSEL_TYPES.includes(tipo as BoatVesselTypeId)
                                          ? vesselTypeLabel(t, tipo)
                                          : tipo}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.location")}</Label>
                                <Input
                                  list="marinheiro-cidades-rj"
                                  value={boatForm.distancia}
                                  onChange={(e) => setBoatForm({ ...boatForm, distancia: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.priceReaisShort")}</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{t("common.currency")}</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pl-10"
                                    value={Math.max(1, Math.round((boatForm.precoCents || 0) / 100))}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        precoCents: Math.max(1, Number(e.target.value || 1)) * 100,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.sizeFeetShort")}</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pr-12"
                                    value={Math.max(1, boatForm.tamanhoPes)}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        tamanhoPes: Math.max(1, Number(e.target.value || 1)),
                                      })
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("common.feet")}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.capacityLabel")}</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="pr-16"
                                    value={Math.max(1, boatForm.capacidade)}
                                    onChange={(e) =>
                                      setBoatForm({
                                        ...boatForm,
                                        capacidade: Math.max(1, Number(e.target.value || 1)),
                                      })
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("common.people")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>{t("detalhes.description")}</Label>
                              <Textarea rows={3} value={boatForm.descricao} onChange={(e) => setBoatForm({ ...boatForm, descricao: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("marinheiro.routes")}</Label>
                              {editRouteIslandRows.map((row, i) => (
                                <div key={`edit-route-${i}`} className="flex gap-2 items-center">
                                  <Input
                                    className="flex-1"
                                    placeholder={t("marinheiro.routesPh")}
                                    value={row}
                                    onChange={(e) => {
                                      const next = [...editRouteIslandRows];
                                      next[i] = e.target.value;
                                      setEditRouteIslandRows(next);
                                      setBoatForm({ ...boatForm, routeIslands: formRowsToStoredRouteIslands(next) });
                                    }}
                                  />
                                  {editRouteIslandRows.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 text-muted-foreground"
                                      onClick={() => {
                                        const next = editRouteIslandRows.filter((_, j) => j !== i);
                                        setEditRouteIslandRows(next);
                                        setBoatForm({ ...boatForm, routeIslands: formRowsToStoredRouteIslands(next) });
                                      }}
                                      aria-label={t("marinheiro.routeIslandRemove")}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditRouteIslandRows((prev) => [...prev, ""])}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                {t("marinheiro.routeIslandAdd")}
                              </Button>
                              <p className="text-xs text-muted-foreground">{t("marinheiro.editRatingHint")}</p>
                            </div>
                            <div className="space-y-1">
                              <Label>{t("marinheiro.embarkLocationsLabel")}</Label>
                              <Input
                                value={editEmbarkLocsText}
                                onChange={(e) => setEditEmbarkLocsText(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">{t("marinheiro.embarkLocationsHint")}</p>
                            </div>
                            <div className="space-y-1">
                              <Label>{t("marinheiro.embarkTimesLabel")}</Label>
                              <Input
                                value={editEmbarkTimesText}
                                onChange={(e) => setEditEmbarkTimesText(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">{t("marinheiro.embarkTimesHint")}</p>
                            </div>
                            {!isMotoAquaticaVessel(boatForm.tipo) ? (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold">{t("marinheiro.amenitiesHeading")}</Label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {catalogAmenities.map((a) => (
                                      <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                          checked={Boolean(amenityIncEdit[a.id])}
                                          onCheckedChange={(c) =>
                                            setAmenityIncEdit((prev) => ({ ...prev, [a.id]: c === true }))
                                          }
                                        />
                                        <span>{a.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-3 rounded-lg border border-border p-3">
                                  <div className="flex items-center gap-2">
                                    <Waves className="w-5 h-5 text-primary shrink-0" />
                                    <div className="flex flex-1 items-center justify-between gap-2">
                                      <span className="text-sm font-semibold text-foreground">
                                        {t("marinheiro.jetSkiHeading")}
                                      </span>
                                      <Switch
                                        checked={Boolean(boatForm.jetSkiOffered)}
                                        onCheckedChange={(v) =>
                                          setBoatForm({
                                            ...boatForm,
                                            jetSkiOffered: v,
                                            ...(!v
                                              ? { jetSkiPriceCents: 0, jetSkiImageUrls: [], jetSkiDocumentUrl: "" }
                                              : {}),
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{t("marinheiro.jetSkiHint")}</p>
                                  {boatForm.jetSkiOffered ? (
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <Label>{t("marinheiro.jetSkiPrice")}</Label>
                                        <div className="relative max-w-xs">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            {t("common.currency")}
                                          </span>
                                          <Input
                                            type="number"
                                            min={1}
                                            step={1}
                                            className="pl-10"
                                            value={Math.max(1, Math.round((boatForm.jetSkiPriceCents || 0) / 100))}
                                            onChange={(e) =>
                                              setBoatForm({
                                                ...boatForm,
                                                jetSkiPriceCents: Math.max(100, Number(e.target.value || 1)) * 100,
                                              })
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
                                            const files = Array.from(e.target.files || []);
                                            const urls = await Promise.all(files.map(fileToDataUrl));
                                            setBoatForm({
                                              ...boatForm,
                                              jetSkiImageUrls: [...(boatForm.jetSkiImageUrls || []), ...urls],
                                            });
                                          }}
                                        />
                                        {(boatForm.jetSkiImageUrls?.length ?? 0) > 0 ? (
                                          <p className="text-xs text-muted-foreground">
                                            {t("marinheiro.jetSkiPhotosCount", {
                                              n: boatForm.jetSkiImageUrls?.length ?? 0,
                                            })}
                                          </p>
                                        ) : (
                                          <p className="text-xs text-destructive">{t("marinheiro.jetSkiPhotosRequired")}</p>
                                        )}
                                      </div>
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
                                            boatForm.jetSkiDocumentUrl?.startsWith("data:")
                                              ? ""
                                              : boatForm.jetSkiDocumentUrl || ""
                                          }
                                          onChange={(e) =>
                                            setBoatForm({ ...boatForm, jetSkiDocumentUrl: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            ) : null}
                            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                              <Label className="text-sm font-semibold text-foreground">{t("calendar.title")}</Label>
                              <BoatCalendarPanel variant="owner" boatId={boat.id} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-semibold text-foreground">{t("marinheiro.docs")}</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                  placeholder={t("marinheiro.tie")}
                                  value={boatForm.tieDocumentUrl || ""}
                                  onChange={(e) => setBoatForm({ ...boatForm, tieDocumentUrl: e.target.value })}
                                />
                                <Input
                                  placeholder={t("marinheiro.tiem")}
                                  value={boatForm.tiemDocumentUrl || ""}
                                  onChange={(e) => setBoatForm({ ...boatForm, tiemDocumentUrl: e.target.value })}
                                />
                              </div>
                            </div>
                            <Input placeholder={t("marinheiro.video")} value={boatForm.videoUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, videoUrl: e.target.value })} />
                            <div className="space-y-1">
                              <Label>{t("marinheiro.photosEdit")}</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  const urls = await Promise.all(files.map(fileToDataUrl));
                                  setBoatForm({ ...boatForm, imagens: [...(boatForm.imagens || []), ...urls] });
                                }}
                              />
                              <p className="text-xs text-muted-foreground">{t("marinheiro.photoCountEdit", { n: (boatForm.imagens || []).length })}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={salvarEdicao} disabled={loading}>
                                {t("marinheiro.saveEdit")}
                              </Button>
                              <Button
                                className="flex-1"
                                variant="secondary"
                                onClick={() => {
                                  setEditingBoatId(null);
                                  setBoatForm(null);
                                  setEditRouteIslandRows([""]);
                                  setEditEmbarkLocsText("");
                                  setEditEmbarkTimesText("");
                                }}
                                disabled={loading}
                              >
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {boats.length > 0 ? (
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h2 className="text-lg font-semibold text-foreground">{t("calendar.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("calendar.panelHint")}</p>
                <Select value={calendarBoatId ?? ""} onValueChange={(v) => setCalendarBoatId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("calendar.pickBoat")} />
                  </SelectTrigger>
                  <SelectContent>
                    {boats.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {calendarBoatId ? <BoatCalendarPanel variant="readonly" boatId={calendarBoatId} /> : null}
              </section>
            ) : null}

            <AlertDialog open={boatPendingDelete !== null} onOpenChange={(open) => !open && setBoatPendingDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("marinheiro.deleteBoatTitle")}</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p className="text-foreground">
                        {t("marinheiro.deleteBoatLead", { name: boatPendingDelete?.nome ?? "—" })}
                      </p>
                      <p>{t("marinheiro.deleteBoatDocsNote")}</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
                  <Button variant="destructive" disabled={loading} onClick={() => void confirmarExclusaoEmbarcacao()}>
                    {t("marinheiro.deleteBoatConfirm")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
};

export default Marinheiro_Page;
