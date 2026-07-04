import { Mail, Check } from "lucide-react";
import { togglePaidInstallment } from "@/db/repo";
import { formatBRL, formatDate, effectiveInstallmentStatus } from "@/lib/format";
import { InstallmentStatusBadge } from "@/components/ui";
import { installmentMailto } from "@/lib/mail";
import type { Installment } from "@/lib/types";

export function InstallmentsList({
  installments,
  clientName,
  clientEmail,
  insurer,
}: {
  installments: Installment[];
  clientName: string;
  clientEmail: string | null;
  insurer: string;
}) {
  if (installments.length === 0) {
    return (
      <p className="px-1 py-3 text-sm text-faint">Sem parcelas registradas.</p>
    );
  }

  return (
    <div className="mt-3 space-y-1.5 border-t border-border pt-3">
      {installments.map((i) => {
        const status = effectiveInstallmentStatus(i);
        const paid = status === "paga";
        return (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-lg bg-panel-2 px-3 py-2"
          >
            <span className="num w-8 text-sm text-muted">{i.number}/{installments.length}</span>
            <span className="num text-sm font-medium">{formatBRL(i.amount)}</span>
            <span className="num text-xs text-faint">venc. {formatDate(i.due_date)}</span>
            <div className="ml-auto flex items-center gap-2">
              <InstallmentStatusBadge status={status} />
              {!paid && (
                <a
                  href={installmentMailto({
                    clientName,
                    email: clientEmail,
                    number: i.number,
                    amount: i.amount,
                    dueDate: i.due_date,
                    insurer,
                  })}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted hover:text-accent"
                  title="Lembrete por e-mail"
                >
                  <Mail size={14} />
                </a>
              )}
              <button
                onClick={() => togglePaidInstallment(i.id, !paid)}
                className={`btn ${paid ? "btn-ghost" : "btn-soft"} !px-2.5 !py-1 !text-xs`}
              >
                <Check size={13} />
                {paid ? "Desfazer" : "Pagar"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
