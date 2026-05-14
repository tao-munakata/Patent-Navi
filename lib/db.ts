import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "patents.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS patents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT UNIQUE,
      publication_number TEXT,
      application_number TEXT,
      title TEXT,
      assignee TEXT,
      filing_date TEXT,
      registration_date TEXT,
      jplatpat_url TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  return _db;
}

export type PatentRow = {
  id: number;
  registration_number: string;
  publication_number: string;
  application_number: string;
  title: string;
  assignee: string;
  filing_date: string;
  registration_date: string;
  jplatpat_url: string;
  created_at: string;
  updated_at: string;
};

export function upsertPatent(p: Omit<PatentRow, "id" | "created_at" | "updated_at">) {
  const db = getDb();
  db.prepare(`
    INSERT INTO patents
      (registration_number, publication_number, application_number, title, assignee,
       filing_date, registration_date, jplatpat_url, updated_at)
    VALUES
      (@registration_number, @publication_number, @application_number, @title, @assignee,
       @filing_date, @registration_date, @jplatpat_url, datetime('now', 'localtime'))
    ON CONFLICT(registration_number) DO UPDATE SET
      publication_number  = excluded.publication_number,
      application_number  = excluded.application_number,
      title               = excluded.title,
      assignee            = excluded.assignee,
      filing_date         = excluded.filing_date,
      registration_date   = excluded.registration_date,
      jplatpat_url        = excluded.jplatpat_url,
      updated_at          = excluded.updated_at
  `).run(p);
}

export function listPatents(): PatentRow[] {
  return getDb().prepare(
    "SELECT * FROM patents ORDER BY updated_at DESC"
  ).all() as PatentRow[];
}
