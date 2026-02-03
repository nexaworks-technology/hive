import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import campaignsRouter from './routes/campaigns.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/campaigns', campaignsRouter);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
