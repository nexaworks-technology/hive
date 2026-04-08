/**
 * Objection Detection & Handling - SutraHR Playbook
 * Classify prospect replies and suggest appropriate responses
 */

/**
 * Objection types matching SutraHR playbook
 */
export const OBJECTION_TYPES = {
  internal_recruiter: {
    name: 'Has Internal Recruiter',
    description: 'Prospect says they have an in-house recruiting team',
    keywords: ['recruiter', 'hiring team', 'in-house', 'internal', 'TA team', 'talent team'],
    sentiment: 'neutral'
  },
  per_hire_preference: {
    name: 'Prefers Per-Hire Pricing',
    description: 'Prospect prefers paying per hire rather than flat fee',
    keywords: ['per-hire', 'per hire', 'per placement', 'commission', 'bonus', 'success-based'],
    sentiment: 'neutral'
  },
  not_ready: {
    name: 'Not Ready / Too Early',
    description: 'Prospect says they are not ready or too early stage for this service',
    keywords: ['too early', 'not ready', 'not hiring', 'later', 'pause', 'not right time', 'bootstrapped'],
    sentiment: 'negative'
  },
  budget_tight: {
    name: 'Budget Constraints',
    description: 'Prospect mentions budget limitations or cost concerns',
    keywords: ['budget', 'cost', 'expensive', 'afford', 'tight', 'lean', 'bootstrap', 'cash flow'],
    sentiment: 'negative'
  },
  send_info: {
    name: 'Wants More Information',
    description: 'Prospect asks for more information or case studies',
    keywords: ['send', 'more info', 'details', 'learn more', 'case study', 'pricing', 'proposal', 'slides'],
    sentiment: 'positive'
  },
  request_meeting: {
    name: 'Wants to Meet',
    description: 'Prospect is interested and wants to schedule a call',
    keywords: ['call', 'chat', 'meet', 'discuss', 'talk', 'schedule', 'time', 'available', 'interested'],
    sentiment: 'positive'
  },
  not_interested: {
    name: 'Not Interested',
    description: 'Prospect explicitly declines or shows no interest',
    keywords: ['not interested', 'no thanks', 'not for us', 'not applicable', 'decline', 'pass'],
    sentiment: 'negative'
  }
};

/**
 * Playbook responses for common objections
 */
