import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Marinheiro = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  phone: string;
  funcaoLabel: string;
  approvalStatus: string;
  reviewNotes: string | null;
  suspensionReason: string | null;
  documentsExpired: boolean;
  photoUrl: string;
  identityDocUrl: string;
  nauticalCertUrl: string;
  bio: string | null;
  locadores: { name: string; email: string }[];
};

type Detail = {
  marinheiro: Marinheiro;
  history: { action: string; reason: string | null; createdAt: string; staffName: string | null }[];
};

export default function MarinheiroReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!id) return;
    const data = await adminJson<Detail>(`/api/admin/marinheiros/${id}/review`);
    setDetail(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [id]);

  async function approve() {
    if (!id) return;
    setLoading(true);
    try {
      await adminJson(`/api/admin/marinheiros/${id}/approve`, { method: "POST", body: "{}" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!id || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await adminJson(`/api/admin/marinheiros/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function suspend() {
    if (!id || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await adminJson(`/api/admin/marinheiros/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  if (!detail) return <p>{error || "A carregar…"}</p>;
  const m = detail.marinheiro;

  return (
    <div>
      <p>
        <Link to="/marinheiros">← Fila de tripulação</Link>
      </p>
      <h1 className="page-title">{m.nome}</h1>
      <span className="badge badge-open">{m.approvalStatus}</span>
      {m.documentsExpired ? <p className="error">Documentos vencidos</p> : null}
      {error && <p className="error">{error}</p>}

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h3>Dados</h3>
          <p>
            <strong>Email:</strong> {m.email}
          </p>
          <p>
            <strong>CPF:</strong> {m.cpf}
          </p>
          <p>
            <strong>Telefone:</strong> {m.phone}
          </p>
          <p>
            <strong>Função:</strong> {m.funcaoLabel}
          </p>
          {m.bio ? (
            <p>
              <strong>Experiência:</strong> {m.bio}
            </p>
          ) : null}
          {m.reviewNotes ? (
            <p>
              <strong>Notas:</strong> {m.reviewNotes}
            </p>
          ) : null}
          {m.suspensionReason ? (
            <p>
              <strong>Suspensão:</strong> {m.suspensionReason}
            </p>
          ) : null}
          <p>
            <strong>Locador:</strong> {m.locadores?.[0]?.name} ({m.locadores?.[0]?.email})
          </p>
        </div>
        <div className="card">
          <h3>Documentos</h3>
          {m.photoUrl ? (
            <p>
              <a href={m.photoUrl} target="_blank" rel="noreferrer">
                Foto
              </a>
            </p>
          ) : null}
          {m.identityDocUrl ? (
            <p>
              <a href={m.identityDocUrl} target="_blank" rel="noreferrer">
                Identidade
              </a>
            </p>
          ) : null}
          {m.nauticalCertUrl ? (
            <p>
              <a href={m.nauticalCertUrl} target="_blank" rel="noreferrer">
                Habilitação náutica
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Ações</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (obrigatório para reprovar/suspender)"
          rows={3}
          style={{ width: "100%", marginBottom: "0.75rem" }}
        />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void approve()}>
            Aprovar
          </button>
          <button type="button" className="btn btn-danger" disabled={loading} onClick={() => void reject()}>
            Reprovar
          </button>
          <button type="button" className="btn btn-sm" disabled={loading} onClick={() => void suspend()}>
            Suspender
          </button>
        </div>
      </div>

      {detail.history.length ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Histórico</h3>
          <ul>
            {detail.history.map((h) => (
              <li key={h.createdAt + h.action}>
                {h.action} — {h.reason ?? "—"} ({h.staffName ?? "sistema"}) —{" "}
                {new Date(h.createdAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
