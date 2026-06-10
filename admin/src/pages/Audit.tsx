import { useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
  metadata: Record<string, unknown>;
};

export default function Audit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ logs: Log[] }>("/api/admin/audit?limit=100")
      .then((d) => setLogs(d.logs))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  return (
    <div>
      <h1 className="page-title">Auditoria</h1>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Actor</th>
              <th>Acção</th>
              <th>Entidade</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  {l.actor?.name || "—"}
                  {l.actor?.role && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{l.actor.role}</div>}
                </td>
                <td>
                  <code>{l.action}</code>
                </td>
                <td>
                  {l.entityType}
                  {l.entityId && (
                    <>
                      <br />
                      <small>{l.entityId}</small>
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
