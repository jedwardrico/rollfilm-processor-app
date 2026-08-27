import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  // Pipeline counts by status
  const pipeline = db.prepare(`
    SELECT status, COUNT(*) as count FROM rolls GROUP BY status
  `).all();

  // Rolls by process
  const byProcess = db.prepare(`
    SELECT p.name as process_name, p.id as process_id, COUNT(r.id) as count
    FROM processes p
    LEFT JOIN rolls r ON r.process_id = p.id
    GROUP BY p.id
    ORDER BY count DESC
  `).all();

  // Rolls per month (last 12 months)
  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM rolls
    WHERE created_at >= datetime('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  // Top film stocks
  const topFilmStocks = db.prepare(`
    SELECT film_stock, COUNT(*) as count
    FROM rolls
    GROUP BY film_stock
    ORDER BY count DESC
    LIMIT 10
  `).all();

  // Chemical utilization (active chemicals with capacity)
  const chemUtilization = db.prepare(`
    SELECT c.name, c.rolls_processed, c.capacity_rolls,
           p.name as process_name,
           CASE WHEN c.capacity_rolls > 0
                THEN ROUND(CAST(c.rolls_processed AS REAL) / c.capacity_rolls * 100)
                ELSE NULL END as pct_used
    FROM chemicals c
    JOIN processes p ON c.process_id = p.id
    WHERE c.active = 1 AND c.capacity_rolls IS NOT NULL
    ORDER BY pct_used DESC
  `).all();

  // Total counts
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_rolls,
      SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned,
      SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as awaiting_scan,
      SUM(CASE WHEN status = 'shot' THEN 1 ELSE 0 END) as awaiting_dev
    FROM rolls
  `).get();

  const totalChemicals = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as active FROM chemicals
  `).get();

  res.json({
    totals: { ...totals, ...totalChemicals },
    pipeline,
    byProcess,
    byMonth,
    topFilmStocks,
    chemUtilization,
  });
});

export default router;
