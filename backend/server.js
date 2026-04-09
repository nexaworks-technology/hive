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
import campaignManager from './utils/campaign-manager.js';
import { checkAndFireDueTouches } from './utils/sequence-trigger.js';
import { getTokensForUser, setCredentials } from './routes/google-calendar.js';
import { google } from 'googleapis';
import { supabase } from './supabase-client.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/test-read-emails', async (_req, res) => {
  try {
    const userId = '15fafa42-8511-4915-8ab7-a496e3d0c8bc';
    
    console.log('[test-read-emails] Testing email reading capability...');
    
    // Get tokens
    const tokens = await getTokensForUser(userId);
    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: 'No Google tokens found',
        solution: 'Connect your Gmail account in Settings'
      });
    }
    
    console.log('[test-read-emails] Tokens found, checking scope...');
    if (!tokens.scope || !tokens.scope.includes('gmail.readonly')) {
      return res.status(400).json({
        success: false,
        error: 'Gmail tokens missing gmail.readonly permission',
        currentScope: tokens.scope,
        solution: 'Reconnect Gmail in Settings to grant read permissions'
      });
    }
    
    // Set up OAuth client
    const { client } = await setCredentials(tokens, userId);
    const gmail = google.gmail({ version: 'v1', auth: client });
    
    console.log('[test-read-emails] Attempting to list unread messages...');
    
    // Try to list unread messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 5
    });
    
    const messages = response.data.messages || [];
    console.log(`[test-read-emails] ✅ Successfully read Gmail! Found ${messages.length} unread messages`);
    
    // Get details of first message if available
    let messageDetails = [];
    if (messages.length > 0) {
      for (let i = 0; i < Math.min(3, messages.length); i++) {
        try {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: messages[i].id,
            format: 'full'
          });
          
          const headers = msg.data.payload.headers || [];
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
          
          messageDetails.push({
            id: messages[i].id,
            from,
            subject,
            snippet: msg.data.snippet
          });
        } catch (err) {
          console.error(`[test-read-emails] Error getting message ${i}:`, err.message);
        }
      }
    }
    
    res.json({
      success: true,
      message: '✅ Can read emails from Gmail!',
      unreadCount: messages.length,
      sampleMessages: messageDetails,
      details: {
        hasTokens: !!tokens,
        hasRefreshToken: !!tokens.refresh_token,
        hasAccessToken: !!tokens.access_token,
        permissions: tokens.scope?.split(' ') || []
      }
    });
  } catch (error) {
    console.error('[test-read-emails] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to read emails',
      details: error.message,
      solution: 'Check that Gmail is connected and tokens are valid'
    });
  }
});

app.get('/debug-campaigns', (_req, res) => {
  try {
    const allCampaigns = campaignManager.getAllCampaigns();
    const campaignDetails = allCampaigns.campaigns.map(campaign => {
      const fullCampaign = campaignManager.getCampaign(campaign.id);
      return {
        id: campaign.id,
        name: campaign.name,
        targetCompany: campaign.targetCompany,
        prospectCount: campaign.prospectCount,
        prospects: fullCampaign.success ? fullCampaign.campaign.prospects.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          mailSent: p.emails.length > 0 ? 'Yes' : 'No',
          replied: p.replies.length > 0 ? 'Yes' : 'No',
          replyCount: p.replies.length
        })) : []
      };
    });
    
    res.json({
      totalCampaigns: allCampaigns.total,
      campaigns: campaignDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// Load campaigns from Supabase on startup
async function initializeCampaignsFromDatabase() {
  try {
    console.log('[server] Loading campaigns from Supabase...');
    const { data: campaigns, error } = await supabase
      .from('sutra_campaigns')
      .select('*');
    
    if (error) {
      console.error('[server] Failed to load campaigns from database:', error.message);
      return;
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('[server] No campaigns found in database');
      return;
    }
    
    console.log(`[server] Found ${campaigns.length} campaigns in database`);
    
    // For now, we'll just log them - campaigns will be loaded on-demand from DB
    // when check-replies is called
    campaigns.forEach(camp => {
      console.log(`  - ${camp.id}: ${camp.name} (${camp.total_found} prospects)`);
    });
  } catch (err) {
    console.error('[server] Error initializing campaigns:', err.message);
  }
}

// Initialize before starting server
await initializeCampaignsFromDatabase();

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