export const OBJECTION_RESPONSES = {
  internal_recruiter: {
    title: 'Existing Internal Recruiter',
    baseResponse: `That's great that you have in-house recruiting support already. Most of our clients actually had 1-2 recruiters on staff when they brought us on.

Here's what we typically see: internal recruiters get overloaded during scaling phases – they're doing everything from sourcing to scheduling to interviewing loops. They become a bottleneck.

We don't replace your team; we supplement them as your dedicated overflow. Your internal team handles strategy and relationships; we handle screening, scheduling, and candidate management. It typically saves them 10-15 hours/week.

Even companies with strong TA teams use us during hiring sprints. Would it make sense to explore how we could help absorb the load during your growth phase?`,
    followUp: 'Are you currently able to keep up with the {{openRolesCount}} open roles with your existing team?',
    nextAction: 'Request meeting'
  },

  per_hire_preference: {
    title: 'Per-Hire Pricing Preference',
    baseResponse: `I understand – per-hire feels flexible on paper. But here's what we've observed: per-hire models create hidden costs.

If you have 8 open roles and per-hire is ₹1-2L per placement, your total cost becomes ₹8-16L. Plus, there's incentive misalignment: the recruiter wants to place bodies, not necessarily the right fit. You end up with turnover, which costs more.

Our flat model inverts this: we're committed to quality because we eat the cost of bad placements. On average, companies with 8+ roles save ₹3-5L using our flat fee vs. per-hire.

Worth exploring the numbers for {{companyName}}?`,
    followUp: 'How many roles are you looking to fill in the next 6 months?',
    nextAction: 'Send cost comparison'
  },

  not_ready: {
    title: 'Not Ready or Too Early',
    baseResponse: `Totally fair – timing is everything. I've learned that many founders wish they'd called us sooner, not later.

Here's why: recruiting becomes increasingly painful the moment you need more than 2-3 simultaneous hires. Right now, you might be able to juggle it. In 6 months with ₹X more ARR and {{openRolesCount}} roles open, it becomes a time sink.

Even if you're not ready to commit, it might be worth a 15-min conversation just to see how it works and have us in your back pocket for when hiring spikes.

When would be a good time to chat – just as intel, no pressure?`,
    followUp: 'What's your hiring velocity looking like for the next quarter?',
    nextAction: 'Schedule light consultation'
  },

  budget_tight: {
    title: 'Budget Constraints',
    baseResponse: `I hear you – budget is real, especially for startups. Here's how most of our clients think about it:

SutraHR is basically a fractional senior recruiter on your team. A full-time senior recruiter costs ₹15-25L + taxes. We're typically 40-50% of that as a monthly retainer, depending on scope.

Many startups find our fee pays for itself by reducing time-to-hire. Every week you save is a developer shipping features instead of a founder interviewing. For Series A companies, that's easily worth ₹10-15L in velocity gain.

Even if it's not right now, could we explore what a small pilot might look like? Sometimes we work with early-stage founders on a variable retainer tied to roles filled.`,
    followUp: 'What's holding back hiring most right now – budget or capacity?',
    nextAction: 'Discuss flexible pricing'
  },

  send_info: {
    title: 'Wants More Information',
    baseResponse: `Absolutely – I'll send a one-pager with our process, case studies, and ROI breakdown. Take a look and let me know what questions pop up.

Once you've reviewed, could we grab 15 minutes next week to discuss how it might work for {{companyName}}? Happy to walk through the timeline and how we'd approach your specific roles.`,
    followUp: 'When would be a good time early next week to sync on this?',
    nextAction: 'Send materials + schedule follow-up call',
    includeMaterials: ['case_studies', 'pricing_guide', 'client_testimonials']
  },

  request_meeting: {
    title: 'Prospect Interested',
    baseResponse: `Fantastic – let's chat. I think there's a real opportunity to take the hiring headache off your plate and get {{companyName}} focused back on product.

I'll send a calendar invite with a few time options. In the meantime, think about:
1. Your top 3-4 most critical open roles
2. Timeline for filling them
3. What's made hiring hard so far

This context helps me tailor our approach specifically for {{companyName}}.`,
    followUp: null,
    nextAction: 'Send calendar invite and prepare for call',
    prepareNotes: ['Gather company background', 'Review open roles', 'Check LinkedIn for team size', 'Prepare success story']
  },

  not_interested: {
    title: 'Not Interested',
    baseResponse: `Thanks for letting me know – that's helpful feedback. I genuinely appreciate you taking the time to respond.

If things change or {{companyName}} decides to explore dedicated recruiting support, you know where to find me. Sometimes founders circle back after they've felt the recruiting pain for a few more months.

Good luck with the growth.`,
    followUp: null,
    nextAction: 'Add to drip campaign (quarterly check-ins)',
    frequency: 'quarterly'
  }
};

/**
 * Detect objection from reply text
 */
export function detectObjection(replyText) {
  const lowerText = replyText.toLowerCase();

  // Score all objection types
  const scores = {};

  Object.entries(OBJECTION_TYPES).forEach(([key, objection]) => {
    let score = 0;

    // Check for keywords
    objection.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      score += matches * 10;
    });

    scores[key] = score;
  });

  // Find highest scoring objection
  let highestScore = 0;
  let detectedObjection = null;

  Object.entries(scores).forEach(([key, score]) => {
    if (score > highestScore) {
      highestScore = score;
      detectedObjection = key;
    }
  });

  // If no clear objection detected, classify as neutral
  if (highestScore < 10) {
    // Try to detect positive/negative sentiment
    const positiveWords = ['interested', 'yes', 'let\'s', 'chat', 'call', 'meet', 'love', 'great'];
    const negativeWords = ['not', 'no', 'can\'t', 'won\'t', 'don\'t want', 'thanks anyway'];

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      positiveScore += (lowerText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
    });

    negativeWords.forEach(word => {
      negativeScore += (lowerText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
    });

    if (positiveScore > negativeScore) {
      detectedObjection = 'request_meeting';
    } else if (negativeScore > 0) {
      detectedObjection = 'not_interested';
    }
  }

  return {
    detectedObjection,
    confidence: Math.min(highestScore / 50, 1), // Normalize to 0-1
    objectionType: detectedObjection ? OBJECTION_TYPES[detectedObjection] : null,
    allScores: scores
  };
}

