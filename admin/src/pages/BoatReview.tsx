import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Boat = {
  id: string;
  name: string;
  type: string;
  reviewStatus: string;
  owner: { name: string; email: string };
  createdAt: string;
  images: string[];
};

export default function BoatReview() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ boats: Boat[] }>(`/api/admin/boats/review-queue?status=${status}`)
      .then((d) => setBoats(d.boats))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [status]);

  return (
    <div>
      <h1 className="page-title">Aprovação de embarcações</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginBottom: "1rem" }}>
        <option value="PENDING_REVIEW">Pendentes</option>
        <option value="UNDER_REVIEW">Em análise</option>
        <option value="APPROVED">Aprovadas</option>
        <option value="REJECTED">Recusadas</option>
        <option value="SUSPENDED">Suspensas</option>
      </select>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Embarcação</th>
              <th>Tipo</th>
              <th>Locador</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {boats.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/boats/${b.id}`}>{b.name}</Link>
                </td>
                <td>{b.type}</td>
                <td>
                  {b.owner.name}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{b.owner.email}</small>
                </td>
                <td>
                  <span className="badge badge-open">{b.reviewStatus}</span>
                </td>
                <td>{new Date(b.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {boats.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  Fila vazia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
