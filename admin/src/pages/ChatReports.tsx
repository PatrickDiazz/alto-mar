import { useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type Report = {
  id: string;
  reason: string;
  status: string;
  boatName: string;
  bookingId: string;
  reporter: { name: string };
  createdAt: string;
};

export default function ChatReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ body: string; bookingId: string; senderName: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ reports: Report[] }>("/api/admin/chat/reports")
      .then((d) => setReports(d.reports))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  async function resolve(id: string, status: string) {
    await adminJson(`/api/admin/chat/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note: "Revisto pela equipe" }),
    });
    const data = await adminJson<{ reports: Report[] }>("/api/admin/chat/reports");
    setReports(data.reports);
  }

  async function search() {
    if (!searchQ.trim()) return;
    const data = await adminJson<{ messages: { body: string; bookingId: string; senderName: string }[] }>(
      `/api/admin/chat/search?q=${encodeURIComponent(searchQ)}`
    );
    setSearchResults(data.messages);
  }

  return (
    <div>
      <h1 className="page-title">Moderação de chat</h1>
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Pesquisar mensagens</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="search"
            placeholder="Texto da mensagem…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-primary" onClick={search}>
            Pesquisar
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul style={{ marginTop: "1rem" }}>
            {searchResults.map((m, i) => (
              <li key={i}>
                <strong>{m.senderName}</strong> (reserva {m.bookingId.slice(0, 8)}…): {m.body}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th>Embarcação</th>
              <th>Denunciante</th>
              <th>Status</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.reason}</td>
                <td>{r.boatName}</td>
                <td>{r.reporter.name}</td>
                <td>
                  <span className="badge badge-open">{r.status}</span>
                </td>
                <td>
                  {r.status === "OPEN" && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => resolve(r.id, "RESOLVED")}>
                        Resolver
                      </button>{" "}
                      <button type="button" className="btn btn-sm" onClick={() => resolve(r.id, "DISMISSED")}>
                        Arquivar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
