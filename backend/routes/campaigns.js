import express from 'express';
import { supabase } from '../supabase-client.js';

const router = express.Router();

// Create a campaign when the flow starts ("Generate Campaign").
router.post('/', async (req, res) => {
  const { title, stage = 'stage-1', payload = {}, status = 'running', summary = null, error = null } = req.body || {};

  const safeTitle = (title && String(title).trim()) || 'Untitled campaign';

  const { data, error: dbError } = await supabase
    .from('campaigns')
    .insert({ title: safeTitle, stage, status, payload, summary, error })
    .select()
    .single();

  if (dbError) {
    console.error('[campaigns POST] insert error', dbError);
    return res.status(500).json({ error: 'Failed to create campaign', details: dbError.message });
  }

  return res.status(201).json(data);
});

// List campaigns for sidebar/history (most recent first).
router.get('/', async (_req, res) => {
  const { data, error: dbError } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (dbError) {
    console.error('[campaigns GET] list error', dbError);
    return res.status(500).json({ error: 'Failed to list campaigns', details: dbError.message });
  }

  return res.json({ campaigns: data || [] });
});

// Get a single campaign (includes payload like leads/sentEmails/stats if stored).
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error: dbError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (dbError) {
    console.error('[campaigns GET /:id] fetch error', dbError);
    return res.status(404).json({ error: 'Campaign not found', details: dbError.message });
  }

  return res.json(data);
});

// Update campaign (used when emails are sent / follow-up stage captures leads + stats).
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { stage, status, payload, summary, error: errorMessage } = req.body || {};

  const { data: existingCampaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('payload')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('[campaigns PATCH] fetch error', fetchError);
    return res.status(404).json({ error: 'Campaign not found', details: fetchError.message });
  }

  const mergedPayload = {
    ...(existingCampaign?.payload || {}),
    ...(payload || {}),
  };

  const updateBody = {
    ...(stage ? { stage } : {}),
    ...(status ? { status } : {}),
    ...(summary ? { summary } : {}),
    ...(typeof errorMessage !== 'undefined' ? { error: errorMessage } : {}),
    payload: mergedPayload,
  };

  const { data, error: updateError } = await supabase
    .from('campaigns')
    .update(updateBody)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[campaigns PATCH] update error', updateError);
    return res.status(500).json({ error: 'Failed to update campaign', details: updateError.message });
  }

  return res.json(data);
});

export default router;
