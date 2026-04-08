/**
 * Email Templates - SutraHR Playbook v1
 * Comprehensive template system aligned with 7-touch sequence
 */

import { substituteTemplateVariables } from './sequence-engine.js';

/**
 * Template library organized by variant and step
 */
export const EMAIL_TEMPLATES = {
  initial_hook: {
    // Touch 1: Initial outreach with curiosity hook
    name: 'Initial Outreach',
    step: 1,
    description: 'Day 1 - Personalized intro with company research and pain point identification',
    subjectLineOptions: [
      {
        formula: 'simple_personalized',
        template: '{{prospectFirstName}}',
        description: 'Simple personalization - highest open rates in tests',
        openRateTarget: 0.45
      },
      {
        formula: 'curiosity_question',
        template: 'Thoughts {{prospectFirstName}}?',
        description: 'Curiosity-driven question - triggers mental engagement',
        openRateTarget: 0.42
      },
      {
        formula: 'referral_implication',
        template: '{{prospectFirstName}} X {{senderName}}',
        description: 'Implies social referral - piques curiosity',
        openRateTarget: 0.40
      },
      {
        formula: 'problem_focused',
        template: '{{companyName}} hiring challenge?',
        description: 'Problem-centric - relevant to pain point',
        openRateTarget: 0.38
      }
    ],
    bodyTemplate: `Hi {{prospectFirstName}},

I came across {{companyName}}'s recent {{fundingStageLabel || 'Series A'}} funding round and was impressed by {{fundingAmount || 'the growth'}}.{{#recentExpansion}} I noticed you're expanding {{recentExpansion}}.{{/recentExpansion}}

Looking at your current hiring, it's clear {{companyName}} is scaling fast – {{openRolesCount || '8+'}} roles open across engineering, product, and ops. {{#taTeamSize}}With only {{taTeamSize}} people handling recruitment{{/taTeamSize}}{{#noTATeam}}Without a dedicated recruiting team{{/noTATeam}}, that's a lot on the founder's plate.

Here's what separates companies that hire fast from those that don't: a dedicated recruiter focused only on filling roles. That's exactly what SutraHR does. We provide one full-time recruiter for a flat retainer (no per-hire fees), and our clients like Dream11 and PharmEasy consistently fill roles in 3 weeks.

I'm not expecting a commitment today – just want to explore if this could help {{companyName}} stay focused on building.

Could we chat 15 minutes this week? I'm free Wed or Thu morning.

Best,
{{senderName}}
SutraHR`
  },

  problem_aware: {
    // Touch 3: Problem deepening follow-up
    name: 'Problem Deepening',
    step: 3,
    description: 'Day 4 - Reference open roles, reinforce pain point, offer value-add insight',
    subjectLineOptions: [
      {
        formula: 'status_check',
        template: 'Just checking in on {{companyName}}',
        description: 'Casual status check - low pressure',
        openRateTarget: 0.35
      },
      {
        formula: 'pattern_observation',
        template: 'Re: {{prospectFirstName}} – same {{roleType}} role posted 3x?',
        description: 'Observes hiring difficulty pattern - shows research',
        openRateTarget: 0.38
      },
      {
        formula: 'quick_thought',
        template: 'Quick thought about {{companyName}}'s hiring',
        description: 'Positions as helpful colleague with insight',
        openRateTarget: 0.32
      }
    ],
    bodyTemplate: `Hi {{prospectFirstName}},

Just circling back on my earlier note – and I wanted to flag something I'm noticing.

You've posted the {{roleType || 'Senior Engineer'}} role {{repeatPostCount || '2-3'}} times in the last {{daysSinceFirstPost || '30'}} days. That's a typical pattern for roles that are hard to fill – either super specific skillset or competitive market for that profile.

The issue: while your team is interviewing candidates, you're losing focus on actual product development. We've solved this for {{clientName || 'companies like Practo and Pepperfry'}} by taking the entire recruiting workflow off their plate.

Outcome: all 8+ roles filled. Timeline: 3 weeks. Cost: flat fee, no surprises.

Let me know if this sounds like something worth exploring. Happy to share success stories or do a quick call.

Best,
{{senderName}}`
  },

  social_proof: {
    // Touch 5: Case study and social proof
    name: 'Social Proof & Case Study',
    step: 5,
    description: 'Day 10 - Share case study, highlight time/cost savings, prove track record',
    subjectLineOptions: [
      {
        formula: 'case_study',
        template: 'Case study: {{caseStudyCompany}} hired {{hireCount}} in 3 weeks',
        description: 'Direct case study reference - credibility',
        openRateTarget: 0.40
      },
      {
        formula: 'success_story',
        template: '{{companyName}}: {{successMetric}}',
        description: 'Personalized success metric',
        openRateTarget: 0.37
      },
      {
        formula: 'relevant_insight',
        template: 'Success story you might relate to',
        description: 'Positions as helpful insight sharing',
        openRateTarget: 0.34
      }
    ],
    bodyTemplate: `Hi {{prospectFirstName}},

Wanted to share a relevant case study that might resonate with {{companyName}}.

**{{caseStudyCompany}}** (Series {{fundingStage}}, {{caseStudyHeadcount}} employees) was in exactly your position:
- 6 engineering roles open
- Only 1.5 people managing recruitment
- Founder spending 5+ hours/week in interviews

**What changed:**
- We brought a dedicated recruiter on flat fee
- Screening and scheduling handled end-to-end by our team
- Founder reclaimed 15+ hours/week for product

**Outcome:**
- All 6 roles filled in 3 weeks
- Cost: ₹{{caseCostSavings}} lower than paying per hire
- Satisfaction: "Best hiring decision we made that year"

For {{companyName}}, with {{openRolesCount}} open roles, this would likely save {{founderName}} 2-3 weeks of time and ₹{{estimatedSavings}} on hiring spend.

Worth a conversation?

Best,
{{senderName}}
SutraHR

---
P.S. We guarantee approved candidates for each open role within 3 weeks. If we don't hit that timeline, we keep working free until we do.`
  },

  voicemail: {
    // Touch 4: Call voicemail script
    name: 'Call Script & Voicemail',
    step: 4,
    description: 'Day 6 - Direct call attempt + voicemail if no answer',
    callIntro: 'Hi {{prospectFirstName}}, this is {{senderName}} from SutraHR – do you have 30 seconds?',
    callHook: 'I noticed {{companyName}} is scaling quickly and has {{openRolesCount}} open roles in key areas. Many founders tell me hiring becomes the bottleneck when you're growing this fast. Is that the case for you?',
    callValueProp: 'We help companies like yours by dedicating one full-time recruiter focused only on your hiring – no per-hire fees, just a flat retainer. It typically saves founders weeks of interview time. Would this be helpful for {{companyName}}?',
    callCTA: 'Great – how does {{proposedTime}} work for a quick call to explore how this works?',
    voicemailScript: `Hi {{prospectFirstName}}, it's {{senderName}} from SutraHR. I'm calling because I saw {{companyName}} is expanding your team and you have {{openRolesCount}} open roles. We work with startups like yours to slash hiring time from months to weeks. I'll send you a quick email on this – really think this could help {{companyName}}. Let's connect soon.`,
    voicemailDuration: '20-30 seconds'
  },

  linkedin_final: {
    // Touch 6: LinkedIn direct message
    name: 'LinkedIn Message',
    step: 6,
    description: 'Day 12 - Final LinkedIn outreach if connected',
    bodyTemplate: `Just wanted to follow up on {{companyName}}'s hiring challenge – no pressure if timing isn't right, I know how busy your plate is.

If it makes sense to explore how we could speed up your hiring, happy to chat. Otherwise, good luck with the growth!`
  },

  final_attempt: {
    // Touch 7: Last attempt email
    name: 'Final Soft Attempt',
    step: 7,
    description: 'Day 15 - Final attempt, low pressure, open door for future',
    subjectLineOptions: [
      {
        formula: 'no_pressure',
        template: 'Maybe now isn't the right time?',
        description: 'Acknowledges no interest, low pressure',
        openRateTarget: 0.28
      },
      {
        formula: 'final_reach',
        template: '{{companyName}} – one more thought',
        description: 'Final attempt with light personalization',
        openRateTarget: 0.25
      }
    ],
    bodyTemplate: `Hi {{prospectFirstName}},

Maybe now isn't the right time for {{companyName}} to think about dedicated recruiting support. I get it – there's a lot on your plate already.

But I wanted to leave this door open: when hiring becomes the bottleneck and every week without a developer costs you momentum, SutraHR is 15 minutes away.

We guarantee approved candidates for each open role within 3 weeks, or we work free until we hit the timeline.

No pressure. Good luck with the growth.

Best,
{{senderName}}
SutraHR`
  }
};

