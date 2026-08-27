import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const STEP_SELECT = `
  SELECT ps.*, c.name as chemical_name
  FROM procedure_steps ps
  LEFT JOIN chemicals c ON ps.chemical_id = c.id
  WHERE ps.procedure_id = ?
  ORDER BY ps.step_order
`;

const PROC_SELECT = `
  SELECT pr.*, p.name as process_name,
    COALESCE((SELECT SUM(roll_count) FROM procedure_runs WHERE procedure_id = pr.id), 0) as rolls_processed
  FROM procedures pr
  JOIN processes p ON pr.process_id = p.id
`;

router.get('/', (req, res) => {
  const { process_id } = req.query;
  let sql = PROC_SELECT + ' WHERE 1=1';
  const params = [];
  if (process_id) { sql += ' AND pr.process_id = ?'; params.push(process_id); }
  sql += ' ORDER BY pr.name';
  const procedures = db.prepare(sql).all(...params);
  const getSteps = db.prepare(STEP_SELECT);
  res.json(procedures.map(proc => ({ ...proc, steps: getSteps.all(proc.id) })));
});

router.get('/:id', (req, res) => {
  const proc = db.prepare(PROC_SELECT + ' WHERE pr.id = ?').get(req.params.id);
  if (!proc) return res.status(404).json({ error: 'Not found' });
  proc.steps = db.prepare(STEP_SELECT).all(proc.id);
  res.json(proc);
});

function insertSteps(procId, steps) {
  const insertStep = db.prepare(`
    INSERT INTO procedure_steps
      (procedure_id, step_order, name, duration_seconds, temperature_c, agitation_notes, chemical_role, chemical_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  steps.forEach((step, i) => {
    insertStep.run(
      procId,
      step.step_order ?? i + 1,
      step.name,
      step.duration_seconds,
      step.temperature_c ?? null,
      step.agitation_notes ?? null,
      step.chemical_role ?? null,
      step.chemical_id ?? null,
    );
  });
}

router.post('/', (req, res) => {
  const { name, process_id, film_stock, temperature_c, push_pull, notes, steps } = req.body;
  if (!name || !process_id) return res.status(400).json({ error: 'name and process_id required' });

  const procId = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO procedures (name, process_id, film_stock, temperature_c, push_pull, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, process_id, film_stock ?? null, temperature_c ?? null, push_pull ?? 0, notes ?? null);
    if (Array.isArray(steps)) insertSteps(lastInsertRowid, steps);
    return lastInsertRowid;
  })();

  const proc = db.prepare(PROC_SELECT + ' WHERE pr.id = ?').get(procId);
  proc.steps = db.prepare(STEP_SELECT).all(procId);
  res.status(201).json(proc);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM procedures WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, process_id, film_stock, temperature_c, push_pull, notes, steps } = req.body;
  db.transaction(() => {
    db.prepare(`
      UPDATE procedures SET name = ?, process_id = ?, film_stock = ?, temperature_c = ?, push_pull = ?, notes = ? WHERE id = ?
    `).run(name ?? existing.name, process_id ?? existing.process_id, film_stock ?? null, temperature_c ?? null, push_pull ?? 0, notes ?? null, req.params.id);
    if (Array.isArray(steps)) {
      db.prepare('DELETE FROM procedure_steps WHERE procedure_id = ?').run(req.params.id);
      insertSteps(req.params.id, steps);
    }
  })();

  const proc = db.prepare(PROC_SELECT + ' WHERE pr.id = ?').get(req.params.id);
  proc.steps = db.prepare(STEP_SELECT).all(req.params.id);
  res.json(proc);
});

// Log a development run: record roll count and increment step chemicals
router.post('/:id/run', (req, res) => {
  const proc = db.prepare(PROC_SELECT + ' WHERE pr.id = ?').get(req.params.id);
  if (!proc) return res.status(404).json({ error: 'Not found' });

  const roll_count = Math.max(1, Number(req.body.roll_count) || 1);
  const run_date = req.body.run_date ?? new Date().toISOString().split('T')[0];
  const notes = req.body.notes ?? null;

  db.transaction(() => {
    db.prepare(
      'INSERT INTO procedure_runs (procedure_id, roll_count, run_date, notes) VALUES (?, ?, ?, ?)'
    ).run(proc.id, roll_count, run_date, notes);

    // Increment each step's chemical by the roll count
    const stepChemicals = db.prepare(
      'SELECT DISTINCT chemical_id FROM procedure_steps WHERE procedure_id = ? AND chemical_id IS NOT NULL'
    ).all(proc.id);
    const incr = db.prepare(
      'UPDATE chemicals SET rolls_processed = rolls_processed + ? WHERE id = ?'
    );
    for (const { chemical_id } of stepChemicals) {
      incr.run(roll_count, chemical_id);
    }
  })();

  const updated = db.prepare(PROC_SELECT + ' WHERE pr.id = ?').get(proc.id);
  updated.steps = db.prepare(STEP_SELECT).all(proc.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM procedures WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

export default router;
