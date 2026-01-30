import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface SendRequest {
  to: string;
  subject: string;
  body: string;
  leadId?: string;
  fromName?: string;
}

export async function POST(req: Request) {
  try {
    const { to, subject, body, fromName }: SendRequest = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 });
    }

    const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
    const port = Number(process.env.ZOHO_SMTP_PORT || 465);
    const user = process.env.ZOHO_SMTP_USER || process.env.ZOHO_USER || process.env.SMTP_USER;
    const pass = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_APP_PASSWORD || process.env.SMTP_PASS;
    const fromEmail = process.env.ZOHO_FROM || user;

    if (!user || !pass || !fromEmail) {
      return NextResponse.json(
        { error: 'Missing SMTP credentials (ZOHO_SMTP_USER/ZOHO_SMTP_PASS/ZOHO_FROM)' },
        { status: 500 }
      );
    }

    const useTls = port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: useTls,
      auth: {
        user,
        pass,
      },
      tls: useTls ? undefined : { rejectUnauthorized: true },
    });

    const mailOptions = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to,
      subject,
      text: body,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ ok: true, messageId: info.messageId, accepted: info.accepted });
  } catch (error) {
    console.error('Email send failed', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: 'Failed to send email', details: message }, { status: 500 });
  }
}
