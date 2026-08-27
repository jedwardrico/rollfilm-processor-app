import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const { process_id, active } = req.query;
  let sql = `
    SELECT fs.*, p.name as process_name
    FROM film_stocks fs
    JOIN processes p ON fs.process_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (process_id) { sql += ' AND fs.process_id = ?'; params.push(process_id); }
  if (active !== undefined) { sql += ' AND fs.active = ?'; params.push(active === 'false' ? 0 : 1); }
  sql += ' ORDER BY fs.brand ASC, fs.name ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT fs.*, p.name as process_name
    FROM film_stocks fs
    JOIN processes p ON fs.process_id = p.id
    WHERE fs.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { brand, name, iso, process_id, notes } = req.body;
  if (!brand || !name || !process_id) {
    return res.status(400).json({ error: 'brand, name, and process_id are required' });
  }
  const process = db.prepare('SELECT * FROM processes WHERE id = ?').get(process_id);
  if (!process) return res.status(400).json({ error: 'Invalid process_id' });

  const result = db.prepare(
    'INSERT INTO film_stocks (brand, name, iso, process_id, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(brand, name, iso ?? null, process_id, notes ?? null);

  res.status(201).json(db.prepare(`
    SELECT fs.*, p.name as process_name
    FROM film_stocks fs JOIN processes p ON fs.process_id = p.id
    WHERE fs.id = ?
  `).get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const stock = db.prepare('SELECT * FROM film_stocks WHERE id = ?').get(req.params.id);
  if (!stock) return res.status(404).json({ error: 'Not found' });

  const allowed = ['brand', 'name', 'iso', 'process_id', 'notes', 'active'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No valid fields to update' });
  values.push(stock.id);
  db.prepare(`UPDATE film_stocks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  res.json(db.prepare(`
    SELECT fs.*, p.name as process_name
    FROM film_stocks fs JOIN processes p ON fs.process_id = p.id
    WHERE fs.id = ?
  `).get(stock.id));
});

router.delete('/:id', (req, res) => {
  const stock = db.prepare('SELECT * FROM film_stocks WHERE id = ?').get(req.params.id);
  if (!stock) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM film_stocks WHERE id = ?').run(stock.id);
  res.status(204).end();
});

export default router;
