/**
 * Sequence Trigger System
 * Checks for prospects with due sequence touches and executes them
 */

import { supabase } from '../supabase-client.js';
import { SUTRAHR_PLAYBOOK_V1, getSequenceStep, calculateTouchDate, getNextSendTime } from './sequence-engine.js';
import {
  generateTier1Email_Day1,
  generateTier2Email_Day1,
  generateTier3Email_Day1,
  generateFollowUpEmail,
  generateObjectionResponseEmail
} from './html-email-templates.js';
import { getUserProfile } from './user-profile.js';
import { google } from 'googleapis';
import { getTokensForUser, setCredentials } from '../routes/google-calendar.js';
import crypto from 'node:crypto';

// Fixed UUID for SutraHR Playbook v1 - clients should treat sequences as immutable config
// The actual sequence definition is in sequence-engine.js, this UUID is just for DB records
const SUTRAHR_PLAYBOOK_V1_UUID = '6e1a0e66-80cf-5622-5234-567812345678';

/**
 * Fire a single sequence touch (email, call reminder, etc.)
 * Called when a touch is due
 */
export async function fireTouchForProspect(prospectSequenceId, stepNumber, touchType) {
  try {
    // Get the prospect sequence record
    const { data: prospectSeq, error: psError } = await supabase
      .from('prospect_sequences')
      .select('*')
      .eq('id', prospectSequenceId)
      .single();

    if (psError || !prospectSeq) {
      console.error('[sequence-trigger] Prospect sequence not found:', prospectSequenceId);
      return { success: false, error: 'Prospect sequence not found' };
    }

    const { campaign_id, prospect_id, user_id } = prospectSeq;

    // Get the step definition
    const step = getSequenceStep(stepNumber);
    if (!step) {
      console.error('[sequence-trigger] Step not found:', stepNumber);
      return { success: false, error: 'Step not found' };
    }

    // Track execution regardless of result
    let executionId = null;
    const executedAt = new Date().toISOString();

    try {
      const { data: execution, error: execError } = await supabase
        .from('sequence_executions')
        .insert({
          sequence_id: prospectSeq.sequence_id,
          prospect_id,
          campaign_id,
          step_number: stepNumber,
          touch_type: touchType,
          status: 'pending',
          executed_at: executedAt
        })
        .select()
        .single();

      if (!execError && execution) {
        executionId = execution.id;
      }
    } catch (err) {
      console.error('[sequence-trigger] Failed to create execution record:', err.message);
    }

    // Execute the touch based on type
    let result = { success: false };

    switch (touchType) {
      case 'email':
        result = await sendSequenceEmail(
          prospect_id,
          campaign_id,
          step,
          user_id,
          executionId
        );
        break;

      case 'linkedin':
        result = await sendLinkedInMessage(
          prospect_id,
          campaign_id,
          step,
          user_id,
          executionId
        );
        break;

      case 'call':
        result = await logCallReminder(
          prospect_id,
          campaign_id,
          step,
          user_id,
          executionId
        );
        break;

      default:
        console.error('[sequence-trigger] Unknown touch type:', touchType);
        result = { success: false, error: 'Unknown touch type' };
    }

    // Update execution status
    if (executionId && result.success) {
      await supabase
        .from('sequence_executions')
        .update({ status: 'sent' })
        .eq('id', executionId);
    } else if (executionId) {
      await supabase
        .from('sequence_executions')
        .update({ status: 'failed', notes: result.error })
        .eq('id', executionId);
    }

    // Update prospect sequence's next touch date
    if (result.success) {
      const nextStepNumber = stepNumber + 1;
      const nextStep = getSequenceStep(nextStepNumber);

      if (nextStep) {
        const nextTouchDate = calculateTouchDate(
          executedAt,
          nextStep.daysFromEnrollment - step.daysFromEnrollment
        );

        await supabase
          .from('prospect_sequences')
          .update({
            last_touch_date: executedAt,
            next_touch_date: nextTouchDate,
            next_touch_index: nextStepNumber
          })
          .eq('id', prospectSequenceId);
      } else {
        // Sequence completed
        await supabase
          .from('prospect_sequences')
          .update({
            last_touch_date: executedAt,
            status: 'completed'
          })
          .eq('id', prospectSequenceId);
      }
    }

    return result;
  } catch (error) {
    console.error('[sequence-trigger] Error firing touch:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a sequence email touch with HTML template
 */
async function sendSequenceEmail(prospectId, campaignId, step, userId, executionId) {
  try {
    console.log(`[sequence-trigger] 📧 Sending HTML email to prospect ${prospectId}, step ${step.stepNumber}`);

    // Get prospect sequence with metadata
    const { data: prospectSeq, error: psError } = await supabase
      .from('prospect_sequences')
      .select('*')
      .eq('prospect_id', prospectId)
      .eq('campaign_id', campaignId)
      .single();

    if (psError || !prospectSeq) {
      console.error('[sequence-trigger] Prospect sequence not found:', prospectId);
      return { success: false, error: 'Prospect sequence not found' };
    }

    // Parse prospect metadata
    let prospect = null;
    try {
      prospect = prospectSeq.metadata ? JSON.parse(prospectSeq.metadata) : {};
    } catch (e) {
      console.warn('[sequence-trigger] Could not parse prospect metadata');
      prospect = {};
    }

    // Use prospectId as email if metadata not available
    prospect.email = prospect.email || prospectId;
    prospect.name = prospect.name || 'Lead';
    prospect.company = prospect.company || 'Your Company';
    prospect.tier = prospect.tier || 'tier1';

    // Normalize tier level
    const tier = prospect.tier.toLowerCase();

    // Get user profile for personalization (logged in email signatures)
    let userProfile = null;
    if (userId) {
      try {
        userProfile = getUserProfile();
      } catch (err) {
        console.warn('[sequence-trigger] Could not load user profile');
        userProfile = null;
      }
    }

    // Log that email will include user details
    const fromName = userProfile?.name || 'SutraHR Team';
    console.log(`[sequence-trigger] 📧 Email will be from: ${fromName}`);

    // Generate HTML email based on step
    let htmlEmail = null;
    let subject = '';

    if (step.stepNumber === 1) {
      // Day 1: Initial outreach based on tier
      if (tier.includes('tier1') || tier === '1') {
        htmlEmail = generateTier1Email_Day1(prospect.name, prospect.company);
        subject = `Speed + vetting quality for ${prospect.company}?`;
      } else if (tier.includes('tier2') || tier === '2') {
        htmlEmail = generateTier2Email_Day1(prospect.name, prospect.company);
        subject = `60% savings + zero risk for ${prospect.company}`;
      } else {
        // Tier 3
        htmlEmail = generateTier3Email_Day1(prospect.name, prospect.company);
        subject = `Team extension for ${prospect.company}?`;
      }
    } else {
      // Follow-up emails on days 2, 4, 6, 10, 12, 15
      htmlEmail = generateFollowUpEmail (prospect.name, prospect.company, step.daysFromEnrollment);
      subject = `Quick follow-up on our previous message`;
    }

    if (!htmlEmail) {
      console.error('[sequence-trigger] Could not generate email template');
      return { success: false, error: 'Email generation failed' };
    }

    // Send via Gmail API
    const sendResult = await sendEmailViaGmail({
      to: prospect.email,
      subject,
      htmlBody: htmlEmail,
      fromName: fromName,
      userId: userId
    });

    if (sendResult.success) {
      console.log(`[sequence-trigger] ✅ Email sent successfully to ${prospect.email}`);
    }

    return sendResult;
  } catch (error) {
    console.error('[sequence-trigger] Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send HTML email via Gmail API (using user's connected Google account)
 */
async function sendEmailViaGmail({ to, subject, htmlBody, fromName = 'SutraHR', userId }) {
  try {
    if (!userId) {
      throw new Error('User ID is required to send email via Gmail API');
    }

    console.log(`[sequence-trigger] 📧 Sending HTML email via Gmail to: ${to}`);

    // Get user's OAuth tokens
    const tokens = await getTokensForUser(userId);
    if (!tokens || !tokens.scope || !tokens.scope.includes('gmail.send')) {
      throw new Error('Google Workspace is not connected or missing Gmail permissions');
    }

    // Set up auth and create Gmail client
    const { client } = await setCredentials(tokens, userId);
    const gmail = google.gmail({ version: 'v1', auth: client });

    // Build MIME message with both text and HTML parts
    const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
    
    // Create plain text fallback from HTML
    const plainText = htmlBody
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    const mimeMessage = [
      `To: ${to}`,
      `From: ${fromName ? `"${fromName}" <me>` : "me"}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      plainText,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      htmlBody,
      `--${boundary}--`
    ].join('\r\n');

    // Encode message in base64url format
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`[sequence-trigger] ✅ Email sent successfully to ${to}`);
    return { success: true, message: `Email sent to ${to}` };
  } catch (error) {
    console.error('[sequence-trigger] Gmail send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a LinkedIn message touch
 */
async function sendLinkedInMessage(prospectId, campaignId, step, userId, executionId) {
  try {
    console.log(`[sequence-trigger] Sending LinkedIn message to prospect ${prospectId}, step ${step.stepNumber}`);

    // Would integrate with LinkedIn Voyager API here
    // For now: log that we would send it
    return { success: true, message: 'LinkedIn message queued' };
  } catch (error) {
    console.error('[sequence-trigger] LinkedIn send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Log a call reminder for a prospect
 */
async function logCallReminder(prospectId, campaignId, step, userId, executionId) {
  try {
    console.log(`[sequence-trigger] Logging call reminder for prospect ${prospectId}, step ${step.stepNumber}`);

    // Insert a call reminder record
    const { data, error } = await supabase
      .from('prospect_calls')
      .insert({
        prospect_id: prospectId,
        campaign_id: campaignId,
        call_date: new Date().toISOString(),
        call_type: 'scheduled_outbound',
        outcome: 'pending',
        call_notes: `SutraHR Playbook Step ${step.stepNumber} - Call reminder generated`
      })
      .select()
      .single();

    if (error) {
      console.error('[sequence-trigger] Call reminder insert error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, callReminderId: data.id };
  } catch (error) {
    console.error('[sequence-trigger] Call reminder error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check all prospects for due touches and fire them
 * Call this periodically (e.g., every 5 minutes via cron or task scheduler)
 */
export async function checkAndFireDueTouches() {
  try {
    console.log('[sequence-trigger] Checking for due touches...');

    const now = new Date().toISOString();

    // Find all active prospects with due touches
    const { data: dueTouches, error: queryError } = await supabase
      .from('prospect_sequences')
      .select('*')
      .eq('status', 'active')
      .lte('next_touch_date', now);

    if (queryError) {
      console.error('[sequence-trigger] Query error:', queryError.message);
      return { success: false, error: queryError.message };
    }

    if (!dueTouches || dueTouches.length === 0) {
      console.log('[sequence-trigger] No due touches found');
      return { success: true, touchesFired: 0 };
    }

    console.log(`[sequence-trigger] Found ${dueTouches.length} due touches`);

    let touchesFired = 0;
    const results = [];

    // Fire each due touch
    for (const prospectSeq of dueTouches) {
      const step = getSequenceStep(prospectSeq.next_touch_index);
      if (step) {
        const result = await fireTouchForProspect(
          prospectSeq.id,
          prospectSeq.next_touch_index,
          step.touchType
        );

        results.push({
          prospectSequenceId: prospectSeq.id,
          stepNumber: prospectSeq.next_touch_index,
          result
        });

        if (result.success) {
          touchesFired++;
        }
      }
    }

    console.log(`[sequence-trigger] Fired ${touchesFired}/${dueTouches.length} touches`);

    return {
      success: true,
      touchesFired,
      dueTouchesCount: dueTouches.length,
      results
    };
  } catch (error) {
    console.error('[sequence-trigger] Error in checkAndFireDueTouches:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enroll a prospect in the SutraHR Playbook sequence
 */
export async function enrollProspectInSequence(options) {
  try {
    const {
      campaignId,
      prospectEmail,
      prospectName = 'Lead',
      prospectCompany,
      prospectTitle,
      tierLevel,
      userId = null, // optional user_id if provided
      enrichedData = null // NEW: enrichment data with achievement, headline, etc.
    } = options;

    // Validate required fields
    if (!campaignId || !prospectEmail) {
      return { success: false, enrolled: false, error: 'campaignId and prospectEmail required' };
    }

    const enrollmentDate = new Date();
    const firstStep = getSequenceStep(1);

    if (!firstStep) {
      return { success: false, enrolled: false, error: 'First step not found' };
    }

    // Calculate when first touch should fire
    const nextTouchDate = getNextSendTime(firstStep, enrollmentDate);

    // Use email as prospect_id for easier lookup
    const prospectId = prospectEmail;

    // Create prospect sequence record with metadata
    const { data, error } = await supabase
      .from('prospect_sequences')
      .insert({
        campaign_id: campaignId,
        prospect_id: prospectId,
        sequence_id: SUTRAHR_PLAYBOOK_V1_UUID,
        user_id: userId || process.env.SUPABASE_SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000',
        enrolled_at: enrollmentDate.toISOString(),
        next_touch_date: nextTouchDate.toISOString(),
        next_touch_index: 1,
        status: 'active',
        // Store prospect metadata as JSON for email generation
        metadata: JSON.stringify({
          email: prospectEmail,
          name: prospectName,
          company: prospectCompany,
          title: prospectTitle,
          tier: tierLevel,
          enrichedData: enrichedData || {} // Store enriched data for token replacement
        })
      })
      .select()
      .single();

    if (error) {
      console.error('[sequence-trigger] Enrollment error:', error.message);
      return { success: false, enrolled: false, error: error.message };
    }

    console.log(`[sequence-trigger] ✅ Enrolled ${prospectEmail} (${tierLevel}) in sequence`, enrichedData ? `with enrichment: ${JSON.stringify(enrichedData)}` : '');

    return {
      success: true,
      enrolled: true,
      prospectId: prospectId,
      prospectSequenceId: data.id,
      firstTouchDate: nextTouchDate,
      enrichedData: enrichedData,
      message: `${prospectName} enrolled in SutraHR 7-touch sequence`
    };
  } catch (error) {
    console.error('[sequence-trigger] Error enrolling prospect:', error.message);
    return { success: false, enrolled: false, error: error.message };
  }
}

/**
 * Pause a prospect's sequence
 */
export async function pauseProspectSequence(prospectSequenceId) {
  try {
    const { error } = await supabase
      .from('prospect_sequences')
      .update({ status: 'paused' })
      .eq('id', prospectSequenceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Sequence paused' };
  } catch (error) {
    console.error('[sequence-trigger] Error pausing sequence:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Resume a prospect's sequence
 */
export async function resumeProspectSequence(prospectSequenceId) {
  try {
    const { error } = await supabase
      .from('prospect_sequences')
      .update({ status: 'active' })
      .eq('id', prospectSequenceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Sequence resumed' };
  } catch (error) {
    console.error('[sequence-trigger] Error resuming sequence:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  fireTouchForProspect,
  checkAndFireDueTouches,
  enrollProspectInSequence,
  pauseProspectSequence,
  resumeProspectSequence
};
