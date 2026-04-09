-- STEP 1: Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  company TEXT,
  linkedin_profile TEXT,
  industry TEXT,
  personalization_source TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- STEP 2: Create indexes for prospects
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- STEP 3: Create prospect_replies table
CREATE TABLE IF NOT EXISTS prospect_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  reply_intent TEXT,
  sentiment TEXT,
  received_at TIMESTAMP NOT NULL,
  auto_reply_sent BOOLEAN DEFAULT false,
  auto_reply_subject TEXT,
  auto_reply_body TEXT,
  auto_reply_error TEXT,
  gmail_message_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

-- STEP 4: Create indexes for prospect_replies
CREATE INDEX IF NOT EXISTS idx_prospect_replies_prospect ON prospect_replies(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_campaign ON prospect_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_received ON prospect_replies(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_intent ON prospect_replies(reply_intent);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_gmail_id ON prospect_replies(gmail_message_id);

-- STEP 5: Create views (one at a time, can be run separately if needed)
CREATE OR REPLACE VIEW v_recent_replies AS
SELECT 
  pr.id,
  pr.prospect_id,
  pr.campaign_id,
  p.name,
  p.email,
  pr.reply_from,
  pr.subject,
  pr.detected_objection,
  pr.reply_date,
  pr.user_responded,
  pr.created_at
FROM prospect_replies pr
JOIN prospects p ON pr.prospect_id::uuid = p.id
ORDER BY pr.reply_date DESC;

-- STEP 6: Create reply summary view
CREATE OR REPLACE VIEW v_reply_summary_by_campaign AS
SELECT 
  campaign_id,
  COUNT(*) AS total_replies,
  COUNT(CASE WHEN detected_objection = 'positive' THEN 1 END) AS positive_replies,
  COUNT(CASE WHEN detected_objection = 'question' THEN 1 END) AS question_replies,
  COUNT(CASE WHEN detected_objection = 'objection' THEN 1 END) AS objection_replies,
  COUNT(CASE WHEN detected_objection = 'not-interested' THEN 1 END) AS not_interested_replies,
  COUNT(CASE WHEN user_responded = true THEN 1 END) AS responses_sent
FROM prospect_replies
GROUP BY campaign_id;

-- STEP 7: Create prospects with reply count view
CREATE OR REPLACE VIEW v_prospects_with_reply_count AS
SELECT 
  p.id,
  p.campaign_id,
  p.name,
  p.email,
  p.role,
  p.company,
  p.status,
  COUNT(pr.id) AS reply_count,
  MAX(pr.reply_date) AS last_reply_date,
  p.created_at
FROM prospects p
LEFT JOIN prospect_replies pr ON pr.prospect_id::uuid = p.id
GROUP BY p.id, p.campaign_id, p.name, p.email, p.role, p.company, p.status, p.created_at;
