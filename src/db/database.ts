// Banco SQLite local no navegador via sql.js (WASM), persistido em IndexedDB.
// O arquivo inteiro do banco é exportado (Uint8Array) e salvo após cada
// mutação (com debounce) — volumes típicos de uma carteira de corretor são
// pequenos, então isso é rápido e simples.
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { SCHEMA } from "./schema";

const DB_KEY = "seguropwa-db";

let db: Database | null = null;

export async function openDatabase(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = await idbGet<Uint8Array>(DB_KEY);
  db = saved ? new SQL.Database(saved) : new SQL.Database();
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Migrações incrementais para bancos já persistidos (CREATE TABLE IF NOT EXISTS não adiciona colunas novas). */
function migrate(d: Database) {
  try {
    d.exec(
      "ALTER TABLE quotes ADD COLUMN renews_policy_id TEXT REFERENCES policies(id) ON DELETE SET NULL",
    );
  } catch {
    // coluna já existe
  }
}

function requireDb(): Database {
  if (!db) throw new Error("Banco ainda não inicializado");
  return db;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving = Promise.resolve();

/** Agenda a persistência do banco no IndexedDB (debounce de 250ms). */
export function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = requireDb().export();
    saving = saving.then(() => idbSet(DB_KEY, data));
  }, 250);
}

/** Persiste imediatamente (usado antes de exportar backup / fechar). */
export async function persistNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const data = requireDb().export();
  await (saving = saving.then(() => idbSet(DB_KEY, data)));
}

type Params = Record<string, SqlValue> | SqlValue[];

/** Executa um comando (INSERT/UPDATE/DELETE). */
export function run(sql: string, params?: Params) {
  const d = requireDb();
  const stmt = d.prepare(sql);
  try {
    if (params) stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
  }
}

/** Retorna todas as linhas como objetos. */
export function all<T = Record<string, unknown>>(sql: string, params?: Params): T[] {
  const d = requireDb();
  const stmt = d.prepare(sql);
  const rows: T[] = [];
  try {
    if (params) stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
  } finally {
    stmt.free();
  }
  return rows;
}

/** Retorna a primeira linha ou null. */
export function get<T = Record<string, unknown>>(sql: string, params?: Params): T | null {
  return all<T>(sql, params)[0] ?? null;
}

/** Valor escalar da primeira coluna da primeira linha. */
export function scalar<T extends SqlValue>(sql: string, params?: Params): T | null {
  const row = get<Record<string, T>>(sql, params);
  if (!row) return null;
  const k = Object.keys(row)[0];
  return row[k] ?? null;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
