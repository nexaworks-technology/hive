import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import campaignsRouter from './routes/campaigns.js';
import scrapeLeadsRouter from './routes/scrape-leads.js';
import googleCalendarRouter from './routes/google-calendar.js';
import authRouter from './routes/auth.js';
import inboundRouter from './routes/inbound.js';


const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/campaigns', campaignsRouter);
app.use('/scrape-leads', scrapeLeadsRouter);
app.use('/google', googleCalendarRouter);
app.use('/auth', authRouter);
app.use('/inbound', inboundRouter);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
