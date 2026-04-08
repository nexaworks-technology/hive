import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Campaign Manager
 * Handles: campaign creation, prospect discovery, email generation, tracking
 */

class CampaignManager {
  constructor() {
    this.campaignConfig = this.loadCampaignConfig();
    this.campaigns = new Map(); // In-memory storage (use DB in production)
    this.prospects = new Map();
    this.emailLogs = new Map();
  }

  loadCampaignConfig() {
    try {
      const configPath = path.join(__dirname, '../data/campaign-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading campaign config:', error.message);
      return null;
    }
  }

  /**
   * Create a new campaign
   */
  createCampaign(campaignData) {
    const {
      campaignName,
      targetCompany,
      targetCompanyWebsite,
      campaignType = 'direct',
      targetIndustry,
      targetCountries = ['United States', 'United Kingdom', 'United Arab Emirates'],
      hiringFocus = true,
      maxProspects = 100,
      notes = ''
    } = campaignData;

    if (!campaignName || !targetCompany) {
      return {
        success: false,
        error: 'Missing required fields: campaignName, targetCompany'
      };
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const campaign = {
      id: campaignId,
      name: campaignName,
      targetCompany: targetCompany,
      targetCompanyWebsite: targetCompanyWebsite,
      campaignType: campaignType,
      targetIndustry: targetIndustry,
      targetCountries: targetCountries,
      hiringFocus: hiringFocus,
      maxProspects: maxProspects,
      notes: notes,
      createdAt: new Date().toISOString(),
      status: 'draft', // draft, active, paused, completed
      prospects: [],
      prospectCount: 0,
      emailsSent: 0,
      repliesReceived: 0,
      followUpSchedule: this.campaignConfig.defaultFollowUpSchedule,
      linkedinSearchStrategies: this.generateLinkedinSearchStrategies(campaignData)
    };

    this.campaigns.set(campaignId, campaign);

    return {
      success: true,
      campaign: campaign,
      linkedinSearchQueries: campaign.linkedinSearchStrategies
    };
  }

  /**
   * Generate LinkedIn search strategies based on campaign
   */
  generateLinkedinSearchStrategies(campaignData) {
    const { targetCompanyIndustry, hiringFocus, targetCountries } = campaignData;
    const strategies = [];

    // Hiring signals search
    if (hiringFocus) {
      const hiringSearches = this.campaignConfig.linkedinSearchStrategies.hiringSignals.general;
      strategies.push({
        name: 'General Hiring Signals',
        queries: hiringSearches,
        description: 'Find people posting about hiring/team growth',
        filters: {
          titles: ['CTO', 'VP of Engineering', 'Founder', 'CEO', 'Head of Talent'],
          locations: targetCountries,
          industries: ['Software Development', 'Technology', 'Financial Services']
        }
      });
    }

    // Funding trigger search
    strategies.push({
      name: 'Recently Funded',
      queries: this.campaignConfig.linkedinSearchStrategies.hiringSignals.fundingTrigger,
      description: 'Target founders/CEOs who just raised Series A/B funding',
      filters: {
        titles: ['Founder', 'CEO', 'Co-Founder'],
        locations: targetCountries,
        posts: 'Last 30 days'
      }
    });

    // Role-specific searches
    strategies.push({
      name: 'CTO & Tech Leaders',
      queries: [this.campaignConfig.linkedinSearchStrategies.hiringSignals.byRole.cto],
      description: 'Target CTOs discussing hiring/scaling',
      filters: {
        titles: ['CTO', 'Chief Technology Officer', 'VP of Engineering'],
        locations: targetCountries
      }
    });

    return strategies;
  }

  /**
   * Add prospect to campaign
   */
  addProspect(campaignId, prospectData) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const {
      name,
      email,
      linkedinProfile,
      linkedinUrl,
      role,
      company,
      industry,
      location,
      personalizationInfo = {}
    } = prospectData;

    if (!name || !email) {
      return { success: false, error: 'Missing required fields: name, email' };
    }

    const prospectId = `pros_${campaignId}_${campaign.prospects.length}`;

    const prospect = {
      id: prospectId,
      campaignId: campaignId,
      name: name,
      email: email,
      linkedinProfile: linkedinProfile || linkedinUrl,
      role: role,
      company: company,
      industry: industry,
      location: location,
      personalizationInfo: personalizationInfo,
      status: 'pending', // pending, outreach_sent, replied, follow_up, closed
      createdAt: new Date().toISOString(),
      emails: [], // Array of sent emails with timestamps
      replies: [], // Array of replies
      followUps: [], // Array of scheduled follow-ups
      notes: []
    };

    campaign.prospects.push(prospectId);
    campaign.prospectCount = campaign.prospects.length;
    this.prospects.set(prospectId, prospect);

    return {
      success: true,
      prospect: prospect,
      campaignProspectCount: campaign.prospectCount
    };
  }

