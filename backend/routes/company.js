import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import companyInsights from '../utils/company-insights.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /company/icp
 * Get ICP analysis for SutraHR
 */
router.get('/icp', (req, res) => {
  try {
    const icp = companyInsights.generateICPSummary('sutraHR');
    if (!icp) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    res.json({
      success: true,
      company: 'SutraHR',
      icp: icp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /company/email-hooks
 * Get personalized email hooks for a prospect
 * Body: { company, role, industry, stage, size, technologies }
 */
router.post('/email-hooks', (req, res) => {
  try {
    const { company, role, industry, stage, size, technologies } = req.body;
    
    if (!company || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: company, role' 
      });
    }

    const hooks = companyInsights.getEmailHooks({
      company,
      role,
      industry,
      stage,
      size,
      technologies: technologies || []
    });

    res.json({
      success: true,
      company: company,
      hooks: hooks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /company/email-angle
 * Generate personalized email angle
 * Body: { prospectType, prospectData: { ... } }
 */
router.post('/email-angle', (req, res) => {
  try {
    const { prospectType, prospectData = {} } = req.body;

    if (!prospectType) {
      return res.status(400).json({ 
        error: 'Missing required field: prospectType (founder|headOfPeople|ctoCTech|recruiter|salesperson)' 
      });
    }

    const angle = companyInsights.generateEmailAngle(prospectType, prospectData);

    res.json({
      success: true,
      prospectType: prospectType,
      angle: angle
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /company/email-draft
 * Generate complete email draft
 * Body: { prospectName, companyName, role, hiringNeeds, prospectType, ... }
 */
router.post('/email-draft', (req, res) => {
  try {
    const prospectData = req.body;

    if (!prospectData.prospectName || !prospectData.prospectType) {
      return res.status(400).json({ 
        error: 'Missing required fields: prospectName, prospectType' 
      });
    }

    const emailDraft = companyInsights.generateEmailDraft(prospectData);

    res.json({
      success: true,
      emailDraft: emailDraft
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /company/analyze-fit
 * Analyze prospect fit with SutraHR's ICP
 * Body: { industry, stage, location, teamSize, hiringPlan, ... }
 */
router.post('/analyze-fit', (req, res) => {
  try {
    const prospectData = req.body;
    const analysis = companyInsights.analyzeProspectFit(prospectData);

    res.json({
      success: true,
      analysis: analysis,
      prospectData: prospectData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /company/proof-points
 * Get SutraHR proof points and statistics
 */
router.get('/proof-points', (req, res) => {
  try {
    const proofPoints = companyInsights.getProofPoints();

    res.json({
      success: true,
      company: 'SutraHR',
      proofPoints: proofPoints
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /company/profile
 * Get full SutraHR profile
 */
router.get('/profile', (req, res) => {
  try {
    const profilePath = path.join(__dirname, '../data/sutraHR-profile.json');
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

    res.json({
      success: true,
      company: 'SutraHR',
      profile: profile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * POST /company/generate-campaign-context
 * Generate context for a prospecting campaign
 * Body: { targetRole, targetIndustry, targetGeography, campaignType }
 */
router.post('/generate-campaign-context', (req, res) => {
  try {
    const { targetRole, targetIndustry, targetGeography, campaignType = 'outreach' } = req.body;

    const context = {
      campaignType: campaignType,
      targeting: {
        role: targetRole,
        industry: targetIndustry,
        geography: targetGeography
      },
      messageThemes: [],
      expectedICP: companyInsights.generateICPSummary('sutraHR'),
      buyingSignals: companyInsights.generateICPSummary('sutraHR').buyingSignals
    };

    // Generate targeted themes based on campaign type
    if (campaignType === 'outreach') {
      context.messageThemes = [
        "Speed of hiring (21-day guarantee)",
        "Cost efficiency (no per-hire fees)",
        "Dedicated resource model",
        "India talent pool access"
      ];
    } else if (campaignType === 'nurture') {
      context.messageThemes = [
        "Success stories from similar companies",
        "Hiring challenges & solutions",
        "Market trends in tech recruiting",
        "Remote team best practices"
      ];
    } else if (campaignType === 'partnership') {
      context.messageThemes = [
        "Co-selling opportunities",
        "Referral benefits",
        "Joint case studies",
        "Integration possibilities"
      ];
    }

    res.json({
      success: true,
      context: context
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


