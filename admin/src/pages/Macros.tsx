import { useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type Macro = {
  id: string;
  code: string;
  category: string;
  title: string;
  body: string;
  active: boolean;
};

export default function Macros() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ macros: Macro[] }>("/api/admin/macros")
      .then((d) => setMacros(d.macros))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  return (
    <div>
      <h1 className="page-title">Macros operacionais</h1>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Categoria</th>
              <th>Título</th>
              <th>Texto</th>
              <th>Activa</th>
            </tr>
          </thead>
          <tbody>
            {macros.map((m) => (
              <tr key={m.id}>
                <td>
                  <code>{m.code}</code>
                </td>
                <td>{m.category}</td>
                <td>{m.title}</td>
                <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{m.body}</td>
                <td>{m.active ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
