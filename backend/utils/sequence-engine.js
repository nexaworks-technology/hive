/**
 * Sequence Engine - SutraHR Playbook Implementation
 * Defines the 7-touch sales cadence for Indian startup founder outreach
 */

// SutraHR Playbook v1 - 7-touch sequence over 15 days
export const SUTRAHR_PLAYBOOK_V1 = {
  id: 'sutrahr-playbook-v1',
  name: 'SutraHR Sales Playbook v1',
  description: 'Proven 7-touch cadence targeting Indian startup founders (50-300 employees)',
  steps: [
    {
      stepNumber: 1,
      touchType: 'email',
      daysFromEnrollment: 0, // Day 1
      templateVariant: 'initial_hook',
      sendTiming: 'tuesday_to_thursday_9am', // High open rate window
      subjectLineFormulas: [
        '{{prospectFirstName}}', // Simple personalized
        'Thoughts {{prospectFirstName}}?', // Curiosity
        '{{prospectFirstName}} X {{senderName}}', // Referral implication
        '{{companyName}} hiring challenge?' // Problem-focused
      ],
      bodyTemplate: `Hi {{prospectFirstName}},

I came across {{companyName}}'s recent {{fundingNews || 'growth'}}.{{#insight}} {{insight}}{{/insight}}

I noticed {{companyName}} has {{openRolesCount || 'several'}} open roles and {{#taTeamSize}}only {{taTeamSize}} recruiters on the team{{/taTeamSize}}.{{#noTATeam}}no dedicated TA team{{/noTATeam}}. Many founders at this stage tell me juggling 8-10 interviews while scaling feels chaotic.

We've helped startups like {{clientExample}} by assigning a full-time recruiter for a flat fee – no per-hire cost – closing roles in ~3 weeks.

Could we chat 15 minutes this week to see if this makes sense for {{companyName}}? I'm free {{availableDays}}.

Best,
{{senderName}}
SutraHR`,
      skipIfReplied: false,
      skipIfCalled: false
    },
    {
      stepNumber: 2,
      touchType: 'linkedin',
      daysFromEnrollment: 1, // Day 2
      templateVariant: 'connection',
      bodyTemplate: `Hi {{prospectFirstName}}, we share a focus on scaling tech teams in India. Would love to connect!`,
      skipIfReplied: true,
      optional: true // Can be disabled per campaign
    },
    {
      stepNumber: 3,
      touchType: 'email',
      daysFromEnrollment: 3, // Day 4
      templateVariant: 'problem_aware',
      subjectLineFormulas: [
        'Just checking in on {{companyName}}',
        'Re: {{prospectFirstName}} – hiring update?',
        'Quick thought about {{companyName}}'
      ],
      bodyTemplate: `Hi {{prospectFirstName}},

Just checking if you saw my note about helping {{companyName}} with hiring. I've noticed the pattern – you've posted similar roles 2-3 times, which is a sign of how tough the market is.

We've filled {{exampleRoleType}} roles at {{clientExample}} and {{clientExample2}} under similar conditions. Each took about 3 weeks, and the founders got back to focusing on the business instead of interviews.

Let me know if you'd like to explore this. No pressure.

Best,
{{senderName}}`,
      skipIfReplied: true,
      skipIfCalled: true
    },
    {
      stepNumber: 4,
      touchType: 'call',
      daysFromEnrollment: 5, // Day 6
      templateVariant: 'voicemail',
      purpose: 'Direct conversation + voicemail if no answer',
      callScriptIntro: `Hi {{prospectFirstName}}, this is {{senderName}} from SutraHR – do you have 30 seconds?`,
      callScriptHook: `I noticed {{companyName}} is growing quickly and has {{openRolesCount || 'several'}} open roles. Many founders tell me hiring is their bottleneck. Is that the case for you?`,
      callScriptValueProp: `We help companies like yours by dedicating one full-time recruiter just for you – unlimited hiring, one flat fee. It saved {{founderName}} weeks of headache. Would this be helpful for {{companyName}}?`,
      voicemailScript: `Hi {{prospectFirstName}}, it's {{senderName}} from SutraHR. I'm calling because {{companyName}} is expanding its team and I saw you have {{openRolesCount}} open roles. We work with startups to slash hiring time. I'll send you a quick email on this – hope we can chat soon.`,
      skipIfReplied: false,
      skipIfCalled: false
    },
    {
      stepNumber: 5,
      touchType: 'email',
      daysFromEnrollment: 9, // Day 10
      templateVariant: 'social_proof',
      subjectLineFormulas: [
        'Case study: {{clientExample}} hired 6 engineers in 3 weeks',
        '{{companyName}}: scaling hiring faster',
        'Success story you might relate to'
      ],
      bodyTemplate: `Hi {{prospectFirstName}},

Wanted to share something that might be relevant. We recently helped {{clientExample}} (also Series {{fundingStage}}, similar headcount) hire {{hireCount}} engineers in 3 weeks – without overloading their internal team.

Here's what changed for them:
1. Stop juggling interviews – our recruiter handled screening + scheduling
2. Fixed hiring timeline – knew roles would close in 3 weeks, not "sometime"
3. Founder time back – could focus on product, not candidate reviews

For {{companyName}}, with {{openRolesCount}} open roles, this typically saves {{timeEstimate}} weeks of founder/leadership time.

Open to a quick call to discuss? I can share the playbook we use.

Best,
{{senderName}}
SutraHR`,
      skipIfReplied: true,
      skipIfCalled: true
    },
    {
      stepNumber: 6,
      touchType: 'linkedin',
      daysFromEnrollment: 11, // Day 12
      templateVariant: 'linkedin_final',
      bodyTemplate: `Just wanted to see if connecting about {{companyName}}'s hiring challenges makes sense – no pressure, I know how busy you are.`,
      skipIfReplied: true,
      skipIfNotConnected: true, // Only send if LinkedIn connection is established
      optional: true
    },
    {
      stepNumber: 7,
      touchType: 'email',
      daysFromEnrollment: 14, // Day 15
      templateVariant: 'final_attempt',
      subjectLineFormulas: [
        "Maybe now isn't the right time?",
        '{{companyName}} – reaching out one more time',
        'Open to touching base when hiring gets busier'
      ],
      bodyTemplate: `Hi {{prospectFirstName}},

Maybe now isn't the right time to think about hiring support. That's totally fair.

I wanted to leave the door open: when {{companyName}} is battling through open roles and TA bandwidth becomes the blocker, SutraHR is a 15-minute call away. We guarantee approved candidates for each role within 3 weeks or we work free until you do.

No pressure. Good luck with the growth.

Best,
{{senderName}}`,
      skipIfReplied: false,
      skipIfCalled: false
    }
  ]
};

