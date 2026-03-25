import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import googleRouter from './modules/google/google.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import inboundRouter from './modules/inbound/inbound.routes.js';

const app = express();
const port = process.env.PORT || 4000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allowed origins — extend this list for additional domains / local dev ports
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost for local dev
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
];

const allAllowedOrigins = [...new Set([...DEFAULT_DEV_ORIGINS, ...ALLOWED_ORIGINS])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/google', googleRouter);
app.use('/auth', authRouter);
app.use('/inbound', inboundRouter);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