  /**
   * Batch add prospects from LinkedIn search results
   */
  addProspectsFromLinkedinSearch(campaignId, prospectsList) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const added = [];
    const errors = [];

    prospectsList.forEach((prospect, index) => {
      const result = this.addProspect(campaignId, prospect);
      if (result.success) {
        added.push(result.prospect);
      } else {
        errors.push({ index, error: result.error });
      }
    });

    return {
      success: true,
      totalAdded: added.length,
      totalErrors: errors.length,
      prospects: added,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get campaign with all prospects
   */
  getCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const prospects = campaign.prospects.map(pId => this.prospects.get(pId));

    return {
      success: true,
      campaign: {
        ...campaign,
        prospects: prospects,
        stats: {
          total: campaign.prospectCount,
          pending: prospects.filter(p => p.status === 'pending').length,
          sent: prospects.filter(p => p.emails.length > 0).length,
          replied: prospects.filter(p => p.replies.length > 0).length,
          followUp: prospects.filter(p => p.followUps.length > 0).length
        }
      }
    };
  }

  /**
   * Get prospect list for campaign (table view)
   */
  getProspectsList(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const prospectsList = campaign.prospects.map(pId => {
      const prospect = this.prospects.get(pId);
      return {
        id: prospect.id,
        name: prospect.name,
        email: prospect.email,
        linkedinProfile: prospect.linkedinProfile,
        role: prospect.role,
        company: prospect.company,
        location: prospect.location,
        personalizationInfo: prospect.personalizationInfo,
        status: prospect.status,
        emailsSent: prospect.emails.length,
        mailSent: prospect.emails.length > 0 ? 'Yes' : 'No',
        lastEmailDate: prospect.emails.length > 0 ? prospect.emails[prospect.emails.length - 1].sentAt : null,
        replied: prospect.replies.length > 0 ? 'Yes' : 'No',
        replyCount: prospect.replies.length,
        followUps: prospect.followUps.length,
        createdAt: prospect.createdAt,
        notes: prospect.notes
      };
    });

    return {
      success: true,
      campaignId: campaignId,
      prospectsList: prospectsList,
      stats: {
        total: prospectsList.length,
        mailSent: prospectsList.filter(p => p.mailSent === 'Yes').length,
        replied: prospectsList.filter(p => p.replied === 'Yes').length,
        pending: prospectsList.filter(p => p.status === 'pending').length
      }
    };
  }

  /**
   * Get prospect details with personalization info
   */
  getProspectDetails(prospectId) {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      return { success: false, error: 'Prospect not found' };
    }

