import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function generateHumanId(processId) {
  const year = new Date().getFullYear();
  const seq = db.transaction(() => {
    const existing = db.prepare('SELECT * FROM roll_sequences WHERE process_id = ? AND year = ?').get(processId, year);
    if (existing) {
      db.prepare('UPDATE roll_sequences SET sequence = sequence + 1 WHERE process_id = ? AND year = ?').run(processId, year);
      return existing.sequence + 1;
    } else {
      db.prepare('INSERT INTO roll_sequences (process_id, year, sequence) VALUES (?, ?, 1)').run(processId, year);
      return 1;
    }
  })();
  return `${processId}-${year}-${String(seq).padStart(3, '0')}`;
}

router.get('/film-stocks', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT film_stock FROM rolls ORDER BY film_stock ASC'
  ).all();
  res.json(rows.map(r => r.film_stock));
});

router.get('/', (req, res) => {
  const { process_id, status, format } = req.query;
  let sql = `
    SELECT r.*, p.name as process_name
    FROM rolls r
    JOIN processes p ON r.process_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (process_id) { sql += ' AND r.process_id = ?'; params.push(process_id); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (format) { sql += ' AND r.format = ?'; params.push(format); }
  sql += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT r.*, p.name as process_name
    FROM rolls r
    JOIN processes p ON r.process_id = p.id
    WHERE r.id = ? OR r.human_id = ?
  `).get(req.params.id, req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { film_stock_id, format, process_id, frames, date_shot, notes, binder_location, push_pull } = req.body;
  let { film_stock } = req.body;

  if (!format || !process_id) return res.status(400).json({ error: 'format and process_id required' });
  if (!film_stock_id && !film_stock) return res.status(400).json({ error: 'film_stock or film_stock_id required' });

  const process = db.prepare('SELECT * FROM processes WHERE id = ?').get(process_id);
  if (!process) return res.status(400).json({ error: 'Invalid process_id' });

  if (film_stock_id) {
    const stock = db.prepare('SELECT * FROM film_stocks WHERE id = ?').get(film_stock_id);
    if (!stock) return res.status(400).json({ error: 'Invalid film_stock_id' });
    film_stock = film_stock || stock.name;
  }

  const human_id = generateHumanId(process_id);
  const result = db.prepare(`
    INSERT INTO rolls (human_id, film_stock, film_stock_id, format, process_id, frames, date_shot, notes, binder_location, push_pull)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(human_id, film_stock, film_stock_id ?? null, format, process_id, frames ?? null, date_shot ?? null, notes ?? null, binder_location ?? null, push_pull ?? 0);

  res.status(201).json(db.prepare('SELECT r.*, p.name as process_name FROM rolls r JOIN processes p ON r.process_id = p.id WHERE r.id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const roll = db.prepare('SELECT * FROM rolls WHERE id = ? OR human_id = ?').get(req.params.id, req.params.id);
  if (!roll) return res.status(404).json({ error: 'Not found' });

  const allowed = ['film_stock', 'film_stock_id', 'format', 'frames', 'date_shot', 'date_processed', 'date_scanned', 'status', 'chemical_id', 'procedure_id', 'push_pull', 'notes', 'binder_location'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No valid fields to update' });
  values.push(roll.id);
  db.prepare(`UPDATE rolls SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT r.*, p.name as process_name FROM rolls r JOIN processes p ON r.process_id = p.id WHERE r.id = ?').get(roll.id));
});

// Convenience: mark a roll as processed and auto-increment chemical usage
router.post('/:id/process', (req, res) => {
  const roll = db.prepare('SELECT * FROM rolls WHERE id = ? OR human_id = ?').get(req.params.id, req.params.id);
  if (!roll) return res.status(404).json({ error: 'Not found' });

  const { chemical_id, procedure_id } = req.body;
  const now = new Date().toISOString().split('T')[0];

  db.transaction(() => {
    const resolvedProcedureId = procedure_id ?? roll.procedure_id;
    db.prepare('UPDATE rolls SET status = ?, date_processed = ?, chemical_id = ?, procedure_id = ? WHERE id = ?')
      .run('processed', now, chemical_id ?? roll.chemical_id, resolvedProcedureId, roll.id);

    // Increment the manually selected chemical (if any)
    if (chemical_id) {
      db.prepare('UPDATE chemicals SET rolls_processed = rolls_processed + 1 WHERE id = ?').run(chemical_id);
    }

    // Increment every chemical assigned to steps of the procedure
    if (resolvedProcedureId) {
      const stepChemicals = db.prepare(
        'SELECT DISTINCT chemical_id FROM procedure_steps WHERE procedure_id = ? AND chemical_id IS NOT NULL'
      ).all(resolvedProcedureId);
      const incr = db.prepare('UPDATE chemicals SET rolls_processed = rolls_processed + 1 WHERE id = ?');
      for (const { chemical_id: cid } of stepChemicals) {
        // Avoid double-counting if the same chemical was also selected manually
        if (cid !== chemical_id) incr.run(cid);
      }
    }
  })();

  res.json(db.prepare('SELECT r.*, p.name as process_name FROM rolls r JOIN processes p ON r.process_id = p.id WHERE r.id = ?').get(roll.id));
});

export default router;
