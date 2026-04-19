import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import campaignsRouter from './routes/campaigns.js';
import scrapeLeadsRouter from './routes/scrape-leads.js';
import googleCalendarRouter from './routes/google-calendar.js';
import authRouter from './routes/auth.js';
import inboundRouter from './routes/inbound.js';
import emailAccountsRouter from './routes/email-accounts.js';
import emailsRouter from './routes/emails.js';
import { supabase } from './supabase-client.js';
import { syncEmailsForAccount } from './services/email-service.js';


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
app.use('/email-accounts', emailAccountsRouter);
app.use('/emails', emailsRouter);

// ===== CRON JOB: Periodic Email Sync =====
// Run every 10 minutes for all active email accounts
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🕐 [CRON] Starting email sync job...');
    
    // Get all active email accounts
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('id, user_id, email_address')
      .eq('is_active', true);

    if (error) {
      console.error('❌ [CRON] Failed to fetch email accounts:', error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('ℹ️ [CRON] No active email accounts to sync');
      return;
    }

    console.log(`📧 [CRON] Syncing ${accounts.length} email account(s)...`);

    // Sync each account
    for (const account of accounts) {
      syncEmailsForAccount(account.id, account.user_id)
        .then(() => {
          console.log(`✅ [CRON] Synced: ${account.email_address}`);
        })
        .catch((err) => {
          console.error(`❌ [CRON] Failed to sync ${account.email_address}:`, err.message);
        });
    }
  } catch (error) {
    console.error('❌ [CRON] Sync job error:', error);
  }
});

console.log('✅ Email sync job scheduled to run every 10 minutes');

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
