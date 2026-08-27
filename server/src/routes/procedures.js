import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const { process_id } = req.query;
  let sql = 'SELECT pr.*, p.name as process_name FROM procedures pr JOIN processes p ON pr.process_id = p.id WHERE 1=1';
  const params = [];
  if (process_id) { sql += ' AND pr.process_id = ?'; params.push(process_id); }
  sql += ' ORDER BY pr.name';
  const procedures = db.prepare(sql).all(...params);

  // Attach steps to each procedure
  const getSteps = db.prepare('SELECT * FROM procedure_steps WHERE procedure_id = ? ORDER BY step_order');
  const result = procedures.map(proc => ({ ...proc, steps: getSteps.all(proc.id) }));
  res.json(result);
});

router.get('/:id', (req, res) => {
  const proc = db.prepare(
    'SELECT pr.*, p.name as process_name FROM procedures pr JOIN processes p ON pr.process_id = p.id WHERE pr.id = ?'
  ).get(req.params.id);
  if (!proc) return res.status(404).json({ error: 'Not found' });
  proc.steps = db.prepare('SELECT * FROM procedure_steps WHERE procedure_id = ? ORDER BY step_order').all(proc.id);
  res.json(proc);
});

router.post('/', (req, res) => {
  const { name, process_id, film_stock, developer, temperature_c, push_pull, notes, steps } = req.body;
  if (!name || !process_id) return res.status(400).json({ error: 'name and process_id required' });

  const result = db.transaction(() => {
    const { lastInsertRowid: procId } = db.prepare(`
      INSERT INTO procedures (name, process_id, film_stock, developer, temperature_c, push_pull, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, process_id, film_stock ?? null, developer ?? null, temperature_c ?? null, push_pull ?? 0, notes ?? null);

    if (Array.isArray(steps)) {
      const insertStep = db.prepare(`
        INSERT INTO procedure_steps (procedure_id, step_order, name, duration_seconds, temperature_c, agitation_notes, chemical_role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      steps.forEach((step, i) => {
        insertStep.run(procId, step.step_order ?? i + 1, step.name, step.duration_seconds, step.temperature_c ?? null, step.agitation_notes ?? null, step.chemical_role ?? null);
      });
    }
    return procId;
  })();

  const proc = db.prepare('SELECT pr.*, p.name as process_name FROM procedures pr JOIN processes p ON pr.process_id = p.id WHERE pr.id = ?').get(result);
  proc.steps = db.prepare('SELECT * FROM procedure_steps WHERE procedure_id = ? ORDER BY step_order').all(result);
  res.status(201).json(proc);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM procedures WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, film_stock, developer, temperature_c, push_pull, notes, steps } = req.body;
  db.transaction(() => {
    db.prepare(`
      UPDATE procedures SET name = ?, film_stock = ?, developer = ?, temperature_c = ?, push_pull = ?, notes = ?
      WHERE id = ?
    `).run(name ?? existing.name, film_stock ?? null, developer ?? null, temperature_c ?? null, push_pull ?? 0, notes ?? null, req.params.id);

    if (Array.isArray(steps)) {
      db.prepare('DELETE FROM procedure_steps WHERE procedure_id = ?').run(req.params.id);
      const insertStep = db.prepare(`
        INSERT INTO procedure_steps (procedure_id, step_order, name, duration_seconds, temperature_c, agitation_notes, chemical_role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      steps.forEach((step, i) => {
        insertStep.run(req.params.id, step.step_order ?? i + 1, step.name, step.duration_seconds, step.temperature_c ?? null, step.agitation_notes ?? null, step.chemical_role ?? null);
      });
    }
  })();

  const proc = db.prepare('SELECT pr.*, p.name as process_name FROM procedures pr JOIN processes p ON pr.process_id = p.id WHERE pr.id = ?').get(req.params.id);
  proc.steps = db.prepare('SELECT * FROM procedure_steps WHERE procedure_id = ? ORDER BY step_order').all(req.params.id);
  res.json(proc);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM procedures WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

export default router;
