import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Company Insights Engine
 * Analyzes company profiles and generates personalized email context
 */

class CompanyInsights {
  constructor() {
    this.sutraHRProfile = this.loadProfile('sutraHR');
  }

  loadProfile(companyName) {
    try {
      const profilePath = path.join(__dirname, '../data/', `${companyName}-profile.json`);
      const profileData = fs.readFileSync(profilePath, 'utf8');
      return JSON.parse(profileData);
    } catch (error) {
      console.error(`Error loading profile for ${companyName}:`, error.message);
      return null;
    }
  }

  /**
   * Generate ICP summary for a company
   */
  generateICPSummary(companyName = 'sutraHR') {
    const profile = companyName === 'sutraHR' ? this.sutraHRProfile : null;
    if (!profile) return null;

    return {
      targetSegment: profile.icp.description,
      primaryStages: profile.icp.characteristics.stage,
      primaryGeographies: profile.targetMarket.geographies,
      keyIndustries: profile.icp.industry_focus,
      painPoints: [
        "Need skilled talent fast",
        "Cost constraints for hiring",
        "Time-consuming recruitment processes",
        "Building distributed/remote teams",
        "Specialized role scarcity",
        "Avoiding long-term contracts"
      ],
      buyingSignals: [
        "Operating globally (US/UK/EU offices)",
        "Series A+ funding",
        "Hiring for tech roles (Backend, Data, DevOps, Frontend)",
        "Mentioning 'remote team' or 'distributed hiring'",
        "Growing 50%+ YoY",
        "Startups expanding from bootstrapped to venture-backed"
      ],
      decisionMakers: [
        "Founders / CEOs",
        "Head of People / HR",
        "VP Engineering / CTO",
        "VP Operations"
      ]
    };
  }

  /**
   * Get personalized email hooks based on prospect profile
   */
  getEmailHooks(prospectData) {
    const { company, role, industry, stage, size, technologies = [] } = prospectData;
    const profile = this.sutraHRProfile;
    const hooks = [];

    // Industry match
    if (industry && profile.icp.industry_focus.includes(industry)) {
      hooks.push(`SutraHR specializes in hiring for ${industry} companies like yours`);
    }

    // Stage match
    if (stage && profile.icp.characteristics.stage.includes(stage)) {
      hooks.push(`We've worked with hundreds of ${stage} companies building distributed teams`);
    }

    // Size relevance
    if (size) {
      hooks.push(`Companies your size (${size}) are saving 40-60% on hiring costs with our dedicated model`);
    }

    // Specific role needs
    const hiringRoles = [...profile.hiringRoles.tech, ...profile.hiringRoles.nonTech];
    if (role && hiringRoles.some(r => r.toLowerCase().includes(role.toLowerCase()))) {
      hooks.push(`We have a pre-vetted network for ${role} roles - typically fill in 2-3 weeks`);
    }

    // Tech stack match
    if (technologies.length > 0) {
      const matchedTechs = technologies.filter(t => 
        hiringRoles.some(r => r.toLowerCase().includes(t.toLowerCase()))
      );
      if (matchedTechs.length > 0) {
        hooks.push(`We've sourced multiple developers for ${matchedTechs.join(', ')} stacks`);
      }
    }

    // Default hooks
    if (hooks.length === 0) {
      hooks.push("SutraHR has helped 10,000+ companies build remote teams from India");
      hooks.push("Dedicated recruiter model: pay once, hire unlimited candidates");
    }

    return hooks;
  }

  /**
   * Generate email angles based on prospect type
   */
  generateEmailAngle(prospectType, prospectData = {}) {
    const profile = this.sutraHRProfile;
    const angles = {
      founder: {
        subject: "Scale your team 10x faster (no long-term contracts)",
        angle: `As a founder, you know hiring is your bottleneck. Rare Carat and Leena.ai scaled from ${
          prospectData.currentTeam || '20'
        } to 100+ people using SutraHR's dedicated recruiter model. They get a dedicated Indian recruiter as part of their team - no per-hire fees.`,
        cta: "Let's grab 15 min to discuss your hiring plan"
      },
      
      headOfPeople: {
        subject: "Reduce time-to-hire from 90 days to 21 days",
        angle: `Your role is to build great teams fast. SutraHR owns the sourcing & screening, so your team focuses on interviews and culture fit. 21-day guaranteed closure for most roles.`,
        cta: "I'd love to show you their process"
      },

      ctoCTech: {
        subject: `Need ${prospectData.hiringFor || 'Backend/Frontend'} developers? We placed ${
          prospectData.targetCount || '50+'
        } in ${prospectData.industryTarget || 'SaaS'} last quarter`,
        angle: `Finding quality ${prospectData.hiringFor || 'developers'} is tough. SutraHR has deep expertise in ${
          prospectData.industries?.join(', ') || 'SaaS, Fintech, AI'
        }. They pre-vet for communication skills (critical for remote).`,
        cta: "Let me share some profiles from your stack"
      },

      recruiter: {
        subject: "Partnership: Let's solve this together",
        angle: `SutraHR's network + your relationships = completed hires. They specialize in the roles that are hard to find (Data Eng, DevOps, Product Managers). Your clients get faster closure.`,
        cta: "Coffee chat to explore collaboration"
      },

      salesperson: {
        subject: "Help your clients scale without blowing their hiring budget",
        angle: `When your startup clients mention 'we need to hire...' that's your moment. SutraHR removes the pain - dedicated recruiters, no per-hire fees, guaranteed timelines. You can position as their hiring partner.`,
        cta: "I'll give you the partner deck"
      }
    };

    return angles[prospectType] || angles.founder;
  }