    return {
      success: true,
      prospect: prospect,
      emailHistory: prospect.emails || [],
      replies: prospect.replies || [],
      schedule: prospect.followUps || [],
      personalizedInfo: prospect.personalizationInfo
    };
  }

  /**
   * Personalize email for prospect
   */
  personalizeEmail(emailTemplate, prospect, campaignDetails = {}) {
    let personalizedEmail = emailTemplate;

    const enrichedData = prospect.enrichedData || {};

    const tokens = {
      '{{companyName}}': campaignDetails.targetCompany || 'SutraHR',
      '{{prospectName}}': prospect.name || '',
      '{{prospectRole}}': prospect.role || 'there',
      '{{prospectCompanyName}}': prospect.company || '',
      '{{prospectCompanyIndustry}}': prospect.industry || '',
      '{{prospectCompanyLocation}}': prospect.location || '',
      '{{hiringNeed}}': campaignDetails.hiringFocus ? 'tech talent' : 'talent',
      '{{personalizationInsight}}': prospect.personalizationInfo?.insight || '',
      // Enriched tokens
      '{{prospectHeadline}}': enrichedData.prospectHeadline || '',
      '{{prospectAchievement}}': enrichedData.prospectAchievement || '',
      '{{recentJobChange}}': enrichedData.recentJobChange || ''
    };

    Object.entries(tokens).forEach(([token, value]) => {
      personalizedEmail = personalizedEmail.replace(new RegExp(token, 'g'), value);
    });

    return personalizedEmail;
  }

  /**
   * Send email to prospect
   */
  sendEmail(prospectId, emailData) {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      return { success: false, error: 'Prospect not found' };
    }

    const { subject, body, from = 'pavan@sutrahr.com', emailType = 'initial' } = emailData;

    const emailRecord = {
      id: `email_${Date.now()}`,
      to: prospect.email,
      from: from,
      subject: subject,
      body: body,
      type: emailType, // initial, follow-up, social-proof
      sentAt: new Date().toISOString(),
      opened: false,
      clicked: false,
      replied: false
    };

    prospect.emails.push(emailRecord);
    prospect.status = prospect.status === 'pending' ? 'outreach_sent' : prospect.status;

    // Log email
    if (!this.emailLogs.has(prospectId)) {
      this.emailLogs.set(prospectId, []);
    }
    this.emailLogs.get(prospectId).push(emailRecord);

    return {
      success: true,
      emailRecord: emailRecord,
      prospectStatus: prospect.status
    };
  }

  /**
   * Log reply from prospect
   */
  logReply(prospectId, replyData) {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      return { success: false, error: 'Prospect not found' };
    }

    const { from, subject, body, receivedAt = new Date().toISOString() } = replyData;

    const reply = {
      id: `reply_${Date.now()}`,
      from: from,
      subject: subject,
      body: body,
      receivedAt: receivedAt,
      sentiment: this.analyzeSentiment(body) // positive, neutral, negative
    };

    prospect.replies.push(reply);
    prospect.status = 'replied';

    return {
      success: true,
      reply: reply,
      prospectStatus: prospect.status
    };
  }

  /**
   * Analyze reply sentiment (simple heuristic)
   */
  analyzeSentiment(text) {
    const positive = ['interested', 'great', 'love', 'perfect', 'excellent', 'yes', "let's", 'meeting', 'call', 'discuss'];
    const negative = ['no', 'not interested', 'pass', 'busy', 'not now', 'unsubscribe'];

    const lower = text.toLowerCase();
    const positiveCount = positive.filter(word => lower.includes(word)).length;
    const negativeCount = negative.filter(word => lower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Schedule follow-up
   */
  scheduleFollowUp(prospectId, followUpData) {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      return { success: false, error: 'Prospect not found' };
    }

    const { followUpDate, followUpType = 'email', followUpTemplate = '', notes = '' } = followUpData;

    const followUp = {
      id: `followup_${Date.now()}`,
      dueDate: followUpDate,
      type: followUpType, // email, linkedin_message, phone_call
      template: followUpTemplate,
      notes: notes,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString()
    };

    prospect.followUps.push(followUp);

    return {
      success: true,
      followUp: followUp
    };
  }

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const prospects = campaign.prospects.map(pId => this.prospects.get(pId));

    const stats = {
      campaignId: campaignId,
      campaignName: campaign.name,
      createdAt: campaign.createdAt,
      prospectCount: campaign.prospectCount,
      emailsSent: prospects.reduce((sum, p) => sum + p.emails.length, 0),
      repliesReceived: prospects.reduce((sum, p) => sum + p.replies.length, 0),
      followUpsScheduled: prospects.reduce((sum, p) => sum + p.followUps.length, 0),
      statusBreakdown: {
        pending: prospects.filter(p => p.status === 'pending').length,
        outreachSent: prospects.filter(p => p.status === 'outreach_sent').length,
        replied: prospects.filter(p => p.status === 'replied').length,
        followUp: prospects.filter(p => p.status === 'follow_up').length,
        closed: prospects.filter(p => p.status === 'closed').length
      },
      sentimentBreakdown: {
        positive: prospects.filter(p => p.replies.some(r => r.sentiment === 'positive')).length,
        neutral: prospects.filter(p => p.replies.some(r => r.sentiment === 'neutral')).length,
        negative: prospects.filter(p => p.replies.some(r => r.sentiment === 'negative')).length
      },
      conversionMetrics: {
        replyRate: `${Math.round((prospects.filter(p => p.replies.length > 0).length / campaign.prospectCount) * 100)}%`,
        responseRate: prospects.filter(p => p.replies.length > 0).length,
        avgEmailsPerProspect: (prospects.reduce((sum, p) => sum + p.emails.length, 0) / campaign.prospectCount).toFixed(1)
      }
    };

    return {
      success: true,
      stats: stats
    };
  }

  /**
   * Update campaign status
   */
  updateCampaignStatus(campaignId, newStatus) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const validStatuses = ['draft', 'active', 'paused', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: 'Invalid status' };
    }

    campaign.status = newStatus;

    return {
      success: true,
      campaign: campaign
    };
  }

  /**
   * Add prospects from web-scraped leads
   * Transforms scraped data into prospect format and adds to campaign
   */
  addProspectsFromScrapedLeads(campaignId, scrapedLeads) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const added = [];
    const errors = [];

    scrapedLeads.forEach((lead, index) => {
      try {
        // Transform scraped lead to prospect format
        const prospectData = {
          name: lead.name,
          email: lead.email,
          role: lead.title || 'Unknown',
          company: lead.company || campaign.targetCompany,
          linkedinProfile: lead.linkedin,
          personalizationInfo: {
            source: 'web-scrape',
            scrapedAt: new Date().toISOString(),
            industry: lead.industry
          }
        };

        const result = this.addProspect(campaignId, prospectData);
        if (result.success) {
          added.push(result.prospect);
        } else {
          errors.push({ index, error: result.error, lead: lead.name });
        }
      } catch (err) {
        errors.push({ index, error: err.message, lead: lead.name });
      }
    });

    return {
      success: true,
      totalAdded: added.length,
      totalErrors: errors.length,
      prospects: added,
      errors: errors.length > 0 ? errors : undefined,
      campaignProspectCount: campaign.prospectCount
    };
  }

  /**
   * Get all campaigns
   */
  getAllCampaigns() {
    const campaigns = Array.from(this.campaigns.values()).map(c => ({
      id: c.id,
      name: c.name,
      targetCompany: c.targetCompany,
      status: c.status,
      prospectCount: c.prospectCount,
      createdAt: c.createdAt,
      stats: {
        emailsSent: c.prospects.reduce((sum, pId) => sum + this.prospects.get(pId).emails.length, 0),
        replied: c.prospects.filter(pId => this.prospects.get(pId).replies.length > 0).length
      }
    }));

    return {
      success: true,
      campaigns: campaigns,
      total: campaigns.length
    };
  }
}

export default new CampaignManager();
