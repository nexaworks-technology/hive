import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { google } from 'googleapis';
import leadQualifier from '../utils/lead-qualifier.js';
import companyInsights from '../utils/company-insights.js';
import {
  generateTier1Email_Day1,
  generateTier2Email_Day1,
  generateTier3Email_Day1,
  generateFollowUpEmail
} from '../utils/html-email-templates.js';
import { getUserProfile } from '../utils/user-profile.js';
import { supabase } from '../supabase-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /outbound/icp
 * Get the current outbound ICP configuration
 */
router.get('/icp', (req, res) => {
  try {
    const icpSummary = leadQualifier.getICPSummary();
    res.json({
      success: true,
      icp: icpSummary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/score-lead
 * Score a single lead against the ICP
 * Body: { companyName, stage, location, industry, teamSize, hiringActivity, role }
 */
router.post('/score-lead', (req, res) => {
  try {
    const prospectData = req.body;

    if (!prospectData.companyName) {
      return res.status(400).json({
        error: 'Missing required field: companyName'
      });
    }

    const score = leadQualifier.scoreLead(prospectData);

    res.json({
      success: true,
      score: score
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/score-leads
 * Score multiple leads and return sorted by score
 * Body: { leads: [...] }
 */
router.post('/score-leads', (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        error: 'Missing required field: leads (array)'
      });
    }

    const scores = leadQualifier.scoreLeads(leads);
    const grouped = leadQualifier.groupByRecommendation(scores);

    res.json({
      success: true,
      totalLeads: scores.length,
      grouped: {
        highlyQualified: grouped.highlyQualified.length,
        qualified: grouped.qualified.length,
        notQualified: grouped.notQualified.length
      },
      scores: scores,
      breakdown: grouped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/prepare-outreach
 * Prepare a qualified lead for outreach with email + LinkedIn strategy
 * Body: { companyName, stage, location, industry, teamSize, hiringActivity, role, prospectName, linkedinUrl }
 */
router.post('/prepare-outreach', (req, res) => {
  try {
    const prospectData = req.body;

    if (!prospectData.companyName || !prospectData.prospectName) {
      return res.status(400).json({
        error: 'Missing required fields: companyName, prospectName'
      });
    }

    // Score the lead
    const leadScore = leadQualifier.scoreLead(prospectData);

    if (!leadScore.qualified) {
      return res.status(400).json({
        success: false,
        message: 'Lead does not meet minimum qualification score',
        score: leadScore
      });
    }

    // Generate email draft based on prospect data
    const emailDraft = companyInsights.generateEmailDraft({
      prospectName: prospectData.prospectName,
      companyName: prospectData.companyName,
      role: prospectData.role || 'Hiring Manager',
      hiringNeeds: 'skilled talent for your growing team',
      prospectType: prospectData.prospectType || 'founder', // Will be determined by role
      industry: prospectData.industry,
      stage: prospectData.stage,
      team: prospectData.teamSize
    });

    // Generate email hooks
    const emailHooks = companyInsights.getEmailHooks({
      company: prospectData.companyName,
      role: prospectData.role,
      industry: prospectData.industry,
      stage: prospectData.stage,
      size: prospectData.teamSize
    });

    // Get proof points for signature
    const proofPoints = companyInsights.getProofPoints();

    // Determine outreach sequence
    const outreachSequence = {
      day0: {
        action: 'LinkedIn Connection Request',
        timing: 'Immediately',
        description: 'Send connection request with thoughtful message about their hiring needs',
        linkedinUrl: prospectData.linkedinUrl
      },
      day3: {
        action: 'Follow-up Email',
        timing: '3 days later',
        description: 'Send personalized email with specific insights about their company'
      },
      day7: {
        action: 'LinkedIn Message',
        timing: '7 days later',
        description: 'If connected, send direct LinkedIn message with social proof'
      },
      day14: {
        action: 'Secondary Email',
        timing: '14 days later',
        description: 'Final attempt with different angle or case study'
      }
    };

    res.json({
      success: true,
      prospectData: prospectData,
      leadScore: leadScore,
      outreachStrategy: {
        emailDraft: emailDraft,
        emailHooks: emailHooks,
        proofPoints: proofPoints,
        outreachSequence: outreachSequence,
        channels: ['LinkedIn', 'Email'],
        expectedOutcome: {
          connectionAcceptanceRate: '15-25%',
          responseRate: '10-15%',
          conversionRate: '2-3%'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/send-prospecting-email
 * Generate and send HTML prospecting email based on prospect tier
 * Body: { prospectName, prospectEmail, prospectCompany, prospectTitle, tier, dayNumber, userId }
 */
/**
 * POST /outbound/test-html-email
 * TEST EMAIL - Send a sample HTML email with Tier 1 template
 */
router.post('/test-html-email', async (req, res) => {
  try {
    const { prospectName = 'John', prospectEmail, prospectCompany = 'Acme Corp', userId } = req.body;

    if (!prospectEmail) {
      return res.status(400).json({ error: 'prospectEmail is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required - please log in and connect your Google account' });
    }

    // Generate Tier 1 email
    const htmlEmail = generateTier1Email_Day1(prospectName, prospectCompany);
    const subject = `🧪 TEST: Speed + vetting quality for ${prospectCompany}?`;

    console.log(`[outbound-test] 📧 Sending TEST HTML email to ${prospectEmail}`);

    let userProfile = null;
    try {
      userProfile = getUserProfile();
    } catch (err) {
      console.warn('[outbound-test] Could not load user profile');
    }

    const senderName = userProfile?.name || 'SutraHR Test';

    try {
      const sendResult = await sendHTMLEmailViaGmail({
        to: prospectEmail,
        subject,
        htmlBody: htmlEmail,
        fromName: senderName,
        userId
      });

      return res.json({
        success: true,
        message: 'TEST HTML email sent successfully!',
        sendResult
      });
    } catch (err) {
      console.error('[outbound-test] Gmail send error:', err.message);
      return res.status(500).json({
        success: false,
        error: `Failed to send test email: ${err.message}`,
        hint: 'Make sure your Google account is connected and has Gmail permissions'
      });
    }
  } catch (error) {
    console.error('[outbound-test] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/send-prospecting-email
 * Send a prospecting email with HTML template
 */
router.post('/send-prospecting-email', async (req, res) => {
  try {
    const { prospectName, prospectEmail, prospectCompany, prospectTitle, tier = 'tier1', dayNumber = 1, userId } = req.body;

    if (!prospectEmail || !prospectCompany || !prospectName) {
      return res.status(400).json({
        error: 'Missing required fields: prospectName, prospectEmail, prospectCompany'
      });
    }

    // Get user profile for sender info
    let userProfile = null;
    try {
      userProfile = getUserProfile();
    } catch (err) {
      console.warn('[outbound] Could not load user profile');
    }

    const senderName = userProfile?.name || 'SutraHR Team';
    const senderEmail = userProfile?.email || 'sales@sutrahr.com';

    // Generate HTML email based on tier and day
    let htmlEmail = null;
    let subject = '';

    const tierLower = String(tier).toLowerCase();

    if (dayNumber === 1) {
      // Day 1: Initial outreach based on tier
      if (tierLower.includes('tier1') || tierLower === '1') {
        htmlEmail = generateTier1Email_Day1(prospectName, prospectCompany);
        subject = `Speed + vetting quality for ${prospectCompany}?`;
      } else if (tierLower.includes('tier2') || tierLower === '2') {
        htmlEmail = generateTier2Email_Day1(prospectName, prospectCompany);
        subject = `60% savings + zero risk for ${prospectCompany}`;
      } else {
        // Tier 3 (TA/Recruiting)
        htmlEmail = generateTier3Email_Day1(prospectName, prospectCompany);
        subject = `Team extension for ${prospectCompany}?`;
      }
    } else {
      // Follow-up emails (day 3, 7, 14, etc.)
      htmlEmail = generateFollowUpEmail(prospectName, prospectCompany, dayNumber);
      subject = `Quick follow-up on our previous message`;
    }

    if (!htmlEmail) {
      return res.status(400).json({
        error: 'Could not generate email template for tier: ' + tier
      });
    }

    console.log(`[outbound] 📧 Sending HTML email to ${prospectName} <${prospectEmail}>`);
    console.log(`[outbound] Subject: ${subject}`);

    // Try to send via Gmail API if userId provided
    let sendResult = { success: false, message: 'Email not sent' };

    if (userId) {
      try {
        sendResult = await sendHTMLEmailViaGmail({
          to: prospectEmail,
          subject,
          htmlBody: htmlEmail,
          fromName: senderName,
          userId
        });
      } catch (err) {
        console.error('[outbound] Gmail send error:', err.message);
        sendResult = {
          success: false,
          message: `Failed to send via Gmail: ${err.message}`,
          error: err.message
        };
      }
    } else {
      // No userId provided - just return the email content for manual testing
      sendResult = {
        success: true,
        message: 'Email generated (not sent - no userId provided)',
        requiresAuth: true
      };
    }

    res.json({
      success: sendResult.success,
      email: {
        to: prospectEmail,
        from: senderName,
        subject: subject,
        htmlBody: htmlEmail,
        prospectName: prospectName,
        prospectCompany: prospectCompany,
        prospectTitle: prospectTitle,
        tier: tier,
        dayNumber: dayNumber
      },
      sendResult: sendResult
    });
  } catch (error) {
    console.error('[outbound] Error in send-prospecting-email:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function: Send HTML email via Gmail API
 */
async function sendHTMLEmailViaGmail({ to, subject, htmlBody, fromName, userId }) {
  try {
    // Get stored Gmail tokens for user
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token, scope')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Gmail integration not configured. Connect your Google account first.');
    }

    // Verify Gmail scope
    if (!tokenData.scope || !tokenData.scope.includes('gmail.send')) {
      throw new Error('Gmail send permission not granted. Reconnect your Google account.');
    }

    // Create OAuth client with stored token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build MIME message with proper HTML and text parts
    const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
    
    // Create plain text fallback (strip HTML tags)
    const textBody = htmlBody
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    const mimeMessage = [
      `To: ${to}`,
      `From: "${fromName}" <me>`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      textBody,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      `--${boundary}--`
    ].join('\r\n');

    // Encode message for Gmail API
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`[outbound] ✅ Email sent successfully to ${to}`);

    return {
      success: true,
      message: `Email sent successfully to ${to}`,
      sentTo: to,
      subject: subject
    };
  } catch (error) {
    console.error('[outbound] Error sending via Gmail:', error.message);
    throw error;
  }
}

/**
 * POST /outbound/filter-qualified
 * Filter a list of leads and return only those above qualification threshold
 * Body: { leads: [...], minScore: default 65 }
 */
router.post('/filter-qualified', (req, res) => {
  try {
    const { leads, minScore } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        error: 'Missing required field: leads (array)'
      });
    }

    const scores = leadQualifier.scoreLeads(leads);
    const qualified = leadQualifier.filterQualifiedLeads(scores, minScore);

    res.json({
      success: true,
      totalLeads: scores.length,
      qualifiedLeads: qualified.length,
      qualificationRate: `${Math.round((qualified.length / scores.length) * 100)}%`,
      qualified: qualified
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /outbound/campaign-plan
 * Plan a campaign with list of leads
 * Body: { campaignName, leads: [...] }
 */
router.post('/campaign-plan', (req, res) => {
  try {
    const { campaignName, leads } = req.body;

    if (!campaignName || !leads || !Array.isArray(leads)) {
      return res.status(400).json({
        error: 'Missing required fields: campaignName, leads (array)'
      });
    }

    // Score all leads
    const scores = leadQualifier.scoreLeads(leads);
    const grouped = leadQualifier.groupByRecommendation(scores);
    const qualified = leadQualifier.filterQualifiedLeads(scores);

    // Get ICP summary
    const icpSummary = leadQualifier.getICPSummary();
    const campaignConfig = icpSummary.campaignConfig;

    // Calculate campaign metrics
    const totalLeads = scores.length;
    const highPriorityLeads = grouped.highlyQualified.length;
    const secondaryLeads = grouped.qualified.length;
    const expectedConnections = Math.round(qualified.length * 0.20); // 20% connection rate
    const expectedResponses = Math.round(expectedConnections * 0.12); // 12% response rate
    const expectedClosures = Math.round(expectedResponses * 0.025); // 2.5% conversion rate

    // Determine daily/weekly distribution
    const week1Daily = Math.min(campaignConfig.dailyOutreach, highPriorityLeads);
    const week1Total = week1Daily * 5;
    const week2To4Daily = Math.min(campaignConfig.dailyOutreach, Math.ceil(secondaryLeads / 15));
    const week2To4Total = week2To4Daily * 15;

    res.json({
      success: true,
      campaign: {
        name: campaignName,
        createdAt: new Date().toISOString()
      },
      summary: {
        totalLeads: totalLeads,
        highPriorityLeads: highPriorityLeads,
        secondaryLeads: secondaryLeads,
        qualifiedTotal: qualified.length,
        qualificationRate: `${Math.round((qualified.length / totalLeads) * 100)}%`
      },
      projections: {
        expectedConnections: expectedConnections,
        expectedResponses: expectedResponses,
        expectedClosures: expectedClosures,
        conversionFunnel: {
          leads: totalLeads,
          qualified: qualified.length,
          connections: expectedConnections,
          responses: expectedResponses,
          closures: expectedClosures
        }
      },
      campaignSchedule: {
        week1: {
          dailyOutreach: week1Daily,
          totalOutreach: week1Total,
          focus: 'High-priority roles (CTO, VP HR, Founders)',
          leads: grouped.highlyQualified.slice(0, week1Total)
        },
        weeks2to4: {
          dailyOutreach: week2To4Daily,
          totalOutreach: week2To4Total,
          focus: 'Secondary roles and secondary-tier leads',
          estimatedLeads: secondaryLeads
        },
        totalDuration: '30 days',
        totalOutreach: week1Total + week2To4Total
      },
      icp: icpSummary.targetICP,
      targetRoles: icpSummary.targetRoles,
      targetIndustries: icpSummary.targetIndustries
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /outbound/example-icp
 * Get example prospects that match the ICP
 */
router.get('/example-icp', (req, res) => {
  try {
    const examples = [
      {
        companyName: 'TechScale Inc',
        stage: 'Series B',
        location: 'San Francisco, USA',
        industry: 'SaaS & B2B Technology',
        teamSize: '45',
        hiringActivity: ['Currently hiring', 'VP Engineering open'],
        role: 'VP Engineering',
        prospectName: 'Sarah Chen'
      },
      {
        companyName: 'FinFlow Startup',
        stage: 'Series A',
        location: 'London, UK',
        industry: 'Fintech & Neo-Banking',
        teamSize: '28',
        hiringActivity: ['Scaling team', 'Hiring multiple Backend engineers'],
        role: 'Founder & CEO',
        prospectName: 'Raj Patel'
      },
      {
        companyName: 'HealthHQ',
        stage: 'Series B',
        location: 'Dubai, UAE',
        industry: 'Healthtech & Healthcare IT',
        teamSize: '67',
        hiringActivity: ['Recent funding received', 'Building team in Dubai'],
        role: 'Head of People',
        prospectName: 'Amanda Rodriguez'
      }
    ];

    // Score the examples
    const scores = examples.map(ex => leadQualifier.scoreLead(ex));

    res.json({
      success: true,
      examples: scores
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
