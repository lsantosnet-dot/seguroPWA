// Schema do banco SQLite local — espelha o schema Postgres do app original,
// sem owner_id (app single-user, sem autenticação).
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  cpf         TEXT,
  city        TEXT,
  state       TEXT,
  birthdate   TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  notes       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  id                 TEXT PRIMARY KEY,
  client_id          TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type               TEXT NOT NULL,
  insurer            TEXT NOT NULL,
  policy_number      TEXT,
  premium            REAL NOT NULL DEFAULT 0,
  commission_rate    REAL NOT NULL DEFAULT 10,
  payment_method     TEXT,
  installments_count INTEGER NOT NULL DEFAULT 1,
  start_date         TEXT,
  end_date           TEXT,
  status             TEXT NOT NULL DEFAULT 'vigente',
  notes              TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS policies_client_idx ON policies (client_id);
CREATE INDEX IF NOT EXISTS policies_end_idx    ON policies (end_date);

CREATE TABLE IF NOT EXISTS quotes (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aberta',
  policy_id         TEXT REFERENCES policies(id) ON DELETE SET NULL,
  renews_policy_id  TEXT REFERENCES policies(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quotes_client_idx ON quotes (client_id);

CREATE TABLE IF NOT EXISTS quote_options (
  id                 TEXT PRIMARY KEY,
  quote_id           TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  insurer            TEXT NOT NULL,
  premium            REAL NOT NULL DEFAULT 0,
  coverage           TEXT,
  installments_count INTEGER NOT NULL DEFAULT 1,
  payment_method     TEXT,
  pdf_file_id        TEXT,
  pdf_name           TEXT,
  is_best            INTEGER NOT NULL DEFAULT 0,
  chosen             INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quote_options_quote_idx ON quote_options (quote_id);

CREATE TABLE IF NOT EXISTS installments (
  id          TEXT PRIMARY KEY,
  policy_id   TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  number      INTEGER NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente',
  paid_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS installments_policy_idx ON installments (policy_id);
CREATE INDEX IF NOT EXISTS installments_due_idx    ON installments (due_date);

CREATE TABLE IF NOT EXISTS claims (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policy_id   TEXT REFERENCES policies(id) ON DELETE SET NULL,
  date        TEXT NOT NULL,
  description TEXT,
  amount      REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'aberto',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS claims_client_idx ON claims (client_id);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  file_id     TEXT,
  file_size   INTEGER,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_client_idx ON documents (client_id);

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL DEFAULT 'outros',
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_client_idx ON comments (client_id);

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT PRIMARY KEY,
  month       TEXT NOT NULL UNIQUE,
  target      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
`;
