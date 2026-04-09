import { google } from 'googleapis';

// Parse and return the Service Account credentials
function getServiceAccountCredentials() {
  try {
    const jsonString = process.env.HUMA_SERVICE_ACCOUNT_JSON;
    if (!jsonString) {
      throw new Error('HUMA_SERVICE_ACCOUNT_JSON not found in .env');
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse Service Account JSON:', error.message);
    throw error;
  }
}

// Create an authenticated Gmail client
async function getGmailClient() {
  try {
    const credentials = getServiceAccountCredentials();
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    });

    const authClient = await auth.getClient();
    
    return google.gmail({
      version: 'v1',
      auth: authClient
    });
  } catch (error) {
    console.error('Failed to create Gmail client:', error.message);
    throw error;
  }
}

// Send an email from Huma's account
async function sendHumaEmail({ to, subject, body, html = null }) {
  try {
    const gmail = await getGmailClient();
    
    const email = [
      `From: ${process.env.HUMA_EMAIL}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      html || body
    ].join('\n');

    const base64Email = Buffer.from(email).toString('base64');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64Email
      }
    });

    console.log(`Email sent from ${process.env.HUMA_EMAIL} to ${to}`);
    return result.data;
  } catch (error) {
    console.error('Failed to send Huma email:', error.message);
    throw error;
  }
}

// Get unread emails from Huma's mailbox matching specific criteria
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

      messages.push({
        id: msg.id,
        threadId: msgData.data.threadId,
        data: msgData.data
      });
    }

    return messages;
  } catch (error) {
    console.error('Failed to get unread emails from Huma:', error.message);
    throw error;
  }
}

// Get reply history for an email thread
async function getThreadReplies(threadId) {
  try {
    const gmail = await getGmailClient();

    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full'
    });

    return {
      threadId,
      messages: thread.data.messages || []
    };
  } catch (error) {
    console.error('Failed to get thread replies:', error.message);
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
  getServiceAccountCredentials,
  getGmailClient,
  sendHumaEmail,
  getUnreadEmails,
  getThreadReplies,
  markAsRead
};
