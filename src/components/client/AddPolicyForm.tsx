import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { createPolicy, updatePolicy } from "@/db/repo";
import { INSURERS, PAYMENT_METHODS, POLICY_STATUS_LABEL, POLICY_TYPES } from "@/lib/constants";
import { addYearsISO, todayISO } from "@/lib/format";
import type { PaymentMethod, Policy, PolicyStatus, PolicyType } from "@/lib/types";

const POLICY_STATUSES: PolicyStatus[] = ["vigente", "em_cotacao", "vencida", "renovada", "cancelada"];

export function AddPolicyForm({
  clientId,
  policy,
  onDone,
}: {
  clientId: string;
  policy?: Policy;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();
  const [form, setForm] = useState({
    type: policy?.type ?? ("auto" as PolicyType),
    insurer: policy?.insurer ?? "",
    policyNumber: policy?.policy_number ?? "",
    premium: policy ? String(policy.premium) : "",
    paymentMethod: (policy?.payment_method ?? "boleto") as PaymentMethod,
    installmentsCount: policy ? String(policy.installments_count) : "12",
    startDate: policy?.start_date ?? today,
    endDate: policy?.end_date ?? addYearsISO(today, 1),
    commissionRate: policy ? String(policy.commission_rate) : "10",
    status: (policy?.status ?? "vigente") as PolicyStatus,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.insurer.trim()) return setError("Informe a seguradora");
    const payload = {
      type: form.type,
      insurer: form.insurer.trim(),
      policyNumber: form.policyNumber || null,
      premium: parseFloat(form.premium.replace(",", ".")) || 0,
      commissionRate: parseFloat(form.commissionRate) || 10,
      paymentMethod: form.paymentMethod,
      installmentsCount: parseInt(form.installmentsCount) || 1,
      startDate: form.startDate,
      endDate: form.endDate,
    };
    const r = policy
      ? updatePolicy(policy.id, { ...payload, status: form.status })
      : createPolicy({ clientId, ...payload });
    if (!r.ok) return setError(r.error ?? "Erro");
    onDone();
  }

  return (
    <form onSubmit={submit} className="card mb-4 space-y-4 p-5">
      <h3 className="font-semibold">{policy ? "Editar apólice" : "Nova apólice"}</h3>
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

      <div className={`grid gap-4 ${policy ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div>
          <label className="label">Início</label>
          <input className="input" type="date" value={form.startDate} onChange={set("startDate")} />
        </div>
        <div>
          <label className="label">Vencimento</label>
          <input className="input" type="date" value={form.endDate} onChange={set("endDate")} />
        </div>
        {policy && (
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set("status")}>
              {POLICY_STATUSES.map((s) => (
                <option key={s} value={s}>{POLICY_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          {policy ? <Save size={16} /> : <Plus size={16} />}
          {policy ? "Salvar alterações" : "Adicionar apólice"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
