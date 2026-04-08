/**
 * Call Tracking & Logging System
 * Track outbound calls, voicemails, and outcomes for SutraHR playbook
 */

import { supabase } from '../supabase-client.js';

/**
 * Call outcomes aligned with playbook strategy
 */
export const CALL_OUTCOMES = {
  interested: {
    name: 'Interested',
    description: 'Prospect expressed interest in SutraHR services',
    nextAction: 'Schedule discovery call'
  },
  request_proposal: {
    name: 'Wants Proposal/Info',
    description: 'Prospect wants more details or a formal proposal',
    nextAction: 'Send proposal and schedule follow-up'
  },
  not_interested: {
    name: 'Not Interested',
    description: 'Prospect declined the offer',
    nextAction: 'Add to annual nurture'
  },
  call_back_later: {
    name: 'Call Back Later',
    description: 'Prospect wants to be called back at a later date',
    nextAction: 'Schedule callback'
  },
  left_voicemail: {
    name: 'Left Voicemail',
    description: 'No answer, left voicemail',
    nextAction: 'Send follow-up email'
  },
  no_answer: {
    name: 'No Answer',
    description: 'Call went unanswered',
    nextAction: 'Try again or send email'
  },
  wrong_number: {
    name: 'Wrong Number',
    description: 'Called wrong number',
    nextAction: 'Verify contact and update'
  },
  transferred: {
    name: 'Transferred',
    description: 'Call transferred to someone else',
    nextAction: 'Follow up with transferred contact'
  }
};

/**
 * Log a call for a prospect
 */
