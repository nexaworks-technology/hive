import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lead Qualification Engine
 * Scores leads against SutraHR's outbound ICP
 * Returns qualification score and recommendations
 */

class LeadQualifier {
  constructor() {
    this.icpConfig = this.loadICPConfig();
  }

  loadICPConfig() {
    try {
      const configPath = path.join(__dirname, '../data/outbound-icp-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading ICP config:', error.message);
      return null;
    }
  }

  /**
   * Evaluate company stage against ICP
   */
  evaluateStage(companyStage) {
    const config = this.icpConfig.outbound.targetICP;
    let score = 0;
    let match = false;

    if (companyStage && config.companyStage.some(stage => 
      companyStage.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(companyStage.toLowerCase())
    )) {
      score = 25; // Full points for stage match
      match = true;
    } else if (companyStage && ['seed', 'pre-series a'].some(s => 
      companyStage.toLowerCase().includes(s)
    )) {
      score = 12; // Partial points for early stage
      match = true;
    } else if (companyStage && ['series c', 'series d', 'growth'].some(s => 
      companyStage.toLowerCase().includes(s)
    )) {
      score = 15; // Less ideal but still viable
      match = true;
    }

    return { score, match, stage: companyStage };
  }

  /**
   * Evaluate geography against ICP
   */
  evaluateGeography(location) {
    const config = this.icpConfig.outbound.targetICP;
    const targetGeos = config.geography;
    const excludeGeos = this.icpConfig.outbound.excludeCriteria.locations;

    let score = 0;
    let match = false;

    // Check for excluded geographies
    if (excludeGeos.some(geo => 
      location && location.toLowerCase().includes(geo.toLowerCase())
    )) {
      return { score: 0, match: false, excluded: true, location };
    }

    // Check for target geographies
    if (targetGeos.some(geo => 
      location && location.toLowerCase().includes(geo.toLowerCase())
    )) {
      score = 20;
      match = true;
    } else if (location && ['Canada', 'Australia', 'Singapore', 'EU'].some(geo => 
      location.toLowerCase().includes(geo.toLowerCase())
    )) {
      score = 15; // Secondary markets okay
      match = true;
    }

    return { score, match, location, excluded: false };
  }

  /**
   * Evaluate industry match
   */
  evaluateIndustry(industry) {
    const config = this.icpConfig.outbound;
    const targetIndustries = config.targetIndustries;
    const excludeIndustries = config.excludeCriteria.industries;

    let score = 0;

    // Check excluded industries
    if (excludeIndustries.some(ind => 
      industry && industry.toLowerCase().includes(ind.toLowerCase())
    )) {
      return { score: 0, industryMatch: false, excluded: true, industry };
    }

    // Check target industries
    if (targetIndustries.some(ind => 
      industry && industry.toLowerCase().includes(ind.toLowerCase()) ||
      ind.toLowerCase().includes(industry?.toLowerCase())
    )) {
      score = 15;
    } else if (industry && ['Software', 'Technology', 'IT', 'Professional Services'].some(ind => 
      industry.toLowerCase().includes(ind.toLowerCase())
    )) {
      score = 8; // Generic tech is okay
    }

    return { score, industryMatch: score >= 15, industry, excluded: false };
  }

  /**
   * Evaluate active hiring indicators
   */
  evaluateHiringActivity(indicators) {
    const config = this.icpConfig.outbound.targetICP.keywords;
    let score = 0;
    let matchedKeywords = [];

    if (!indicators) return { score: 0, activeHiring: false, matchedKeywords };

    if (typeof indicators === 'string') {
      indicators = [indicators];
    }

    indicators.forEach(indicator => {
      config.forEach(keyword => {
        if (indicator.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
          matchedKeywords.push(keyword);
        }
      });
    });

    // Cap at 25
    score = Math.min(score, 25);
    matchedKeywords = [...new Set(matchedKeywords)];

    return { 
      score, 
      activeHiring: score >= 10, 
      matchedKeywords,
      indicators 
    };
  }

