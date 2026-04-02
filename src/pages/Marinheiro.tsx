import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Anchor, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { authFetch, clearSession, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

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
  imagens: string[];
};

type OwnerBookingRow = {
  id: string;
  status: string;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  embarkLocation: string;
  totalCents: number;
  boat: { id: string; nome: string };
  renter: { id: string; nome: string; email: string };
};

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
  imagens: [],
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [newRouteIslandsText, setNewRouteIslandsText] = useState("");
  const [editRouteIslandsText, setEditRouteIslandsText] = useState("");

  const isLocatario = user?.role === "locatario";
  const pendentes = useMemo(() => bookings.filter((b) => b.status === "PENDING"), [bookings]);
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
      const resp = await authFetch("/api/owner/bookings?status=PENDING");
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookings")));
      }
      const data = (await resp.json()) as { bookings: OwnerBookingRow[] };
      setBookings(data.bookings);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBookings")).trim();
      toast.error(m || t("marinheiro.toastBookings"), { id: "owner-bookings" });
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
    setBoatForm({ ...boat });
    setEditRouteIslandsText((boat.routeIslands || []).join(", "));
  };

  const salvarEdicao = async () => {
    if (!editingBoatId || !boatForm) return;
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
          tipo: boatForm.tipo,
          descricao: boatForm.descricao,
          routeIslands: boatForm.routeIslands || [],
          verificado: Boolean(boatForm.verificado),
          tieDocumentUrl: boatForm.tieDocumentUrl || null,
          tiemDocumentUrl: boatForm.tiemDocumentUrl || null,
          videoUrl: boatForm.videoUrl || null,
          imagens: boatForm.imagens || [],
        }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastUpdateFail")));
      }
      toast.success(t("marinheiro.toastUpdate"));
      setEditingBoatId(null);
      setBoatForm(null);
      setEditRouteIslandsText("");
      await carregarMeusBarcos();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastUpdateFail")).trim();
      toast.error(m || t("marinheiro.toastUpdateFail"));
    } finally {
      setLoading(false);
    }
  };

  const registrarEmbarcacao = async () => {
    setLoading(true);
    try {
      const payload = {
        ...newBoatForm,
        tieDocumentUrl: newBoatForm.tieDocumentUrl?.trim() ? newBoatForm.tieDocumentUrl.trim() : null,
        tiemDocumentUrl: newBoatForm.tiemDocumentUrl?.trim() ? newBoatForm.tiemDocumentUrl.trim() : null,
        videoUrl: newBoatForm.videoUrl?.trim() ? newBoatForm.videoUrl.trim() : null,
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
      toast.success(t("marinheiro.toastRegister"));
      setRegistering(false);
      setNewBoatForm(emptyBoatForm);
      setNewRouteIslandsText("");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/")} className="text-foreground hover:text-primary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
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
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("marinheiro.myBoats")}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{boats.length}</Badge>
                  <Button size="sm" onClick={() => setRegistering((p) => !p)}>
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
                          {(newBoatForm.tipo || t("marinheiro.previewType"))} • {(newBoatForm.distancia || t("marinheiro.previewLoc"))}
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
                        <Input placeholder={t("marinheiro.typePh")} value={newBoatForm.tipo} onChange={(e) => setNewBoatForm({ ...newBoatForm, tipo: e.target.value })} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>{t("marinheiro.location")}</Label>
                        <Input placeholder={t("marinheiro.locationPh")} value={newBoatForm.distancia} onChange={(e) => setNewBoatForm({ ...newBoatForm, distancia: e.target.value })} />
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
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">{t("marinheiro.routes")}</Label>
                    <Input
                      placeholder={t("marinheiro.routesPh")}
                      value={newRouteIslandsText}
                      onChange={(e) => {
                        const text = e.target.value;
                        setNewRouteIslandsText(text);
                        setNewBoatForm({
                          ...newBoatForm,
                          routeIslands: text
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{t("marinheiro.routesHint")}</p>
                  </div>
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
                      <Input placeholder={t("marinheiro.tie")} value={newBoatForm.tieDocumentUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, tieDocumentUrl: e.target.value })} />
                      <Input placeholder={t("marinheiro.tiem")} value={newBoatForm.tiemDocumentUrl || ""} onChange={(e) => setNewBoatForm({ ...newBoatForm, tiemDocumentUrl: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={registrarEmbarcacao} disabled={loading}>{t("marinheiro.saveBoat")}</Button>
                    <Button variant="secondary" onClick={() => { setRegistering(false); setNewBoatForm(emptyBoatForm); setNewRouteIslandsText(""); }}>
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
                                  {boat.tipo} • {boat.tamanho} • {boat.capacidade} {t("common.people")}
                                </p>
                                <p className="text-xs text-muted-foreground">{boat.distancia}</p>
                                <p className="text-xs text-muted-foreground">
                                  {boat.preco} • {t("marinheiro.ratingLabel")} {boat.nota}
                                </p>
                              </div>
                              <Button variant="secondary" size="sm" onClick={() => iniciarEdicao(boat)}>
                                <Pencil className="w-4 h-4 mr-1" />
                                {t("marinheiro.edit")}
                              </Button>
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
                                <Input value={boatForm.tipo} onChange={(e) => setBoatForm({ ...boatForm, tipo: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>{t("marinheiro.location")}</Label>
                                <Input value={boatForm.distancia} onChange={(e) => setBoatForm({ ...boatForm, distancia: e.target.value })} />
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
                            <div className="space-y-1">
                              <Label>{t("marinheiro.routes")}</Label>
                              <Input
                                placeholder={t("marinheiro.routesPh")}
                                value={editRouteIslandsText}
                                onChange={(e) =>
                                  {
                                    const text = e.target.value;
                                    setEditRouteIslandsText(text);
                                    setBoatForm({
                                      ...boatForm,
                                      routeIslands: text
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    });
                                  }
                                }
                              />
                              <p className="text-xs text-muted-foreground">{t("marinheiro.editRatingHint")}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input placeholder={t("marinheiro.tie")} value={boatForm.tieDocumentUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, tieDocumentUrl: e.target.value })} />
                              <Input placeholder={t("marinheiro.tiem")} value={boatForm.tiemDocumentUrl || ""} onChange={(e) => setBoatForm({ ...boatForm, tiemDocumentUrl: e.target.value })} />
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
                              <Button className="flex-1" variant="secondary" onClick={() => { setEditingBoatId(null); setBoatForm(null); setEditRouteIslandsText(""); }} disabled={loading}>
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

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("marinheiro.pendingTitle")}</h2>
                <Badge variant="outline">{pendentes.length}</Badge>
              </div>

              {pendentes.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">{t("marinheiro.noPending")}</p>
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
                            {t("marinheiro.embark")} {b.embarkLocation} • {t("marinheiro.total")}{" "}
                            {currencyFmt.format(b.totalCents / 100)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("marinheiro.passengers")} {b.passengersAdults} {t("marinheiro.adults")}
                            {b.hasKids ? ` + ${b.passengersChildren} ${t("marinheiro.kids")}` : ""}
                            {b.bbqKit ? ` • ${t("marinheiro.bbq")}` : ""}
                          </p>
                        </div>
                        <Badge className="bg-accent text-accent-foreground">{t("marinheiro.pendingBadge")}</Badge>
                      </div>

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
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Marinheiro_Page;
