import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const positivePattern = /\bpositive\b/i;

const buildSlotsReply = (recipientName: string) => {
  const firstName = recipientName.split(' ')[0] || 'there';
  const subject = 'Great to hear it — pick a time';
  const body = `Hi ${firstName},\n\nGreat to hear that you’re interested. Let’s lock a quick sync (15-20 mins):\n- Tomorrow, 10:00 AM\n- Tomorrow, 2:00 PM\n- Day after tomorrow, 11:00 AM\n\nReply with the slot that works best (or share your preferred time) and I’ll send a Meet link right away.`;
  return { subject, body };
};

const sendEmail = async (to: string, subject: string, body: string) => {
  const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const user = process.env.ZOHO_SMTP_USER || process.env.ZOHO_USER || process.env.SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_APP_PASSWORD || process.env.SMTP_PASS;
  const fromEmail = process.env.ZOHO_FROM || user;

  if (!user || !pass || !fromEmail) {
    throw new Error('Missing SMTP credentials (ZOHO_SMTP_USER/ZOHO_SMTP_PASS/ZOHO_FROM)');
  }

  const useTls = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: useTls,
    auth: { user, pass },
    tls: useTls ? undefined : { rejectUnauthorized: true },
  });

  const mailOptions = {
    from: fromEmail,
    to,
    subject,
    text: body,
  };

  await transporter.sendMail(mailOptions);
};

const parseBody = async (req: Request) => {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return req.json();
  }

  const raw = await req.text();
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return Object.fromEntries(new URLSearchParams(raw));
    } catch {
      return {};
    }
  }
};

const firstNonEmpty = (payload: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const val = payload[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return '';
};

const extractEmail = (value: string) => {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : '';
};

export async function POST(req: Request) {
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  const url = new URL(req.url);
  const providedSecret =
    req.headers.get('x-zoho-signature') ||
    req.headers.get('x-zoho-webhook-secret') ||
    req.headers.get('x-webhook-secret') ||
    url.searchParams.get('secret') ||
    url.searchParams.get('token');

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!providedSecret || providedSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await parseBody(req);
  const rawFrom = firstNonEmpty(payload, [
    'fromAddress',
    'from',
    'email',
    'mail',
    'sender',
  ]);
  const from = extractEmail(rawFrom) || rawFrom;
  const subject = String(payload.subject || '').trim();
  const textBody = firstNonEmpty(payload, [
    'text',
    'body',
    'message',
    'plain',
    'plainBody',
    'textBody',
    'TextBody',
    'html',
    'htmlBody',
    'HtmlBody',
    'content',
    'mailContent',
    'content_text',
    'summary',
  ]) || String(payload).trim();
  const displayName = firstNonEmpty(payload, ['name', 'fromName', 'sender']) || from;

  if (!from || !textBody) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Missing from or body', payload });
  }

  if (!positivePattern.test(textBody)) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'No positive keyword' });
  }

  try {
    const reply = buildSlotsReply(displayName || from);
    await sendEmail(from, reply.subject, reply.body);
    return NextResponse.json({ ok: true, action: 'sent-slots', to: from, subject: reply.subject });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reply';
    return NextResponse.json({ error: 'Failed to send reply', details: message, payload }, { status: 500 });
  }
}