  /**
   * Get relevant statistics and proof points for email
   */
  getProofPoints() {
    const profile = this.sutraHRProfile;
    return {
      clients: `${profile.stats.timesWorkedWith}`,
      positions: `${profile.stats.positionsClosedAllTime}`,
      closureTime: `${profile.stats.guaranteedClosureTime}`,
      experience: profile.company.experience,
      recentClients: profile.recentClients.slice(0, 5),
      socialProof: profile.socialProof,
      guarantees: "Guaranteed closure within 21 days, even for niche roles"
    };
  }

  /**
   * Generate full email draft with context
   */
  generateEmailDraft(prospectData) {
    const {
      prospectName = 'there',
      companyName = 'your company',
      role = 'hiring manager',
      hiringNeeds = 'skilled talent',
      prospectType = 'founder'
    } = prospectData;

    const angle = this.generateEmailAngle(prospectType, prospectData);
    const hooks = this.getEmailHooks(prospectData);
    const proofPoints = this.getProofPoints();

    return {
      subject: angle.subject,
      preview: angle.angle.substring(0, 50) + '...',
      body: `Hi ${prospectName},

${angle.angle}

Why this matters for ${companyName}:
${hooks.map((hook, i) => `${i + 1}. ${hook}`).join('\n')}

Quick proof: ${prospectData.recentClient || 'Rare Carat'} went from "we need to hire now" to "team is fully onboarded" in 19 days. That's with a dedicated recruiter managing the full pipeline.

${angle.cta}?

Best,
Pavan

P.S. - If hiring isn't a priority right now, totally understand. But keep us in mind when it is.`,
      
      cta: angle.cta,
      angle: angle.angle,
      hooks: hooks,
      proofPoints: proofPoints,
      companyContext: {
        industry: prospectData.industry || 'SaaS',
        stage: prospectData.stage || 'Series A-C',
        team: prospectData.team || '20-50',
        growthRate: prospectData.growthRate || '50%+ YoY'
      }
    };
  }

  /**
   * Analyze prospect compatibility with SutraHR's ICP
   */
  analyzeProspectFit(prospectData) {
    const profile = this.sutraHRProfile;
    const {
      industry,
      stage,
      location,
      teamSize,
      hiringPlan,
      technologies = []
    } = prospectData;

    let fitScore = 0;
    let reasons = [];

    // Industry fit
    if (industry && profile.icp.industry_focus.some(ind => 
      ind.toLowerCase().includes(industry.toLowerCase())
    )) {
      fitScore += 25;
      reasons.push(`✅ Industry match: ${industry}`);
    } else {
      reasons.push(`⚠️  Industry: ${industry || 'unknown'} (outside core focus)`);
    }

    // Stage fit
    if (stage && profile.icp.characteristics.stage.includes(stage)) {
      fitScore += 25;
      reasons.push(`✅ Stage fit: ${stage}`);
    } else {
      reasons.push(`⚠️  Stage: ${stage || 'unknown'} (may not be ideal)`);
    }

    // Geography/International
    if (location && location !== 'India') {
      fitScore += 20;
      reasons.push(`✅ International hiring need (great SutraHR fit)`);
    }

    // Team size
    if (teamSize && (teamSize === 'SMB' || teamSize === 'Mid-market' || teamSize === 'Enterprise')) {
      fitScore += 15;
      reasons.push(`✅ Team size suitable for SutraHR model`);
    }

    // Hiring intensity
    if (hiringPlan && (hiringPlan.includes('multiple') || hiringPlan.includes('rapid') || hiringPlan.includes('scale'))) {
      fitScore += 15;
      reasons.push(`✅ Active hiring phase (perfect timing)`);
    }

    return {
      fitScore: Math.min(fitScore, 100),
      recommendation: fitScore >= 70 ? '🟢 Strong fit' : fitScore >= 50 ? '🟡 Potential fit' : '🔴 Weak fit',
      reasons: reasons
    };
  }
}

export default new CompanyInsights();