/**
 * Get suggested response for an objection
 */
export function getSuggestedResponse(objectionType, prospectData = {}) {
  const response = OBJECTION_RESPONSES[objectionType];
  if (!response) {
    return null;
  }

  // Substitute variables in the response
  const variables = {
    prospectFirstName: prospectData.name?.split(' ')[0] || 'there',
    companyName: prospectData.company || '{{companyName}}',
    openRolesCount: prospectData.openRolesCount?.toString() || '8',
    founderName: prospectData.name?.split(' ')[0] || 'you'
  };

  const baseResponse = response.baseResponse.replace(
    /{{(\w+)}}/g,
    (match, key) => variables[key] || match
  );

  const followUp = response.followUp ? response.followUp.replace(
    /{{(\w+)}}/g,
    (match, key) => variables[key] || match
  ) : null;

  return {
    title: response.title,
    baseResponse,
    followUp,
    nextAction: response.nextAction,
    frequency: response.frequency || null,
    includeMaterials: response.includeMaterials || []
  };
}

/**
 * Classify sentiment of prospect reply
 */
export function classifySentiment(replyText) {
  const lowerText = replyText.toLowerCase();

  const positiveWords = [
    'interested', 'yes', 'let\'s', 'chat', 'call', 'meet', 'discuss',
    'love', 'great', 'sounds good', 'makes sense', 'like this', 'tell me more'
  ];

  const negativeWords = [
    'not interested', 'no thanks', 'not for us', 'pass', 'decline',
    'can\'t', 'won\'t', 'don\'t want', 'not applicable', 'no way'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    positiveScore += (lowerText.match(new RegExp(word, 'gi')) || []).length;
  });

  negativeWords.forEach(word => {
    negativeScore += (lowerText.match(new RegExp(word, 'gi')) || []).length;
  });

  if (positiveScore > negativeScore) {
    return 'positive';
  } else if (negativeScore > positiveScore) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

/**
 * Build suggested next actions based on objection and sentiment
 */
export function suggestNextActions(objectionType, sentiment) {
  const actions = [];

  switch (objectionType) {
    case 'request_meeting':
      actions.push('Send calendar invite with 2-3 time options');
      actions.push('Prepare meeting agenda (roles, timeline, process)');
      actions.push('Pull customer success story for their stage');
      break;

    case 'send_info':
      actions.push('Email case studies and pricing guide');
      actions.push('Schedule 3-day follow-up meeting request');
      break;

    case 'internal_recruiter':
    case 'per_hire_preference':
    case 'budget_tight':
      actions.push('Send cost/ROI comparison document');
      actions.push('Offer pilot or trial period');
      actions.push('Schedule call to discuss in detail');
      break;

    case 'not_ready':
      actions.push('Send helpful hiring article/resource');
      actions.push('Add to quarterly nurture campaign');
      actions.push('Check back in 3 months');
      break;

    case 'not_interested':
      actions.push('Thank them for their time');
      actions.push('Add to annual check-in list');
      break;

    default:
      actions.push('Manual review recommended');
  }

  return actions;
}

export default {
  OBJECTION_TYPES,
  OBJECTION_RESPONSES,
  detectObjection,
  getSuggestedResponse,
  classifySentiment,
  suggestNextActions
};
