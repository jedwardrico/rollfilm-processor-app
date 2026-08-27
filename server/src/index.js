import express from 'express';
import cors from 'cors';
import processesRouter from './routes/processes.js';
import chemicalsRouter from './routes/chemicals.js';
import rollsRouter from './routes/rolls.js';
import proceduresRouter from './routes/procedures.js';
import statsRouter from './routes/stats.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/processes', processesRouter);
app.use('/api/chemicals', chemicalsRouter);
app.use('/api/rolls', rollsRouter);
app.use('/api/procedures', proceduresRouter);
app.use('/api/stats', statsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RollFilm server running on port ${PORT}`);
});
