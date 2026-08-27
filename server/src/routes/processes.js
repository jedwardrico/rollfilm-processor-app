import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM processes ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM processes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { id, name, description } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    db.prepare('INSERT INTO processes (id, name, description) VALUES (?, ?, ?)').run(id, name, description ?? null);
    res.status(201).json(db.prepare('SELECT * FROM processes WHERE id = ?').get(id));
  } catch (e) {
    res.status(409).json({ error: 'Process ID already exists' });
  }
});

export default router;
