import express from 'express';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from '../../config/supabase.js';
import requireAuth from '../../middlewares/require-auth.js';
import { google } from 'googleapis';
import crypto from 'node:crypto';
import { getTokensForUser, setCredentials } from '../google/google.routes.js';

const router = express.Router();

// ─── OpenRouter AI Setup ─────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Call OpenRouter API to generate a personalized email for a single lead.
 */
async function generateEmail({ lead, settings }) {
  const { name, company, title } = lead;
  const { agencyName, service, valueProp, ctaStyle, tone } = settings;

  const ctaMap = {
    'book-call': 'book a 15-min call',
    'quick-chat': 'jump on a quick 10-min chat',
    demo: 'see a quick demo',
  };
  const ctaText = ctaMap[ctaStyle] || 'connect briefly';

  const systemPrompt = `You are a world-class B2B sales email writer for ${agencyName}.
Write a short, highly personalized outreach email.
Tone: ${tone || 'professional'}.
Goal: get the recipient to ${ctaText}.
Service: ${service}.
Value proposition: ${valueProp}.

RULES:
- Maximum 5 sentences total (subject excluded)
- Sentence 1 must naturally reference their role (${title}) or company (${company})
- No generic openers like "I hope this finds you well" or "I wanted to reach out"
- End with exactly ONE clear call to action. You MUST use exactly "[CALENDAR_LINK]" as the placeholder if you ask them to book a time.
- Keep it conversational, not corporate
- Return ONLY valid JSON with keys "subject" and "body" — no markdown, no commentary`;

  const userPrompt = `Write an outreach email to ${name}, ${title} at ${company}.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hive.nexaworks.tech',
      'X-Title': 'Hive Inbound Outreach',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${err}`);
  }

  const payload = await res.json();
  const raw = payload.choices?.[0]?.message?.content || '';

  // Strip markdown code fences if the model wraps output in ```json
  let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  
  // Inject booking link into initial outreach as well, if AI generates a placeholder
  if (settings.bookingLink) {
    cleaned = cleaned.replace(/\[(?:.*)?(?:calendar|booking|link|schedule).*?\]/ig, settings.bookingLink);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: try to extract JSON substring
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI response was not valid JSON: ' + raw.slice(0, 200));
  }
}

/**
 * Send a single email via Gmail API using the user's connected Google account.
 */
