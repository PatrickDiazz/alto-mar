import { FormEvent, useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { adminJson, getStaff } from "../lib/auth";

type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "banhista" | "locatario";
  createdAt: string;
  emailVerifiedAt: string | null;
};

export default function Users() {
  const staff = getStaff();
  const canManage = staff?.permissions?.usersManage === true;

  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"pending" | "verified" | "all">("pending");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (role) params.set("role", role);
    if (query) params.set("q", query);
    const data = await adminJson<{ users: AppUser[]; total: number }>(
      `/api/admin/users?${params.toString()}`
    );
    setUsers(data.users);
    setTotal(data.total);
  }, [status, role, query]);

  useEffect(() => {
    if (!canManage) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [canManage, load]);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
  }

  async function activate(userId: string) {
    if (!window.confirm("Ativar esta conta (confirmar e-mail)?")) return;
    setActivatingId(userId);
    setError("");
    try {
      await adminJson(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar.");
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Contas da plataforma</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Ative contas com e-mail pendente para permitir login sem o link de confirmação.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="pending">E-mail pendente</option>
          <option value="verified">E-mail confirmado</option>
          <option value="all">Todas</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Todos os perfis</option>
          <option value="banhista">Banhista</option>
          <option value="locatario">Locador</option>
        </select>
        <form onSubmit={onSearch} style={{ display: "flex", gap: "0.5rem", flex: "1 1 200px" }}>
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="submit" className="btn btn-sm">
            Buscar
          </button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Cadastro</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === "locatario" ? "Locador" : "Banhista"}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  {u.emailVerifiedAt ? (
                    <span className="badge" style={{ background: "var(--success, #166534)", color: "#fff" }}>
                      Confirmado
                    </span>
                  ) : (
                    <span className="badge badge-open">Pendente</span>
                  )}
                </td>
                <td>
                  {!u.emailVerifiedAt ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={activatingId === u.id}
                      onClick={() => activate(u.id)}
                    >
                      {activatingId === u.id ? "A ativar…" : "Ativar"}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  Nenhuma conta encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
          {total} conta(s) no total
        </p>
      </div>
    </div>
  );
}
