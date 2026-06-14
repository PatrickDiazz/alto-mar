import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type AuditAccount = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  active: boolean;
  actionCount: number;
  lastActionAt: string | null;
};

function formatMetadata(metadata: Record<string, unknown>) {
  const keys = Object.keys(metadata);
  if (keys.length === 0) return null;
  return JSON.stringify(metadata, null, 2);
}

export default function AuditAccountPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<AuditAccount | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accountId) return;
    adminJson<{ account: AuditAccount; logs: Log[] }>(`/api/admin/audit/accounts/${accountId}?limit=200`)
      .then((d) => {
        setAccount(d.account);
        setLogs(d.logs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [accountId]);

  if (!account) {
    return <p>{error || "A carregar auditoria…"}</p>;
  }

  return (
    <div>
      <p>
        <Link to="/audit">← Todas as contas</Link>
      </p>
      <h1 className="page-title">{account.name}</h1>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {account.role && <span className="badge">{account.role}</span>}
        {account.email && <span className="badge">{account.email}</span>}
        <span className="badge">{account.actionCount} acções</span>
        {account.id !== "system" && !account.active && (
          <span className="badge badge-open">Conta inactiva</span>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Acção</th>
              <th>Entidade</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  Nenhuma acção registada para esta conta.
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const meta = formatMetadata(l.metadata);
                return (
                  <tr key={l.id}>
                    <td>{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
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
                    <td>
                      {meta ? (
                        <pre
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            whiteSpace: "pre-wrap",
                            color: "var(--muted)",
                            maxWidth: "28rem",
                          }}
                        >
                          {meta}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