/**
 * Get template by variant name
 */
export function getTemplate(variant) {
  return EMAIL_TEMPLATES[variant] || null;
}

/**
 * Get all subject line options for a template variant
 */
export function getSubjectLineOptions(variant) {
  const template = EMAIL_TEMPLATES[variant];
  return template?.subjectLineOptions || [];
}

/**
 * Render an email template with prospect data
 */
export function renderEmailTemplate(variant, prospectData = {}, senderData = {}, campaignData = {}) {
  const template = getTemplate(variant);
  if (!template) {
    throw new Error(`Template variant '${variant}' not found`);
  }

  // Build variable map for template substitution
  const variables = {
    // Prospect info
    prospectFirstName: prospectData.name?.split(' ')[0] || 'there',
    prospectFullName: prospectData.name || '',
    prospectRole: prospectData.role || '',
    prospectCompanyName: prospectData.company || '',
    companyName: prospectData.company || '',
    prospectEmail: prospectData.email || '',

    // Company/Funding info
    fundingStageLabel: prospectData.fundingStage || 'Series A',
    fundingAmount: prospectData.fundingAmount || '',
    fundingDate: prospectData.fundingDate || '',
    recentExpansion: prospectData.expansionNews || '',

    // Hiring signals
    openRolesCount: prospectData.openRolesCount?.toString() || '8+',
    roleType: prospectData.primaryOpenRole || 'engineering',
    repeatPostCount: prospectData.repeatedPostings?.toString() || '2-3',
    daysSinceFirstPost: prospectData.daysSinceFirstPosting?.toString() || '30',

    // Team info
    taTeamSize: prospectData.taTeamSize?.toString() || '',
    noTATeam: !prospectData.taTeamSize ? 'true' : '',
    totalHeadcount: prospectData.headcount?.toString() || '120',

    // Sender info
    senderName: senderData.name || 'Pavan',
    senderTitle: senderData.title || 'Senior Recruiter',

    // Social proof
    clientName: campaignData.primaryClient || 'Practo',
    clientExample: campaignData.client1 || 'Dream11',
    clientExample2: campaignData.client2 || 'PharmEasy',
    caseStudyCompany: campaignData.caseStudyCompany || 'TechStartup XYZ',
    caseStudyHeadcount: campaignData.caseStudyHeadcount?.toString() || '80',
    hireCount: campaignData.caseStudyHireCount?.toString() || '6',
    successMetric: campaignData.successMetric || 'scaled hiring 6x faster',

    // Cost/Time estimates
    caseCostSavings: campaignData.caseCostSavings || '₹5L',
    estimatedSavings: campaignData.estimatedSavings || '₹3L',
    timeEstimate: campaignData.timeEstimate || '2-3',

    // Availability
    availableDays: campaignData.presenterAvailability || 'Wed/Thu mornings',
    proposedTime: campaignData.proposedMeetingTime || 'Thursday at 2pm',

    // Founder/CEO name
    founderName: prospectData.name?.split(' ')[0] || 'you',

    // Call-specific
    callType: 'outbound'
  };

  // Render body template
  const body = substituteTemplateVariables(template.bodyTemplate, variables);

  // For call/voicemail, include the call script
  let result = { body, variant, step: template.step };

  if (template.callIntro) {
    result.callIntro = substituteTemplateVariables(template.callIntro, variables);
    result.callHook = substituteTemplateVariables(template.callHook, variables);
    result.callValueProp = substituteTemplateVariables(template.callValueProp, variables);
    result.callCTA = substituteTemplateVariables(template.callCTA, variables);
    result.voicemailScript = substituteTemplateVariables(template.voicemailScript, variables);
  }

  return result;
}

