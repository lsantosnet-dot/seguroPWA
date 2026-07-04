// Provider que abre o banco antes de renderizar o app e re-renderiza a
// árvore a cada mutação (dbEvents "change").
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ShieldCheck } from "lucide-react";
import { openDatabase, persistNow } from "./database";
import { dbEvents } from "./repo";
import { recordChange } from "./backupReminder";

const DbVersionContext = createContext(0);

/** Versão dos dados — muda a cada mutação; use como dependência de useMemo. */
export function useDataVersion(): number {
  return useContext(DbVersionContext);
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    openDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    const onChange = () => {
      setVersion((v) => v + 1);
      recordChange();
    };
    dbEvents.addEventListener("change", onChange);
    // garante a persistência ao sair/minimizar
    const onHide = () => {
      if (document.visibilityState === "hidden") void persistNow();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      dbEvents.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-danger">Erro ao abrir o banco local</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck size={28} />
          </span>
          <p className="text-sm">Abrindo o banco de dados local…</p>
        </div>
      </div>
    );
  }

  return (
    <DbVersionContext.Provider value={version}>{children}</DbVersionContext.Provider>
  );
}
