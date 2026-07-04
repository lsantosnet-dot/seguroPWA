// Banners de PWA: instalar o app, nova versão disponível e status offline.
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";
import { useInstall } from "./useInstall";
import { persistNow } from "@/db/database";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1h

export function PwaUI() {
  return (
    <>
      <OfflineBadge />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
        <UpdateBanner />
        <InstallBanner />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // busca novas versões periodicamente e ao voltar para o app
      setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-panel p-4 shadow-2xl">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <RefreshCw size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nova versão disponível</p>
        <p className="text-xs text-muted">Atualize para receber as novidades.</p>
      </div>
      <button
        className="btn btn-primary !py-1.5 !text-xs"
        onClick={async () => {
          await persistNow(); // garante que nada se perde antes do reload
          await updateServiceWorker(true);
        }}
      >
        Atualizar
      </button>
      <button
        className="text-faint hover:text-text"
        onClick={() => setNeedRefresh(false)}
        aria-label="Depois"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
const INSTALL_DISMISSED_KEY = "apolice-install-dismissed";

function InstallBanner() {
  const { canPrompt, showIOSHint, installed, install } = useInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(INSTALL_DISMISSED_KEY) === "1",
  );

  if (installed || dismissed || (!canPrompt && !showIOSHint)) return null;

  function dismiss() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-panel p-4 shadow-2xl">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Download size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instalar o Apólice</p>
        {canPrompt ? (
          <p className="text-xs text-muted">
            Use como app, com ícone e funcionamento offline.
          </p>
        ) : (
          <p className="text-xs text-muted">
            No Safari: toque em <Share size={12} className="inline" /> Compartilhar
            e depois em <b>Adicionar à Tela de Início</b>.
          </p>
        )}
      </div>
      {canPrompt && (
        <button className="btn btn-primary !py-1.5 !text-xs" onClick={() => void install()}>
          Instalar
        </button>
      )}
      <button className="text-faint hover:text-text" onClick={dismiss} aria-label="Fechar">
        <X size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-1.5 text-xs font-medium text-warning shadow-xl">
      <WifiOff size={13} /> Offline — seus dados continuam salvos neste aparelho
    </div>
  );
}
