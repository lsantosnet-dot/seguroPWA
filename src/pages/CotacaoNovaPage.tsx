import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getClientsList, getPolicy, getQuote } from "@/db/repo";
import { QuoteWizard } from "@/components/quote/QuoteWizard";

export function CotacaoNovaPage() {
  const [params] = useSearchParams();
  const preselectedClientId = params.get("client") ?? undefined;
  const quoteId = params.get("quote");
  const renewsPolicyId = params.get("renews");

  // carregados uma vez ao montar — o wizard controla o próprio estado
  const clients = useMemo(() => getClientsList(), []);
  const resume = useMemo(
    () => (quoteId ? getQuote(quoteId) ?? undefined : undefined),
    [quoteId],
  );
  const renewsPolicy = useMemo(
    () => (renewsPolicyId ? getPolicy(renewsPolicyId) ?? undefined : undefined),
    [renewsPolicyId],
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">
        {resume ? "Continuar cotação" : renewsPolicy ? "Renovar apólice" : "Nova cotação"}
      </h1>
      <QuoteWizard
        key={quoteId ?? "new"}
        clients={clients}
        preselectedClientId={preselectedClientId}
        renewsPolicy={renewsPolicy}
        resume={resume}
      />
    </div>
  );
}
