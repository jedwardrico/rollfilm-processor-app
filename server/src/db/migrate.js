import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../../data/rollfilm.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS chemicals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    process_id TEXT NOT NULL REFERENCES processes(id),
    role TEXT NOT NULL CHECK(role IN ('developer','stop','fixer','bleach','blix','stabilizer','wash','other')),
    capacity_rolls INTEGER,
    rolls_processed INTEGER NOT NULL DEFAULT 0,
    volume_ml INTEGER,
    date_mixed TEXT,
    expiry_date TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rolls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    human_id TEXT NOT NULL UNIQUE,
    film_stock TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('135','120','4x5','other')),
    process_id TEXT NOT NULL REFERENCES processes(id),
    frames INTEGER,
    date_shot TEXT,
    date_processed TEXT,
    date_scanned TEXT,
    status TEXT NOT NULL DEFAULT 'shot' CHECK(status IN ('shot','processing','processed','scanning','scanned','archived')),
    chemical_id INTEGER REFERENCES chemicals(id),
    procedure_id INTEGER,
    push_pull INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    binder_location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS procedures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    process_id TEXT NOT NULL REFERENCES processes(id),
    film_stock TEXT,
    developer TEXT,
    temperature_c REAL,
    push_pull INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS procedure_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    procedure_id INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    temperature_c REAL,
    agitation_notes TEXT,
    chemical_role TEXT
  );

  CREATE TABLE IF NOT EXISTS roll_sequences (
    process_id TEXT PRIMARY KEY REFERENCES processes(id),
    year INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0
  );
`);

// Seed default processes
const insertProcess = db.prepare(
  'INSERT OR IGNORE INTO processes (id, name, description) VALUES (?, ?, ?)'
);
insertProcess.run('C41', 'C-41', 'Color negative film process');
insertProcess.run('BW', 'Black & White', 'Black and white negative process');
insertProcess.run('E6', 'E-6', 'Color reversal (slide) film process');
insertProcess.run('ECN2', 'ECN-2', 'Motion picture color negative process');
insertProcess.run('RA4', 'RA-4', 'Color photographic paper process');

// Seed default C41 procedure
const insertProc = db.prepare(
  'INSERT OR IGNORE INTO procedures (id, name, process_id, temperature_c, notes) VALUES (?, ?, ?, ?, ?)'
);
insertProc.run(1, 'Standard C-41', 'C41', 38.0, 'Standard Kodak C-41 process');

const insertStep = db.prepare(
  'INSERT OR IGNORE INTO procedure_steps (id, procedure_id, step_order, name, duration_seconds, temperature_c, agitation_notes, chemical_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
insertStep.run(1, 1, 1, 'Developer', 195, 38.0, 'Continuous first 30s, then 4 inversions every 30s', 'developer');
insertStep.run(2, 1, 2, 'Blix', 390, 38.0, '4 inversions every 30s', 'blix');
insertStep.run(3, 1, 3, 'Wash', 180, null, 'Running water or 4 changes', 'wash');
insertStep.run(4, 1, 4, 'Stabilizer', 60, null, '4 inversions, do not wash after', 'stabilizer');

// Seed standard B&W procedure (D-76 1:1)
insertProc.run(2, 'D-76 1:1 (ISO 400)', 'BW', 20.0, 'Kodak D-76 diluted 1:1 for ISO 400 film');
insertStep.run(5, 2, 1, 'Developer', 720, 20.0, 'Continuous first 30s, then 4 inversions every 60s', 'developer');
insertStep.run(6, 2, 2, 'Stop Bath', 60, null, 'Continuous agitation', 'stop');
insertStep.run(7, 2, 3, 'Fixer', 300, null, '4 inversions every 30s', 'fixer');
insertStep.run(8, 2, 4, 'Wash', 600, null, 'Running water or Ilford wash method', 'wash');
insertStep.run(9, 2, 5, 'Photoflo', 60, null, 'Gentle inversion, do not agitate vigorously', 'other');

db.close();
console.log('Migration complete. Database ready at', DB_PATH);
