import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Macro = { code: string; title: string; body: string };

type Boat = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  locationText: string;
  priceCents: number;
  description: string;
  reviewStatus: string;
  reviewNotes: string | null;
  tieDocumentUrl: string | null;
  tiemDocumentUrl: string | null;
  videoUrl: string | null;
  ownerRgUrl: string | null;
  ownerNauticalLicenseUrl: string | null;
  owner: { name: string; email: string };
  ownerBoatCount: number;
  images: string[];
  history: { action: string; reason: string | null; createdAt: string; staffName: string | null }[];
};

export default function BoatReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [boat, setBoat] = useState<Boat | null>(null);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macroCode, setMacroCode] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!id) return;
    const [boatData, macroData] = await Promise.all([
      adminJson<{ boat: Boat }>(`/api/admin/boats/${id}/review`),
      adminJson<{ macros: Macro[] }>("/api/admin/macros?category=boat_rejection"),
    ]);
    setBoat(boatData.boat);
    setMacros(macroData.macros);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [id]);

  async function approve() {
    if (!id) return;
    setLoading(true);
    try {
      await adminJson(`/api/admin/boats/${id}/approve`, { method: "POST", body: "{}" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!id) return;
    setLoading(true);
    try {
      await adminJson(`/api/admin/boats/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ macroCode: macroCode || undefined, reason: customReason }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function underReview() {
    if (!id) return;
    await adminJson(`/api/admin/boats/${id}/under-review`, { method: "POST", body: "{}" });
    await load();
  }

  if (!boat) return <p>{error || "A carregar…"}</p>;

  const price = (boat.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div>
      <p>
        <Link to="/boats">← Fila de aprovação</Link>
      </p>
      <h1 className="page-title">{boat.name}</h1>
      <span className="badge badge-open">{boat.reviewStatus}</span>

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h3>Dados da embarcação</h3>
          <p>
            <strong>Tipo:</strong> {boat.type}
          </p>
          <p>
            <strong>Capacidade:</strong> {boat.capacity}
          </p>
          <p>
            <strong>Local:</strong> {boat.locationText}
          </p>
          <p>
            <strong>Valor:</strong> {price}
          </p>
          <p>
            <strong>Descrição:</strong> {boat.description}
          </p>
          {boat.reviewNotes && (
            <p>
              <strong>Notas:</strong> {boat.reviewNotes}
            </p>
          )}
        </div>
        <div className="card">
          <h3>Proprietário</h3>
          <p>
            {boat.owner.name} · {boat.owner.email}
          </p>
          <p>
            <strong>Embarcações:</strong> {boat.ownerBoatCount}
          </p>
          <p>
            <a href={boat.tieDocumentUrl || "#"} target="_blank" rel="noreferrer">
              TIE
            </a>{" "}
            ·{" "}
            <a href={boat.tiemDocumentUrl || "#"} target="_blank" rel="noreferrer">
              TIEM
            </a>
            {boat.videoUrl && (
              <>
                {" "}
                ·{" "}
                <a href={boat.videoUrl} target="_blank" rel="noreferrer">
                  Vídeo
                </a>
              </>
            )}
          </p>
          {boat.ownerRgUrl && (
            <p>
              <a href={boat.ownerRgUrl} target="_blank" rel="noreferrer">
                RG proprietário
              </a>
            </p>
          )}
        </div>
      </div>

      {boat.images?.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Fotos</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {boat.images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Acções</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button type="button" className="btn btn-sm" onClick={underReview} disabled={loading}>
            Marcar em análise
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={approve} disabled={loading}>
            Aprovar
          </button>
        </div>
        <div className="field">
          <label>Macro de recusa</label>
          <select value={macroCode} onChange={(e) => setMacroCode(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {macros.map((m) => (
              <option key={m.code} value={m.code}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Motivo personalizado (opcional se macro seleccionada)</label>
          <textarea rows={3} value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
        </div>
        <button type="button" className="btn btn-danger btn-sm" onClick={reject} disabled={loading}>
          Recusar
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {boat.history.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Histórico</h3>
          <ul>
            {boat.history.map((h, i) => (
              <li key={i}>
                <strong>{h.action}</strong> — {h.staffName} · {new Date(h.createdAt).toLocaleString("pt-BR")}
                {h.reason && <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{h.reason}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
