import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const { process_id, active } = req.query;
  let sql = 'SELECT c.*, p.name as process_name FROM chemicals c JOIN processes p ON c.process_id = p.id WHERE 1=1';
  const params = [];
  if (process_id) { sql += ' AND c.process_id = ?'; params.push(process_id); }
  if (active !== undefined) { sql += ' AND c.active = ?'; params.push(active === 'true' ? 1 : 0); }
  sql += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(
    'SELECT c.*, p.name as process_name FROM chemicals c JOIN processes p ON c.process_id = p.id WHERE c.id = ?'
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, process_id, role, capacity_rolls, volume_ml, date_mixed, expiry_date, notes } = req.body;
  if (!name || !process_id || !role) return res.status(400).json({ error: 'name, process_id, and role required' });
  const result = db.prepare(`
    INSERT INTO chemicals (name, process_id, role, capacity_rolls, volume_ml, date_mixed, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, process_id, role, capacity_rolls ?? null, volume_ml ?? null, date_mixed ?? null, expiry_date ?? null, notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM chemicals WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const chemical = db.prepare('SELECT * FROM chemicals WHERE id = ?').get(req.params.id);
  if (!chemical) return res.status(404).json({ error: 'Not found' });

  const allowed = ['name', 'role', 'capacity_rolls', 'rolls_processed', 'volume_ml', 'date_mixed', 'expiry_date', 'notes', 'active'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No valid fields to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE chemicals SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM chemicals WHERE id = ?').get(req.params.id));
});

// Increment rolls processed (used after a roll is developed)
router.post('/:id/increment', (req, res) => {
  const chemical = db.prepare('SELECT * FROM chemicals WHERE id = ?').get(req.params.id);
  if (!chemical) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE chemicals SET rolls_processed = rolls_processed + 1 WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM chemicals WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM chemicals WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

export default router;
