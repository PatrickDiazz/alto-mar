import { useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type Case = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  targetUser: { name: string; email: string } | null;
  targetBoat: { name: string } | null;
  reporter: { name: string } | null;
};

export default function Moderation() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ cases: Case[] }>("/api/admin/moderation/cases")
      .then((d) => setCases(d.cases))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  async function applyAction(caseId: string, actionType: string) {
    const reason = window.prompt("Justificativa obrigatória:");
    if (!reason?.trim()) return;
    try {
      await adminJson(`/api/admin/moderation/cases/${caseId}/actions`, {
        method: "POST",
        body: JSON.stringify({ actionType, reason }),
      });
      const data = await adminJson<{ cases: Case[] }>("/api/admin/moderation/cases");
      setCases(data.cases);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div>
      <h1 className="page-title">Moderação da plataforma</h1>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th>Alvo</th>
              <th>Denunciante</th>
              <th>Status</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>{c.reason}</td>
                <td>
                  {c.targetUser?.name || c.targetBoat?.name || "—"}
                  {c.targetUser?.email && (
                    <>
                      <br />
                      <small>{c.targetUser.email}</small>
                    </>
                  )}
                </td>
                <td>{c.reporter?.name || "—"}</td>
                <td>
                  <span className="badge badge-open">{c.status}</span>
                </td>
                <td>
                  {c.status === "OPEN" && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => applyAction(c.id, "WARNING")}>
                        Advertência
                      </button>{" "}
                      <button type="button" className="btn btn-sm" onClick={() => applyAction(c.id, "TEMP_SUSPENSION")}>
                        Suspender
                      </button>{" "}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => applyAction(c.id, "PERMANENT_BAN")}>
                        Banir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  Nenhum caso.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