async function sendEmail({ to, subject, body, fromName, userId }) {
  if (!userId) {
    throw new Error('User ID is required to send email via connected Google account.');
  }

  const tokens = await getTokensForUser(userId);
  if (!tokens || !tokens.scope || !tokens.scope.includes('gmail.send')) {
    throw new Error('Google Workspace is not connected or missing Gmail permissions.');
  }

  const { client } = await setCredentials(tokens, userId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
  const htmlBody = body.split('\n').map((l) => (l.trim() ? `<p>${l}</p>` : '')).join('');

  const str = [
    `To: ${to}`,
    `From: ${fromName ? `"${fromName}" <me>` : "me"}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
    `--${boundary}--`
  ].join('\r\n');

  const encodedMessage = Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /inbound/preview-email
 * Generate a single email preview (no send). Used by the Campaign Setup modal.
 */
router.post('/preview-email', requireAuth, async (req, res) => {
  try {
    const { lead, settings } = req.body || {};

    if (!lead || !settings) {
      return res.status(400).json({ error: 'lead and settings are required' });
    }
    if (!lead.name || !lead.email) {
      return res.status(400).json({ error: 'lead.name and lead.email are required' });
    }
    if (!settings.agencyName || !settings.service || !settings.valueProp) {
      return res.status(400).json({ error: 'agencyName, service, and valueProp are required' });
    }

    const email = await generateEmail({ lead, settings });
    return res.json(email); // { subject, body }
  } catch (err) {
    console.error('[inbound][preview-email] error', err);
    return res.status(500).json({ error: err.message || 'Failed to generate email preview' });
  }
});

/**
 * POST /inbound/launch
 * Create an inbound campaign, generate + send emails to all leads.
 */
router.post('/launch', requireAuth, async (req, res) => {
  try {
    const { leads, settings } = req.body || {};

    if (!leads?.length) {
      return res.status(400).json({ error: 'leads array is required and must not be empty' });
    }
    if (!settings?.agencyName || !settings?.service || !settings?.valueProp) {
      return res.status(400).json({ error: 'agencyName, service, and valueProp are required in settings' });
    }

    // Filter to only leads with valid emails
    const validLeads = leads.filter((l) => l.email?.includes('@') && l.name);

    if (!validLeads.length) {
      return res.status(400).json({ error: 'No leads with valid email addresses found' });
    }

    // Create campaign row in Supabase
    const campaignTitle = `Inbound: ${settings.agencyName} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        title: campaignTitle,
        stage: 'inbound-sending',
        status: 'running',
        user_id: req.user.id,
        payload: {
          type: 'inbound',
          settings,
          leads: validLeads.map((l) => ({
            ...l,
            emailSent: false,
            emailSentAt: null,
            replied: false,
            meetingBooked: false,
            followup1Sent: false,
            followup1SendAt: null,
            followup2Sent: false,
            followup2SendAt: null,
          })),
        },
      })
      .select()
      .single();

    if (campaignError) {
      console.error('[inbound][launch] campaign create error', campaignError);
      return res.status(500).json({ error: 'Failed to create campaign', details: campaignError.message });
    }

    const campaignId = campaign.id;
    const fromName = `${settings.agencyName}`;
    const now = Date.now();
    const day3 = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
    const day7 = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Process leads: generate + send emails (sequentially to avoid rate limits)
    const processedLeads = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const lead of validLeads) {
      let emailSent = false;
      let generatedSubject = '';
      let generatedBody = '';
      let sendError = null;

      try {
        const generated = await generateEmail({ lead, settings });
        generatedSubject = generated.subject;
        generatedBody = generated.body;

        await sendEmail({
          to: lead.email,
          subject: generatedSubject,
          body: generatedBody,
          fromName,
          userId: req.user.id,
        });

        emailSent = true;
        sentCount++;
        console.log(`[inbound][launch] sent email to ${lead.email}`);
      } catch (err) {
        failedCount++;
        sendError = err.message;
        console.error(`[inbound][launch] failed for ${lead.email}:`, err.message);
      }

      processedLeads.push({
        ...lead,
        emailSent,
        emailSentAt: emailSent ? new Date().toISOString() : null,
        replied: false,
        meetingBooked: false,
        emailSubject: generatedSubject,
        emailBody: generatedBody,
        sendError: sendError || null,
        followup1Sent: false,
        followup1SendAt: emailSent ? day3 : null,
        followup2Sent: false,
        followup2SendAt: emailSent ? day7 : null,
      });
    }

    // Update campaign with processed leads + final status
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        stage: 'inbound-active',
        status: failedCount === validLeads.length ? 'failed' : 'active',
        payload: {
          type: 'inbound',
          settings,
          leads: processedLeads,
          stats: { total: validLeads.length, sent: sentCount, failed: failedCount },
        },
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[inbound][launch] update error', updateError);
    }

    return res.status(201).json({
      campaignId,
      sent: sentCount,
      failed: failedCount,
      total: validLeads.length,
    });
  } catch (err) {
    console.error('[inbound][launch] unexpected error', err);
    return res.status(500).json({ error: err.message || 'Failed to launch campaign' });
  }
});

/**
 * POST /inbound/:campaignId/followup
 * Send follow-up emails to leads that haven't replied.
 * Respects the followup1SendAt / followup2SendAt timestamps.
 */
