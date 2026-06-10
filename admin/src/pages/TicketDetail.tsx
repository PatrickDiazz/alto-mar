import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { type: string; name?: string; role?: string };
};

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  type: string;
  createdByName: string | null;
  createdByEmail: string | null;
  tags: { id: string; name: string }[];
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    const data = await adminJson<{ ticket: Ticket; messages: Message[] }>(`/api/admin/tickets/${id}`);
    setTicket(data.ticket);
    setMessages(data.messages);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [id]);

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    try {
      await adminJson(`/api/admin/tickets/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  async function updateStatus(status: string) {
    if (!id) return;
    await adminJson(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  if (!ticket) return <p>{error || "A carregar…"}</p>;

  return (
    <div>
      <p>
        <Link to="/tickets">← Tickets</Link>
      </p>
      <h1 className="page-title">{ticket.subject}</h1>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <span className="badge badge-open">{ticket.status}</span>
        <span className="badge">{ticket.priority}</span>
        <span className="badge">{ticket.type}</span>
      </div>
      <p style={{ color: "var(--muted)" }}>
        {ticket.createdByName} · {ticket.createdByEmail}
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-sm" onClick={() => updateStatus("IN_PROGRESS")}>
          Em progresso
        </button>{" "}
        <button type="button" className="btn btn-sm" onClick={() => updateStatus("RESOLVED")}>
          Resolver
        </button>{" "}
        <button type="button" className="btn btn-sm" onClick={() => updateStatus("CLOSED")}>
          Fechar
        </button>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.author.type === "staff" ? "staff" : ""}`}>
            <div className="message-meta">
              {m.author.name}
              {m.author.role ? ` (${m.author.role})` : ""} · {new Date(m.createdAt).toLocaleString("pt-BR")}
            </div>
            {m.body}
          </div>
        ))}
      </div>

      <form onSubmit={sendReply} className="card">
        <div className="field">
          <label>Resposta</label>
          <textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Enviar resposta
        </button>
      </form>
    </div>
  );
}
