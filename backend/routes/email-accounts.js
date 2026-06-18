import express from 'express';
import { supabase } from '../supabase-client.js';
import requireAuth from '../middleware/require-auth.js';
import { encryptCredential, decryptCredential } from '../utils/encryption.js';
import { testIMAPConnection, testSMTPConnection, syncEmailsForAccount, sendEmailViaSMTP, fetchEmailsFromIMAP } from '../services/email-service.js';

const router = express.Router();

/**
 * POST /email-accounts/test-form
 * Test connection for form data (before saving)
 * PUBLIC - no auth required for testing
 */
router.post('/test-form', async (req, res) => {
  try {
    const {
      email_address,
      imap_host,
      imap_port = 993,
      imap_password,
      smtp_host,
      smtp_port = 587,
      smtp_password,
    } = req.body;

    // Validate inputs
    if (!email_address || !imap_host || !imap_password || !smtp_host || !smtp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = {
      imap: { success: false, error: null },
      smtp: { success: false, error: null },
    };

    // Test IMAP
    try {
      const testAccount = {
        email_address,
        imap_host,
        imap_port,
        imap_encrypted_password: encryptCredential(imap_password),
      };
      await testIMAPConnection(testAccount);
      results.imap.success = true;
      console.log('✅ IMAP test passed for', email_address);
    } catch (imapError) {
      results.imap.error = imapError.message;
      console.error('❌ IMAP test failed:', imapError.message);
    }

    // Test SMTP
    try {
      const testAccount = {
        email_address,
        smtp_host,
        smtp_port,
        smtp_encrypted_password: encryptCredential(smtp_password),
      };
      await testSMTPConnection(testAccount);
      results.smtp.success = true;
      console.log('✅ SMTP test passed for', email_address);
    } catch (smtpError) {
      results.smtp.error = smtpError.message;
      console.error('❌ SMTP test failed:', smtpError.message);
    }

    return res.json({ results });
  } catch (err) {
    console.error('[email-accounts test-form] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts/send-test
 * Send a test email (no auth required)
 * Used for quick testing with unverified accounts
 */
router.post('/send-test', async (req, res) => {
  try {
    const {
      email_address,
      smtp_host,
      smtp_port = 587,
      smtp_password,
      to,
      subject = 'Test Email from Hive',
      text = 'This is a test email sent from Hive email integration.',
    } = req.body;

    // Validate inputs
    if (!email_address || !smtp_host || !smtp_password || !to) {
      return res.status(400).json({ error: 'Missing required fields: email_address, smtp_host, smtp_password, to' });
    }

    try {
      const testAccount = {
        email_address,
        smtp_host,
        smtp_port,
        smtp_encrypted_password: encryptCredential(smtp_password),
      };

      const result = await sendEmailViaSMTP(testAccount, { to, subject, text });
      console.log('✅ Test email sent successfully:', result.messageId);

      return res.json({
        success: true,
        messageId: result.messageId,
        from: email_address,
        to,
        message: 'Test email sent successfully',
      });
    } catch (sendError) {
      console.error('❌ Failed to send test email:', sendError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        details: sendError.message,
      });
    }
  } catch (err) {
    console.error('[email-accounts send-test] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts/fetch-test
 * Fetch incoming emails (no auth required)
 * Used for quick testing with unverified accounts
 */
router.post('/fetch-test', async (req, res) => {
  try {
    const {
      email_address,
      imap_host,
      imap_port = 993,
      imap_password,
      unreadOnly = true,
    } = req.body;

    // Validate inputs
    if (!email_address || !imap_host || !imap_password) {
      return res.status(400).json({ error: 'Missing required fields: email_address, imap_host, imap_password' });
    }

    try {
      const testAccount = {
        email_address,
        imap_host,
        imap_port,
        imap_encrypted_password: encryptCredential(imap_password),
      };

      // Get both unread and read emails by modifying fetchEmailsFromIMAP to support options
      const emails = await fetchEmailsFromIMAP(testAccount, { unreadOnly });
      console.log(`✅ Fetched ${emails.length} emails from IMAP`);

      return res.json({
        success: true,
        count: emails.length,
        emails: emails,
        unreadOnly: unreadOnly,
        message: `Successfully fetched ${emails.length} email(s)`,
      });
    } catch (fetchError) {
      console.error('❌ Failed to fetch emails:', fetchError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch emails',
        details: fetchError.message,
      });
    }
  } catch (err) {
    console.error('[email-accounts fetch-test] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// All other routes require authentication
router.use(requireAuth);

/**
 * GET /email-accounts
 * List all email accounts for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('id, email_address, imap_host, smtp_host, is_active, last_sync, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[email-accounts GET] error:', error);
      return res.status(500).json({ error: 'Failed to fetch email accounts' });
    }

    return res.json({ emailAccounts: data || [] });
  } catch (err) {
    console.error('[email-accounts GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts
 * Add a new email account
 */
router.post('/', async (req, res) => {
  try {
    const {
      email_address,
      imap_host,
      imap_port = 993,
      imap_password,
      smtp_host,
      smtp_port = 587,
      smtp_password,
    } = req.body;

    // Validate inputs
    if (!email_address || !imap_host || !imap_password || !smtp_host || !smtp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Test connections before saving
    const testEmailAccount = {
      email_address,
      imap_host,
      imap_port,
      imap_encrypted_password: encryptCredential(imap_password),
      smtp_host,
      smtp_port,
      smtp_encrypted_password: encryptCredential(smtp_password),
    };

    try {
      await testIMAPConnection(testEmailAccount);
      console.log('✅ IMAP test passed');
    } catch (imapError) {
      return res.status(400).json({
        error: 'IMAP connection failed',
        details: imapError.message,
      });
    }

    try {
      await testSMTPConnection(testEmailAccount);
      console.log('✅ SMTP test passed');
    } catch (smtpError) {
      return res.status(400).json({
        error: 'SMTP connection failed',
        details: smtpError.message,
      });
    }

    // Encrypt passwords before storing
    const encryptedIMAPPassword = encryptCredential(imap_password);
    const encryptedSMTPPassword = encryptCredential(smtp_password);

    // Insert into database
    const { data, error: insertError } = await supabase
      .from('email_accounts')
      .insert({
        user_id: req.user.id,
        email_address,
        imap_host,
        imap_port,
        imap_encrypted_password: encryptedIMAPPassword,
        smtp_host,
        smtp_port,
        smtp_encrypted_password: encryptedSMTPPassword,
        is_active: true,
      })
      .select();

    if (insertError) {
      console.error('[email-accounts POST] insert error:', insertError);
      
      if (insertError.code === '23505') { // Unique constraint
        return res.status(400).json({ error: 'This email account is already connected' });
      }
      
      return res.status(500).json({ error: 'Failed to save email account' });
    }

    console.log('✅ Email account created:', data[0]?.id);

    return res.status(201).json({
      success: true,
      emailAccount: {
        id: data[0].id,
        email_address: data[0].email_address,
        imap_host: data[0].imap_host,
        smtp_host: data[0].smtp_host,
        created_at: data[0].created_at,
      },
    });
  } catch (err) {
    console.error('[email-accounts POST] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts/:id/test
 * Test connection for an email account
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emailAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    const results = { imap: null, smtp: null };

    // Test IMAP
    try {
      results.imap = await testIMAPConnection(emailAccount);
    } catch (imapError) {
      results.imap = { success: false, error: imapError.message };
    }

    // Test SMTP
    try {
      results.smtp = await testSMTPConnection(emailAccount);
    } catch (smtpError) {
      results.smtp = { success: false, error: smtpError.message };
    }

    return res.json({ results });
  } catch (err) {
    console.error('[email-accounts test] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts/:id/sync
 * Manually trigger sync for an email account
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: emailAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Trigger sync (can be async, no need to wait)
    syncEmailsForAccount(id, req.user.id).catch((err) => {
      console.error('Background sync error:', err);
    });

    return res.json({ message: 'Sync initiated', status: 'queued' });
  } catch (err) {
    console.error('[email-accounts sync] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /email-accounts/:id/send
 * Send an email from a connected email account
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { to, subject, text, html } = req.body;

    // Validate inputs
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing to, subject, or text' });
    }

    // Fetch email account
    const { data: emailAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Send email
    try {
      const result = await sendEmailViaSMTP(emailAccount, { to, subject, text, html });
      console.log('✅ Email sent successfully:', result.messageId);
      return res.json({
        success: true,
        messageId: result.messageId,
        from: emailAccount.email_address,
        to,
      });
    } catch (sendError) {
      console.error('❌ Failed to send email:', sendError.message);
      return res.status(500).json({
        error: 'Failed to send email',
        details: sendError.message,
      });
    }
  } catch (err) {
    console.error('[email-accounts send] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /email-accounts/:id/set-primary
 * Set an email account as the primary one for sending
 */
router.patch('/:id/set-primary', async (req, res) => {
  try {
    const { id } = req.params;

    // First, set all user's accounts to inactive
    const { error: updateAllError } = await supabase
      .from('email_accounts')
      .update({ is_active: false })
      .eq('user_id', req.user.id);

    if (updateAllError) {
      console.error('[email-accounts set-primary] error updating all:', updateAllError);
      return res.status(500).json({ error: 'Failed to update email accounts' });
    }

    // Then, set the specified account as active
    const { data, error: updateError } = await supabase
      .from('email_accounts')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (updateError || !data || data.length === 0) {
      console.error('[email-accounts set-primary] error updating account:', updateError);
      return res.status(404).json({ error: 'Email account not found' });
    }

    console.log('✅ Email account set as primary:', id);
    return res.json({ success: true, message: 'Email account set as primary', emailAccount: data[0] });
  } catch (err) {
    console.error('[email-accounts set-primary] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /email-accounts/:id
 * Remove an email account
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: deleteError } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      console.error('[email-accounts DELETE] error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete email account' });
    }

    return res.json({ success: true, message: 'Email account removed' });
  } catch (err) {
    console.error('[email-accounts DELETE] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