router.post('/:campaignId/followup', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('payload')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const payload = campaign.payload || {};
    if (payload.type !== 'inbound') {
      return res.status(400).json({ error: 'Not an inbound campaign' });
    }

    const { leads = [], settings = {} } = payload;
    const now = new Date();
    const fromName = settings.agencyName || '';
    let sentCount = 0;

    const updatedLeads = await Promise.all(
      leads.map(async (lead) => {
        if (lead.replied || lead.meetingBooked) return lead;

        // Follow-up 1
        if (!lead.followup1Sent && lead.followup1SendAt && new Date(lead.followup1SendAt) <= now) {
          try {
            const subject = `Re: ${lead.emailSubject || 'Following up'}`;
            const body = `Hi ${lead.name?.split(' ')[0] || lead.name},

Just following up on my note from a few days ago. I know things get busy — wanted to make sure this didn't slip through.

Would ${settings.ctaStyle === 'demo' ? 'seeing a quick demo' : 'a quick 10-min call'} make sense this week?

${fromName}`;

            await sendEmail({ to: lead.email, subject, body, fromName, userId: req.user.id });
            sentCount++;
            console.log(`[inbound][followup1] sent to ${lead.email}`);
            return { ...lead, followup1Sent: true, followup1SentAt: new Date().toISOString() };
          } catch (err) {
            console.error(`[inbound][followup1] failed for ${lead.email}:`, err.message);
          }
        }

        // Follow-up 2
        if (!lead.followup2Sent && lead.followup2SendAt && new Date(lead.followup2SendAt) <= now && lead.followup1Sent) {
          try {
            const subject = `Last note — ${lead.company || 'your team'}`;
            const body = `Hi ${lead.name?.split(' ')[0] || lead.name},

I'll keep this short — last note from me on this. If now's not the right time, totally understood. Happy to reconnect whenever it makes sense.

${fromName}`;

            await sendEmail({ to: lead.email, subject, body, fromName, userId: req.user.id });
            sentCount++;
            console.log(`[inbound][followup2] sent to ${lead.email}`);
            return { ...lead, followup2Sent: true, followup2SentAt: new Date().toISOString() };
          } catch (err) {
            console.error(`[inbound][followup2] failed for ${lead.email}:`, err.message);
          }
        }

        return lead;
      })
    );

    // Save updated payload
    await supabase
      .from('campaigns')
      .update({ payload: { ...payload, leads: updatedLeads } })
      .eq('id', campaignId);

    return res.json({ sent: sentCount, total: leads.length });
  } catch (err) {
    console.error('[inbound][followup] error', err);
    return res.status(500).json({ error: err.message || 'Follow-up failed' });
  }
});

/**
 * GET /inbound/:campaignId/leads
 * Returns all leads with their outreach status for the tracker page.
 */
router.get('/:campaignId/leads', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, title, created_at, status, payload')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { leads = [], settings = {}, stats = {} } = campaign.payload || {};
    return res.json({ campaignId: campaign.id, title: campaign.title, createdAt: campaign.created_at, status: campaign.status, settings, leads, stats });
  } catch (err) {
    console.error('[inbound][get-leads] error', err);
    return res.status(500).json({ error: err.message || 'Failed to get leads' });
  }
});

/**
 * PATCH /inbound/:campaignId/leads/:leadId
 * Mark a lead as replied or meeting booked (e.g. manual update from tracker UI).
 */
router.patch('/:campaignId/leads/:leadId', requireAuth, async (req, res) => {
  try {
    const { campaignId, leadId } = req.params;
    const { replied, meetingBooked } = req.body || {};

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('payload')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const payload = campaign.payload || {};
    const leads = (payload.leads || []).map((l) => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        ...(typeof replied === 'boolean' ? { replied } : {}),
        ...(typeof meetingBooked === 'boolean' ? { meetingBooked } : {}),
      };
    });

    await supabase
      .from('campaigns')
      .update({ payload: { ...payload, leads } })
      .eq('id', campaignId);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[inbound][patch-lead] error', err);
    return res.status(500).json({ error: err.message || 'Failed to update lead' });
  }
});

// ─── AI Reply Classification + Auto-Response ────────────────────────────────

/**
 * Classify a lead's reply and generate an automatic response email.
 */
