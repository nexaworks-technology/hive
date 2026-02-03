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

export default router;
