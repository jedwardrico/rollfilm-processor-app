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
  CREATE TABLE IF NOT EXISTS film_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    iso INTEGER,
    process_id TEXT NOT NULL REFERENCES processes(id),
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

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
    format TEXT NOT NULL CHECK(format IN ('135','120','127','220','4x5','other')),
    process_id TEXT NOT NULL REFERENCES processes(id),
    exposures INTEGER,
    date_shot TEXT,
    date_processed TEXT,
    date_scanned TEXT,
    status TEXT NOT NULL DEFAULT 'shot' CHECK(status IN ('shot','processing','processed','scanning','scanned','archived')),
    film_stock_id INTEGER REFERENCES film_stocks(id),
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
    chemical_role TEXT,
    chemical_id INTEGER REFERENCES chemicals(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS procedure_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    procedure_id INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    roll_count INTEGER NOT NULL DEFAULT 1,
    run_date TEXT NOT NULL DEFAULT (date('now')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roll_sequences (
    process_id TEXT PRIMARY KEY REFERENCES processes(id),
    year INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0
  );
`);

// Add chemical_id to procedure_steps if upgrading from an older schema
try {
  db.prepare('ALTER TABLE procedure_steps ADD COLUMN chemical_id INTEGER REFERENCES chemicals(id) ON DELETE SET NULL').run();
} catch { /* column already exists */ }

// Add film_stock_id to rolls if upgrading from an older schema
try {
  db.prepare('ALTER TABLE rolls ADD COLUMN film_stock_id INTEGER REFERENCES film_stocks(id)').run();
} catch { /* column already exists */ }

// Seed default processes
const insertProcess = db.prepare(
  'INSERT OR IGNORE INTO processes (id, name, description) VALUES (?, ?, ?)'
);
insertProcess.run('C41', 'C-41', 'Color negative film process');
insertProcess.run('BW', 'Black & White', 'Black and white negative process');
insertProcess.run('E6', 'E-6', 'Color reversal (slide) film process');
insertProcess.run('ECN2', 'ECN-2', 'Motion picture color negative process');
insertProcess.run('RA4', 'RA-4', 'Color photographic paper process');

// Seed common film stocks
const insertStock = db.prepare(
  'INSERT OR IGNORE INTO film_stocks (id, brand, name, iso, process_id) VALUES (?, ?, ?, ?, ?)'
);
// C-41 color negative
insertStock.run(1,  'Kodak',   'Kodak Portra 160',      160,  'C41');
insertStock.run(2,  'Kodak',   'Kodak Portra 400',      400,  'C41');
insertStock.run(3,  'Kodak',   'Kodak Portra 800',      800,  'C41');
insertStock.run(4,  'Kodak',   'Kodak Gold 200',        200,  'C41');
insertStock.run(5,  'Kodak',   'Kodak ColorPlus 200',   200,  'C41');
insertStock.run(6,  'Kodak',   'Kodak Ultramax 400',    400,  'C41');
insertStock.run(7,  'Kodak',   'Kodak Ektar 100',       100,  'C41');
insertStock.run(8,  'Fujifilm','Fujifilm Superia 400',  400,  'C41');
insertStock.run(9,  'Fujifilm','Fujifilm Superia 800',  800,  'C41');
insertStock.run(10, 'Fujifilm','Fujifilm Pro 400H',     400,  'C41');
insertStock.run(11, 'Fujifilm','Fujifilm Velvia 50',    50,   'E6');
insertStock.run(12, 'Fujifilm','Fujifilm Velvia 100',   100,  'E6');
insertStock.run(13, 'Fujifilm','Fujifilm Provia 100F',  100,  'E6');
// Black & white
insertStock.run(14, 'Ilford',  'Ilford HP5 Plus',       400,  'BW');
insertStock.run(15, 'Ilford',  'Ilford FP4 Plus',       125,  'BW');
insertStock.run(16, 'Ilford',  'Ilford Delta 100',      100,  'BW');
insertStock.run(17, 'Ilford',  'Ilford Delta 400',      400,  'BW');
insertStock.run(18, 'Ilford',  'Ilford Delta 3200',     3200, 'BW');
insertStock.run(19, 'Ilford',  'Ilford Pan F Plus',     50,   'BW');
insertStock.run(20, 'Kodak',   'Kodak Tri-X 400',       400,  'BW');
insertStock.run(21, 'Kodak',   'Kodak T-Max 100',       100,  'BW');
insertStock.run(22, 'Kodak',   'Kodak T-Max 400',       400,  'BW');
insertStock.run(23, 'Fomapan', 'Fomapan 100',           100,  'BW');
insertStock.run(24, 'Fomapan', 'Fomapan 200',           200,  'BW');
insertStock.run(25, 'Fomapan', 'Fomapan 400',           400,  'BW');
insertStock.run(26, 'Rollei',  'Rollei Superpan 200',   200,  'BW');
insertStock.run(27, 'Cinestill','Cinestill 800T',        800,  'C41');
insertStock.run(28, 'Cinestill','Cinestill 400D',        400,  'C41');
insertStock.run(29, 'Cinestill','Cinestill 50D',         50,   'C41');

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
