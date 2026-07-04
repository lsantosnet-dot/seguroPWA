import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { getAllClaims } from "@/db/repo";
import { useDataVersion } from "@/db/DbContext";
import { EmptyState } from "@/components/ui";
import { SinistrosList } from "@/components/SinistrosList";

export function SinistrosPage() {
  const version = useDataVersion();
  const claims = useMemo(() => getAllClaims(), [version]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">
        Sinistros <span className="text-muted">({claims.length})</span>
      </h1>

      {claims.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={26} />}
          title="Nenhum sinistro registrado"
          description="Registre sinistros pela aba Sinistros de cada cliente."
        />
      ) : (
        <SinistrosList claims={claims} />
      )}
    </div>
  );
}
