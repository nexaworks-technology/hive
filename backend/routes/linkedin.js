import express from 'express';
import { supabase } from '../supabase-client.js';
import requireAuth from '../middleware/require-auth.js';
import { sendConnectionRequest, checkConnectionStatus } from '../utils/linkedin.js';

const router = express.Router();

// Retrieve user's LinkedIn cookie from Supabase profile metadata
async function getLinkedInCookie(userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.user_metadata?.linkedin_cookie || null;
}

/**
 * GET /linkedin/campaigns
 * List all linkedin campaigns for the user
 */
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, title, status, created_at, payload')
      .eq('user_id', req.user.id)
      .filter('payload->>type', 'eq', 'linkedin')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ campaigns: data });
  } catch (err) {
    console.error('[linkedin][campaigns] error', err);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * POST /linkedin/launch
 * Creates a new LinkedIn connection campaign and kicks off the background sequence
 */
router.post('/launch', requireAuth, async (req, res) => {
  try {
    const { leads, settings } = req.body || {};

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'Leads array is required' });
    }

    const validLeads = leads.filter(l => l.linkedin && l.linkedin.includes('linkedin.com/in/'));
    if (!validLeads.length) {
      return res.status(400).json({ error: 'No actionable leads found with valid LinkedIn URLs.' });
    }

    const cookie = await getLinkedInCookie(req.user.id);
    if (!cookie) {
      return res.status(403).json({ error: 'No LinkedIn li_at cookie found for this user. Connect account first.' });
    }

    const campaignTitle = `LinkedIn Outreach · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    // Initialize leads payload
    const payloadLeads = validLeads.map(l => ({
      ...l,
      connectionSent: false,
      connectionAccepted: false,
      followupSent: false,
      error: null
    }));

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        title: campaignTitle,
        stage: 'inbound-linkedin',
        status: 'running',
        user_id: req.user.id,
        payload: {
          type: 'linkedin',
          settings,
          leads: payloadLeads
        }
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Simulate async processing (in a real app, send to a RabbitMQ/Bull worker)
    // We start the background sending process asynchronously
    processLinkedInQueue(campaign.id, req.user.id, cookie).catch(err => {
      console.error('[linkedin][background] Critical Queue Error', err);
    });

    return res.json({ success: true, campaignId: campaign.id, acceptedLeads: validLeads.length });
  } catch (err) {
    console.error('[linkedin][launch] error', err);
    return res.status(500).json({ error: err.message || 'Failed to launch LinkedIn campaign' });
  }
});

/**
 * Async Background Worker Simulator
 * Processes the connection queue slowly using setTimeout to avoid LinkedIn rate-limits.
 */
async function processLinkedInQueue(campaignId, userId, cookie) {
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('payload')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) return;

  const payload = campaign.payload;
  const leads = payload.leads || [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (lead.connectionSent || lead.error) continue; // Skip processed

    console.log(`[linkedin][background] Sending request to ${lead.linkedin}...`);
    try {
      // Draft personalized AI message (Wait, we can just use a static setting template for now)
      // Example: "Hi Pavan, love what you are building at NexaWorks!"
      let connectionMessage = payload.settings?.noteTemplate || `Hi ${lead.name.split(' ')[0]},\n\nI saw your profile and wanted to connect!\n\nBest,`;
      if (lead.company) connectionMessage = connectionMessage.replace('{company}', lead.company);

      // Send the request via Voyager API
      await sendConnectionRequest(lead.linkedin, connectionMessage, cookie);
      
      lead.connectionSent = true;
      lead.connectionSentAt = new Date().toISOString();
      console.log(`[linkedin][background] ✅ Sent to ${lead.name}`);

    } catch (err) {
      console.error(`[linkedin][background] ❌ Failed for ${lead.name}:`, err.message);
      lead.error = err.message;
    }

    // Persist progress to DB
    await supabase.from('campaigns').update({ payload }).eq('id', campaignId);

    // Sleep mathematically random between 10s and 25s as anti-ban measure
    if (i < leads.length - 1) {
      const waitMs = Math.floor(Math.random() * (25000 - 10000 + 1) + 10000);
      console.log(`[linkedin][background] Sleeping for ${waitMs / 1000}s to mimic human behavior...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  console.log(`[linkedin][background] 🎉 Campaign ${campaignId} processing finished.`);
}

export default router;
