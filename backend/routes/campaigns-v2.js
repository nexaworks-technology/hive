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
import { supabase } from '../supabase-client.js';

const router = express.Router();

/**
 * Send email via Gmail API using user's connected Google account
 */
async function sendGmailEmail({ to, subject, body, htmlBody, fromName, userId }) {
  if (!userId) {
    throw new Error('User ID required to send email');
  }

  const tokens = await getTokensForUser(userId);
  if (!tokens) {
    throw new Error('No Google tokens found for this user');
  }

  if (!tokens.scope || !tokens.scope.includes('gmail.send')) {
    throw new Error('Google account missing Gmail send permission');
  }

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
            total_enrolled: 0,
            created_at: new Date().toISOString(),
            metadata: JSON.stringify({
              campaignType: campaignData.campaignType,
              description: campaignData.description,
              targetCompany: campaignData.targetCompany
            })
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
 * Get campaign details
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = campaignManager.getCampaign(campaignId);

    // If not in memory, try to fetch from database
    if (!result.success && result.error) {
      const { data: dbCampaign, error: dbError } = await supabase
        .from('sutra_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (dbError || !dbCampaign) {
        return res.json(result); // Return the original error
      }

      // Return the database campaign
      return res.json({
        success: true,
        campaign: dbCampaign
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Missing required fields: subject, body'
      });
    }

    const prospect = campaignManager.getProspectDetails(prospectId);
    if (!prospect.success) {
      return res.status(404).json(prospect);
    }

    const campaign = campaignManager.getCampaign(campaignId);
    if (!campaign.success) {
      return res.status(404).json(campaign);
    }

    // Personalize email
    const personalizedBody = campaignManager.personalizeEmail(
      body,
      prospect.prospect,
      { targetCompany: campaign.campaign.targetCompany }
    );

    // If HTML body provided, use it (already has formatting); otherwise convert plain text to HTML
    let finalHtmlBody = htmlBody || personalizedBody.split('\n').map((l) => (l.trim() ? `<p>${l}</p>` : '')).join('');

    // Send email via Gmail API using authenticated user's ID
    try {
      const emailResult = await sendGmailEmail({
        to: prospect.prospect.email,
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

      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: emailResult.id
      });
    } catch (gmailError) {
      console.error('[campaigns-v2] Gmail send error:', gmailError.message);
      res.status(500).json({
        error: 'Failed to send email',
        details: gmailError.message
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
router.post('/:campaignId/prospects/:prospectId/log-reply', (req, res) => {
  try {
    const { prospectId } = req.params;
    const { from, subject, body, receivedAt } = req.body;

    const result = campaignManager.logReply(prospectId, {
      from: from,
      subject: subject,
      body: body,
      receivedAt: receivedAt
    });

    res.json(result);
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
router.post('/:campaignId/prospects/:prospectId/schedule-followup', (req, res) => {
  try {
    const { prospectId } = req.params;
    const { followUpDate, followUpType = 'email', followUpTemplate = '', notes = '' } = req.body;

    if (!followUpDate) {
      return res.status(400).json({ error: 'Missing required field: followUpDate' });
    }

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
                content: `Analyze this email reply and classify the intent. Return JSON with: intent (one of: positive, question, objection, not-interested, out-of-office), replySubject, replyBody (2-3 sentences).\n\nOriginal email subject: "${prospect.emailSubject || 'Outreach'}"\n\nTheir reply:\n${replyText}`
              }],
              temperature: 0.5,
              max_tokens: 300,
            }),
          });

          if (aiRes.ok) {
            const payload = await aiRes.json();
            const content = payload.choices?.[0]?.message?.content || '';
            const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            
            try {
              const parsed = JSON.parse(cleaned);
              intent = parsed.intent || 'question';
              autoReplyBody = {
                subject: parsed.replySubject || `Re: ${subjectHeader}`,
                body: parsed.replyBody || 'Thanks for your reply!'
              };
            } catch (parseErr) {
              console.error('[check-replies] AI parse error:', parseErr.message);
              autoReplyBody = {
                subject: `Re: ${subjectHeader}`,
                body: `Hi ${prospect.name?.split(' ')[0] || prospect.name},\n\nThanks for getting back to me! Happy to discuss further.\n\nBest regards`
              };
            }
          }
        } catch (aiErr) {
          console.error('[check-replies] AI classification error:', aiErr.message);
          autoReplyBody = {
            subject: `Re: ${subjectHeader}`,
            body: `Hi ${prospect.name?.split(' ')[0] || prospect.name},\n\nThanks for your reply! Let's connect.\n\nBest regards`
          };
          autoReplyError = aiErr.message;
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

export default router;
