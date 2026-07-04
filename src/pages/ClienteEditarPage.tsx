import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, UserX } from "lucide-react";
import { deleteClient, getClient } from "@/db/repo";
import { useDataVersion } from "@/db/DbContext";
import { ClientForm } from "@/components/ClientForm";
import { EmptyState } from "@/components/ui";

export function ClienteEditarPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const version = useDataVersion();
  const client = useMemo(() => getClient(id), [id, version]);
  const [deleting, setDeleting] = useState(false);

  if (!client) {
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

  async function remove() {
    const ok = window.confirm(
      `Excluir ${client!.name}? Todas as apólices, cotações, parcelas, sinistros e documentos do cliente serão removidos.`,
    );
    if (!ok) return;
    setDeleting(true);
    await deleteClient(id);
    navigate("/clientes");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar cliente</h1>
        <button
          className="btn btn-ghost !text-danger"
          disabled={deleting}
          onClick={() => void remove()}
        >
          <Trash2 size={16} /> Excluir cliente
        </button>
      </div>
      <ClientForm client={client} />
    </div>
  );
}