/**
 * Render a subject line using one of the template formulas
 */
export function renderSubjectLine(variant, formula, prospectData = {}, senderData = {}) {
  const template = getTemplate(variant);
  if (!template) {
    throw new Error(`Template variant '${variant}' not found`);
  }

  const subjectOption = template.subjectLineOptions?.find(s => s.formula === formula);
  if (!subjectOption) {
    throw new Error(`Subject line formula '${formula}' not found for variant '${variant}'`);
  }

  const variables = {
    prospectFirstName: prospectData.name?.split(' ')[0] || 'there',
    prospectFullName: prospectData.name || '',
    companyName: prospectData.company || '',
    senderName: senderData.name || 'Recruiter',
    roleType: prospectData.primaryOpenRole || 'engineer'
  };

  return substituteTemplateVariables(subjectOption.template, variables);
}

/**
 * A/B test tracking structure for subject lines
 */
export function createSubjectLineVariant(variant, formula) {
  const template = getTemplate(variant);
  const subjectOption = template?.subjectLineOptions?.find(s => s.formula === formula);

  if (!subjectOption) {
    return null;
  }

  return {
    variant,
    formula,
    template: subjectOption.template,
    description: subjectOption.description,
    targetOpenRate: subjectOption.openRateTarget,
    stats: {
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0
    }
  };
}

export default {
  EMAIL_TEMPLATES,
  getTemplate,
  getSubjectLineOptions,
  renderEmailTemplate,
  renderSubjectLine,
  createSubjectLineVariant
};