/**
 * Get the SutraHR Playbook sequence definition
 */
export function getSutraHRPlaybook() {
  return SUTRAHR_PLAYBOOK_V1;
}

/**
 * Get a specific step in the sequence
 */
export function getSequenceStep(stepNumber) {
  const playbook = SUTRAHR_PLAYBOOK_V1;
  return playbook.steps.find(s => s.stepNumber === stepNumber);
}

/**
 * Calculate the date a touch should fire
 */
export function calculateTouchDate(enrollmentDate, daysFromEnrollment) {
  const date = new Date(enrollmentDate);
  date.setDate(date.getDate() + daysFromEnrollment);
  return date;
}

/**
 * Check if a date/time falls within business hours (9am-5pm)
 */
export function isBusinessHours(date) {
  const hours = date.getHours();
  return hours >= 9 && hours < 17;
}

/**
 * Get the next viable send time for a step (respecting timing windows)
 */
export function getNextSendTime(step, afterDate = new Date()) {
  if (step.sendTiming === 'tuesday_to_thursday_9am') {
    // Find next Tue-Thu at 9am
    let d = new Date(afterDate);
    d.setHours(9, 0, 0, 0);
    
    // Move to next day if already past 9am today
    if (d <= afterDate) {
      d.setDate(d.getDate() + 1);
    }
    
    // Keep incrementing until we hit Tue-Thu (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
    while (d.getDay() === 0 || d.getDay() === 1 || d.getDay() === 5 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    
    return d;
  }
  
  // Default: asap
  return afterDate;
}

/**
 * Determine if a step should be skipped based on prospect state
 */
export function shouldSkipStep(step, prospectState) {
  // prospectState = { replied: bool, called: bool, meetingBooked: bool, etc. }
  
  if (step.skipIfReplied && prospectState.replied) {
    return true;
  }
  
  if (step.skipIfCalled && prospectState.called) {
    return true;
  }
  
  if (step.skipIfNotConnected && !prospectState.linkedinConnected) {
    return true;
  }
  
  return false;
}

/**
 * Determine the next step index that should fire
 */
export function getNextActiveStep(currentStepIndex, prospectState) {
  const playbook = SUTRAHR_PLAYBOOK_V1;
  
  for (let i = currentStepIndex; i < playbook.steps.length; i++) {
    const step = playbook.steps[i];
    if (!shouldSkipStep(step, prospectState)) {
      return i;
    }
  }
  
  // All remaining steps skipped – sequence complete
  return null;
}

/**
 * Substitute template variables in text
 */
export function substituteTemplateVariables(template, variables) {
  let result = template;
  
  // Simple {{variable}} replacement
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  // Conditional blocks {{#variable}}...{{/variable}}
  const conditionalRegex = /{{#(\w+)}}(.*?){{\/\1}}/gs;
  result = result.replace(conditionalRegex, (match, key, content) => {
    return variables[key] ? content : '';
  });
  
  return result;
}

export default {
  SUTRAHR_PLAYBOOK_V1,
  getSutraHRPlaybook,
  getSequenceStep,
  calculateTouchDate,
  isBusinessHours,
  getNextSendTime,
  shouldSkipStep,
  getNextActiveStep,
  substituteTemplateVariables
};
