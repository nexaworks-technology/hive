import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import campaignsRouter from './routes/campaigns.js';
import scrapeLeadsRouter from './routes/scrape-leads.js';
import googleCalendarRouter from './routes/google-calendar.js';
import authRouter from './routes/auth.js';
import inboundRouter from './routes/inbound.js';
import linkedinRouter from './routes/linkedin.js';
import companyRouter from './routes/company.js';
import outboundRouter from './routes/outbound.js';
import campaignsV2Router from './routes/campaigns-v2.js';
import userProfileRouter from './routes/user-profile.js';
import { checkAndFireDueTouches } from './utils/sequence-trigger.js';
import { getTokensForUser, setCredentials } from './routes/google-calendar.js';
import { google } from 'googleapis';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/campaigns', campaignsRouter);
app.use('/campaigns-v2', campaignsV2Router);
app.use('/scrape-leads', scrapeLeadsRouter);
app.use('/google', googleCalendarRouter);
app.use('/auth', authRouter);
app.use('/inbound', inboundRouter);
app.use('/linkedin', linkedinRouter);
app.use('/company', companyRouter);
app.use('/outbound', outboundRouter);
app.use('/', userProfileRouter);

// Get user ID from request (can be from session or hardcoded for testing)
app.get('/diagnose-gmail', async (req, res) => {
  try {
    // For testing, we'll use the hardcoded UUID from conversation
    // In production, get this from session/token
    const userId = '15fafa42-8511-4915-8ab7-a496e3d0c8bc';
    const diagnostics = {
      userId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check 1: Tokens exist
    try {
      const tokens = await getTokensForUser(userId);
      if (!tokens) {
        diagnostics.checks.tokensExist = {
          status: 'FAIL',
          message: 'No Google tokens found for this user',
          solution: 'Click "Connect Gmail" to authorize your Google account'
        };
      } else {
        diagnostics.checks.tokensExist = {
          status: 'PASS',
          message: 'Google tokens found',
          tokenType: tokens.token_type,
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date
        };

        // Check 2: Try to refresh token (if refresh token exists)
        if (tokens.refresh_token) {
          try {
            const { client } = await setCredentials(tokens, userId);
            
            // Try a simple Gmail API call to verify token works
            const gmail = google.gmail({ version: 'v1', auth: client });
            const profile = await gmail.users.getProfile({ userId: 'me' });
            
            diagnostics.checks.tokenValid = {
              status: 'PASS',
              message: 'Token is valid and Gmail API is accessible',
              gmailAddress: profile.data.emailAddress,
              messagesTotal: profile.data.messagesTotal
            };
          } catch (tokenError) {
            const errorMsg = tokenError.message || '';
            diagnostics.checks.tokenValid = {
              status: 'FAIL',
              message: `Token validation failed: ${errorMsg}`,
              error: errorMsg,
              solution: 
                errorMsg.includes('invalid_grant') 
                  ? 'Your Google session has expired. Click "Connect Gmail" to refresh your authorization.'
                  : errorMsg.includes('401')
                  ? 'Authorization failed. Try reconnecting your Gmail account.'
                  : 'An error occurred. Try connecting your Gmail account again.'
            };
          }
        } else {
          diagnostics.checks.tokenValid = {
            status: 'WARN',
            message: 'No refresh token available. You may need to reconnect.',
            solution: 'Click "Connect Gmail" to re-authorize with refresh token'
          };
        }
      }
    } catch (checkError) {
      diagnostics.checks.tokensExist = {
        status: 'ERROR',
        message: 'Failed to check tokens',
        error: checkError.message
      };
    }

    res.json(diagnostics);
  } catch (err) {
    res.status(500).json({
      error: 'Diagnosis failed',
      message: err.message,
      solution: 'Try refreshing the page or reconnecting your Gmail account'
    });
  }
});

// Simple status endpoint (no auth needed)
app.get('/google/status-simple', async (req, res) => {
  try {
    const userId = '15fafa42-8511-4915-8ab7-a496e3d0c8bc';
    const tokens = await getTokensForUser(userId);
    const isConnected = Boolean(tokens?.refresh_token || tokens?.access_token);
    
    let email = null;
    if (isConnected && tokens) {
      try {
        const { client } = await setCredentials(tokens, userId);
        const gmail = google.gmail({ version: 'v1', auth: client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        email = profile.data?.emailAddress;
      } catch (emailErr) {
        console.error('[google][status-simple] failed to get email', emailErr.message);
        email = tokens?.email || null;
      }
    }
    
    res.json({ 
      connected: isConnected,
      email: email
    });
  } catch (err) {
    console.error('[google][status-simple] error', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Check if user has Google tokens connected
app.get('/check-google-tokens', async (req, res) => {
  try {
    // For now, just return that it's connected (since we have the UUID)
    // In production, you would check the database for valid tokens
    res.json({ connected: true });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Alias endpoint
app.get('/check-google-connection', async (req, res) => {
  try {
    res.json({ connected: true });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});

// Start background job to fire due sequence touches every 30 seconds
console.log('[sequence-trigger] Starting background job to fire due touches...');
setInterval(async () => {
  try {
    const result = await checkAndFireDueTouches();
    if (result.touchesFired > 0) {
      console.log(`[sequence-trigger] 🔥 Fired ${result.touchesFired} sequence touches`);
    }
  } catch (err) {
    console.error('[sequence-trigger] Background job error:', err.message);
  }
}, 30000); // Run every 30 seconds
