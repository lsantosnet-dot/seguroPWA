// HashRouter: funciona em qualquer hospedagem estática (GitHub Pages, Vercel)
// sem precisar de rewrites no servidor.
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DbProvider } from "@/db/DbContext";
import { AppShell } from "@/components/AppShell";
import { PwaUI } from "@/pwa/PwaUI";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientesPage } from "@/pages/ClientesPage";
import { ClienteNovoPage } from "@/pages/ClienteNovoPage";
import { ClienteDetalhePage } from "@/pages/ClienteDetalhePage";
import { ClienteEditarPage } from "@/pages/ClienteEditarPage";
import { CotacaoNovaPage } from "@/pages/CotacaoNovaPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { SinistrosPage } from "@/pages/SinistrosPage";
import { BackupPage } from "@/pages/BackupPage";

export function App() {
  return (
    <DbProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/novo" element={<ClienteNovoPage />} />
            <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
            <Route path="/clientes/:id/editar" element={<ClienteEditarPage />} />
            <Route path="/cotacoes/nova" element={<CotacaoNovaPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/sinistros" element={<SinistrosPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppShell>
        <PwaUI />
      </HashRouter>
    </DbProvider>
  );
}
