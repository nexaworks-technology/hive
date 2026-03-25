import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import googleRouter from './modules/google/google.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import inboundRouter from './modules/inbound/inbound.routes.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/google', googleRouter);
app.use('/auth', authRouter);
app.use('/inbound', inboundRouter);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
