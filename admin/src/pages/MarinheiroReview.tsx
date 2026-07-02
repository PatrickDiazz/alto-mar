import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Marinheiro = {
  id: string;
  nome: string;
  funcaoLabel: string;
  approvalStatus: string;
  locadores: { name: string; email: string }[];
  createdAt: string;
  photoUrl: string;
};

export default function MarinheiroReview() {
  const [items, setItems] = useState<Marinheiro[]>([]);
  const [status, setStatus] = useState("PENDENTE");
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ marinheiros: Marinheiro[] }>(`/api/admin/marinheiros/review-queue?status=${status}`)
      .then((d) => setItems(d.marinheiros))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [status]);

  return (
    <div>
      <h1 className="page-title">Aprovação de tripulação</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginBottom: "1rem" }}>
        <option value="PENDENTE">Pendentes</option>
        <option value="APROVADO">Aprovados</option>
        <option value="REPROVADO">Reprovados</option>
        <option value="SUSPENSO">Suspensos</option>
      </select>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Função</th>
              <th>Locador</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/marinheiros/${m.id}`}>{m.nome}</Link>
                </td>
                <td>{m.funcaoLabel}</td>
                <td>
                  {m.locadores?.[0]?.name ?? "—"}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{m.locadores?.[0]?.email ?? ""}</small>
                </td>
                <td>
                  <span className="badge badge-open">{m.approvalStatus}</span>
                </td>
                <td>{new Date(m.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {items.length === 0 && (
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
