import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import type { MarinheiroFormState, MarinheiroRecord } from "@/lib/marinheiroTypes";
import type { TFunction } from "i18next";

export async function fetchOwnerMarinheiros(): Promise<MarinheiroRecord[]> {
  const resp = await authFetch("/api/owner/marinheiros");
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, "Erro ao carregar tripulação."));
  const data = (await resp.json()) as { marinheiros: MarinheiroRecord[] };
  return data.marinheiros ?? [];
}

export async function fetchOwnerMarinheiro(id: string): Promise<MarinheiroRecord> {
  const resp = await authFetch(`/api/owner/marinheiros/${encodeURIComponent(id)}`);
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, "Erro ao carregar marinheiro."));
  const data = (await resp.json()) as { marinheiro: MarinheiroRecord };
  return data.marinheiro;
}

function formToCreatePayload(form: MarinheiroFormState) {
  return {
    nome: form.nome.trim(),
    email: form.email.trim(),
    password: form.password,
    cpf: form.cpf.replace(/\D/g, ""),
    birthDate: form.birthDate,
    phone: form.phone.trim(),
    photoUrl: form.photoUrl,
    funcao: form.funcao,
    funcaoCustom: form.funcao === "OUTRA" ? form.funcaoCustom.trim() : null,
    identityDocUrl: form.identityDocUrl,
    identityDocExpiresAt: form.identityDocExpiresAt || null,
    nauticalCertUrl: form.nauticalCertUrl,
    nauticalCertExpiresAt: form.nauticalCertExpiresAt || null,
    bio: form.bio.trim() || null,
    showOnBoatDetail: form.showOnBoatDetail,
    boatIds: form.boatIds,
  };
}

function formToUpdatePayload(form: Partial<MarinheiroFormState>) {
  const payload: Record<string, unknown> = {};
  if (form.nome !== undefined) payload.nome = form.nome.trim();
  if (form.phone !== undefined) payload.phone = form.phone.trim();
  if (form.photoUrl !== undefined) payload.photoUrl = form.photoUrl;
  if (form.funcao !== undefined) payload.funcao = form.funcao;
  if (form.funcaoCustom !== undefined) {
    payload.funcaoCustom = form.funcao === "OUTRA" ? form.funcaoCustom.trim() : null;
  }
  if (form.identityDocUrl !== undefined) payload.identityDocUrl = form.identityDocUrl;
  if (form.identityDocExpiresAt !== undefined) payload.identityDocExpiresAt = form.identityDocExpiresAt || null;
  if (form.nauticalCertUrl !== undefined) payload.nauticalCertUrl = form.nauticalCertUrl;
  if (form.nauticalCertExpiresAt !== undefined) payload.nauticalCertExpiresAt = form.nauticalCertExpiresAt || null;
  if (form.bio !== undefined) payload.bio = form.bio.trim() || null;
  if (form.showOnBoatDetail !== undefined) payload.showOnBoatDetail = form.showOnBoatDetail;
  if (form.boatIds !== undefined) payload.boatIds = form.boatIds;
  return payload;
}

export async function createOwnerMarinheiro(form: MarinheiroFormState, t: TFunction) {
  const resp = await authFetch("/api/owner/marinheiros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formToCreatePayload(form)),
  });
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.saveFail")));
  const data = (await resp.json()) as { marinheiro: MarinheiroRecord };
  return data.marinheiro;
}

export async function updateOwnerMarinheiro(id: string, form: Partial<MarinheiroFormState>, t: TFunction) {
  const resp = await authFetch(`/api/owner/marinheiros/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formToUpdatePayload(form)),
  });
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.saveFail")));
  const data = (await resp.json()) as { marinheiro: MarinheiroRecord };
  return data.marinheiro;
}

export async function assignBookingMarinheiros(bookingId: string, marinheiroIds: string[], t: TFunction) {
  const resp = await authFetch(`/api/owner/bookings/${encodeURIComponent(bookingId)}/marinheiros`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marinheiroIds }),
  });
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.assignFail")));
  const data = (await resp.json()) as { marinheiros: MarinheiroRecord[] };
  return data.marinheiros;
}

export async function fetchBookingMarinheiros(bookingId: string): Promise<MarinheiroRecord[]> {
  const resp = await authFetch(`/api/owner/bookings/${encodeURIComponent(bookingId)}/marinheiros`);
  if (!resp.ok) return [];
  const data = (await resp.json()) as { marinheiros: MarinheiroRecord[] };
  return data.marinheiros ?? [];
}

export async function assignBoatMarinheiros(boatId: string, marinheiroIds: string[], t: TFunction) {
  const resp = await authFetch(`/api/owner/boats/${encodeURIComponent(boatId)}/marinheiros`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marinheiroIds }),
  });
  if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("crew.boatLinkFail")));
  const data = (await resp.json()) as { marinheiros: MarinheiroRecord[] };
  return data.marinheiros;
}