  /**
   * Evaluate team size
   */
  evaluateTeamSize(size) {
    const config = this.icpConfig.outbound.targetICP.teamSize;
    let score = 0;

    if (!size) return { score: 0, sizeMatch: false, size };

    // Parse size if it's a range string like "50-100"
    let actualSize = size;
    if (typeof size === 'string') {
      const match = size.match(/(\d+)/);
      if (match) actualSize = parseInt(match[0]);
    }

    if (actualSize >= config.min && actualSize <= config.max) {
      score = 10;
    } else if (actualSize < config.min) {
      score = 3; // Too small but early stage
    } else if (actualSize > config.max && actualSize < 500) {
      score = 5; // Growing beyond ideal size
    }

    return { score, sizeMatch: score >= 10, size, actualSize };
  }

  /**
   * Evaluate role fit for decision maker
   */
  evaluateRoleFit(role) {
    const config = this.icpConfig.outbound.targetRoles;
    let score = 0;
    let roleType = null;

    if (!role) return { score: 0, roleFit: false, role };

    // Check high priority roles
    if (config.highPriority.some(r => 
      role.toLowerCase().includes(r.toLowerCase()) ||
      r.toLowerCase().includes(role.toLowerCase())
    )) {
      score = 5;
      roleType = 'highPriority';
    } else if (config.secondary.some(r => 
      role.toLowerCase().includes(r.toLowerCase()) ||
      r.toLowerCase().includes(role.toLowerCase())
    )) {
      score = 3;
      roleType = 'secondary';
    } else if (role.toLowerCase().includes('manager') || 
               role.toLowerCase().includes('lead') ||
               role.toLowerCase().includes('director')) {
      score = 2;
      roleType = 'other-leadership';
    }

    return { score, roleFit: score >= 2, role, roleType };
  }

  /**
   * Check exclusion criteria
   */
  evaluateExclusions(companyData) {
    const exclude = this.icpConfig.outbound.excludeCriteria;
    const { hiringStatus, location, company } = companyData;

    const exclusionReasons = [];

    // Check hiring status exclusions
    if (hiringStatus && exclude.hiringStatus.some(status => 
      hiringStatus.toLowerCase().includes(status.toLowerCase())
    )) {
      exclusionReasons.push(`Hiring status exclusion: ${hiringStatus}`);
    }

    // Check location exclusions (already done in evaluateGeography, but double check)
    if (location && exclude.locations.some(loc => 
      location.toLowerCase().includes(loc.toLowerCase())
    )) {
      exclusionReasons.push(`Location exclusion: ${location}`);
    }

    return {
      isExcluded: exclusionReasons.length > 0,
      exclusionReasons
    };
  }

