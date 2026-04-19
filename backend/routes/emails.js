import express from 'express';
import { supabase } from '../supabase-client.js';
import requireAuth from '../middleware/require-auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /campaigns/:campaignId/emails
 * Get all email threads for a campaign
 */
router.get('/campaign/:campaignId/emails', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Fetch email threads
    const { data: emails, error } = await supabase
      .from('email_threads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('received_at', { ascending: false });

    if (error) {
      console.error('[campaign emails GET] error:', error);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }

    return res.json({ emails: emails || [] });
  } catch (err) {
    console.error('[campaign emails GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /campaigns/:campaignId/emails/thread/:threadId
 * Get full email thread
 */
router.get('/campaign/:campaignId/emails/thread/:threadId', async (req, res) => {
  try {
    const { campaignId, threadId } = req.params;

    // Fetch all emails in thread
    const { data: thread, error } = await supabase
      .from('email_threads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('[thread GET] error:', error);
      return res.status(500).json({ error: 'Failed to fetch thread' });
    }

    return res.json({ thread: thread || [] });
  } catch (err) {
    console.error('[thread GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /emails/:emailId/read
 * Mark email as read
 */
router.patch('/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;

    const { error } = await supabase
      .from('email_threads')
      .update({ is_read: true })
      .eq('id', emailId);

    if (error) {
      console.error('[email read] error:', error);
      return res.status(500).json({ error: 'Failed to update email' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[email read] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /emails/:emailId/archive
 * Archive email
 */
router.patch('/:emailId/archive', async (req, res) => {
  try {
    const { emailId } = req.params;

    const { error } = await supabase
      .from('email_threads')
      .update({ is_archived: true })
      .eq('id', emailId);

    if (error) {
      console.error('[email archive] error:', error);
      return res.status(500).json({ error: 'Failed to archive email' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[email archive] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
