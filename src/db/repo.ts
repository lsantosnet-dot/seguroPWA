// Consultas e mutações — port fiel de src/lib/data.ts + src/lib/actions.ts do
// app original, agora contra o SQLite local. Sem owner_id (single-user).
import { all, get, nowISO, run, schedulePersist, scalar, uuid } from "./database";
import * as files from "./files";
import { addMonthsISO, addYearsISO, daysUntil, monthKey, parseISO, todayISO } from "@/lib/format";
import { RENEWAL_WINDOW_DAYS } from "@/lib/constants";
import { renewalMailto, installmentMailto } from "@/lib/mail";
import type {
  Claim,
  ClaimStatus,
  Channel,
  Client,
  ClientWithStats,
  Comment,
  DocCategory,
  DocumentRow,
  Goal,
  Installment,
  PaymentMethod,
  Policy,
  PolicyStatus,
  PolicyType,
  Quote,
  QuoteOption,
} from "@/lib/types";

// Notifica a UI após cada mutação (o DbProvider escuta e re-renderiza).
export const dbEvents = new EventTarget();
function touch() {
  schedulePersist();
  dbEvents.dispatchEvent(new Event("change"));
}

// --- mapeamento de linhas ---------------------------------------------------
type Row = Record<string, unknown>;

function mapClient(r: Row): Client {
  return { ...(r as unknown as Client), tags: JSON.parse((r.tags as string) || "[]") };
}
function mapOption(r: Row): QuoteOption {
  return {
    ...(r as unknown as QuoteOption),
    is_best: !!r.is_best,
    chosen: !!r.chosen,
  };
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export function getClientsWithStats(): ClientWithStats[] {
  const clients = all("SELECT * FROM clients ORDER BY name COLLATE NOCASE").map(mapClient);
  const stats = all<{ client_id: string; count: number; premium: number }>(
    `SELECT client_id, COUNT(*) AS count, SUM(premium) AS premium
       FROM policies WHERE status != 'cancelada' GROUP BY client_id`,
  );
  const byId = new Map(stats.map((s) => [s.client_id, s]));
  return clients.map((c) => ({
    ...c,
    policy_count: byId.get(c.id)?.count ?? 0,
    premium_total: Number(byId.get(c.id)?.premium ?? 0),
  }));
}

export function getClientsList(): Pick<Client, "id" | "name">[] {
  return all<{ id: string; name: string }>(
    "SELECT id, name FROM clients ORDER BY name COLLATE NOCASE",
  );
}

export function getClient(id: string): Client | null {
  const r = get("SELECT * FROM clients WHERE id = ?", [id]);
  return r ? mapClient(r) : null;
}

export function getClientPolicies(clientId: string): Policy[] {
  return all<Policy>(
    "SELECT * FROM policies WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
  );
}

export function getClientQuotes(clientId: string): (Quote & { options: QuoteOption[] })[] {
  const quotes = all<Quote>(
    "SELECT * FROM quotes WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
  );
  return quotes.map((q) => ({
    ...q,
    options: all("SELECT * FROM quote_options WHERE quote_id = ? ORDER BY created_at", [q.id]).map(mapOption),
  }));
}

export function getClientClaims(clientId: string): Claim[] {
  return all<Claim>("SELECT * FROM claims WHERE client_id = ? ORDER BY date DESC", [clientId]);
}

export function getClientDocuments(clientId: string): DocumentRow[] {
  return all<DocumentRow>(
    "SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
  );
}

export function getClientComments(clientId: string): Comment[] {
  return all<Comment>(
    "SELECT * FROM comments WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
  );
}

/** Todas as parcelas das apólices de um cliente, agrupadas por policy_id. */
export function getClientInstallments(clientId: string): Record<string, Installment[]> {
  const rows = all<Installment>(
    `SELECT i.* FROM installments i
      JOIN policies p ON p.id = i.policy_id
     WHERE p.client_id = ? ORDER BY i.number`,
    [clientId],
  );
  const grouped: Record<string, Installment[]> = {};
  for (const i of rows) (grouped[i.policy_id] ??= []).push(i);
  return grouped;
}

// ---------------------------------------------------------------------------
// Cotações
// ---------------------------------------------------------------------------
export function getQuote(
  id: string,
): (Quote & { options: QuoteOption[]; client: Client }) | null {
  const q = get<Quote>("SELECT * FROM quotes WHERE id = ?", [id]);
  if (!q) return null;
  const client = getClient(q.client_id);
  if (!client) return null;
  return {
    ...q,
    client,
    options: all("SELECT * FROM quote_options WHERE quote_id = ? ORDER BY created_at", [id]).map(mapOption),
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export type ExpiringPolicy = Policy & {
  client: Pick<Client, "id" | "name" | "email">;
};
export type PendingInstallment = Installment & {
  policy: Pick<Policy, "id" | "type" | "insurer"> & {
    client: Pick<Client, "id" | "name" | "email">;
  };
};

export interface DashboardData {
  clientCount: number;
  newClientsThisMonth: number;
  activePolicies: number;
  openQuotes: number;
  premiumTotal: number;
  commissionEstimate: number;
  expiring: ExpiringPolicy[];
  pendingInstallments: PendingInstallment[];
  commissionByMonth: { month: string; label: string; value: number }[];
  goalTarget: number;
  goalAchieved: number;
  isEmpty: boolean;
}

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function getExpiringPolicies(): ExpiringPolicy[] {
  return all<Row & Policy & { c_id: string; c_name: string; c_email: string | null }>(
    `SELECT p.*, c.id AS c_id, c.name AS c_name, c.email AS c_email
       FROM policies p JOIN clients c ON c.id = p.client_id`,
  ).map((r) => ({
    ...(r as unknown as Policy),
    client: { id: r.c_id, name: r.c_name, email: r.c_email },
  }));
}

function getPendingInstallmentsJoined(): PendingInstallment[] {
  return all<Row & Installment>(
    `SELECT i.*, p.id AS p_id, p.type AS p_type, p.insurer AS p_insurer,
            c.id AS c_id, c.name AS c_name, c.email AS c_email
       FROM installments i
       JOIN policies p ON p.id = i.policy_id
       JOIN clients c ON c.id = p.client_id
      WHERE i.status != 'paga'`,
  ).map((r) => ({
    ...(r as unknown as Installment),
    policy: {
      id: r.p_id as string,
      type: r.p_type as PolicyType,
      insurer: r.p_insurer as string,
      client: { id: r.c_id as string, name: r.c_name as string, email: (r.c_email as string) ?? null },
    },
  }));
}

export function getDashboardData(): DashboardData {
  const clients = all<{ id: string; created_at: string }>("SELECT id, created_at FROM clients");
  const policies = getExpiringPolicies();
  const openQuotes = Number(scalar("SELECT COUNT(*) FROM quotes WHERE status = 'aberta'") ?? 0);
  const installments = getPendingInstallmentsJoined();
  const goal = get<Goal>("SELECT * FROM goals WHERE month = ?", [monthKey()]);

  const thisMonth = monthKey();
  const newClientsThisMonth = clients.filter(
    (c) => monthKey(new Date(c.created_at)) === thisMonth,
  ).length;

  const active = policies.filter((p) => p.status === "vigente");
  const premiumTotal = active.reduce((s, p) => s + Number(p.premium), 0);
  const commissionEstimate = active.reduce(
    (s, p) => s + (Number(p.premium) * Number(p.commission_rate)) / 100,
    0,
  );

  const expiring = active
    .filter((p) => p.end_date && daysUntil(p.end_date) <= RENEWAL_WINDOW_DAYS)
    .sort((a, b) => daysUntil(a.end_date) - daysUntil(b.end_date));

  const pendingInstallments = installments.sort(
    (a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime(),
  );

  const byMonth = new Map<string, number>();
  for (const p of active) {
    if (!p.start_date) continue;
    const key = p.start_date.slice(0, 7);
    const commission = (Number(p.premium) * Number(p.commission_rate)) / 100;
    byMonth.set(key, (byMonth.get(key) ?? 0) + commission);
  }
  const commissionByMonth: DashboardData["commissionByMonth"] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    commissionByMonth.push({
      month: key,
      label: MONTH_SHORT[d.getMonth()],
      value: byMonth.get(key) ?? 0,
    });
  }

  const goalAchieved = byMonth.get(thisMonth) ?? 0;
  const goalTarget = goal ? Number(goal.target) : 12000;

  return {
    clientCount: clients.length,
    newClientsThisMonth,
    activePolicies: active.length,
    openQuotes,
    premiumTotal,
    commissionEstimate,
    expiring,
    pendingInstallments,
    commissionByMonth,
    goalTarget,
    goalAchieved,
    isEmpty: clients.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Dados do shell (sidebar): contadores + meta do mês
// ---------------------------------------------------------------------------
export interface ShellData {
  agenda: number;
  sinistros: number;
  meta: { achieved: number; target: number };
}

export function getShellData(): ShellData {
  const policies = all<{ end_date: string | null; premium: number; commission_rate: number; start_date: string | null }>(
    "SELECT end_date, premium, commission_rate, start_date FROM policies WHERE status = 'vigente'",
  );
  const expiring = policies.filter(
    (p) => p.end_date && daysUntil(p.end_date) <= RENEWAL_WINDOW_DAYS,
  ).length;
  const pendingInstallments = Number(
    scalar("SELECT COUNT(*) FROM installments WHERE status != 'paga'") ?? 0,
  );
  const sinistros = Number(
    scalar(
      "SELECT COUNT(*) FROM claims WHERE status IN ('aberto','em_analise','aprovado')",
    ) ?? 0,
  );
  const goalTarget = scalar<number>("SELECT target FROM goals WHERE month = ?", [monthKey()]);

  const thisMonth = monthKey();
  const achieved = policies
    .filter((p) => p.start_date && p.start_date.slice(0, 7) === thisMonth)
    .reduce((s, p) => s + (Number(p.premium) * Number(p.commission_rate)) / 100, 0);

  return {
    agenda: expiring + pendingInstallments,
    sinistros,
    meta: { achieved, target: goalTarget != null ? Number(goalTarget) : 12000 },
  };
}

// ---------------------------------------------------------------------------
// Agenda — vencimentos de apólices + parcelas, agrupados por prazo
// ---------------------------------------------------------------------------
export interface AgendaItem {
  id: string;
  kind: "renovacao" | "parcela";
  title: string;
  subtitle: string;
  date: string;
  days: number;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  amount: number;
  mailHref: string;
}

export function getAgenda(): AgendaItem[] {
  const policies = getExpiringPolicies().filter(
    (p) => p.status === "vigente" && p.end_date,
  );
  const installments = getPendingInstallmentsJoined();

  const items: AgendaItem[] = [];
  for (const p of policies) {
    items.push({
      id: `pol-${p.id}`,
      kind: "renovacao",
      title: p.client.name,
      subtitle: `Renovação ${p.type} • ${p.insurer}`,
      date: p.end_date!,
      days: daysUntil(p.end_date),
      clientId: p.client.id,
      clientName: p.client.name,
      clientEmail: p.client.email,
      amount: Number(p.premium),
      mailHref: renewalMailto({
        clientName: p.client.name,
        email: p.client.email,
        type: p.type,
        insurer: p.insurer,
        endDate: p.end_date,
      }),
    });
  }
  for (const i of installments) {
    items.push({
      id: `inst-${i.id}`,
      kind: "parcela",
      title: i.policy.client.name,
      subtitle: `Parcela ${i.number} • ${i.policy.type} ${i.policy.insurer}`,
      date: i.due_date,
      days: daysUntil(i.due_date),
      clientId: i.policy.client.id,
      clientName: i.policy.client.name,
      clientEmail: i.policy.client.email,
      amount: Number(i.amount),
      mailHref: installmentMailto({
        clientName: i.policy.client.name,
        email: i.policy.client.email,
        number: i.number,
        amount: Number(i.amount),
        dueDate: i.due_date,
        insurer: i.policy.insurer,
      }),
    });
  }
  return items.sort((a, b) => a.days - b.days);
}

// ---------------------------------------------------------------------------
// Sinistros (todos)
// ---------------------------------------------------------------------------
export type ClaimWithClient = Claim & {
  client: Pick<Client, "id" | "name">;
  policy: Pick<Policy, "type" | "insurer"> | null;
};

export function getAllClaims(): ClaimWithClient[] {
  return all<Row & Claim>(
    `SELECT cl.*, c.id AS c_id, c.name AS c_name, p.type AS p_type, p.insurer AS p_insurer
       FROM claims cl
       JOIN clients c ON c.id = cl.client_id
       LEFT JOIN policies p ON p.id = cl.policy_id
      ORDER BY cl.date DESC`,
  ).map((r) => ({
    ...(r as unknown as Claim),
    client: { id: r.c_id as string, name: r.c_name as string },
    policy: r.p_type
      ? { type: r.p_type as PolicyType, insurer: r.p_insurer as string }
      : null,
  }));
}

// ---------------------------------------------------------------------------
// Busca global
// ---------------------------------------------------------------------------
export interface SearchResult {
  type: "cliente" | "apolice";
  id: string;
  href: string;
  title: string;
  subtitle: string;
}

export function search(q: string): SearchResult[] {
  const term = q.trim();
  if (!term) return [];
  const like = `%${term}%`;

  const clients = all<{ id: string; name: string; city: string | null; state: string | null }>(
    `SELECT id, name, city, state FROM clients
      WHERE name LIKE ? OR email LIKE ? OR cpf LIKE ? LIMIT 8`,
    [like, like, like],
  );
  const policies = all<{ id: string; client_id: string; type: string; insurer: string; client_name: string }>(
    `SELECT p.id, p.client_id, p.type, p.insurer, c.name AS client_name
       FROM policies p JOIN clients c ON c.id = p.client_id
      WHERE p.insurer LIKE ? OR p.policy_number LIKE ? LIMIT 8`,
    [like, like],
  );

  const results: SearchResult[] = [];
  for (const c of clients) {
    results.push({
      type: "cliente",
      id: c.id,
      href: `/clientes/${c.id}`,
      title: c.name,
      subtitle: [c.city, c.state].filter(Boolean).join("/") || "Cliente",
    });
  }
  for (const p of policies) {
    results.push({
      type: "apolice",
      id: p.id,
      href: `/clientes/${p.client_id}`,
      title: `${p.insurer} • ${p.type}`,
      subtitle: p.client_name ?? "Apólice",
    });
  }
  return results;
}

// ===========================================================================
// Mutações
// ===========================================================================

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export interface ClientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  city?: string | null;
  state?: string | null;
  birthdate?: string | null;
  tags?: string[];
  notes?: string | null;
}

export function createClient(
  input: ClientInput,
): { ok: true; id: string } | { ok: false; error: string } {
  if (!input.name?.trim()) return { ok: false, error: "Nome é obrigatório" };
  const id = uuid();
  run(
    `INSERT INTO clients (id, name, email, phone, cpf, city, state, birthdate, tags, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.email ?? null,
      input.phone ?? null,
      input.cpf ?? null,
      input.city ?? null,
      input.state ?? null,
      input.birthdate || null,
      JSON.stringify(input.tags ?? []),
      input.notes ?? null,
      nowISO(),
    ],
  );
  touch();
  return { ok: true, id };
}

export function updateClient(id: string, input: ClientInput): { ok: boolean; error?: string } {
  run(
    `UPDATE clients SET name = ?, email = ?, phone = ?, cpf = ?, city = ?, state = ?,
            birthdate = ?, tags = ?, notes = ? WHERE id = ?`,
    [
      input.name.trim(),
      input.email ?? null,
      input.phone ?? null,
      input.cpf ?? null,
      input.city ?? null,
      input.state ?? null,
      input.birthdate || null,
      JSON.stringify(input.tags ?? []),
      input.notes ?? null,
      id,
    ],
  );
  touch();
  return { ok: true };
}

export async function deleteClient(id: string): Promise<{ ok: boolean }> {
  // remove blobs de documentos e PDFs de cotação antes do cascade
  const docs = all<{ file_id: string | null }>(
    "SELECT file_id FROM documents WHERE client_id = ?",
    [id],
  );
  const pdfs = all<{ pdf_file_id: string | null }>(
    `SELECT o.pdf_file_id FROM quote_options o
      JOIN quotes q ON q.id = o.quote_id WHERE q.client_id = ?`,
    [id],
  );
  for (const d of docs) await files.deleteFile(d.file_id);
  for (const p of pdfs) await files.deleteFile(p.pdf_file_id);
  run("DELETE FROM clients WHERE id = ?", [id]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Relacionamento (comentários)
// ---------------------------------------------------------------------------
export function addComment(
  clientId: string,
  channel: Channel,
  body: string,
): { ok: boolean; error?: string } {
  if (!body.trim()) return { ok: false, error: "Escreva um comentário" };
  run(
    "INSERT INTO comments (id, client_id, channel, body, created_at) VALUES (?, ?, ?, ?, ?)",
    [uuid(), clientId, channel, body.trim(), nowISO()],
  );
  touch();
  return { ok: true };
}

export function deleteComment(id: string) {
  run("DELETE FROM comments WHERE id = ?", [id]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sinistros
// ---------------------------------------------------------------------------
export function addClaim(input: {
  clientId: string;
  policyId?: string | null;
  date: string;
  description: string;
  amount: number;
  status?: ClaimStatus;
}): { ok: boolean; error?: string } {
  run(
    `INSERT INTO claims (id, client_id, policy_id, date, description, amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      input.clientId,
      input.policyId || null,
      input.date || todayISO(),
      input.description,
      input.amount,
      input.status ?? "aberto",
      nowISO(),
    ],
  );
  touch();
  return { ok: true };
}

export function updateClaimStatus(id: string, status: ClaimStatus) {
  run("UPDATE claims SET status = ? WHERE id = ?", [status, id]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Documentos (arquivos locais no IndexedDB)
// ---------------------------------------------------------------------------
export async function uploadDocument(
  clientId: string,
  category: DocCategory,
  file: File,
): Promise<{ ok: boolean; error?: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo" };
  const stored = await files.saveFile(file);
  run(
    `INSERT INTO documents (id, client_id, name, category, file_id, file_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), clientId, file.name, category, stored.id, file.size, nowISO()],
  );
  touch();
  return { ok: true };
}

export async function deleteDocument(id: string, fileId: string | null) {
  await files.deleteFile(fileId);
  run("DELETE FROM documents WHERE id = ?", [id]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Parcelas
// ---------------------------------------------------------------------------
export function togglePaidInstallment(id: string, paid: boolean) {
  run("UPDATE installments SET status = ?, paid_at = ? WHERE id = ?", [
    paid ? "paga" : "pendente",
    paid ? todayISO() : null,
    id,
  ]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cotações (multi-seguradora)
// ---------------------------------------------------------------------------
export function createQuote(input: {
  clientId: string;
  type: PolicyType;
  notes?: string | null;
}): { ok: true; id: string } | { ok: false; error: string } {
  const id = uuid();
  run(
    `INSERT INTO quotes (id, client_id, type, status, policy_id, notes, created_at)
     VALUES (?, ?, ?, 'aberta', NULL, ?, ?)`,
    [id, input.clientId, input.type, input.notes ?? null, nowISO()],
  );
  touch();
  return { ok: true, id };
}

export function updateQuote(
  id: string,
  input: { type: PolicyType; notes?: string | null },
): { ok: boolean; error?: string } {
  run("UPDATE quotes SET type = ?, notes = ? WHERE id = ?", [
    input.type,
    input.notes ?? null,
    id,
  ]);
  touch();
  return { ok: true };
}

export function updateQuoteOption(
  id: string,
  input: {
    insurer: string;
    premium: number;
    coverage?: string | null;
    installmentsCount: number;
    paymentMethod?: PaymentMethod | null;
  },
): { ok: true } | { ok: false; error: string } {
  if (!input.insurer.trim()) return { ok: false, error: "Informe a seguradora" };
  run(
    `UPDATE quote_options SET insurer = ?, premium = ?, coverage = ?,
            installments_count = ?, payment_method = ? WHERE id = ?`,
    [
      input.insurer.trim(),
      input.premium,
      input.coverage ?? null,
      Math.max(1, Math.round(input.installmentsCount || 1)),
      input.paymentMethod ?? null,
      id,
    ],
  );
  touch();
  return { ok: true };
}

export async function addQuoteOption(
  quoteId: string,
  input: {
    insurer: string;
    premium: number;
    coverage?: string | null;
    installmentsCount: number;
    paymentMethod?: PaymentMethod | null;
    pdf?: File | null;
  },
): Promise<{ ok: true; option: QuoteOption } | { ok: false; error: string }> {
  if (!input.insurer.trim()) return { ok: false, error: "Informe a seguradora" };

  let pdfFileId: string | null = null;
  let pdfName: string | null = null;
  if (input.pdf && input.pdf.size > 0) {
    const stored = await files.saveFile(input.pdf);
    pdfFileId = stored.id;
    pdfName = input.pdf.name;
  }

  const id = uuid();
  run(
    `INSERT INTO quote_options (id, quote_id, insurer, premium, coverage,
            installments_count, payment_method, pdf_file_id, pdf_name, is_best, chosen, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [
      id,
      quoteId,
      input.insurer.trim(),
      input.premium,
      input.coverage ?? null,
      Math.max(1, Math.round(input.installmentsCount || 1)),
      input.paymentMethod ?? null,
      pdfFileId,
      pdfName,
      nowISO(),
    ],
  );
  touch();
  const row = get("SELECT * FROM quote_options WHERE id = ?", [id])!;
  return { ok: true, option: mapOption(row) };
}

export function markBestOption(quoteId: string, optionId: string) {
  run("UPDATE quote_options SET is_best = 0 WHERE quote_id = ?", [quoteId]);
  run("UPDATE quote_options SET is_best = 1 WHERE id = ?", [optionId]);
  touch();
  return { ok: true };
}

export async function deleteQuoteOption(optionId: string) {
  const fileId = scalar<string>(
    "SELECT pdf_file_id FROM quote_options WHERE id = ?",
    [optionId],
  );
  await files.deleteFile(fileId);
  run("DELETE FROM quote_options WHERE id = ?", [optionId]);
  touch();
  return { ok: true };
}

export async function deleteQuote(quoteId: string) {
  const pdfs = all<{ pdf_file_id: string | null }>(
    "SELECT pdf_file_id FROM quote_options WHERE quote_id = ?",
    [quoteId],
  );
  for (const p of pdfs) await files.deleteFile(p.pdf_file_id);
  run("DELETE FROM quotes WHERE id = ?", [quoteId]);
  touch();
  return { ok: true };
}

function insertInstallments(policyId: string, total: number, count: number, firstDue: string) {
  const base = Math.floor((total / count) * 100) / 100;
  let accumulated = 0;
  for (let n = 1; n <= count; n++) {
    const amount = n === count ? Math.round((total - accumulated) * 100) / 100 : base;
    accumulated += base;
    run(
      `INSERT INTO installments (id, policy_id, number, amount, due_date, status, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'pendente', NULL, ?)`,
      [uuid(), policyId, n, amount, addMonthsISO(firstDue, n - 1), nowISO()],
    );
  }
}

/** Oficializa a cotação: cria a apólice + parcelas a partir da opção escolhida. */
export function officializeQuote(input: {
  quoteId: string;
  optionId: string;
  policyNumber?: string | null;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  startDate: string;
  endDate?: string | null;
  firstDueDate?: string | null;
  commissionRate?: number;
}): { ok: true; clientId: string; policyId: string } | { ok: false; error: string } {
  const quote = get<Quote>("SELECT * FROM quotes WHERE id = ?", [input.quoteId]);
  if (!quote) return { ok: false, error: "Cotação não encontrada" };

  const option = get("SELECT * FROM quote_options WHERE id = ?", [input.optionId]);
  if (!option) return { ok: false, error: "Opção não encontrada" };
  const opt = mapOption(option);

  const start = input.startDate || todayISO();
  const end = input.endDate || addYearsISO(start, 1);
  const count = Math.max(1, Math.round(input.installmentsCount || 1));

  // 1) cria a apólice
  const policyId = uuid();
  run(
    `INSERT INTO policies (id, client_id, type, insurer, policy_number, premium,
            commission_rate, payment_method, installments_count, start_date, end_date,
            status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vigente', ?, ?)`,
    [
      policyId,
      quote.client_id,
      quote.type,
      opt.insurer,
      input.policyNumber ?? null,
      opt.premium,
      input.commissionRate ?? 10,
      input.paymentMethod,
      count,
      start,
      end,
      opt.coverage,
      nowISO(),
    ],
  );

  // 2) gera as parcelas
  insertInstallments(policyId, Number(opt.premium), count, input.firstDueDate || start);

  // 3) atualiza a cotação e a opção escolhida
  run("UPDATE quote_options SET chosen = 0 WHERE quote_id = ?", [input.quoteId]);
  run("UPDATE quote_options SET chosen = 1 WHERE id = ?", [input.optionId]);
  run("UPDATE quotes SET status = 'oficializada', policy_id = ? WHERE id = ?", [
    policyId,
    input.quoteId,
  ]);

  touch();
  return { ok: true, clientId: quote.client_id, policyId };
}

// ---------------------------------------------------------------------------
// Apólice avulsa (cadastro direto, sem cotação)
// ---------------------------------------------------------------------------
export function createPolicy(input: {
  clientId: string;
  type: PolicyType;
  insurer: string;
  policyNumber?: string | null;
  premium: number;
  commissionRate?: number;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  startDate: string;
  endDate?: string | null;
  generateInstallments?: boolean;
}): { ok: boolean; error?: string } {
  const start = input.startDate || todayISO();
  const end = input.endDate || addYearsISO(start, 1);
  const count = Math.max(1, Math.round(input.installmentsCount || 1));

  const policyId = uuid();
  run(
    `INSERT INTO policies (id, client_id, type, insurer, policy_number, premium,
            commission_rate, payment_method, installments_count, start_date, end_date,
            status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vigente', NULL, ?)`,
    [
      policyId,
      input.clientId,
      input.type,
      input.insurer,
      input.policyNumber ?? null,
      input.premium,
      input.commissionRate ?? 10,
      input.paymentMethod,
      count,
      start,
      end,
      nowISO(),
    ],
  );

  if (input.generateInstallments !== false) {
    insertInstallments(policyId, input.premium, count, start);
  }

  touch();
  return { ok: true };
}

export function updatePolicy(
  id: string,
  input: {
    type: PolicyType;
    insurer: string;
    policyNumber?: string | null;
    premium: number;
    commissionRate?: number;
    paymentMethod: PaymentMethod;
    installmentsCount: number;
    startDate: string;
    endDate?: string | null;
    status: PolicyStatus;
  },
): { ok: boolean; error?: string } {
  if (!input.insurer.trim()) return { ok: false, error: "Informe a seguradora" };
  const start = input.startDate || todayISO();
  const end = input.endDate || addYearsISO(start, 1);
  run(
    `UPDATE policies SET type = ?, insurer = ?, policy_number = ?, premium = ?,
            commission_rate = ?, payment_method = ?, installments_count = ?,
            start_date = ?, end_date = ?, status = ? WHERE id = ?`,
    [
      input.type,
      input.insurer.trim(),
      input.policyNumber ?? null,
      input.premium,
      input.commissionRate ?? 10,
      input.paymentMethod,
      Math.max(1, Math.round(input.installmentsCount || 1)),
      start,
      end,
      input.status,
      id,
    ],
  );
  touch();
  return { ok: true };
}

export function deletePolicy(id: string) {
  run("DELETE FROM policies WHERE id = ?", [id]);
  touch();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------
export function setGoal(month: string, target: number) {
  run(
    `INSERT INTO goals (id, month, target, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET target = excluded.target`,
    [uuid(), month, target, nowISO()],
  );
  touch();
  return { ok: true };
}
