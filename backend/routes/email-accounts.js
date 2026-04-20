import express from 'express';
import { supabase } from '../supabase-client.js';
import requireAuth from '../middleware/require-auth.js';
import { encryptCredential, decryptCredential } from '../utils/encryption.js';
import { testIMAPConnection, testSMTPConnection, syncEmailsForAccount } from '../services/email-service.js';

const router = express.Router();

// All routes require authentication
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
 * POST /email-accounts/test-form
 * Test connection for form data (before saving)
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
