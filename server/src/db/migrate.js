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

// Extended film stock catalog (sourced from analog.cafe/app/all-film)
// ADOX
insertStock.run(30, 'ADOX',          'CMS 20 II Pro',           20,   'BW');
insertStock.run(31, 'ADOX',          'HR-50',                   50,   'BW');
insertStock.run(32, 'ADOX',          'CHS 100 II',              100,  'BW');
insertStock.run(33, 'ADOX',          'Scala 50',                50,   'BW');
insertStock.run(34, 'ADOX',          'Color Mission 200',       200,  'C41');
// Agfa
insertStock.run(35, 'Agfa',          'Copex Rapid',             50,   'BW');
insertStock.run(36, 'Agfa Photo',    'APX 100',                 100,  'BW');
insertStock.run(37, 'Agfa Photo',    'APX 200',                 200,  'BW');
insertStock.run(38, 'Agfa Photo',    'APX 400',                 400,  'BW');
insertStock.run(39, 'Agfa Photo',    'Color 400',               400,  'C41');
// Bergger
insertStock.run(40, 'Bergger',       'Pancro 400',              400,  'BW');
// CatLABS
insertStock.run(41, 'CatLABS',       'X Film 80',               80,   'BW');
insertStock.run(42, 'CatLABS',       'X Film 320',              320,  'BW');
// CineStill
insertStock.run(43, 'CineStill',     'bwXX',                    250,  'BW');
insertStock.run(44, 'CineStill',     'Red Rum',                 200,  'C41');
// dubblefilm
insertStock.run(45, 'dubblefilm',    'Daily Black & White',     400,  'BW');
insertStock.run(46, 'dubblefilm',    'Apollo',                  200,  'C41');
insertStock.run(47, 'dubblefilm',    'Daily Color',             400,  'C41');
// FILM Ferrania
insertStock.run(48, 'FILM Ferrania', 'Orto 50',                 50,   'BW');
insertStock.run(49, 'FILM Ferrania', 'P30',                     80,   'BW');
insertStock.run(50, 'FILM Ferrania', 'P33',                     160,  'BW');
// Flic Film
insertStock.run(51, 'Flic Film',     'Wolfen 100',              100,  'BW');
insertStock.run(52, 'Flic Film',     'UltraPan 100',            100,  'BW');
insertStock.run(53, 'Flic Film',     'UltraPan 400',            400,  'BW');
insertStock.run(54, 'Flic Film',     'Cine Color 50D',          50,   'ECN2');
insertStock.run(55, 'Flic Film',     'Cine Color 500T',         500,  'ECN2');
insertStock.run(56, 'Flic Film',     'Elektra 100',             100,  'C41');
insertStock.run(57, 'Flic Film',     'Aurora 400',              400,  'C41');
insertStock.run(58, 'Flic Film',     'Aurora 800',              800,  'C41');
insertStock.run(59, 'Flic Film',     'Chrome 100',              100,  'E6');
// Foma
insertStock.run(60, 'Foma',          'Retropan 320 Soft',       320,  'BW');
insertStock.run(61, 'Foma',          'Foma Ortho 400',          400,  'BW');
// FPP
insertStock.run(62, 'FPP',           'Dracula',                 64,   'BW');
insertStock.run(63, 'FPP',           'WolfMan',                 100,  'BW');
insertStock.run(64, 'FPP',           'Frankenstein',            200,  'BW');
insertStock.run(65, 'FPP',           'The Mummy 400',           400,  'BW');
insertStock.run(66, 'FPP',           'Derev Pan 100',           100,  'BW');
insertStock.run(67, 'FPP',           'Derev Pan 200',           200,  'BW');
insertStock.run(68, 'FPP',           'Derev Pan 400',           400,  'BW');
insertStock.run(69, 'FPP',           'Svema FN64',              64,   'BW');
insertStock.run(70, 'FPP',           'Svema Foto 100',          100,  'BW');
insertStock.run(71, 'FPP',           'Svema Foto 200',          200,  'BW');
insertStock.run(72, 'FPP',           'Svema Foto 400',          400,  'BW');
insertStock.run(73, 'FPP',           'Retrochrome 400',         400,  'E6');
// Fujifilm
insertStock.run(74, 'Fujifilm',      'Neopan 100 Acros II',     100,  'BW');
insertStock.run(75, 'Fujifilm',      'Fujicolor 100',           100,  'C41');
insertStock.run(76, 'Fujifilm',      'Fujicolor 200',           200,  'C41');
insertStock.run(77, 'Fujifilm',      'Fujifilm 400',            400,  'C41');
// Harman
insertStock.run(78, 'Harman',        'Phoenix 200',             200,  'C41');
insertStock.run(79, 'Harman',        'Phoenix II 200',          200,  'C41');
insertStock.run(80, 'Harman',        'RED 125',                 125,  'C41');
insertStock.run(81, 'Harman',        'Switch Azure 125',        125,  'C41');
insertStock.run(82, 'Harman',        'Phoenix 125',             125,  'C41');
// Ilford (additional — HP5, FP4, Delta, PanF already seeded above)
insertStock.run(83, 'Ilford',        'XP2 Super',               400,  'C41');
insertStock.run(84, 'Ilford',        'SFX 200',                 200,  'BW');
insertStock.run(85, 'Ilford',        'ORTHO Plus',              80,   'BW');
insertStock.run(86, 'Ilford',        'PAN 100',                 100,  'BW');
insertStock.run(87, 'Ilford',        'PAN 400',                 400,  'BW');
insertStock.run(88, 'Ilford',        'Ilfocolor 400 Vintage Tone', 400, 'C41');
insertStock.run(89, 'Ilford',        'Ilfochrome 100',          100,  'E6');
// JCH
insertStock.run(90, 'JCH',           'Streetpan 400',           400,  'BW');
// Kentmere
insertStock.run(91, 'Kentmere',      'PAN 100',                 100,  'BW');
insertStock.run(92, 'Kentmere',      'PAN 200',                 200,  'BW');
insertStock.run(93, 'Kentmere',      'PAN 400',                 400,  'BW');
// Kodak (additional — Portra/Gold/ColorPlus/Ultramax/Ektar/TriX/TMax already seeded)
insertStock.run(94, 'Kodak',         'Kodacolor 100',           100,  'C41');
insertStock.run(95, 'Kodak',         'Kodacolor 200',           200,  'C41');
insertStock.run(96, 'Kodak',         'ProImage 100',            100,  'C41');
insertStock.run(97, 'Kodak',         'T-Max P3200',             3200, 'BW');
insertStock.run(98, 'Kodak',         'UltraMax 800',            800,  'C41');
insertStock.run(99, 'Kodak',         'Ektachrome E100',         100,  'E6');
// Kono!
insertStock.run(100, 'Kono!',        'Monolit 64',              64,   'BW');
insertStock.run(101, 'Kono!',        'Kolorit 125 Tungsten',    125,  'C41');
insertStock.run(102, 'Kono!',        'Rotwild 400',             400,  'C41');
// Kosmo Foto
insertStock.run(103, 'Kosmo Foto',   'Mono 100',                100,  'BW');
insertStock.run(104, 'Kosmo Foto',   'Agent Shadow 400',        400,  'BW');
// Lomography
insertStock.run(105, 'Lomography',   'Earl Grey',               100,  'BW');
insertStock.run(106, 'Lomography',   'Lady Grey',               400,  'BW');
insertStock.run(107, 'Lomography',   'Berlin 400',              400,  'BW');
insertStock.run(108, 'Lomography',   'Potsdam 100',             100,  'BW');
insertStock.run(109, 'Lomography',   'Fantome Kino',            8,    'BW');
insertStock.run(110, 'Lomography',   'Babylon Kino',            13,   'BW');
insertStock.run(111, 'Lomography',   'Color Negative 100',      100,  'C41');
insertStock.run(112, 'Lomography',   'Color Negative 400',      400,  'C41');
insertStock.run(113, 'Lomography',   'Color Negative 800',      800,  'C41');
insertStock.run(114, 'Lomography',   'LomoChrome Purple XR',    null, 'C41');
insertStock.run(115, 'Lomography',   'LomoChrome Metropolis XR',null, 'C41');
insertStock.run(116, 'Lomography',   'LomoChrome Turquoise XR', null, 'C41');
insertStock.run(117, 'Lomography',   "LomoChrome Color '92",    400,  'C41');
insertStock.run(118, 'Lomography',   'Redscale XR',             null, 'C41');
// Lucky
insertStock.run(119, 'Lucky',        'SHD 100',                 100,  'BW');
insertStock.run(120, 'Lucky',        'C200',                    200,  'C41');
// Optik Oldschool
insertStock.run(121, 'Optik Oldschool','Opticolour 200',        200,  'C41');
// Oriental
insertStock.run(122, 'Oriental',     'Seagull 100',             100,  'BW');
// Original Wolfen
insertStock.run(123, 'Original Wolfen','NC 500',                400,  'C41');
insertStock.run(124, 'Original Wolfen','NC 400',                400,  'C41');
// Rollei (SuperPan 200 already seeded)
insertStock.run(125, 'Rollei',       'RPX 25',                  25,   'BW');
insertStock.run(126, 'Rollei',       'RPX 100',                 100,  'BW');
insertStock.run(127, 'Rollei',       'RPX 400',                 400,  'BW');
insertStock.run(128, 'Rollei',       'Ortho 25 Plus',           25,   'BW');
insertStock.run(129, 'Rollei',       'Retro 80S',               80,   'BW');
insertStock.run(130, 'Rollei',       'Retro 400S',              400,  'BW');
insertStock.run(131, 'Rollei',       'Infrared 400',            400,  'BW');
insertStock.run(132, 'Rollei',       'Redbird 400',             400,  'C41');
insertStock.run(133, 'Rollei',       'CrossBird 200',           200,  'E6');
// Shanghai
insertStock.run(134, 'Shanghai',     'GP3 100 PAN',             100,  'BW');
insertStock.run(135, 'Shanghai',     'GP3 400 PAN',             400,  'BW');
// Silberra
insertStock.run(136, 'Silberra',     'Pan 50',                  50,   'BW');
insertStock.run(137, 'Silberra',     'Ultima 100',              100,  'BW');
insertStock.run(138, 'Silberra',     'Pan 160',                 160,  'BW');
insertStock.run(139, 'Silberra',     'Pan 200',                 200,  'BW');
insertStock.run(140, 'Silberra',     'Color 50',                50,   'C41');
insertStock.run(141, 'Silberra',     'Color 100',               100,  'C41');
insertStock.run(142, 'Silberra',     'Color 160',               160,  'C41');
// Svema
insertStock.run(143, 'Svema',        'FN 64',                   64,   'BW');
insertStock.run(144, 'Svema',        'Foto 100',                100,  'BW');
insertStock.run(145, 'Svema',        'Foto 200',                200,  'BW');
insertStock.run(146, 'Svema',        'Foto 400',                400,  'BW');
insertStock.run(147, 'Svema',        'Color 125',               125,  'C41');

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
