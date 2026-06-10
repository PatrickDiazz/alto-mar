import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Ticket = {
  id: string;
  type: string;
  status: string;
  priority: string;
  subject: string;
  createdByName: string | null;
  createdAt: string;
  tags: { name: string; color: string }[];
};

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    adminJson<{ tickets: Ticket[] }>(`/api/admin/tickets${q}`)
      .then((d) => setTickets(d.tickets))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [status]);

  return (
    <div>
      <h1 className="page-title">Tickets</h1>
      <div style={{ marginBottom: "1rem" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
          <option value="ESCALATED">ESCALATED</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Assunto</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Cliente</th>
              <th>Tags</th>
              <th>Criado</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/tickets/${t.id}`}>{t.subject}</Link>
                </td>
                <td>{t.type}</td>
                <td>
                  <span className="badge badge-open">{t.status}</span>
                </td>
                <td>
                  <span className={`badge ${t.priority === "URGENT" ? "badge-urgent" : t.priority === "HIGH" ? "badge-high" : ""}`}>
                    {t.priority}
                  </span>
                </td>
                <td>{t.createdByName}</td>
                <td>
                  {t.tags?.map((tag) => (
                    <span key={tag.name} className="badge" style={{ marginRight: 4, background: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </td>
                <td>{new Date(t.createdAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--muted)" }}>
                  Nenhum ticket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
