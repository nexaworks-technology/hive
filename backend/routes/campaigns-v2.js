import express from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import { getTokensForUser, setCredentials } from './google-calendar.js';
import requireAuth from '../middleware/require-auth.js';
import campaignManager from '../utils/campaign-manager.js';
import companyInsights from '../utils/company-insights.js';
import leadQualifier from '../utils/lead-qualifier.js';
import scrapeLeadsRouter, { searchCompanies, fetchHunterLead } from './scrape-leads.js';
import { enrollProspectInSequence, checkAndFireDueTouches, fireTouchForProspect } from '../utils/sequence-trigger.js';
import { enrichFromHunter, enrichDefault } from '../utils/hunter-enricher.js';
import { getSimpleEmailTemplate } from '../utils/simple-template.js';
import { generateCategoryWiseReply } from '../utils/category-wise-replies.js';
import { supabase } from '../supabase-client.js';

const router = express.Router();

/**
 * Send email via Gmail API using user's connected Google account
 */
async function sendGmailEmail({ to, subject, body, htmlBody, fromName, userId }) {
  console.log(`[sendGmailEmail] 📧 Starting email send:`, { to, subject: subject?.slice(0, 30), userId });
  
  if (!userId) {
    console.error(`[sendGmailEmail] ❌ No userId provided`);
    throw new Error('User ID required to send email');
  }

  console.log(`[sendGmailEmail] 🔑 Fetching Google tokens for userId: ${userId}`);
  const tokens = await getTokensForUser(userId);
  if (!tokens) {
    console.error(`[sendGmailEmail] ❌ No Google tokens found for user ${userId}`);
    throw new Error('No Google tokens found for this user');
  }

  console.log(`[sendGmailEmail] ✅ Found tokens, checking Gmail scope...`);
  if (!tokens.scope || !tokens.scope.includes('gmail.send')) {
    console.error(`[sendGmailEmail] ❌ Missing gmail.send scope. Current scope:`, tokens.scope);
    throw new Error('Google account missing Gmail send permission. Scope: ' + (tokens.scope || 'none'));
  }

  console.log(`[sendGmailEmail] ✅ Scope verified, setting up Gmail API client...`);
  const { client } = await setCredentials(tokens, userId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
  
  // Use provided htmlBody if available, otherwise convert plain text
  const finalHtmlBody = htmlBody || body.split('\n').map((l) => (l.trim() ? `<p>${l}</p>` : '')).join('');

  const str = [
    `To: ${to}`,
    `From: ${fromName ? `"${fromName}" <me>` : "me"}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    finalHtmlBody,
    `--${boundary}--`
  ].join('\r\n');

  const encodedMessage = Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log(`[sendGmailEmail] 📤 Calling Gmail API to send message to ${to}...`);
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });

  console.log(`[sendGmailEmail] ✅ Email sent to ${to}:`, result.data?.id);
  return result.data;
}


/**
 * POST /campaigns/create
 * Create a new outbound campaign with auto-scraped prospects
 */
router.post('/create', async (req, res) => {
  try {
    const campaignData = req.body;
    
    // Map frontend field names to backend field names
    if (campaignData.companyWebsite && !campaignData.targetCompanyWebsite) {
      campaignData.targetCompanyWebsite = campaignData.companyWebsite;
    }
    
    // Generate campaign name from targetCompany and campaignType if not provided
    if (!campaignData.campaignName && campaignData.targetCompany) {
      const month = new Date().toLocaleString('default', { month: 'short' });
      const year = new Date().getFullYear();
      campaignData.campaignName = `${month} ${year} - ${campaignData.targetCompany} ${campaignData.campaignType || 'Campaign'}`;
    }

    if (!campaignData.campaignName || !campaignData.targetCompany) {
      return res.status(400).json({
        error: 'Missing required fields: campaignName, targetCompany'
      });
    }

    // Create the campaign in memory
    const result = campaignManager.createCampaign(campaignData);
    
    if (!result.success) {
      return res.json(result);
    }

    const campaign = result.campaign;

    // Auto-scrape prospects for the target company in the background
    // Don't wait for this - return the campaign immediately
    (async () => {
      try {
        const query = `${campaignData.targetCompany} company website`;
        console.log(`[campaigns-v2] Starting auto-scrape for: ${query}`);
        
        let domains = [];
        
        // If we have the company website, use it first
        if (campaignData.targetCompanyWebsite) {
          const domain = campaignData.targetCompanyWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          domains.push(domain);
        }
        
        // Also search for related domains
        try {
          const searchResults = await searchCompanies(query);
          domains = [...new Set([...domains, ...searchResults.slice(0, 2)])]; // Deduplicate, limit to 3 total
          console.log(`[campaigns-v2] Found ${domains.length} domains for ${campaignData.targetCompany}`);
        } catch (err) {
          console.error(`[campaigns-v2] Domain search error:`, err.message);
          // Continue with what we have
        }

        const scrapedLeads = [];

        try {
          // Process all domains in PARALLEL for speed
          const hunterPromises = domains.map(domain => 
            (async () => {
              try {
                console.log(`[campaigns-v2] Fetching contacts from: ${domain}`);
                const hunterLeads = await fetchHunterLead(domain);
                console.log(`[campaigns-v2] Found ${hunterLeads.length} contacts in ${domain}`);
                return hunterLeads.map(lead => ({
                  ...lead,
                  company: campaignData.targetCompany,
                  domain
                }));
              } catch (err) {
                console.warn(`[campaigns-v2] Hunter error for ${domain}:`, err.message);
                return [];
              }
            })()
          );

          // Wait for all Hunter API calls at once
          const allResults = await Promise.all(hunterPromises);
          const flatLeads = allResults.flat();
          console.log(`[campaigns-v2] 📊 Hunter total results: ${flatLeads.length} leads from ${domains.length} domains`);

          // Add all contacts from all domains
          if (flatLeads && Array.isArray(flatLeads) && flatLeads.length > 0) {
            flatLeads.forEach(hunterLead => {
              scrapedLeads.push({
                name: hunterLead.name,
                email: hunterLead.email,
                title: hunterLead.position || 'Unknown',
                company: campaignData.targetCompany,
                linkedin: hunterLead.linkedin || `https://www.google.com/search?q=${encodeURIComponent(hunterLead.name + ' ' + campaignData.targetCompany)}`,
                industry: ''
              });
            });
          }
        } catch (err) {
          console.error('[campaigns-v2] Error fetching contacts:', err.message);
        }

        // Add scraped leads to campaign
        console.log(`[campaigns-v2] Total scraped leads: ${scrapedLeads.length}`);
        
        if (scrapedLeads.length > 0) {
          const addResult = campaignManager.addProspectsFromScrapedLeads(campaign.id, scrapedLeads);
          console.log(`[campaigns-v2] Added ${addResult.totalAdded} prospects to campaign ${campaign.id}`);
          
          // ✅ SAVE SCRAPED LEADS TO SUPABASE
          try {
            console.log(`[campaigns-v2] 🔄 Starting DB insert for ${scrapedLeads.length} leads...`);
            const prospectRecords = scrapedLeads.map(lead => ({
              campaign_id: campaign.id,
              name: lead.name,
              email: lead.email,
              role: lead.title || 'Unknown',
              company: lead.company || campaignData.targetCompany,
              linkedin_profile: lead.linkedin || null,
              industry: lead.industry || null,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            console.log(`[campaigns-v2] Inserting ${prospectRecords.length} prospects:`, prospectRecords.slice(0, 1)); // Log first one

            const { data: inserted, error: insertError } = await supabase
              .from('prospects')
              .insert(prospectRecords)
              .select(); // IMPORTANT: Get back the inserted records with their auto-generated IDs

            if (insertError) {
              console.error(`[campaigns-v2] ❌ Error saving ${scrapedLeads.length} prospects to Supabase:`, insertError.message, insertError.details, insertError.hint);
            } else {
              console.log(`[campaigns-v2] ✅ Saved ${scrapedLeads.length} prospects to Supabase for campaign ${campaign.id}`);
              if (inserted && inserted.length > 0) {
                console.log(`[campaigns-v2] First prospect in DB:`, {
                  id: inserted[0].id,
                  name: inserted[0].name,
                  email: inserted[0].email
                });
              }
            }
          } catch (dbErr) {
            console.error(`[campaigns-v2] ❌ Exception saving prospects to Supabase:`, dbErr.message);
          }
        } else {
          console.warn(`[campaigns-v2] ⚠️  NO LEADS SCRAPED - skipping DB save`);
        }
        
        // Save campaign to sutra_campaigns table
        try {
          const domain = domains[0] || campaignData.targetCompanyWebsite?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '';
          const { data, error } = await supabase.from('sutra_campaigns').insert([{
            id: campaign.id,
            name: campaign.name,
            domain: domain,
            status: scrapedLeads.length > 0 ? 'ready' : 'no-leads',
            total_found: scrapedLeads.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
          if (error) {
            console.error(`[campaigns-v2] ❌ Insert to sutra_campaigns failed:`, error.message);
          } else {
            console.log(`[campaigns-v2] ✅ Campaign ${campaign.id} saved to sutra_campaigns`);
          }
        } catch (dbErr) {
          console.error(`[campaigns-v2] ❌ Exception saving to sutra_campaigns:`, dbErr.message);
        }
      } catch (err) {
        console.error('[campaigns-v2] Auto-scraping fatal error:', err.message);
      }
    })();

    // Return the campaign immediately (prospects will be added asynchronously)
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId
 * Get campaign details with prospects and reply data from database
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Try memory first
    let campaign = campaignManager.getCampaign(campaignId);
    
    // Always fetch latest prospects from database (don't rely on stale memory)
    let dbProspects = [];
    let dbCampaign = null;
    
    try {
      // Fetch campaign metadata from database
      const { data: campaignData, error: campaignError } = await supabase
        .from('sutra_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();
      
      if (!campaignError && campaignData) {
        dbCampaign = campaignData;
      }
      
      // Always fetch latest prospects for this campaign
      const { data: prospects, error: prospectError } = await supabase
        .from('prospects')
        .select('*')
        .eq('campaign_id', campaignId);
      
      if (prospectError) {
        console.error(`[campaigns-v2] Error fetching prospects for campaign ${campaignId}:`, prospectError.message);
      } else {
        console.log(`[campaigns-v2] ✅ Fetched ${prospects?.length || 0} prospects for campaign ${campaignId}`);
      }

      if (!prospectError && prospects) {
        dbProspects = prospects;
      }
    } catch (dbErr) {
      console.error('[campaigns-v2] Database error:', dbErr.message);
    }

    // If we have database prospects, use those (always prefer database over memory)
    if (dbProspects.length > 0 || dbCampaign) {
      // Fetch reply counts for each prospect
      const prospectIds = dbProspects.map(p => p.id);
      let replyCountMap = {};
      
      if (prospectIds.length > 0) {
        const { data: replyCounts } = await supabase
          .from('prospect_replies')
          .select('prospect_id')
          .in('prospect_id', prospectIds);
        
        // Build map of prospect_id -> reply count
        replyCounts?.forEach(reply => {
          replyCountMap[reply.prospect_id] = (replyCountMap[reply.prospect_id] || 0) + 1;
        });
      }

      // Transform prospects to match expected format
      const enrichedProspects = dbProspects.map(prospect => ({
        ...prospect,
        linkedin: prospect.linkedin_profile,  // Map to expected field
        linkedin_profile: prospect.linkedin_profile,  // Keep both
        emailSent: prospect.status !== 'pending',  // Consider sent if not pending
        replied: (replyCountMap[prospect.id] || 0) > 0,
        followupCount: 0,  // Would need additional tracking table
        id: prospect.id,  // Ensure ID is present
        name: prospect.name,
        email: prospect.email,
        company: prospect.company,
        role: prospect.role
      }));

      console.log(`[campaigns-v2] GET campaign ${campaignId}: Returning ${enrichedProspects.length} prospects`);
      
      if (enrichedProspects.length > 0) {
        console.log(`[campaigns-v2] Sample prospect IDs being sent to frontend:`, enrichedProspects.slice(0, 2).map(p => ({ id: p.id, name: p.name, email: p.email })));
      }

      return res.json({
        success: true,
        campaign: {
          ...(dbCampaign || campaign.campaign || {}),
          id: campaignId,
          prospects: enrichedProspects,
          prospectCount: enrichedProspects.length,
          payload: {
            leads: enrichedProspects  // Also include under payload.leads for compatibility
          }
        }
      });
    }

    // Fallback: return memory campaign if no database data found
    if (campaign.success) {
      res.json(campaign);
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Campaign not found',
        campaignId 
      });
    }
  } catch (error) {
    console.error('[campaigns-v2] GET campaign error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns-v2/debug/db-status
 * Diagnostic endpoint to check what's in Supabase
 */
router.get('/debug/db-status', async (req, res) => {
  try {
    // Get all campaigns from Supabase
    const { data: campaigns, error: campaignError } = await supabase
      .from('sutra_campaigns')
      .select('id, name, domain, total_found')
      .limit(5);

    // Get all prospects from Supabase
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('id, campaign_id, name, email, company')
      .limit(20);

    // Group prospects by campaign
    const prospectsByCampaign = {};
    (prospects || []).forEach(p => {
      if (!prospectsByCampaign[p.campaign_id]) {
        prospectsByCampaign[p.campaign_id] = [];
      }
      prospectsByCampaign[p.campaign_id].push({ name: p.name, email: p.email });
    });

    res.json({
      timestamp: new Date().toISOString(),
      supabase_campaigns: {
        count: campaigns?.length || 0,
        data: campaigns || []
      },
      supabase_prospects: {
        count: prospects?.length || 0,
        by_campaign: prospectsByCampaign
      },
      errors: {
        campaignError: campaignError?.message,
        prospectError: prospectError?.message
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug endpoint error',
      message: error.message 
    });
  }
});

/**
 * GET /campaigns
 * Get all campaigns
 */
/**
 * POST /campaigns/:campaignId/prospects
 * Add a prospect to campaign
 */
router.post('/:campaignId/prospects', (req, res) => {
  try {
    const { campaignId } = req.params;
    const prospectData = req.body;

    const result = campaignManager.addProspect(campaignId, prospectData);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/prospects/batch
 * Add multiple prospects from LinkedIn search results
 */
router.post('/:campaignId/prospects/batch', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { prospects } = req.body;

    if (!Array.isArray(prospects)) {
      return res.status(400).json({ error: 'prospects must be an array' });
    }

    const result = campaignManager.addProspectsFromLinkedinSearch(campaignId, prospects);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId/prospects/list
 * Get prospects list for campaign (table view)
 */
router.get('/:campaignId/prospects/list', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = campaignManager.getProspectsList(campaignId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId/prospects/:prospectId/details
 * Get prospect details with personalization info
 */
router.get('/:campaignId/prospects/:prospectId/details', (req, res) => {
  try {
    const { prospectId } = req.params;
    const result = campaignManager.getProspectDetails(prospectId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/prospects/:prospectId/send-email
 * Send personalized email to prospect
 */
router.post('/:campaignId/prospects/:prospectId/send-email', requireAuth, async (req, res) => {
  try {
    const { prospectId, campaignId } = req.params;
    const { subject, body, htmlBody, emailType = 'initial' } = req.body;

    console.log(`[campaigns-v2] 📧 send-email request:`, { prospectId, campaignId, subject: subject?.slice(0, 30) });

    if (!subject || !body) {
      console.error(`[campaigns-v2] Missing fields - subject: ${!!subject}, body: ${!!body}`);
      return res.status(400).json({
        error: 'Missing required fields: subject, body'
      });
    }

    // Fetch prospect from Supabase instead of in-memory cache
    console.log(`[campaigns-v2] Fetching prospect ${prospectId} from prospects table...`);
    const { data: prospectData, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError) {
      console.error(`[campaigns-v2] ❌ Prospect query error:`, prospectError);
      return res.status(404).json({
        success: false,
        error: 'Prospect not found',
        details: prospectError.message
      });
    }

    if (!prospectData) {
      console.error(`[campaigns-v2] ❌ Prospect not found: ${prospectId}`);
      return res.status(404).json({
        success: false,
        error: 'Prospect not found',
        prospectId
      });
    }

    console.log(`[campaigns-v2] ✅ Found prospect: ${prospectData.name} (${prospectData.email})`);

    // Fetch campaign metadata from Supabase
    console.log(`[campaigns-v2] Fetching campaign ${campaignId} from sutra_campaigns table...`);
    let { data: campaignData, error: campaignError } = await supabase
      .from('sutra_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error(`[campaigns-v2] ❌ Campaign query error:`, campaignError.message);
      return res.status(500).json({
        success: false,
        error: 'Database error fetching campaign',
        details: campaignError.message
      });
    }

    if (!campaignData) {
      console.error(`[campaigns-v2] ❌ Campaign not found in sutra_campaigns: ${campaignId}`);
      console.log(`[campaigns-v2] Trying fallback: from in-memory campaignManager...`);
      
      // Fallback to in-memory campaign manager if not in database yet
      const memCampaign = campaignManager.getCampaign(campaignId);
      if (!memCampaign.success) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found',
          campaignId,
          note: 'Campaign may not be fully initialized yet. Try again in a moment.'
        });
      }
      
      // Use in-memory campaign data as fallback
      campaignData = memCampaign.campaign;
      console.log(`[campaigns-v2] ✅ Using in-memory campaign: ${campaignData.targetCompany}`);
    } else {
      console.log(`[campaigns-v2] ✅ Found campaign in DB: ${campaignData.domain}`);
    }

    // Personalize email
    const personalizedBody = campaignManager.personalizeEmail(
      body,
      prospectData,
      { targetCompany: campaignData.domain || 'SutraHR' }
    );

    // If HTML body provided, use it (already has formatting); otherwise convert plain text to HTML
    let finalHtmlBody = htmlBody || personalizedBody.split('\n').map((l) => (l.trim() ? `<p>${l}</p>` : '')).join('');

    // Send email via Gmail API using authenticated user's ID
    try {
      console.log(`[campaigns-v2] 📧 Sending email to ${prospectData.email} via Gmail...`);
      const emailResult = await sendGmailEmail({
        to: prospectData.email,
        subject: subject,
        body: personalizedBody,
        htmlBody: finalHtmlBody,
        fromName: 'SutraHR',
        userId: req.user.id  // Use authenticated user's ID instead of hardcoded UUID
      });

      // Also log in campaign manager for tracking
      campaignManager.sendEmail(prospectId, {
        subject: subject,
        body: personalizedBody,
        emailType: emailType,
        from: 'pavan@sutrahr.com'
      });

      // ✅ Update prospect status in Supabase
      try {
        const { error: updateError } = await supabase
          .from('prospects')
          .update({ 
            status: 'contacted',
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('email', prospectData.email);

        if (updateError) {
          console.error('[campaigns-v2] Error updating prospect status:', updateError.message);
        } else {
          console.log(`[campaigns-v2] ✅ Updated prospect status for ${prospectData.email}`);
        }
      } catch (dbErr) {
        console.error('[campaigns-v2] Exception updating prospect in Supabase:', dbErr.message);
      }

      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: emailResult.id
      });
    } catch (gmailError) {
      console.error('[campaigns-v2] ❌ Gmail send error:', gmailError.message);
      console.error('[campaigns-v2] Error stack:', gmailError.stack?.split('\n').slice(0, 3).join(' | '));
      res.status(500).json({
        error: 'Failed to send email',
        details: gmailError.message,
        errorType: gmailError.constructor.name
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/prospects/:prospectId/log-reply
 * Log a reply from prospect
 */
router.post('/:campaignId/prospects/:prospectId/log-reply', async (req, res) => {
  try {
    const { prospectId, campaignId } = req.params;
    const { from, subject, body, receivedAt } = req.body;

    // Verify prospect exists in Supabase
    const { data: prospectData, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospectData) {
      return res.status(404).json({ success: false, error: 'Prospect not found' });
    }

    // Store reply in Supabase prospect_replies table
    try {
      const { error: insertError } = await supabase
        .from('prospect_replies')
        .insert({
          prospect_id: prospectId,
          campaign_id: campaignId,
          from: from,
          subject: subject,
          body: body,
          received_at: receivedAt || new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[campaigns-v2] Error logging reply:', insertError.message);
        return res.status(500).json({ success: false, error: insertError.message });
      }

      // Also log in campaign manager for backward compatibility
      const result = campaignManager.logReply(prospectId, {
        from: from,
        subject: subject,
        body: body,
        receivedAt: receivedAt
      });

      res.json({
        success: true,
        message: 'Reply logged successfully',
        ...result
      });
    } catch (dbErr) {
      console.error('[campaigns-v2] Exception logging reply:', dbErr.message);
      res.status(500).json({ success: false, error: dbErr.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate an appropriate auto-reply using OpenRouter AI
 */
async function generateAutoReply({ leadName, prospectReplyText, replyIntent, userProfile }) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const AI_MODEL = 'google/gemini-2.0-flash-001';

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const intentPrompts = {
    positive: `They are interested and want to move forward. Write an enthusiastic response confirming next steps and asking about their timeline.`,
    question: `They asked clarifying questions about our service. Write a helpful response answering their concerns and re-affirming our value.`,
    objection: `They have objections or concerns. Write a respectful response addressing their specific concern and offering a call to discuss.`,
    'not-interested': `They declined the offer. Write a respectful response leaving the door open for the future.`,
    'out-of-office': `They are out of office. Write a brief acknowledgment and ask them to get back when they return.`,
  };

  const intentGuide = intentPrompts[replyIntent] || intentPrompts['question'];

  const systemPrompt = `You are ${userProfile.name}, ${userProfile.jobTitle} at ${userProfile.companyName}. 
Your task: Generate a SHORT, professional email reply to a prospect who replied to your outreach.
${intentGuide}

RULES:
- Keep it to 3-4 sentences max
- Be personal and conversational, not robotic
- End with a clear next step or call to action
- Include your name at the end
- Return ONLY valid JSON with keys "subject" and "body" — no markdown, no commentary`;

  const userPrompt = `The prospect ${leadName} replied: "${prospectReplyText}"
Based on the reply intent (${replyIntent}), generate an immediate auto-reply email with subject and body.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hive.nexaworks.tech',
        'X-Title': 'Hive Auto-Reply',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error: ${res.status} ${err}`);
    }

    const payload = await res.json();
    const raw = payload.choices?.[0]?.message?.content || '';

    // Strip markdown code fences
    let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('AI response was not valid JSON');
    }
  } catch (error) {
    console.error('[campaigns-v2] Auto-reply generation error:', error.message);
    // Fallback simple response
    return {
      subject: `Re: ${leadName}`,
      body: `Hi ${leadName},\n\nThanks for getting back to me. I appreciate your interest.\n\nLooking forward to connecting.\n\nBest,\n${userProfile.name}`
    };
  }
}

/**
 * POST /campaigns/:campaignId/prospects/:prospectId/send-auto-reply
 * Generate and send an automatic reply to a prospect's message
 */
router.post('/:campaignId/prospects/:prospectId/send-auto-reply', requireAuth, async (req, res) => {
  try {
    const { prospectId, campaignId } = req.params;
    const { replyText, replyIntent = 'question' } = req.body;

    if (!replyText) {
      return res.status(400).json({
        error: 'Missing required field: replyText (the prospect\'s message)'
      });
    }

    const prospect = campaignManager.getProspectDetails(prospectId);
    if (!prospect.success) {
      return res.status(404).json(prospect);
    }

    // Get user profile for personalization
    let userProfile = null;
    try {
      const profileRes = await fetch('http://localhost:4000/user-profile');
      if (profileRes.ok) {
        userProfile = await profileRes.json();
      }
    } catch (err) {
      console.warn('[campaigns-v2] Could not fetch user profile');
    }

    if (!userProfile) {
      userProfile = {
        name: 'SutraHR Team',
        email: 'hello@sutrahr.com',
        jobTitle: 'Head of Sales',
        companyName: 'SutraHR',
        phone: '+91 95379 54953',
        calendlyLink: 'https://calendly.com/sutrahr'
      };
    }

    // Generate AI auto-reply
    console.log(`[campaigns-v2] 🤖 Generating auto-reply for ${prospect.prospect.name} (intent: ${replyIntent})...`);
    const autoReplyTemplate = await generateAutoReply({
      leadName: prospect.prospect.name,
      prospectReplyText: replyText,
      replyIntent: replyIntent,
      userProfile: userProfile
    });

    const { subject, body } = autoReplyTemplate;

    // Convert to HTML
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reply from ${userProfile.companyName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .content { padding: 30px; line-height: 1.6; color: #333; }
          .footer { border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            ${body.split('\n').map(line => `<p>${line.trim() || '&nbsp;'}</p>`).join('')}
            <div class="footer">
              <p><strong>${userProfile.name}</strong><br>${userProfile.jobTitle}, ${userProfile.companyName}<br>📧 ${userProfile.email} | 📱 ${userProfile.phone}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send auto-reply via Gmail
    try {
      await sendGmailEmail({
        to: prospect.prospect.email,
        subject: subject,
        body: body,
        htmlBody: htmlBody,
        fromName: userProfile.name || 'SutraHR',
        userId: req.user.id
      });

      console.log(`[campaigns-v2] ✅ Auto-reply sent to ${prospect.prospect.email}`);

      res.json({
        success: true,
        message: 'Auto-reply sent successfully',
        autoReply: {
          subject: subject,
          body: body
        }
      });
    } catch (gmailError) {
      console.error('[campaigns-v2] Failed to send auto-reply:', gmailError.message);
      res.status(500).json({
        error: 'Failed to send auto-reply',
        details: gmailError.message
      });
    }
  } catch (error) {
    console.error('[campaigns-v2] Auto-reply error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


/**
 * POST /campaigns/:campaignId/prospects/:prospectId/schedule-followup
 * Schedule a follow-up
 */
router.post('/:campaignId/prospects/:prospectId/schedule-followup', async (req, res) => {
  try {
    const { prospectId, campaignId } = req.params;
    const { followUpDate, followUpType = 'email', followUpTemplate = '', notes = '' } = req.body;

    if (!followUpDate) {
      return res.status(400).json({ error: 'Missing required field: followUpDate' });
    }

    // Verify prospect exists in Supabase
    const { data: prospectData, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospectData) {
      return res.status(404).json({ success: false, error: 'Prospect not found' });
    }

    // Store follow-up in Supabase if we add a follow_ups table, for now just confirm via campaign manager
    const result = campaignManager.scheduleFollowUp(prospectId, {
      followUpDate: followUpDate,
      followUpType: followUpType,
      followUpTemplate: followUpTemplate,
      notes: notes
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = campaignManager.getCampaignStats(campaignId);
    
    // Flatten the stats structure for the frontend
    if (result.success && result.stats) {
      const flatStats = {
        ...result.stats,
        totalProspects: result.stats.prospectCount,
        emailsSent: result.stats.emailsSent,
        replies: result.stats.repliesReceived,
        followUpsScheduled: result.stats.followUpsScheduled,
        replyRate: parseInt(result.stats.conversionMetrics.replyRate) || 0,
        responseRate: result.stats.conversionMetrics.responseRate,
        avgEmailsPerProspect: parseFloat(result.stats.conversionMetrics.avgEmailsPerProspect) || 0
      };
      
      res.json({ success: true, stats: flatStats });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /campaigns/:campaignId/status
 * Update campaign status
 */
router.patch('/:campaignId/status', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    const result = campaignManager.updateCampaignStatus(campaignId, status);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/bulk-send-emails
 * Send emails to multiple prospects one-by-one
 */
router.post('/:campaignId/bulk-send-emails', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { prospectIds, emailTemplate } = req.body;

    if (!Array.isArray(prospectIds) || !emailTemplate) {
      return res.status(400).json({
        error: 'Missing required fields: prospectIds (array), emailTemplate'
      });
    }

    const campaign = campaignManager.getCampaign(campaignId);
    if (!campaign.success) {
      return res.status(404).json(campaign);
    }

    const results = {
      success: true,
      sent: [],
      failed: [],
      totalSent: 0,
      totalFailed: 0
    };

    for (const prospectId of prospectIds) {
      const prospectDetails = campaignManager.getProspectDetails(prospectId);
      
      if (!prospectDetails.success) {
        results.failed.push({ prospectId, error: 'Prospect not found' });
        results.totalFailed++;
        continue;
      }

      const { subject, body } = emailTemplate;

      // Personalize
      const personalizedBody = campaignManager.personalizeEmail(
        body,
        prospectDetails.prospect,
        { targetCompany: campaign.campaign.targetCompany }
      );

      // Send via Gmail API
      try {
        const emailResult = await sendGmailEmail({
          to: prospectDetails.prospect.email,
          subject: subject,
          body: personalizedBody,
          fromName: 'SutraHR',
          userId: req.user.id
        });

        // Also log in campaign manager for tracking
        const logResult = campaignManager.sendEmail(prospectId, {
          subject: subject,
          body: personalizedBody,
          emailType: 'initial',
          from: 'pavan@sutrahr.com'
        });

        results.sent.push({
          prospectId,
          messageId: emailResult.id,
          timestamp: new Date().toISOString()
        });
        results.totalSent++;
      } catch (gmailError) {
        console.error(`[campaigns-v2] Failed to send email to prospect ${prospectId}:`, gmailError.message);
        results.failed.push({
          prospectId,
          error: gmailError.message
        });
        results.totalFailed++;
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId/linkedin-search-strategies
 * Get LinkedIn search strategies for the campaign
 */
router.get('/:campaignId/linkedin-search-strategies', (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = campaignManager.getCampaign(campaignId);

    if (!campaign.success) {
      return res.status(404).json(campaign);
    }

    res.json({
      success: true,
      campaignId: campaignId,
      targetCompany: campaign.campaign.targetCompany,
      searchStrategies: campaign.campaign.linkedinSearchStrategies,
      instructions: {
        step1: 'Use the search queries above in LinkedIn Sales Navigator or LinkedIn.com search',
        step2: 'Filter results by: Titles, Locations, Industries (provided in each strategy)',
        step3: 'Extract prospect data: Name, Email, Title, Company, LinkedIn URL',
        step4: 'Add prospects to campaign using /bulk-import endpoint',
        step5: 'Review prospects in campaign table before sending outreach'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/generate-email-templates
 * Generate personalized email templates for campaign
 */
router.post('/:campaignId/generate-email-templates', (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = campaignManager.getCampaign(campaignId);

    if (!campaign.success) {
      return res.status(404).json(campaign);
    }

    const campaignInfo = campaign.campaign;

    // Generate initial outreach email
    const initialEmail = companyInsights.generateEmailDraft({
      prospectName: '{{prospectName}}',
      companyName: campaignInfo.targetCompany,
      role: '{{prospectRole}}',
      hiringNeeds: 'skilled tech talent',
      prospectType: 'founder',
      industry: campaignInfo.targetIndustry || 'SaaS'
    });

    // Generate follow-up email 1 (value-add)
    const followUpEmail1 = {
      subject: `Re: {{prospectName}}, quick insight on hiring`,
      body: `Hi {{prospectName}},

I was researching {{prospectCompanyName}} yesterday and noticed you're actively hiring for your {{prospectRole}} role.

I've got a few things that might help:
1. Our latest report on "Scaling Tech Teams Fast" - you might find the hiring section useful
2. A template our other clients use for vetting engineers (saves ~15 hours per hire)
3. Quick intro to {{companyName}} if you'd like to explore a dedicated recruiter model

No pressure either way - but let me know if any of these would be useful.

Quick question though: what's been your biggest hiring challenge so far?

Best,
Pavan`
    };

    // Generate follow-up email 2 (social proof)
    const followUpEmail2 = {
      subject: `Quick win for {{prospectName}} - Rare Carat hired their entire team via us`,
      body: `Hi {{prospectName}},

You don't know me, but you might know Rare Carat or Leena.ai - they scaled their entire teams from {{prospectCompanyName}} using our model.

What they did:
- Got 50+ qualified profiles in 2 weeks
- Hired their VP Product, 4 Backend engineers, 2 Frontend engineers
- All without the per-hire fees or long-term contracts

They said the biggest win wasn't just speed - it was that our recruiters understood startup culture and hiring needs.

Thought it might be relevant given your hiring push at {{prospectCompanyName}}.

If you're open to a quick 15-min chat about how this works, I'm happy to jump on a call.

Best,
Pavan`
    };

    const templates = {
      initial: {
        name: 'Initial Outreach',
        description: 'First contact - problem awareness angle',
        template: initialEmail
      },
      followUp1: {
        name: 'Follow-up 1 (Value Add)',
        description: 'Second touch - provide value before ask',
        template: followUpEmail1
      },
      followUp2: {
        name: 'Follow-up 2 (Social Proof)',
        description: 'Third touch - case study angle',
        template: followUpEmail2
      }
    };

    res.json({
      success: true,
      campaignId: campaignId,
      templates: templates,
      note: 'Use {{prospectName}}, {{prospectRole}}, {{prospectCompanyName}} tokens for personalization'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns-v2/:campaignId/enroll-in-sequence
 * Enroll a prospect in the SutraHR Playbook sequence
 */
router.post('/:campaignId/enroll-in-sequence', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { prospectId } = req.body;

    if (!prospectId) {
      return res.status(400).json({ error: 'Missing prospectId' });
    }

    // Verify prospect exists in this campaign
    const prospect = campaignManager.getProspectDetails(prospectId);
    if (!prospect.success) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Enroll in sequence
    const result = await enrollProspectInSequence(campaignId, prospectId, req.user.id);

    if (result.success) {
      res.json({
        success: true,
        message: `Prospect enrolled in SutraHR Playbook`,
        prospectSequenceId: result.prospectSequenceId,
        firstTouchDate: result.firstTouchDate
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns-v2/:campaignId/prospects/:prospectId/fire-touch
 * Manually fire a sequence touch (for testing)
 */
router.post('/:campaignId/prospects/:prospectId/fire-touch', requireAuth, async (req, res) => {
  try {
    const { campaignId, prospectId } = req.params;
    const { stepNumber } = req.body;

    if (!stepNumber) {
      return res.status(400).json({ error: 'Missing stepNumber' });
    }

    // Note: In production, would look up the actual prospect_sequences record
    // For now, this is a placeholder for the feature
    res.json({
      success: true,
      message: `Would fire step ${stepNumber} for prospect ${prospectId}`,
      note: 'Requires prospect sequence record from database'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns-v2/:campaignId/sequence-status
 * Get sequence status for all prospects in campaign
 */
router.get('/:campaignId/sequence-status', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Placeholder: would query prospect_sequences table
    res.json({
      success: true,
      campaignId,
      message: 'Sequence status tracking (requires database integration)',
      prospectSequences: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns-v2/:campaignId/sequence-timeline
 * Get timeline of all scheduled touches for this campaign
 */
router.get('/:campaignId/sequence-timeline', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Placeholder: would query prospect_sequences and sequence_executions tables
    res.json({
      success: true,
      campaignId,
      message: 'Sequence timeline (requires database integration)',
      timeline: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /campaigns-v2/check-and-fire-touches
 * Admin endpoint to check for and fire due touches (called by cron)
 */
router.post('/check-and-fire-touches', requireAuth, async (req, res) => {
  try {
    // In production, restrict this to admin users or API keys
    const result = await checkAndFireDueTouches();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Title-based Tier definitions for SutraHR contact prioritization
 */
const TITLE_TIERS = {
  tier1: {
    prefix: 'Tier 1 • Technical Leaders',
    pitch: 'Focus on speed (under 3 weeks), vetting (top 1% talent), and eliminating the noise of bad resumes.',
    keywords: [
      'Chief Technology Officer', 'CTO',
      'VP of Engineering', 'VP Engineering',
      'Head of Engineering', 'Director of Engineering',
      'VP of Tech', 'Engineering Lead',
      'Chief Architect', 'VP Product & Engineering'
    ]
  },
  tier2: {
    prefix: 'Tier 2 • Business Leaders',
    pitch: 'Focus heavily on the financial arbitrage (saving 60% on payroll), zero upfront risk, and extending their runway.',
    keywords: [
      'Chief Executive Officer', 'CEO',
      'Founder', 'Co-Founder', 'Co Founder',
      'President', 'Managing Director'
    ]
  },
  tier3: {
    prefix: 'Tier 3 • Talent Leaders',
    pitch: 'Position SutraHR as a plugin or extension of their team. "We embed a sourcer to feed you candidates so you can hit your quarterly hiring targets faster."',
    keywords: [
      'Head of Talent Acquisition', 'Director of Technical Recruiting',
      'VP of People', 'VP of Talent',
      'Talent Acquisition Lead', 'Recruiting Manager',
      'Head of People', 'Director of Talent Acquisition',
      'TA Lead', 'Recruiting Director',
      'Head of HR', 'CHRO', 'Chief People Officer',
      'VP Human Resources'
    ]
  }
};

/**
 * Matches a job title against tier keywords
 */
function getTierForTitle(title) {
  if (!title) return null;
  const titleLower = title.toLowerCase();

  for (const [tier, config] of Object.entries(TITLE_TIERS)) {
    for (const keyword of config.keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return tier;
      }
    }
  }
  return null;
}

/**
 * POST /campaigns-v2/:campaignId/scrape-company-by-titles
 * Scrape contacts from a company by title tier and auto-enroll in sequence
 * Body: { domain: "example.com" }
 * Auth: TEMP DISABLED FOR TESTING
 */
router.post('/:campaignId/scrape-company-by-titles', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'domain is required' });
    }

    if (!process.env.HUNTER_API_KEY) {
      return res.status(500).json({ error: 'HUNTER_API_KEY not configured' });
    }

    // Get all contacts from Hunter.io
    let hunterLeads = [];
    try {
      hunterLeads = await fetchHunterLead(domain);
    } catch (err) {
      console.error(`[scrape-company-by-titles] Hunter error for ${domain}:`, err.message);
      return res.status(500).json({ error: `Hunter.io error: ${err.message}` });
    }

    if (!hunterLeads || !hunterLeads.length) {
      return res.status(404).json({ 
        message: 'No contacts found for this domain',
        domain,
        results: { tier1: [], tier2: [], tier3: [], enrolled: 0 }
      });
    }

    // Organize by tier
    const results = {
      tier1: [],
      tier2: [],
      tier3: [],
      unmatched: []
    };

    for (const lead of hunterLeads) {
      const tier = getTierForTitle(lead.position);
      const contact = {
        name: lead.name || 'Unknown',
        email: lead.email,
        position: lead.position || 'Unknown',
        linkedin: lead.linkedin || `https://www.google.com/search?q=${encodeURIComponent(lead.name || 'lead')} ${domain}`,
        domain: lead.domain
      };

      if (tier) {
        results[tier].push(contact);
      } else {
        results.unmatched.push(contact);
      }
    }

    // Simple enrollment - just enroll tier1, tier2, tier3 with basic template
    let enrolledCount = 0;
    const enrolledContacts = [];

    for (const tier of ['tier1', 'tier2', 'tier3']) {
      for (const contact of results[tier]) {
        try {
          // Enroll right away with just basic info
          const enrollResult = await enrollProspectInSequence({
            campaignId,
            prospectEmail: contact.email,
            prospectName: contact.name,
            prospectCompany: domain,
            prospectTitle: contact.position,
            tierLevel: tier,
            userId: req.user?.id || 'test-user-bypass'
          });

          if (enrollResult.success) {
            enrolledCount++;
            enrolledContacts.push({
              ...contact,
              prospectId: enrollResult.prospectId,
              tier,
              prospectSequenceId: enrollResult.prospectSequenceId,
              firstTouchDate: enrollResult.firstTouchDate,
              enrolledAt: new Date().toISOString()
            });
            console.log(`[scrape-company-by-titles] ✅ Enrolled ${contact.email}`);
          } else {
            console.error(`[scrape-company-by-titles] ❌ Failed to enroll ${contact.email}:`, enrollResult.error);
          }
        } catch (err) {
          console.error(`[scrape-company-by-titles] Error enrolling ${contact.email}:`, err.message);
        }
      }
    }

    // Save campaign to database
    try {
      await supabase.from('campaigns').insert({
        id: campaignId,
        status: 'active'
      });
      console.log(`[scrape-company-by-titles] ✅ Campaign ${campaignId} saved to database`);
    } catch (dbErr) {
      console.warn(`[scrape-company-by-titles] Warning: Could not save campaign to DB:`, dbErr.message);
    }

    // Return organized results
    res.json({
      success: true,
      domain,
      campaignId,
      totalFound: hunterLeads.length,
      totalEnrolled: enrolledCount,
      results: {
        tier1: {
          count: results.tier1.length,
          pitch: TITLE_TIERS.tier1.pitch,
          contacts: results.tier1
        },
        tier2: {
          count: results.tier2.length,
          pitch: TITLE_TIERS.tier2.pitch,
          contacts: results.tier2
        },
        tier3: {
          count: results.tier3.length,
          pitch: TITLE_TIERS.tier3.pitch,
          contacts: results.tier3
        },
        unmatched: {
          count: results.unmatched.length,
          contacts: results.unmatched.slice(0, 5) // Show first 5 unmatched
        }
      },
      enrolledContacts,
      summary: `✅ Scraped ${hunterLeads.length} contacts from ${domain}, enrolled ${enrolledCount} in sequence (Tier 1: ${results.tier1.length}, Tier 2: ${results.tier2.length}, Tier 3: ${results.tier3.length})`
    });
  } catch (error) {
    console.error('[scrape-company-by-titles] error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape company' });
  }
});

/**
 * Get all campaigns for current user
 */
router.get('/', async (req, res) => {
  try {
    // Check if supabase is available
    if (!supabase) {
      console.warn('[campaigns GET] supabase not available, returning empty campaigns');
      return res.json({
        success: true,
        campaigns: [],
        total: 0
      });
    }

    const { data: campaigns, error } = await supabase
      .from('sutra_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[campaigns GET] Error fetching campaigns:', error.message);
      // Return empty array instead of 500 error
      return res.json({
        success: true,
        campaigns: [],
        total: 0,
        error: error.message
      });
    }
    
    // Format response with available fields
    const formattedCampaigns = (campaigns || []).map(campaign => ({
      id: campaign.id,
      status: campaign.status || 'unknown',
      createdAt: campaign.created_at,
      domain: campaign.domain || '-',
      totalFound: campaign.total_found || 0,
      totalEnrolled: campaign.total_enrolled || 0
    }));
    
    res.json({
      success: true,
      campaigns: formattedCampaigns,
      total: formattedCampaigns.length
    });
  } catch (error) {
    console.error('[campaigns GET] error:', error);
    // Return empty array instead of 500 error
    res.json({
      success: true,
      campaigns: [],
      total: 0,
      error: error.message || 'Failed to fetch campaigns'
    });
  }
});

/**
 * POST /campaigns-v2/:campaignId/check-replies
 * Check Gmail for replies to outbound campaign emails
 * Auto-send AI-powered responses and update prospect status
 */
router.post('/:campaignId/check-replies', requireAuth, async (req, res) => {
  const { campaignId } = req.params;
  const { prospectsList } = req.body;  // Accept prospects list from frontend
  
  try {
    console.log(`[check-replies] Checking for replies for campaign: ${campaignId}`);
    
    // Try to get campaign from memory first
    const result = campaignManager.getCampaign(campaignId);
    let campaign = null;
    let prospects = null;
    
    if (result.success) {
      // Campaign found in memory
      campaign = result.campaign;
      prospects = campaign.prospects || [];
      console.log(`[check-replies] Found campaign in memory with ${prospects.length} prospects`);
    } else if (prospectsList && Array.isArray(prospectsList)) {
      // Use prospects passed from frontend
      console.log(`[check-replies] Using ${prospectsList.length} prospects from frontend`);
      prospects = prospectsList;
    } else {
      // No campaign in memory and no prospects from frontend
      const allCampaigns = campaignManager.getAllCampaigns();
      return res.status(404).json({ 
        error: `Campaign not found: ${campaignId}. Please send prospectsList in request body.`,
        availableCampaigns: allCampaigns.campaigns?.map(c => c.id) || []
      });
    }

    // If no prospects, return early
    if (!prospects || prospects.length === 0) {
      return res.json({
        success: true,
        campaignId,
        repliesFound: 0,
        repliesProcessed: 0,
        prospectUpdates: [],
        totalProspects: 0,
        message: 'No prospects to check for replies'
      });
    }

    // Get user ID from authenticated session or campaign
    const userId = campaign?.user_id || req.user.id;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Campaign does not have a user_id and user not authenticated. Try creating the campaign again.'
      });
    }

    console.log(`[check-replies] Using userId: ${userId}`);

    let tokens;
    try {
      tokens = await getTokensForUser(userId);
    } catch (tokenErr) {
      console.error('[check-replies] Token fetch error:', tokenErr.message);
      return res.status(400).json({
        error: 'Failed to retrieve Google tokens',
        details: 'getTokensForUser error - possibly invalid user_id'
      });
    }

    if (!tokens) {
      return res.status(400).json({ 
        error: 'Google not connected for this user. Please reconnect Gmail in Settings.',
        userId: userId  
      });
    }

    let client;
    try {
      const credResult = await setCredentials(tokens, userId);
      client = credResult.client;
    } catch (credErr) {
      console.error('[check-replies] Credentials error:', credErr.message);
      return res.status(400).json({
        error: 'Failed to setup Google auth',
        details: credErr.message
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: client });

    // Get unread emails from Gmail
    let messages = [];
    try {
      const response = await gmail.users.messages.list({ 
        userId: 'me', 
        q: 'is:unread',
        maxResults: 50
      });
      messages = response.data.messages || [];
    } catch (gmailErr) {
      console.error('[check-replies] Gmail list error:', gmailErr.message);
      // Don't fail - just return no messages
      messages = [];
    }

    let repliesProcessed = 0;
    const prospectUpdates = [];

    // Parse and match emails to campaign prospects
    for (const msg of messages) {
      try {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = msgData.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name === 'From')?.value || '';
        const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '';
        
        // Extract email from "Name <email>" format
        const fromEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader.split(' ')[0];
        const replyText = msgData.data.snippet || '';

        console.log(`[check-replies] Processing email from: ${fromEmail}`);

        // Find prospect in list with matching email
        const prospect = prospects?.find(p => 
          p.email?.toLowerCase() === fromEmail.toLowerCase()
        );

        if (!prospect) {
          console.log(`[check-replies] No prospect found for ${fromEmail}, skipping`);
          continue;
        }

        if (prospect.replied) {
          console.log(`[check-replies] Prospect ${fromEmail} already marked as replied`);
          continue;
        }

        // Classify reply intent using AI
        let intent = 'question';
        let autoReplyBody = {};
        let autoReplyError = null;

        try {
          const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
          const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';

          // AI classification: just classify intent, don't ask for reply body
          const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: AI_MODEL,
              messages: [{
                role: 'user',
                content: `Analyze this email reply and classify ONLY the intent. Return JSON with: intent (one of: positive, question, objection, not-interested, out-of-office). Nothing else.\n\nOriginal email subject: "${prospect.emailSubject || 'Outreach'}"\n\nTheir reply:\n${replyText}`
              }],
              temperature: 0.5,
              max_tokens: 100,
            }),
          });

          if (aiRes.ok) {
            const payload = await aiRes.json();
            const content = payload.choices?.[0]?.message?.content || '';
            const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            
            try {
              const parsed = JSON.parse(cleaned);
              intent = parsed.intent || 'question';
            } catch (parseErr) {
              console.error('[check-replies] AI parse error:', parseErr.message);
              intent = 'question';
            }
          }
        } catch (aiErr) {
          console.error('[check-replies] AI classification error:', aiErr.message);
          intent = 'question';
          autoReplyError = aiErr.message;
        }

        // Generate category-wise reply based on detected intent
        try {
          autoReplyBody = generateCategoryWiseReply(
            intent,
            prospect.name,
            prospect.company,
            subjectHeader || 'Your Message'
          );
          console.log(`[check-replies] Generated ${intent} reply for ${fromEmail}`);
        } catch (replyErr) {
          console.error('[check-replies] Reply generation error:', replyErr.message);
          autoReplyBody = {
            subject: `Re: ${subjectHeader || 'Your Message'}`,
            body: `Hi ${prospect.name?.split(' ')[0] || 'there'},\n\nThanks for your reply! Looking forward to connecting.\n\nBest regards`
          };
        }

        // Send auto-reply via Gmail
        let autoReplySent = false;
        try {
          await sendGmailEmail({
            to: fromEmail,
            subject: autoReplyBody.subject || 'Re: Your Message',
            body: autoReplyBody.body || 'Thanks for your message!',
            fromName: campaign.agency_name || '',
            userId: userId
          });
          autoReplySent = true;
          console.log(`[check-replies] ✅ Auto-reply sent to ${fromEmail}`);
        } catch (sendErr) {
          console.error(`[check-replies] Failed to send auto-reply to ${fromEmail}:`, sendErr.message);
          autoReplyError = sendErr.message;
        }

        // Mark email as read in Gmail
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: msg.id,
            requestBody: { removeLabelIds: ['UNREAD'] }
          });
        } catch (markErr) {
          console.error('[check-replies] Failed to mark as read:', markErr.message);
        }

        // Update campaign prospects in-memory
        prospect.replied = true;
        prospect.replyText = replyText;
        prospect.replyIntent = intent;
        prospect.autoReplySent = autoReplySent;
        prospect.autoReplySubject = autoReplyBody.subject;
        prospect.autoReplyBody = autoReplyBody.body;
        prospect.autoReplyError = autoReplyError;
        prospect.replyReceivedAt = new Date().toISOString();
        
        // Add to replies array (required for UI to show "Replied: Yes")
        if (!prospect.replies) {
          prospect.replies = [];
        }
        prospect.replies.push({
          from: fromEmail,
          subject: subjectHeader,
          text: replyText,
          intent: intent,
          receivedAt: new Date().toISOString(),
          autoReplySent: autoReplySent,
          autoReplySubject: autoReplyBody.subject,
          autoReplyBody: autoReplyBody.body
        });

        // ✅ NEW: Save reply to database for permanent persistence
        try {
          // First, ensure prospect exists in prospects table
          const { data: existingProspect, error: selectErr } = await supabase
            .from('prospects')
            .select('id')
            .eq('email', prospect.email)
            .single();

          let prospectDbId = existingProspect?.id;
          
          if (!existingProspect) {
            const { data: newProspect, error: insertProspectErr } = await supabase
              .from('prospects')
              .insert({
                campaign_id: campaignId,
                name: prospect.name,
                email: prospect.email,
                role: prospect.role,
                company: prospect.company,
                linkedin_profile: prospect.linkedinProfile,
                industry: prospect.personalizationInfo?.industry,
                personalization_source: prospect.personalizationInfo?.source,
                status: 'replied'
              })
              .select('id')
              .single();
            
            if (insertProspectErr) {
              console.error('[check-replies] Failed to insert prospect:', insertProspectErr.message);
            } else {
              prospectDbId = newProspect?.id;
            }
          }

          // Then, save the reply to prospect_replies table
          if (prospectDbId) {
            const { error: insertReplyErr } = await supabase
              .from('prospect_replies')
              .insert({
                prospect_id: prospectDbId,
                campaign_id: campaignId,
                reply_from: fromEmail,
                subject: subjectHeader,
                body: replyText,
                detected_objection: intent,
                sentiment: intent === 'positive' ? 'positive' : intent === 'not-interested' ? 'negative' : 'neutral',
                reply_date: new Date().toISOString(),
                user_responded: false,
                suggested_response: autoReplyBody.body,
                notes: autoReplyError || null
              });

            if (insertReplyErr) {
              console.error('[check-replies] Failed to save reply to DB:', insertReplyErr.message);
            } else {
              console.log(`[check-replies] ✅ Reply saved to database for ${fromEmail}`);
            }

            // Update prospect status to 'replied'
            const { error: updateErr } = await supabase
              .from('prospects')
              .update({ status: 'replied', updated_at: new Date().toISOString() })
              .eq('id', prospectDbId);

            if (updateErr) {
              console.error('[check-replies] Failed to update prospect status:', updateErr.message);
            }
          }
        } catch (dbErr) {
          console.error('[check-replies] Database error:', dbErr.message);
          // Don't fail the entire check-replies operation if DB save fails
        }

        prospectUpdates.push({
          prospectId: prospect.id,
          replied: true,
          replyText,
          replyIntent: intent,
          autoReplySent,
          autoReplySubject: autoReplyBody.subject,
          autoReplyBody: autoReplyBody.body,
          autoReplyError,
          replyReceivedAt: prospect.replyReceivedAt
        });

        repliesProcessed++;

      } catch (msgErr) {
        console.error('[check-replies] Error processing message:', msgErr.message);
      }
    }

    res.json({
      success: true,
      campaignId,
      repliesFound: messages.length,
      repliesProcessed,
      prospectUpdates,
      totalProspects: prospects?.length || 0,
      message: repliesProcessed > 0 ? `✅ Processed ${repliesProcessed} replies` : 'No new replies found'
    });

  } catch (error) {
    console.error('[check-replies] error:', error);
    res.status(500).json({ error: error.message || 'Failed to check replies' });
  }
});

/**
 * GET /campaigns/:campaignId/prospects/:prospectId/replies
 * Fetch all replies for a specific prospect from the database
 */
router.get('/:campaignId/prospects/:prospectId/replies', async (req, res) => {
  try {
    const { campaignId, prospectId } = req.params;

    // Get prospect from memory first to find email
    const prospectResult = campaignManager.getProspectDetails(prospectId);
    if (!prospectResult.success) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const prospect = prospectResult.prospect;
    const prospectEmail = prospect.email;

    // Find prospect in database by email
    const { data: dbProspect, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('email', prospectEmail)
      .single();

    if (prospectError || !dbProspect) {
      // No database record yet, return empty replies
      return res.json({
        success: true,
        prospectId,
        prospectEmail,
        replies: [],
        message: 'No replies found in database'
      });
    }

    // Fetch all replies for this prospect from database
    const { data: replies, error: repliesError } = await supabase
      .from('prospect_replies')
      .select('*')
      .eq('prospect_id', dbProspect.id)
      .order('reply_date', { ascending: false });

    if (repliesError) {
      console.error('[get-replies] Database error:', repliesError.message);
      return res.status(500).json({ error: 'Failed to fetch replies from database' });
    }

    res.json({
      success: true,
      prospectId,
      prospectEmail,
      prospectName: prospect.name,
      replies: replies || [],
      totalReplies: replies?.length || 0
    });
  } catch (error) {
    console.error('[get-replies] Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to get replies' });
  }
});

/**
 * POST /campaigns-v2/:campaignId/send-huma-emails
 * Send campaign emails from Huma's Google Workspace account
 */
router.post('/:campaignId/send-huma-emails', requireAuth, async (req, res) => {
  const { campaignId } = req.params;
  const { prospects: prospectsList, emailTemplate } = req.body;

  try {
    console.log(`[send-huma-emails] Sending emails to ${prospectsList?.length || 0} prospects from ${process.env.HUMA_EMAIL}`);

    if (!prospectsList || !Array.isArray(prospectsList) || prospectsList.length === 0) {
      return res.status(400).json({ error: 'Missing or empty prospects list' });
    }

    if (!process.env.HUMA_SERVICE_ACCOUNT_JSON) {
      return res.status(500).json({ error: 'Huma email service account not configured' });
    }

    // Import Huma Gmail utilities
    const { sendHumaEmail } = await import('../utils/huma-gmail.js');

    const results = {
      success: true,
      campaignId,
      totalProspects: prospectsList.length,
      emailsSent: 0,
      emailsFailed: 0,
      details: []
    };

    for (const prospect of prospectsList) {
      try {
        if (!prospect.email) {
          console.error(`[send-huma-emails] Prospect missing email: ${prospect.name}`);
          results.emailsFailed++;
          results.details.push({
            name: prospect.name,
            email: prospect.email,
            success: false,
            error: 'Missing email address'
          });
          continue;
        }

        // Generate email subject and body
        let subject = emailTemplate?.subject || `Message for ${prospect.name}`;
        let body = emailTemplate?.body || `Hi ${prospect.name},\n\nWe'd like to connect!\n\nBest regards,\nHuma`;

        // Replace template variables
        if (emailTemplate?.hasTemplate) {
          body = body
            .replace(/\{name\}/g, prospect.name)
            .replace(/\{company\}/g, prospect.company || '')
            .replace(/\{role\}/g, prospect.role || '');
        }

        // Send email via Huma's account
        await sendHumaEmail({
          to: prospect.email,
          subject,
          body
        });

        results.emailsSent++;
        results.details.push({
          name: prospect.name,
          email: prospect.email,
          success: true
        });

        console.log(`[send-huma-emails] ✅ Sent to ${prospect.email}`);

      } catch (emailErr) {
        console.error(`[send-huma-emails] Failed to send to ${prospect.email}:`, emailErr.message);
        results.emailsFailed++;
        results.details.push({
          name: prospect.name,
          email: prospect.email,
          success: false,
          error: emailErr.message
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('[send-huma-emails] error:', error);
    res.status(500).json({ error: error.message || 'Failed to send Huma emails' });
  }
});

/**
 * POST /campaigns-v2/:campaignId/check-huma-replies
 * Check for replies on Huma's email account
 */
router.post('/:campaignId/check-huma-replies', requireAuth, async (req, res) => {
  const { campaignId } = req.params;
  const { prospectsList } = req.body;

  try {
    console.log(`[check-huma-replies] Checking ${prospectsList?.length || 0} prospects for replies`);

    if (!process.env.HUMA_SERVICE_ACCOUNT_JSON) {
      return res.status(500).json({ error: 'Huma email service account not configured' });
    }

    if (!prospectsList || !Array.isArray(prospectsList) || prospectsList.length === 0) {
      return res.json({
        success: true,
        campaignId,
        repliesFound: 0,
        repliesProcessed: 0,
        prospectUpdates: [],
        totalProspects: 0,
        message: 'No prospects to check for replies'
      });
    }

    // Import Huma Gmail utilities
    const { getUnreadEmails, getThreadReplies, markAsRead } = await import('../utils/huma-gmail.js');
    const OpenRouter = (await import('openrouter')).default;

    // Build email list for search
    const prospectEmails = prospectsList.map(p => p.email).filter(Boolean);
    const searchQuery = prospectEmails.map(email => `from:${email}`).join(' OR ');

    let messages = [];
    try {
      const unreadMessages = await getUnreadEmails(searchQuery);
      messages = unreadMessages;
      console.log(`[check-huma-replies] Found ${messages.length} unread emails from prospects`);
    } catch (gmailErr) {
      console.error('[check-huma-replies] Gmail search error:', gmailErr.message);
      return res.status(500).json({ error: 'Failed to search Gmail: ' + gmailErr.message });
    }

    let repliesProcessed = 0;
    const prospectUpdates = [];

    for (const msg of messages) {
      try {
        const headers = msg.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const dateHeader = headers.find(h => h.name === 'Date');

        const fromEmail = fromHeader?.value || '';
        const fromEmailMatch = fromEmail.match(/<(.+?)>/);
        const fromEmailClean = fromEmailMatch ? fromEmailMatch[1] : fromEmail;

        // Find matching prospect
        const prospect = prospectsList.find(
          p => p.email.toLowerCase() === fromEmailClean.toLowerCase()
        );

        if (!prospect) {
          console.log(`[check-huma-replies] No prospect found for ${fromEmailClean}, skipping`);
          continue;
        }

        // Extract reply body
        let replyBody = '';
        let replyText = '';
        try {
          const parts = msg.data.payload.parts || [];
          const textPart = parts.find(p => p.mimeType === 'text/plain');
          const htmlPart = parts.find(p => p.mimeType === 'text/html');
          
          if (textPart?.body?.data) {
            replyText = Buffer.from(textPart.body.data, 'base64').toString();
          } else if (htmlPart?.body?.data) {
            replyText = Buffer.from(htmlPart.body.data, 'base64').toString().replace(/<[^>]*>/g, '');
          } else if (msg.data.payload.body?.data) {
            replyText = Buffer.from(msg.data.payload.body.data, 'base64').toString();
          }
        } catch (bodyErr) {
          console.error('[check-huma-replies] Error extracting reply body:', bodyErr.message);
          replyText = '(Unable to extract reply text)';
        }

        // Classify reply intent
        let intent = 'inquiry';
        let detectedObjection = null;
        try {
          const openRouterApiKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY not configured');

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterApiKey}`,
              'HTTP-Referer': 'http://localhost:3000'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-2-70b-chat',
              messages: [
                {
                  role: 'system',
                  content: 'You are an email classification expert. Classify the email intent and detect any objections. Return JSON with: { "intent": "positive|question|objection|not_interested|out_of_office", "objection": "your detected objection or null", "sentiment": "positive|neutral|negative" }'
                },
                {
                  role: 'user',
                  content: `Classify this reply from a prospect:\n\n${replyText.substring(0, 500)}`
                }
              ]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const classification = JSON.parse(data.choices[0].message.content);
            intent = classification.intent || 'inquiry';
            detectedObjection = classification.objection;
          }
        } catch (aiErr) {
          console.error('[check-huma-replies] AI classification error:', aiErr.message);
        }

        // Save reply to database
        try {
          // Find or create prospect in database
          const { data: existingProspect, error: prospectFetchErr } = await supabase
            .from('prospects')
            .select('id')
            .eq('email', prospect.email)
            .single();

          let prospectDbId;
          if (existingProspect) {
            prospectDbId = existingProspect.id;
          } else {
            const { data: newProspect, error: insertProspectErr } = await supabase
              .from('prospects')
              .insert({
                campaign_id: campaignId,
                name: prospect.name,
                email: prospect.email,
                role: prospect.role,
                company: prospect.company,
                linkedin_profile: prospect.linkedinProfile || null,
                industry: prospect.industry || null,
                status: 'replied'
              })
              .select('id')
              .single();

            if (insertProspectErr) {
              console.error('[check-huma-replies] Failed to insert prospect:', insertProspectErr.message);
              continue;
            }
            prospectDbId = newProspect.id;
          }

          // Insert reply
          const { error: insertReplyErr } = await supabase
            .from('prospect_replies')
            .insert({
              prospect_id: prospectDbId,
              campaign_id: campaignId,
              reply_from: prospect.email,
              subject: subjectHeader?.value || '(no subject)',
              body: replyText,
              detected_objection: detectedObjection,
              sentiment: 'neutral',
              reply_date: new Date(dateHeader?.value || Date.now()).toISOString(),
              user_responded: false
            });

          if (insertReplyErr) {
            console.error('[check-huma-replies] Failed to save reply to DB:', insertReplyErr.message);
          } else {
            console.log(`[check-huma-replies] ✅ Reply saved to database for ${prospect.email}`);
          }

          // Update prospect status
          const { error: updateErr } = await supabase
            .from('prospects')
            .update({ status: 'replied', updated_at: new Date().toISOString() })
            .eq('id', prospectDbId);

          if (updateErr) {
            console.error('[check-huma-replies] Failed to update prospect status:', updateErr.message);
          }
        } catch (dbErr) {
          console.error('[check-huma-replies] Database error:', dbErr.message);
        }

        // Mark email as read
        try {
          await markAsRead(msg.id);
        } catch (markErr) {
          console.error('[check-huma-replies] Failed to mark as read:', markErr.message);
        }

        prospectUpdates.push({
          prospectId: prospect.id,
          prospectEmail: prospect.email,
          replied: true,
          replyIntent: intent,
          detectedObjection: detectedObjection
        });

        repliesProcessed++;

      } catch (msgErr) {
        console.error('[check-huma-replies] Error processing message:', msgErr.message);
      }
    }

    res.json({
      success: true,
      campaignId,
      repliesFound: messages.length,
      repliesProcessed,
      prospectUpdates,
      totalProspects: prospectsList?.length || 0,
      message: repliesProcessed > 0 ? `✅ Processed ${repliesProcessed} replies` : 'No new replies found'
    });

  } catch (error) {
    console.error('[check-huma-replies] error:', error);
    res.status(500).json({ error: error.message || 'Failed to check Huma replies' });
  }
});

export default router;
