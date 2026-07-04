import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { createClient, updateClient } from "@/db/repo";
import { UFS } from "@/lib/constants";
import type { Client } from "@/lib/types";

export function ClientForm({ client }: { client?: Client }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    cpf: client?.cpf ?? "",
    city: client?.city ?? "",
    state: client?.state ?? "",
    birthdate: client?.birthdate ?? "",
    tags: (client?.tags ?? []).join(", "),
    notes: client?.notes ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      city: form.city || null,
      state: form.state || null,
      birthdate: form.birthdate || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: form.notes || null,
    };
    if (client) {
      const r = updateClient(client.id, payload);
      if (!r.ok) return setError(r.error ?? "Erro ao salvar");
      navigate(`/clientes/${client.id}`);
    } else {
      const r = createClient(payload);
      if (!r.ok) return setError(r.error);
      navigate(`/clientes/${r.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      <div>
        <label className="label">Nome completo *</label>
        <input className="input" value={form.name} onChange={set("name")} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.phone} onChange={set("phone")} placeholder="(11) 90000-0000" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">CPF</label>
          <input className="input" value={form.cpf} onChange={set("cpf")} />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input className="input" value={form.city} onChange={set("city")} />
        </div>
        <div>
          <label className="label">UF</label>
          <select className="input" value={form.state} onChange={set("state")}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nascimento</label>
          <input className="input" type="date" value={form.birthdate} onChange={set("birthdate")} />
        </div>
        <div>
          <label className="label">Tags (separadas por vírgula)</label>
          <input className="input" value={form.tags} onChange={set("tags")} placeholder="VIP, Auto" />
        </div>
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea className="input min-h-24" value={form.notes} onChange={set("notes")} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          <Save size={16} />
          {client ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