export async function logProspectCall(prospectId, campaignId, callData) {
  try {
    const {
      callDate = new Date().toISOString(),
      callType = 'outbound', // outbound, inbound
      durationSeconds = 0,
      outcome = 'no_answer', // Use CALL_OUTCOMES keys
      voicemailLeft = false,
      callNotes = '',
      transferredToName = null,
      transferredToRole = null,
      prospectTone = null, // friendly, neutral, skeptical, hostile
      nextActionSuggested = null,
      userId = null
    } = callData;

    // Validate outcome
    if (!CALL_OUTCOMES[outcome]) {
      return {
        success: false,
        error: `Invalid outcome: ${outcome}`
      };
    }

    // Insert call record
    const { data, error } = await supabase
      .from('prospect_calls')
      .insert({
        prospect_id: prospectId,
        campaign_id: campaignId,
        call_date: callDate,
        call_type: callType,
        duration_seconds: durationSeconds,
        outcome,
        voicemail_left: voicemailLeft,
        call_notes: callNotes,
        next_action_suggested: nextActionSuggested || CALL_OUTCOMES[outcome].nextAction
      })
      .select()
      .single();

    if (error) {
      console.error('[call-tracker] Insert error:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[call-tracker] Call logged for prospect ${prospectId}`);

    return {
      success: true,
      callId: data.id,
      outcome,
      nextAction: data.next_action_suggested
    };
  } catch (error) {
    console.error('[call-tracker] Error logging call:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get call history for a prospect
 */
export async function getProspectCallHistory(prospectId, campaignId) {
  try {
    const { data, error } = await supabase
      .from('prospect_calls')
      .select('*')
      .eq('prospect_id', prospectId)
      .eq('campaign_id', campaignId)
      .order('call_date', { ascending: false });

    if (error) {
      console.error('[call-tracker] Query error:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      calls: data || [],
      count: (data || []).length
    };
  } catch (error) {
    console.error('[call-tracker] Error fetching call history:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get call statistics for a campaign
 */
export async function getCampaignCallStats(campaignId) {
  try {
    const { data, error } = await supabase
      .from('prospect_calls')
      .select('outcome, call_type, duration_seconds')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('[call-tracker] Stats query error:', error.message);
      return { success: false, error: error.message };
    }

    const calls = data || [];
    const stats = {
      totalCalls: calls.length,
      outboundCalls: calls.filter(c => c.call_type === 'outbound').length,
      inboundCalls: calls.filter(c => c.call_type === 'inbound').length,
      voicemailsLeft: calls.filter(c => c.voicemail_left).length,
      avgDuration: calls.length > 0
        ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / calls.length)
        : 0,
      byOutcome: {}
    };

    // Count by outcome
    Object.keys(CALL_OUTCOMES).forEach(outcome => {
      stats.byOutcome[outcome] = calls.filter(c => c.outcome === outcome).length;
    });

    // Calculate conversion rates
    const interestedCalls = calls.filter(c => c.outcome === 'interested').length;
    stats.interestRate = calls.length > 0 ? ((interestedCalls / calls.length) * 100).toFixed(1) : 0;

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('[call-tracker] Error calculating stats:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update call outcome (if user corrects after initial log)
 */
export async function updateCallOutcome(callId, newOutcome, additionalNotes = '') {
  try {
    if (!CALL_OUTCOMES[newOutcome]) {
      return { success: false, error: `Invalid outcome: ${newOutcome}` };
    }

    const { data, error } = await supabase
      .from('prospect_calls')
      .update({
        outcome: newOutcome,
        call_notes: additionalNotes,
        next_action_suggested: CALL_OUTCOMES[newOutcome].nextAction
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, call: data };
  } catch (error) {
    console.error('[call-tracker] Error updating call:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Suggest next action based on call outcome
 */
export function suggestCallFollowUp(outcome, prospectData = {}) {
  const outcomeInfo = CALL_OUTCOMES[outcome];
  if (!outcomeInfo) {
    return null;
  }

  const suggestions = {
    interested: {
      action: 'Schedule discovery call',
      template: `Hi {{prospectName}},

Great talking with you about {{companyName}}'s hiring. As discussed, here are some times I'm available for a more detailed conversation:

- Wednesday, 2-4pm
- Thursday, 10am-12pm
- Friday, 1-3pm

Which works best? I'll send a calendar invite.

Best,
{{senderName}}`,
      materials: ['case_studies', 'pricing_guide', 'client_list']
    },

    request_proposal: {
      action: 'Send proposal/pricing deck',
      template: `Hi {{prospectName}},

Perfect – I'm sending over our proposal for {{companyName}}. This includes:
- Our process and timeline
- Pricing model and ROI analysis
- Client success stories
- FAQ

Take a look and let me know any questions. Happy to hop on a call early next week to walk through it.

Best,
{{senderName}}`,
      materials: ['proposal_template', 'pricing_guide', 'case_studies']
    },

    call_back_later: {
      action: 'Schedule callback reminder',
      template: `{{prospectName}} requested callback on {{callbackDate}}.`,
      materials: []
    },

    left_voicemail: {
      action: 'Send follow-up email',
      template: `Hi {{prospectName}},

I tried reaching you earlier today – {{callNotes}}. Sending this email as I mentioned.

{{emailBodies.problem_aware}}

Let me know if a conversation makes sense.

Best,
{{senderName}}`,
      materials: ['case_studies']
    },

    no_answer: {
      action: 'Retry call or send email',
      template: `Hi {{prospectName}},

Tried reaching you earlier – let me send this via email instead.

Can we find 15 minutes to chat about how we could help {{companyName}} accelerate hiring?

Best,
{{senderName}}`,
      materials: ['case_studies']
    },

    not_interested: {
      action: 'Add to annual nurture campaign',
      template: `Thanks for taking the time to chat, {{prospectName}}. I completely understand – I'll circle back in a few months when things might look different.

Good luck with the growth!`,
      materials: []
    },

    transferred: {
      action: 'Follow up with transferred contact',
      template: `Hi {{transferredToName}},

{{prospectName}} kindly transferred me to you earlier. We were discussing how SutraHR could help {{companyName}} accelerate hiring of {{roleType}} roles.

Do you have 15 minutes this week to chat about this?

Best,
{{senderName}}`,
      materials: ['case_studies']
    }
  };

  return suggestions[outcome] || null;
}

/**
 * Get prospects due for callback
 */
export async function getCallbacksDue(campaignId) {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('prospect_calls')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('outcome', 'call_back_later')
      .lte('call_date', now)
      .is('callback_completed', null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, callbacksDue: data || [] };
  } catch (error) {
    console.error('[call-tracker] Error getting callbacks due:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  CALL_OUTCOMES,
  logProspectCall,
  getProspectCallHistory,
  getCampaignCallStats,
  updateCallOutcome,
  suggestCallFollowUp,
  getCallbacksDue
};
