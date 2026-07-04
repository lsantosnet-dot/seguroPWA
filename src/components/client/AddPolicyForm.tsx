import { useState } from "react";
import { Plus } from "lucide-react";
import { createPolicy } from "@/db/repo";
import { INSURERS, PAYMENT_METHODS, POLICY_TYPES } from "@/lib/constants";
import { addYearsISO, todayISO } from "@/lib/format";
import type { PaymentMethod, PolicyType } from "@/lib/types";

export function AddPolicyForm({
  clientId,
  onDone,
}: {
  clientId: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();
  const [form, setForm] = useState({
    type: "auto" as PolicyType,
    insurer: "",
    policyNumber: "",
    premium: "",
    paymentMethod: "boleto" as PaymentMethod,
    installmentsCount: "12",
    startDate: today,
    endDate: addYearsISO(today, 1),
    commissionRate: "10",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.insurer.trim()) return setError("Informe a seguradora");
    const r = createPolicy({
      clientId,
      type: form.type,
      insurer: form.insurer.trim(),
      policyNumber: form.policyNumber || null,
      premium: parseFloat(form.premium.replace(",", ".")) || 0,
      commissionRate: parseFloat(form.commissionRate) || 10,
      paymentMethod: form.paymentMethod,
      installmentsCount: parseInt(form.installmentsCount) || 1,
      startDate: form.startDate,
      endDate: form.endDate,
    });
    if (!r.ok) return setError(r.error ?? "Erro");
    onDone();
  }

  return (
    <form onSubmit={submit} className="card mb-4 space-y-4 p-5">
      <h3 className="font-semibold">Nova apólice</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {POLICY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Seguradora</label>
          <input className="input" list="insurers" value={form.insurer} onChange={set("insurer")} />
          <datalist id="insurers">
            {INSURERS.map((i) => <option key={i} value={i} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Nº da apólice</label>
          <input className="input" value={form.policyNumber} onChange={set("policyNumber")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label">Prêmio (R$)</label>
          <input className="input" inputMode="decimal" value={form.premium} onChange={set("premium")} placeholder="0,00" />
        </div>
        <div>
          <label className="label">Comissão (%)</label>
          <input className="input" inputMode="decimal" value={form.commissionRate} onChange={set("commissionRate")} />
        </div>
        <div>
          <label className="label">Pagamento</label>
          <select className="input" value={form.paymentMethod} onChange={set("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Parcelas</label>
          <input className="input" type="number" min={1} value={form.installmentsCount} onChange={set("installmentsCount")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Início</label>
          <input className="input" type="date" value={form.startDate} onChange={set("startDate")} />
        </div>
        <div>
          <label className="label">Vencimento</label>
          <input className="input" type="date" value={form.endDate} onChange={set("endDate")} />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          Adicionar apólice
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
