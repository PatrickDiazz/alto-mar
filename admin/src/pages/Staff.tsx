import { FormEvent, useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

export default function Staff() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [error, setError] = useState("");

  async function load() {
    const data = await adminJson<{ staff: StaffRow[] }>("/api/admin/staff");
    setStaff(data.staff);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await adminJson("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div>
      <h1 className="page-title">Equipe operacional</h1>
      {error && <p className="error">{error}</p>}

      <form onSubmit={onSubmit} className="card" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
        <h3>Novo membro</h3>
        <div className="field">
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="field">
          <label>Papel</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STAFF">STAFF</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="SENIOR_MODERATOR">SENIOR_MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Criar
        </button>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.role}</td>
                <td>{s.active ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