async function classifyAndDraftReply({ lead, replyText, originalSubject, originalBody, settings }) {
  const { name, company } = lead;
  const { agencyName, service, ctaStyle } = settings;

  const ctaMap = {
    'book-call': 'book a 15-min call',
    'quick-chat': 'jump on a 10-min chat',
    demo: 'see a quick demo',
  };
  const ctaText = ctaMap[ctaStyle] || 'connect briefly';

  const systemPrompt = `You are a world-class B2B sales assistant for ${agencyName} (service: ${service}).
You received a reply to an outreach email. Analyze it and write a smart follow-up response.

Original email sent:
Subject: ${originalSubject || '(no subject)'}
Body: ${originalBody || '(no body)'}

Their reply:
${replyText}

Instructions:
1. Classify the intent as one of: positive, question, objection, not-interested, out-of-office
2. Write a short (3-5 sentence) natural reply that:
   - Directly addresses their specific message
   - If positive → confirms next step (${ctaText}), shows calendar link placeholder [CALENDAR_LINK]
   - If question → gives a clear, concise answer and re-pitches the CTA
   - If objection → gently acknowledges, reframes with a fresh angle, re-asks for ${ctaText}
   - If not-interested → graciously backs off and leaves the door open ("no problem, I'll circle back in Q3...")
   - If out-of-office → plans to follow up after their return date
3. Never be pushy. Sound human, not salesy.

Return ONLY valid JSON: { "intent": "...", "replySubject": "...", "replyBody": "..." }`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hive.nexaworks.tech',
      'X-Title': 'Hive Reply Intelligence',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.5,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter classify error: ${res.status} ${err}`);
  }

  const payload = await res.json();
  const raw = payload.choices?.[0]?.message?.content || '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI classify response was not valid JSON: ' + raw.slice(0, 200));
  }
}

/**
 * POST /inbound/:campaignId/check-replies
 * Polls the IMAP inbox, matches emails to leads, AI-classifies intent,
 * auto-sends a reply, and updates Supabase.
 */
router.post('/:campaignId/check-replies', requireAuth, async (req, res) => {
  const { campaignId } = req.params;

  // Fetch campaign
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('payload')
    .eq('id', campaignId)
    .eq('user_id', req.user.id)
    .single();

  if (fetchError || !campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const payload = campaign.payload || {};
  if (payload.type !== 'inbound') {
    return res.status(400).json({ error: 'Not an inbound campaign' });
  }

  const { leads = [], settings = {} } = payload;
  const leadsByEmail = {};
  leads.forEach((lead, idx) => {
    if (lead.email) leadsByEmail[lead.email.toLowerCase()] = idx;
  });

  const newReplies = [];
  const updatedLeads = leads.map((l) => ({ ...l })); // shallow copy

  const unreadMessages = [];
  let imapClient = null;
  let calendarMatchesFound = 0;

  // 0. Auto-check Google Calendar for bookings via Attendees
  const tokens = await getTokensForUser(req.user.id);
  let authClient = null;

  if (tokens) {
    try {
      const { client } = await setCredentials(tokens, req.user.id);
      authClient = client;

      if (tokens.scope && tokens.scope.includes('calendar')) {
        console.log('[inbound][check-replies] Scanning Google Calendar for bookings...');
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 14); // look back 14 days and into the future

        const calRes = await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        });

        const events = calRes.data.items || [];
        events.forEach((event) => {
          const attendees = event.attendees || [];
          attendees.forEach((att) => {
            const attEmail = att.email?.toLowerCase();
            const leadIdx = leadsByEmail[attEmail];
            if (leadIdx !== undefined) {
              const lead = updatedLeads[leadIdx];
              if (!lead.meetingEventId) {
                console.log(`[inbound][check-replies] Booked meeting found/updated for lead: ${attEmail}`);
                lead.meetingBooked = true;
                lead.meetingEventId = event.id;
                lead.meetingLink = event.hangoutLink || event.location || event.htmlLink || '';
                lead.meetingTime = event.start?.dateTime || event.start?.date || '';
                calendarMatchesFound++;
              }
            }
          });
        });
      }
    } catch (calErr) {
      console.error('[inbound][check-replies] Calendar check failed:', calErr.message);
    }
  }

  // 1. Try Gmail API first
  const useGmailAPI = tokens && tokens.scope && tokens.scope.includes('gmail.readonly') && authClient;

  if (useGmailAPI) {
    console.log('[inbound][check-replies] Using Gmail API');
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });

      const response = await gmail.users.messages.list({ userId: 'me', q: 'is:unread' });
      const gMessages = response.data.messages || [];
      console.log(`[inbound][check-replies] ${gMessages.length} unread email(s) found via Gmail API`);

      // ⚡ Fetch all messages in parallel instead of sequentially
      const fetchedMessages = await Promise.all(
        gMessages.map(async (gMsg) => {
          try {
            const msgData = await gmail.users.messages.get({ userId: 'me', id: gMsg.id, format: 'raw' });
            const raw = Buffer.from(msgData.data.raw, 'base64url').toString('utf-8');
            const parsed = await simpleParser(raw);

            const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
            const replyText = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';
            const emailSubject = parsed.subject || '';

            if (!fromEmail || !replyText.trim()) return null;

            return {
              uid: gMsg.id,
              fromEmail,
              replyText,
              emailSubject,
              markSeen: async () => {
                await gmail.users.messages.modify({
                  userId: 'me',
                  id: gMsg.id,
                  requestBody: { removeLabelIds: ['UNREAD'] }
                });
              }
            };
          } catch (err) {
            console.error(`[inbound][check-replies] error processing gmail msg id ${gMsg.id}:`, err.message);
            return null;
          }
        })
      );
      fetchedMessages.filter(Boolean).forEach((m) => unreadMessages.push(m));
    } catch (err) {
      console.error('[inbound][check-replies] Gmail API error:', err.message);
      return res.status(500).json({ error: `Gmail API connection failed: ${err.message}` });
    }
  } else {
    // 2. Fallback to IMAP
    console.log('[inbound][check-replies] Using IMAP Fallback');
    const IMAP_HOST = process.env.IMAP_HOST;
    const IMAP_PORT = Number(process.env.IMAP_PORT || 993);
    const IMAP_USER = process.env.IMAP_USER;
    const IMAP_PASS = process.env.IMAP_PASS;

    if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
      return res.status(500).json({ error: 'IMAP not configured and Google not connected' });
    }

    imapClient = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: IMAP_USER, pass: IMAP_PASS },
      logger: false,
    });

    try {
      await imapClient.connect();
      console.log('[inbound][check-replies] IMAP connected');
      await imapClient.mailboxOpen('INBOX');

      const uids = await imapClient.search({ seen: false });
      console.log(`[inbound][check-replies] ${uids.length} unread email(s) found via IMAP`);

      // ⚡ Fetch all IMAP messages in parallel
      const imapFetched = await Promise.all(
        uids.map(async (uid) => {
          try {
            const msgBytes = await imapClient.fetchOne(uid, { source: true });
            const parsed = await simpleParser(msgBytes.source);

            const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
            const replyText = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';
            const emailSubject = parsed.subject || '';

            if (!fromEmail || !replyText.trim()) return null;

            return {
              uid: String(uid),
              fromEmail,
              replyText,
              emailSubject,
              markSeen: async () => {
                await imapClient.messageFlagsAdd(uid, ['\\Seen']);
              }
            };
          } catch (msgErr) {
            console.error(`[inbound][check-replies] error processing imap uid ${uid}:`, msgErr.message);
            return null;
          }
        })
      );
      imapFetched.filter(Boolean).forEach((m) => unreadMessages.push(m));
    } catch (imapErr) {
      console.error('[inbound][check-replies] IMAP error:', imapErr.message);
      if (imapClient) { try { await imapClient.logout(); } catch {} }
      return res.status(500).json({ error: `IMAP connection failed: ${imapErr.message}` });
    }
  }

  // 3. Process matched replies — ⚡ all in parallel (AI classify + send)
  await Promise.all(
    unreadMessages.map(async (msg) => {
      const { uid, fromEmail, replyText, emailSubject, markSeen } = msg;

      const leadIdx = leadsByEmail[fromEmail];
      if (leadIdx === undefined) {
        console.log(`[inbound][check-replies] msg uid ${uid} — sender ${fromEmail} not in campaign, skipping`);
        return;
      }

      const lead = updatedLeads[leadIdx];

      if (lead.replyReceivedAt) {
        console.log(`[inbound][check-replies] lead ${fromEmail} already has a reply recorded, skipping`);
        await markSeen();
        return;
      }

      console.log(`[inbound][check-replies] matched reply from ${fromEmail} (lead: ${lead.name})`);
      await markSeen();

      let intent = 'question';
      let replySubject = `Re: ${emailSubject || lead.emailSubject || 'Following up'}`;
      let replyBody = '';

      try {
        const aiResult = await classifyAndDraftReply({
          lead,
          replyText: replyText.trim().slice(0, 2000),
          originalSubject: lead.emailSubject,
          originalBody: lead.emailBody,
          settings,
        });
        intent = aiResult.intent || 'question';
        replySubject = aiResult.replySubject || replySubject;
        replyBody = aiResult.replyBody || '';

        if (settings.bookingLink) {
          replyBody = replyBody.replace(/\[(?:calendar[\s_-]*link|booking[\s_-]*link)\]/ig, settings.bookingLink);
        }
      } catch (aiErr) {
        console.error(`[inbound][check-replies] AI classify failed for ${fromEmail}:`, aiErr.message);
        replyBody = `Hi ${lead.name?.split(' ')[0] || lead.name},\n\nThanks for getting back to me! Let me know a good time to connect.\n\n${settings.agencyName || ''}`;
      }

      let autoReplySent = false;
      let autoReplyError = null;
      try {
        await sendEmail({
          to: lead.email,
          subject: replySubject,
          body: replyBody,
          fromName: settings.agencyName || '',
          userId: req.user.id,
        });
        autoReplySent = true;
        console.log(`[inbound][check-replies] auto-reply sent to ${fromEmail} (intent: ${intent})`);
      } catch (sendErr) {
        autoReplyError = sendErr.message;
        console.error(`[inbound][check-replies] auto-reply send failed for ${fromEmail}:`, sendErr.message);
      }

    updatedLeads[leadIdx] = {
      ...lead,
      replied: true,
      replyReceivedAt: new Date().toISOString(),
      replyText: replyText.trim().slice(0, 3000),
      replySubject: emailSubject,
      replyIntent: intent,
      autoReplySubject: replySubject,
      autoReplyBody: replyBody,
      autoReplySent,
      autoReplySentAt: autoReplySent ? new Date().toISOString() : null,
      autoReplyError: autoReplyError || null,
      meetingBooked: intent === 'positive' ? lead.meetingBooked : lead.meetingBooked,
    };

      newReplies.push({
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: fromEmail,
        intent,
        replyText: replyText.trim().slice(0, 500),
        autoReplySent,
      });
    })
  );

  if (imapClient) {
    try { await imapClient.logout(); console.log('[inbound][check-replies] IMAP disconnected'); } catch (e) {}
  }

  // Save updated leads to Supabase
  if (newReplies.length > 0 || calendarMatchesFound > 0) {
    const { error: updateErr } = await supabase
      .from('campaigns')
      .update({ payload: { ...payload, leads: updatedLeads } })
      .eq('id', campaignId);

    if (updateErr) {
      console.error('[inbound][check-replies] Supabase update error:', updateErr);
    }
  }

  return res.json({
    checked: true,
    newReplies: newReplies.length,
    replies: newReplies,
  });
});

/**
 * GET /inbound/campaigns
 * List all inbound campaigns for the current user with summary stats.
 */
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('campaigns')
      .select('id, title, created_at, status, payload')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const campaigns = (rows || [])
      .filter((r) => r.payload?.type === 'inbound')
      .map((r) => {
        const leads = r.payload?.leads || [];
        return {
          campaignId: r.id,
          title: r.title,
          createdAt: r.created_at,
          status: r.status,
          settings: r.payload?.settings || {},
          stats: {
            total: leads.length,
            sent: leads.filter((l) => l.emailSent).length,
            replied: leads.filter((l) => l.replied).length,
            booked: leads.filter((l) => l.meetingBooked).length,
          },
        };
      });

    return res.json({ campaigns });
  } catch (err) {
    console.error('[inbound][list-campaigns] error', err);
    return res.status(500).json({ error: err.message || 'Failed to list campaigns' });
  }
});

export default router;