  /**
   * Score a lead comprehensively
   * Returns score 0-100 + detailed breakdown
   */
  scoreLead(prospectData) {
    const {
      companyName,
      stage,
      location,
      industry,
      teamSize,
      hiringActivity = [],
      role,
      hiringStatus = null
    } = prospectData;

    // Check exclusions first
    const exclusionCheck = this.evaluateExclusions(prospectData);
    if (exclusionCheck.isExcluded) {
      return {
        prospectId: companyName,
        qualifyingScore: 0,
        recommendation: '🔴 DISQUALIFIED',
        reasons: exclusionCheck.exclusionReasons,
        breakdown: {},
        qualified: false
      };
    }

    // Evaluate all criteria
    const stageEval = this.evaluateStage(stage);
    const geoEval = this.evaluateGeography(location);
    const industryEval = this.evaluateIndustry(industry);
    const hiringEval = this.evaluateHiringActivity(hiringActivity);
    const sizeEval = this.evaluateTeamSize(teamSize);
    const roleEval = this.evaluateRoleFit(role);

    // Calculate weighted score (normalize each criterion to 0-100, then apply weights)
    const weights = this.icpConfig.outbound.scoringWeights;
    const totalScore = Math.round(
      ((stageEval.score / 25) * weights.stageMatch * 100) +
      ((geoEval.score / 20) * weights.geographyMatch * 100) +
      ((hiringEval.score / 25) * weights.activeHiring * 100) +
      ((industryEval.score / 15) * weights.industryMatch * 100) +
      ((sizeEval.score / 10) * weights.teamSizeMatch * 100) +
      ((roleEval.score / 5) * weights.roleFit * 100)
    );

    const minScore = this.icpConfig.outbound.minQualificationScore;
    const minHighPriorityScore = this.icpConfig.outbound.minHighPriorityRoleScore;
    const minSecondaryScore = this.icpConfig.outbound.minSecondaryRoleScore;

    // Determine qualification based on role and score
    let qualified = false;
    let recommendation = '🔴 NOT QUALIFIED';

    if (roleEval.roleType === 'highPriority' && totalScore >= minHighPriorityScore) {
      qualified = true;
      recommendation = '🟢 HIGHLY QUALIFIED';
    } else if (roleEval.roleType === 'secondary' && totalScore >= minSecondaryScore) {
      qualified = true;
      recommendation = '🟡 QUALIFIED';
    } else if (roleEval.roleType && totalScore >= minScore) {
      qualified = true;
      recommendation = '🟡 QUALIFIED';
    }

    return {
      prospectId: companyName,
      qualifyingScore: totalScore,
      qualified: qualified,
      recommendation: recommendation,
      breakdown: {
        stageMatch: { ...stageEval, weight: weights.stageMatch, weighted: (stageEval.score / 25) * weights.stageMatch * 100 },
        geographyMatch: { ...geoEval, weight: weights.geographyMatch, weighted: (geoEval.score / 20) * weights.geographyMatch * 100 },
        hiringActivity: { ...hiringEval, weight: weights.activeHiring, weighted: (hiringEval.score / 25) * weights.activeHiring * 100 },
        industryMatch: { ...industryEval, weight: weights.industryMatch, weighted: (industryEval.score / 15) * weights.industryMatch * 100 },
        teamSize: { ...sizeEval, weight: weights.teamSizeMatch, weighted: (sizeEval.score / 10) * weights.teamSizeMatch * 100 },
        roleMatch: { ...roleEval, weight: weights.roleFit, weighted: (roleEval.score / 5) * weights.roleFit * 100 }
      },
      prospectData: prospectData
    };
  }

  /**
   * Batch score multiple leads
   */
  scoreLeads(leadsList) {
    return leadsList.map(lead => this.scoreLead(lead))
      .sort((a, b) => b.qualifyingScore - a.qualifyingScore);
  }

  /**
   * Get ICP summary for reference
   */
  getICPSummary() {
    const config = this.icpConfig.outbound;
    return {
      targetICP: config.targetICP,
      targetRoles: config.targetRoles,
      targetIndustries: config.targetIndustries,
      excludeCriteria: config.excludeCriteria,
      scoringWeights: config.scoringWeights,
      minQualificationScore: config.minQualificationScore,
      campaignConfig: config.campaignConfig
    };
  }

  /**
   * Filter leads by qualification score
   */
  filterQualifiedLeads(scoredLeads, minScore = null) {
    const threshold = minScore || this.icpConfig.outbound.minQualificationScore;
    return scoredLeads.filter(lead => lead.qualifyingScore >= threshold);
  }

  /**
   * Get leads by recommendation tier
   */
  groupByRecommendation(scoredLeads) {
    return {
      highlyQualified: scoredLeads.filter(l => l.recommendation === '🟢 HIGHLY QUALIFIED'),
      qualified: scoredLeads.filter(l => l.recommendation === '🟡 QUALIFIED'),
      notQualified: scoredLeads.filter(l => l.recommendation === '🔴 NOT QUALIFIED' || l.recommendation === '🔴 DISQUALIFIED')
    };
  }
}

export default new LeadQualifier();
