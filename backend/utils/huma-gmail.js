import { google } from 'googleapis';
import { getTokensForUser, setCredentials } from '../routes/google-calendar.js';
import { supabase } from '../supabase-client.js';

// Get OAuth tokens for Huma from database
async function getHumaOAuthTokens() {
  try {
    // Get Huma's user ID from email
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', process.env.HUMA_EMAIL)
      .single();

    if (error || !users) {
      throw new Error(`Huma user not found in database. Make sure huma.m@sutrahr.com has logged in first.`);
    }

    const humaUserId = users.id;

    // Get stored Google tokens
    const tokens = await getTokensForUser(humaUserId);
    if (!tokens) {
      throw new Error('Huma has not connected her Google account yet. Please log in as huma.m@sutrahr.com in the app.');
    }

    return { tokens, userId: humaUserId };
  } catch (error) {
    console.error('Failed to get Huma OAuth tokens:', error.message);
    throw error;
  }
}

// Create Gmail client using Huma's OAuth tokens
async function getGmailClient() {
  try {
    const { tokens, userId } = await getHumaOAuthTokens();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  } catch (error) {
    console.error('Failed to create Gmail client:', error.message);
    throw error;
  }
}

// Send an email from Huma's account using Gmail API
async function sendHumaEmail({ to, subject, body, html = null }) {
  try {
    const gmail = await getGmailClient();

    const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;
    
    const textBody = body;
    const htmlBody = html || body.split('\n').map(line => `<p>${line}</p>`).join('');

    const mimeMessage = [
      `To: ${to}`,
      `From: ${process.env.HUMA_EMAIL}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      textBody,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
      `--${boundary}--`
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`✅ Email sent from ${process.env.HUMA_EMAIL} to ${to}`);
    return result.data;
  } catch (error) {
    console.error('Failed to send Huma email:', error.message);
    throw error;
  }
}

// Get unread emails from Huma's mailbox
async function getUnreadEmails(query = 'is:unread') {
  try {
    const gmail = await getGmailClient();

    const listResult = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });

    if (!listResult.data.messages) {
      return [];
    }

    const messages = [];
    for (const msg of listResult.data.messages) {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const headers = msgData.data.payload.headers || [];
      const fromHeader = headers.find(h => h.name === 'From');
      const subjectHeader = headers.find(h => h.name === 'Subject');
      const dateHeader = headers.find(h => h.name === 'Date');

      // Extract body
      let bodyText = '';
      const parts = msgData.data.payload.parts || [];
      const textPart = parts.find(p => p.mimeType === 'text/plain');
      const htmlPart = parts.find(p => p.mimeType === 'text/html');

      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, 'base64').toString();
      } else if (htmlPart?.body?.data) {
        bodyText = Buffer.from(htmlPart.body.data, 'base64').toString().replace(/<[^>]*>/g, '');
      } else if (msgData.data.payload.body?.data) {
        bodyText = Buffer.from(msgData.data.payload.body.data, 'base64').toString();
      }

      messages.push({
        id: msg.id,
        threadId: msgData.data.threadId,
        from: fromHeader?.value || '',
        subject: subjectHeader?.value || '',
        body: bodyText,
        date: dateHeader?.value
      });
    }

    return messages;
  } catch (error) {
    console.error('Failed to get unread emails from Huma:', error.message);
    throw error;
  }
}

// Mark a message as read
async function markAsRead(messageId) {
  try {
    const gmail = await getGmailClient();

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to mark message as read:', error.message);
    throw error;
  }
}


export {
  getHumaOAuthTokens,
  getGmailClient,
  sendHumaEmail,
  getUnreadEmails,
  markAsRead
};
