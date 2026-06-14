import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
};

type Conversation = {
  bookingId: string;
  status: string;
  bookingDate: string;
  boatName: string;
  renter: { id: string; name: string; email: string };
  owner: { id: string; name: string; email: string };
  messages: Message[];
  reports: { id: string; reason: string; status: string; reporter: { name: string } }[];
};

export default function ChatConversation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    adminJson<{ conversation: Conversation }>(`/api/admin/chat/conversations/${bookingId}`)
      .then((d) => setConversation(d.conversation))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [bookingId]);

  if (!conversation) return <p>{error || "A carregar conversa…"}</p>;

  const renterId = conversation.renter.id;

  return (
    <div>
      <p>
        <Link to="/chats">← Todas as conversas</Link>
      </p>
      <h1 className="page-title">{conversation.boatName}</h1>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <span className={`badge ${conversation.status === "ACCEPTED" ? "badge-ok" : "badge-open"}`}>
          {conversation.status}
        </span>
        <span className="badge">{conversation.bookingDate}</span>
        <span className="badge">{conversation.messages.length} mensagens</span>
      </div>

      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3>Banhista</h3>
          <p>
            {conversation.renter.name}
            <br />
            <small>{conversation.renter.email}</small>
          </p>
        </div>
        <div className="card">
          <h3>Locador</h3>
          <p>
            {conversation.owner.name}
            <br />
            <small>{conversation.owner.email}</small>
          </p>
        </div>
      </div>

      {conversation.reports.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3>Denúncias nesta conversa</h3>
          <ul>
            {conversation.reports.map((r) => (
              <li key={r.id}>
                <span className="badge badge-open">{r.status}</span> {r.reason} — {r.reporter.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Mensagens</h3>
        {conversation.messages.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Ainda não há mensagens nesta reserva.</p>
        ) : (
          <div className="messages" style={{ maxHeight: "none" }}>
            {conversation.messages.map((m) => {
              const isRenter = m.sender.id === renterId;
              return (
                <div key={m.id} className={`message ${isRenter ? "" : "staff"}`}>
                  <div className="message-meta">
                    {m.sender.name} ({isRenter ? "banhista" : "locador"}) ·{" "}
                    {new Date(m.createdAt).toLocaleString("pt-BR")}
                  </div>
                  {m.body}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
