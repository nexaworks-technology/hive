import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { supabase } from '../supabase-client.js';
import { decryptCredential } from '../utils/encryption.js';

/**
 * Fetch emails from IMAP server
 */
export const fetchEmailsFromIMAP = async (emailAccount) => {
  return new Promise((resolve, reject) => {
    const { imap_host, imap_port, email_address, imap_encrypted_password } = emailAccount;
    
    let decryptedPassword;
    try {
      decryptedPassword = decryptCredential(imap_encrypted_password);
    } catch (err) {
      console.error('Failed to decrypt IMAP password:', err);
      return reject(new Error('Failed to decrypt credentials'));
    }

    const imap = new Imap({
      user: email_address,
      password: decryptedPassword,
      host: imap_host,
      port: imap_port,
      tls: imap_port === 993,
    });

    const emails = [];

    imap.openBox('INBOX', false, async (err, box) => {
      if (err) {
        console.error('Failed to open INBOX:', err);
        imap.end();
        return reject(err);
      }

      // Fetch last 50 unread emails (or since last sync)
      const searchCriteria = ['UNSEEN'];
      imap.search(searchCriteria, (err, results) => {
        if (err || !results || results.length === 0) {
          imap.end();
          return resolve(emails);
        }

        const f = imap.fetch(results, { bodies: '' });
        
        f.on('message', (msg, seqno) => {
          simpleParser(msg, async (err, parsed) => {
            if (err) {
              console.error('Error parsing email:', err);
              return;
            }

            try {
              emails.push({
                messageId: parsed.messageId || `${Date.now()}-${seqno}`,
                inReplyTo: parsed.inReplyTo,
                subject: parsed.subject || '(no subject)',
                from: parsed.from?.text || 'unknown@unknown.com',
                fromName: parsed.from?.name,
                to: parsed.to?.text || email_address,
                text: parsed.text || '',
                html: parsed.html,
                date: parsed.date,
                threadId: parsed.headers?.get('x-thread-id') || parsed.messageId,
              });
            } catch (error) {
              console.error('Error processing parsed email:', error);
            }
          });
        });

        f.on('error', (err) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });

        f.on('end', () => {
          imap.end();
        });
      });
    });

    imap.on('error', (err) => {
      console.error('IMAP error:', err);
      reject(err);
    });

    imap.on('end', () => {
      resolve(emails);
    });

    imap.openBox('INBOX', false);
  });
};

/**
 * Send email via user's SMTP
 */
export const sendEmailViaSMTP = async (emailAccount, options) => {
  const { to, subject, text, html } = options;
  const { email_address, smtp_host, smtp_port, smtp_encrypted_password } = emailAccount;

  let decryptedPassword;
  try {
    decryptedPassword = decryptCredential(smtp_encrypted_password);
  } catch (err) {
    console.error('Failed to decrypt SMTP password:', err);
    throw new Error('Failed to decrypt credentials');
  }

  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    secure: smtp_port === 465,
    auth: {
      user: email_address,
      pass: decryptedPassword,
    },
  });

  const mailOptions = {
    from: email_address,
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ SMTP send error:', error);
    throw error;
  }
};

/**
 * Test IMAP connection
 */
export const testIMAPConnection = async (emailAccount) => {
  return new Promise((resolve, reject) => {
    const { imap_host, imap_port, email_address, imap_encrypted_password } = emailAccount;

    let decryptedPassword;
    try {
      decryptedPassword = decryptCredential(imap_encrypted_password);
    } catch (err) {
      return reject(new Error('Failed to decrypt credentials'));
    }

    const imap = new Imap({
      user: email_address,
      password: decryptedPassword,
      host: imap_host,
      port: imap_port,
      tls: imap_port === 993,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 15000,
    });

    let resolved = false;

    imap.openBox('INBOX', false, (err, box) => {
      if (resolved) return;
      resolved = true;

      if (err) {
        console.error('❌ IMAP test failed:', err.message);
        imap.end();
        return reject(new Error(`IMAP connection failed: ${err.message}`));
      }

      console.log('✅ IMAP connection successful');
      imap.end();
      resolve({ success: true, message: 'IMAP connection successful' });
    });

    imap.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        console.error('❌ IMAP error:', err.message);
        reject(new Error(`IMAP connection failed: ${err.message}`));
      }
    });

    // Add timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('❌ IMAP connection timeout');
        imap.end();
        reject(new Error('IMAP connection timeout'));
      }
    }, 20000);
  });
};

/**
 * Test SMTP connection
 */
export const testSMTPConnection = async (emailAccount) => {
  const { email_address, smtp_host, smtp_port, smtp_encrypted_password } = emailAccount;

  let decryptedPassword;
  try {
    decryptedPassword = decryptCredential(smtp_encrypted_password);
  } catch (err) {
    throw new Error('Failed to decrypt credentials');
  }

  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    secure: smtp_port === 465,
    auth: {
      user: email_address,
      pass: decryptedPassword,
    },
  });

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    throw new Error(`SMTP test failed: ${error.message}`);
  }
};

/**
 * Sync emails for a user account (call this periodically)
 */
export const syncEmailsForAccount = async (emailAccountId, userId) => {
  try {
    // Fetch email account
    const { data: emailAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !emailAccount) {
      throw new Error('Email account not found');
    }

    // Fetch emails from IMAP
    console.log(`📧 Syncing emails for ${emailAccount.email_address}...`);
    const emails = await fetchEmailsFromIMAP(emailAccount);
    console.log(`✅ Fetched ${emails.length} emails`);

    // Store in database
    let storedCount = 0;
    for (const email of emails) {
      const { error: insertError } = await supabase
        .from('email_threads')
        .upsert(
          {
            email_account_id: emailAccountId,
            thread_id: email.threadId,
            subject: email.subject,
            sender_email: email.from,
            sender_name: email.fromName,
            recipient_email: email.to,
            body: email.text,
            html_body: email.html,
            message_id: email.messageId,
            in_reply_to: email.inReplyTo,
            email_type: 'received',
            received_at: email.date,
          },
          { onConflict: 'message_id' }
        );

      if (!insertError) storedCount++;
    }

    // Update last sync timestamp
    await supabase
      .from('email_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', emailAccountId);

    // Log sync result
    await supabase.from('email_sync_logs').insert({
      email_account_id: emailAccountId,
      sync_type: 'imap_fetch',
      status: 'success',
      emails_fetched: storedCount,
    });

    console.log(`✅ Sync complete: ${storedCount} emails stored`);
    return { success: true, emailsFetched: storedCount };
  } catch (error) {
    console.error('❌ Sync error:', error);
    
    // Log failure
    await supabase.from('email_sync_logs').insert({
      email_account_id: emailAccountId,
      sync_type: 'imap_fetch',
      status: 'failed',
      error_message: error.message,
    }).catch(e => console.error('Failed to log error:', e));

    throw error;
  }
};
