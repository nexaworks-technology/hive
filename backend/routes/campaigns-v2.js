import express from 'express';
import campaignManager from '../utils/campaign-manager.js';
import companyInsights from '../utils/company-insights.js';
import leadQualifier from '../utils/lead-qualifier.js';

const router = express.Router();

/**
 * POST /campaigns/create
 * Create a new outbound campaign
 */
router.post('/create', (req, res) => {
  try {
    const campaignData = req.body;

    if (!campaignData.campaignName || !campaignData.targetCompany) {
      return res.status(400).json({
        error: 'Missing required fields: campaignName, targetCompany'
      });
    }

    const result = campaignManager.createCampaign(campaignData);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId
 * Get campaign details
 */
router.get('/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = campaignManager.getCampaign(campaignId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /campaigns
 * Get all campaigns
 */
router.get('/', (req, res) => {
  try {
    const result = campaignManager.getAllCampaigns();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
router.post('/:campaignId/prospects/:prospectId/send-email', (req, res) => {
  try {
    const { prospectId, campaignId } = req.params;
    const { subject, body, emailType = 'initial' } = req.body;

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

    const result = campaignManager.sendEmail(prospectId, {
      subject: subject,
      body: personalizedBody,
      emailType: emailType,
      from: 'pavan@sutrahr.com'
    });

    res.json(result);
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

    res.json(result);
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
router.post('/:campaignId/bulk-send-emails', (req, res) => {
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

    prospectIds.forEach(prospectId => {
      const prospectDetails = campaignManager.getProspectDetails(prospectId);
      
      if (!prospectDetails.success) {
        results.failed.push({ prospectId, error: 'Prospect not found' });
        results.totalFailed++;
        return;
      }

      const { subject, body } = emailTemplate;

      // Personalize
      const personalizedBody = campaignManager.personalizeEmail(
        body,
        prospectDetails.prospect,
        { targetCompany: campaign.campaign.targetCompany }
      );

      const sendResult = campaignManager.sendEmail(prospectId, {
        subject: subject,
        body: personalizedBody,
        emailType: 'initial',
        from: 'pavan@sutrahr.com'
      });

      if (sendResult.success) {
        results.sent.push(sendResult);
        results.totalSent++;
      } else {
        results.failed.push({ prospectId, error: sendResult.error });
        results.totalFailed++;
      }
    });

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

export default router;
