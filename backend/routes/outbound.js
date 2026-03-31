import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import leadQualifier from '../utils/lead-qualifier.js';
import companyInsights from '../utils/company-insights.js';

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
