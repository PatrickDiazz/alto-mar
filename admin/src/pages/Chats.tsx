import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Conversation = {
  bookingId: string;
  status: string;
  bookingDate: string;
  boatName: string;
  renter: { name: string; email: string };
  owner: { name: string; email: string };
  lastMessageAt: string | null;
  messageCount: number;
  lastMessagePreview: string | null;
  lastSenderName: string | null;
  openReportsCount: number;
};

export default function Chats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    adminJson<{ conversations: Conversation[] }>(`/api/admin/chat/conversations${qs ? `?${qs}` : ""}`)
      .then((d) => setConversations(d.conversations))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [status, q]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }

  return (
    <div>
      <h1 className="page-title">Chats</h1>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <NavLink to="/chats" end className={({ isActive }) => (isActive ? "btn btn-primary btn-sm" : "btn btn-sm")}>
          Conversas
        </NavLink>
        <NavLink to="/chats/reports" className={({ isActive }) => (isActive ? "btn btn-primary btn-sm" : "btn btn-sm")}>
          Denúncias
        </NavLink>
      </div>

      <form onSubmit={runSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Barco, banhista ou locador…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ACCEPTED">ACCEPTED (activo)</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="PENDING">PENDING</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
        {q && (
          <button type="button" className="btn btn-sm" onClick={() => { setQ(""); setSearchInput(""); }}>
            Limpar
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Embarcação / Reserva</th>
              <th>Banhista</th>
              <th>Locador</th>
              <th>Status</th>
              <th>Mensagens</th>
              <th>Última actividade</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.bookingId}>
                <td>
                  <Link to={`/chats/${c.bookingId}`}>
                    <strong>{c.boatName}</strong>
                  </Link>
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {c.bookingDate} · {c.bookingId.slice(0, 8)}…
                  </small>
                  {c.openReportsCount > 0 && (
                    <>
                      <br />
                      <span className="badge badge-urgent">{c.openReportsCount} denúncia(s)</span>
                    </>
                  )}
                </td>
                <td>
                  {c.renter.name}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{c.renter.email}</small>
                </td>
                <td>
                  {c.owner.name}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{c.owner.email}</small>
                </td>
                <td>
                  <span className={`badge ${c.status === "ACCEPTED" ? "badge-ok" : "badge-open"}`}>{c.status}</span>
                </td>
                <td>
                  {c.messageCount}
                  {c.lastMessagePreview && (
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4, maxWidth: 220 }}>
                      <strong>{c.lastSenderName}:</strong> {c.lastMessagePreview.slice(0, 80)}
                      {c.lastMessagePreview.length > 80 ? "…" : ""}
                    </div>
                  )}
                </td>
                <td>
                  {c.lastMessageAt
                    ? new Date(c.lastMessageAt).toLocaleString("pt-BR")
                    : <span style={{ color: "var(--muted)" }}>Sem mensagens</span>}
                </td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  Nenhuma conversa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
