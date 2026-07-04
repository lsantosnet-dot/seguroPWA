import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  FileSearch,
  Star,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Pencil,
  Save,
  X,
  FileText,
} from "lucide-react";
import { deleteQuote, deleteQuoteOption, updateQuote, updateQuoteOption } from "@/db/repo";
import { openFile } from "@/db/files";
import { EmptyState } from "@/components/ui";
import { INSURERS, PAYMENT_METHODS, POLICY_TYPES, POLICY_TYPE_LABEL } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/format";
import type { PaymentMethod, PolicyType, Quote, QuoteOption } from "@/lib/types";

type QuoteWithOptions = Quote & { options: QuoteOption[] };

export function QuotesTab({
  clientId,
  quotes,
}: {
  clientId: string;
  quotes: QuoteWithOptions[];
}) {
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  function removeQuote(q: QuoteWithOptions) {
    const ok = window.confirm(
      `Excluir a cotação de ${POLICY_TYPE_LABEL[q.type]}? Todas as propostas dela serão removidas.`,
    );
    if (!ok) return;
    void deleteQuote(q.id);
  }

  function removeOption(id: string) {
    const ok = window.confirm("Excluir esta proposta?");
    if (!ok) return;
    void deleteQuoteOption(id);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link
          to={`/cotacoes/nova?client=${clientId}`}
          className="btn btn-ghost"
        >
          <Plus size={16} /> Nova cotação
        </Link>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={24} />}
          title="Nenhuma cotação"
          description="Compare propostas de várias seguradoras e oficialize a melhor."
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const best = q.options.reduce<QuoteOption | null>(
              (acc, o) => (!acc || o.premium < acc.premium ? o : acc),
              null,
            );
            const canEdit = q.status === "aberta";
            return (
              <div key={q.id} className="card p-5">
                {editingQuoteId === q.id ? (
                  <EditQuoteHeader quote={q} onDone={() => setEditingQuoteId(null)} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      Cotação {POLICY_TYPE_LABEL[q.type]}
                    </span>
                    {q.status === "oficializada" ? (
                      <span className="badge badge-green">
                        <CheckCircle2 size={12} /> Oficializada
                      </span>
                    ) : q.status === "descartada" ? (
                      <span className="badge badge-gray">Descartada</span>
                    ) : (
                      <span className="badge badge-blue">Em aberto</span>
                    )}
                    <span className="num ml-auto text-xs text-faint">
                      {formatDate(q.created_at)}
                    </span>
                    {canEdit && (
                      <button
                        className="text-faint hover:text-accent"
                        onClick={() => setEditingQuoteId(q.id)}
                        title="Editar cotação"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      className="text-faint hover:text-danger"
                      onClick={() => removeQuote(q)}
                      title="Excluir cotação"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {q.options.length === 0 && (
                    <p className="text-sm text-faint">Sem propostas adicionadas.</p>
                  )}
                  {q.options.map((o) => {
                    const isCheapest = best && o.id === best.id;
                    if (editingOptionId === o.id) {
                      return (
                        <EditQuoteOption
                          key={o.id}
                          option={o}
                          onDone={() => setEditingOptionId(null)}
                        />
                      );
                    }
                    return (
                      <div
                        key={o.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                          o.chosen
                            ? "border-accent bg-accent-soft"
                            : "border-border bg-panel-2"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            {o.insurer}
                            {o.is_best && (
                              <Star size={13} className="fill-warning text-warning" />
                            )}
                            {isCheapest && !o.is_best && (
                              <span className="badge badge-green">menor preço</span>
                            )}
                            {o.chosen && (
                              <span className="badge badge-green">contratada</span>
                            )}
                          </p>
                          {o.coverage && (
                            <p className="truncate text-xs text-muted">{o.coverage}</p>
                          )}
                        </div>
                        {o.pdf_file_id && (
                          <button
                            onClick={() => void openFile(o.pdf_file_id!)}
                            className="text-faint hover:text-accent"
                            title="Ver PDF"
                          >
                            <FileText size={15} />
                          </button>
                        )}
                        <span className="num ml-auto text-sm font-semibold">
                          {formatBRL(o.premium)}
                        </span>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setEditingOptionId(o.id)}
                              className="text-faint hover:text-accent"
                              title="Editar proposta"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => removeOption(o.id)}
                              className="text-faint hover:text-danger"
                              title="Excluir proposta"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                  {q.status === "aberta" && (
                    <Link
                      to={`/cotacoes/nova?quote=${q.id}`}
                      className="btn btn-primary !py-1.5 !text-xs"
                    >
                      Continuar / oficializar <ArrowRight size={14} />
                    </Link>
                  )}
                  {q.status === "oficializada" && q.policy_id && (
                    <span className="text-xs text-faint">
                      Apólice gerada a partir desta cotação.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditQuoteHeader({
  quote,
  onDone,
}: {
  quote: Quote;
  onDone: () => void;
}) {
  const [type, setType] = useState<PolicyType>(quote.type);
  const [notes, setNotes] = useState(quote.notes ?? "");

  function save() {
    updateQuote(quote.id, { type, notes: notes || null });
    onDone();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="label !mb-0">Tipo</label>
        <select
          className="input !w-auto"
          value={type}
          onChange={(e) => setType(e.target.value as PolicyType)}
        >
          {POLICY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button onClick={save} className="btn btn-primary !py-1.5 !text-xs">
          <Save size={13} /> Salvar
        </button>
        <button onClick={onDone} className="btn btn-ghost !py-1.5 !text-xs">
          <X size={13} /> Cancelar
        </button>
      </div>
      <div>
        <label className="label">Observações</label>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}

function EditQuoteOption({
  option,
  onDone,
}: {
  option: QuoteOption;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    insurer: option.insurer,
    premium: String(option.premium),
    coverage: option.coverage ?? "",
    installmentsCount: String(option.installments_count),
    paymentMethod: (option.payment_method ?? "boleto") as PaymentMethod,
  });

  function save() {
    setError(null);
    const r = updateQuoteOption(option.id, {
      insurer: form.insurer,
      premium: parseFloat(form.premium.replace(",", ".")) || 0,
      coverage: form.coverage || null,
      installmentsCount: parseInt(form.installmentsCount) || 1,
      paymentMethod: form.paymentMethod,
    });
    if (!r.ok) return setError(r.error);
    onDone();
  }

  return (
    <div className="rounded-lg border border-border-strong bg-panel-2 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Seguradora</label>
          <input
            className="input"
            list="insurers-edit"
            value={form.insurer}
            onChange={(e) => setForm((f) => ({ ...f, insurer: e.target.value }))}
          />
          <datalist id="insurers-edit">
            {INSURERS.map((i) => <option key={i} value={i} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Prêmio (R$)</label>
          <input
            className="input"
            inputMode="decimal"
            value={form.premium}
            onChange={(e) => setForm((f) => ({ ...f, premium: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Parcelas</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.installmentsCount}
            onChange={(e) => setForm((f) => ({ ...f, installmentsCount: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Pagamento</label>
          <select
            className="input"
            value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Coberturas</label>
          <input
            className="input"
            value={form.coverage}
            onChange={(e) => setForm((f) => ({ ...f, coverage: e.target.value }))}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="btn btn-primary !py-1.5 !text-xs">
          <Save size={13} /> Salvar
        </button>
        <button onClick={onDone} className="btn btn-ghost !py-1.5 !text-xs">
          <X size={13} /> Cancelar
        </button>
      </div>
    </div>
  );
}
