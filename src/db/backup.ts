// Backup — exporta e importa toda a base em JSON, incluindo os arquivos
// (documentos e PDFs) em base64. Compatível com o formato v1 do app original
// (que não tinha arquivos embutidos).
import { all, persistNow, run } from "./database";
import { dbEvents } from "./repo";
import { schedulePersist } from "./database";
import * as files from "./files";

export const TABLES = [
  "clients",
  "policies",
  "quotes",
  "quote_options",
  "installments",
  "claims",
  "documents",
  "comments",
  "goals",
] as const;

type TableName = (typeof TABLES)[number];

// Colunas por tabela (na ordem do INSERT) — usadas na importação.
const COLUMNS: Record<TableName, string[]> = {
  clients: ["id", "name", "email", "phone", "cpf", "city", "state", "birthdate", "tags", "notes", "created_at"],
  policies: ["id", "client_id", "type", "insurer", "policy_number", "premium", "commission_rate", "payment_method", "installments_count", "start_date", "end_date", "status", "notes", "created_at"],
  quotes: ["id", "client_id", "type", "status", "policy_id", "notes", "created_at"],
  quote_options: ["id", "quote_id", "insurer", "premium", "coverage", "installments_count", "payment_method", "pdf_file_id", "pdf_name", "is_best", "chosen", "created_at"],
  installments: ["id", "policy_id", "number", "amount", "due_date", "status", "paid_at", "created_at"],
  claims: ["id", "client_id", "policy_id", "date", "description", "amount", "status", "created_at"],
  documents: ["id", "client_id", "name", "category", "file_id", "file_size", "created_at"],
  comments: ["id", "client_id", "channel", "body", "created_at"],
  goals: ["id", "month", "target", "created_at"],
};

export interface BackupBundle {
  app: string;
  version: number;
  exported_at: string;
  data: Record<string, Record<string, unknown>[]>;
  files?: { id: string; name: string; type: string; data_base64: string }[];
}

export async function getExportBundle(): Promise<BackupBundle> {
  await persistNow();
  const bundle: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) bundle[t] = all(`SELECT * FROM ${t}`);

  // embute os arquivos referenciados
  const fileIds = new Set<string>();
  for (const d of bundle.documents) if (d.file_id) fileIds.add(d.file_id as string);
  for (const o of bundle.quote_options) if (o.pdf_file_id) fileIds.add(o.pdf_file_id as string);

  const embedded: NonNullable<BackupBundle["files"]> = [];
  for (const id of fileIds) {
    const rec = await files.getFile(id);
    if (!rec) continue;
    embedded.push({
      id: rec.id,
      name: rec.name,
      type: rec.type,
      data_base64: await files.fileToBase64(rec),
    });
  }

  return {
    app: "apolice",
    version: 2,
    exported_at: new Date().toISOString(),
    data: bundle,
    files: embedded,
  };
}

export async function downloadBackup() {
  const bundle = await getExportBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apolice-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Normaliza uma linha vinda do backup para o INSERT local. */
function normalizeRow(table: TableName, r: Record<string, unknown>): unknown[] {
  const row = { ...r };
  delete row.owner_id; // backups do app original (Supabase) têm owner_id
  if (table === "clients") {
    // tags: array (v1/Postgres) ou string JSON (local)
    row.tags = JSON.stringify(
      Array.isArray(row.tags) ? row.tags : JSON.parse((row.tags as string) || "[]"),
    );
  }
  if (table === "quote_options") {
    row.is_best = row.is_best ? 1 : 0;
    row.chosen = row.chosen ? 1 : 0;
    // v1 usava pdf_url/pdf_path (URLs remotas — não recuperáveis offline)
    row.pdf_file_id = row.pdf_file_id ?? null;
  }
  if (table === "documents") {
    row.file_id = row.file_id ?? null;
  }
  return COLUMNS[table].map((c) => {
    const v = row[c];
    if (v === undefined || v === null) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    return v as string | number;
  });
}

export async function importBundle(
  json: string,
): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
  let parsed: BackupBundle;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON inválido" };
  }
  const data = parsed.data;
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Formato de backup não reconhecido" };
  }

  // apaga base atual (ordem inversa respeita as FKs)
  for (const t of [...TABLES].reverse()) run(`DELETE FROM ${t}`);

  const counts: Record<string, number> = {};
  try {
    for (const t of TABLES) {
      const rows = data[t] ?? [];
      for (const r of rows) {
        const values = normalizeRow(t, r);
        const placeholders = COLUMNS[t].map(() => "?").join(", ");
        run(
          `INSERT INTO ${t} (${COLUMNS[t].join(", ")}) VALUES (${placeholders})`,
          values as (string | number | null)[],
        );
      }
      counts[t] = rows.length;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // restaura os arquivos embutidos (formato v2)
  for (const f of parsed.files ?? []) {
    await files.saveFileFromBase64(f);
  }

  schedulePersist();
  dbEvents.dispatchEvent(new Event("change"));
  return { ok: true, counts };
}
