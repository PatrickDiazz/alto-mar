import { FormEvent, useEffect, useState } from "react";
import { adminJson } from "../lib/auth";

type Tag = { id: string; name: string; color: string };

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");

  async function load() {
    const data = await adminJson<{ tags: Tag[] }>("/api/admin/tags");
    setTags(data.tags);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await adminJson("/api/admin/tags", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div>
      <h1 className="page-title">Tags de tickets</h1>
      {error && <p className="error">{error}</p>}

      <form onSubmit={onSubmit} className="card" style={{ maxWidth: 400, marginBottom: "1.5rem" }}>
        <div className="field">
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Cor</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">
          Criar tag
        </button>
      </form>

      <div className="card">
        <ul>
          {tags.map((t) => (
            <li key={t.id}>
              <span className="badge" style={{ background: t.color }}>
                {t.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
