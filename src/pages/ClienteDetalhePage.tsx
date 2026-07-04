import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { UserX } from "lucide-react";
import {
  getClient,
  getClientClaims,
  getClientComments,
  getClientDocuments,
  getClientInstallments,
  getClientPolicies,
  getClientQuotes,
} from "@/db/repo";
import { useDataVersion } from "@/db/DbContext";
import { ClientDetail } from "@/components/client/ClientDetail";
import { EmptyState } from "@/components/ui";

export function ClienteDetalhePage() {
  const { id = "" } = useParams();
  const version = useDataVersion();

  const data = useMemo(() => {
    const client = getClient(id);
    if (!client) return null;
    return {
      client,
      policies: getClientPolicies(id),
      installmentsByPolicy: getClientInstallments(id),
      quotes: getClientQuotes(id),
      claims: getClientClaims(id),
      documents: getClientDocuments(id),
      comments: getClientComments(id),
    };
  }, [id, version]);

  if (!data) {
    return (
      <EmptyState
        icon={<UserX size={26} />}
        title="Cliente não encontrado"
        description="Ele pode ter sido removido."
      >
        <Link to="/clientes" className="btn btn-primary">
          Voltar para clientes
        </Link>
      </EmptyState>
    );
  }

  return <ClientDetail {...data} />;
}
