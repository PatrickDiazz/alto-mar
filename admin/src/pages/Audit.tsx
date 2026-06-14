import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminJson } from "../lib/auth";

type AuditAccount = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  active: boolean;
  actionCount: number;
  lastActionAt: string | null;
};

export default function Audit() {
  const [accounts, setAccounts] = useState<AuditAccount[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ accounts: AuditAccount[] }>("/api/admin/audit/accounts")
      .then((d) => setAccounts(d.accounts))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  return (
    <div>
      <h1 className="page-title">Auditoria</h1>
      <p style={{ color: "var(--muted)", marginTop: "-0.5rem", marginBottom: "1.25rem" }}>
        Selecione uma conta operacional para ver o histórico de acções.
      </p>
      {error && <p className="error">{error}</p>}

      {accounts.length === 0 && !error ? (
        <p style={{ color: "var(--muted)" }}>Ainda não há registos de auditoria.</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conta</th>
                <th>Papel</th>
                <th>Acções</th>
                <th>Última acção</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                    {a.email && (
                      <>
                        <br />
                        <small style={{ color: "var(--muted)" }}>{a.email}</small>
                      </>
                    )}
                    {a.id !== "system" && !a.active && (
                      <>
                        <br />
                        <span className="badge badge-open">Inactiva</span>
                      </>
                    )}
                  </td>
                  <td>{a.role || "—"}</td>
                  <td>{a.actionCount}</td>
                  <td>
                    {a.lastActionAt ? new Date(a.lastActionAt).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td>
                    <Link to={`/audit/${a.id}`}>Ver acções</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
