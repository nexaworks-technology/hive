-- Prospect Replies Database Schema
-- Stores campaign prospects and their email replies for permanent persistence

-- Table 1: prospects
-- Stores individual prospects that were targeted in campaigns
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
  status TEXT DEFAULT 'pending',  -- pending, contacted, replied, closed
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- Table 2: prospect_replies
-- Stores all incoming email replies from prospects with classification and auto-reply details
CREATE TABLE IF NOT EXISTS prospect_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  reply_intent TEXT,  -- positive, question, objection, not-interested, out-of-office, negative
  sentiment TEXT,     -- positive, neutral, negative
  received_at TIMESTAMP NOT NULL,
  auto_reply_sent BOOLEAN DEFAULT false,
  auto_reply_subject TEXT,
  auto_reply_body TEXT,
  auto_reply_error TEXT,
  gmail_message_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_prospect_replies_prospect ON prospect_replies(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_campaign ON prospect_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_received ON prospect_replies(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_intent ON prospect_replies(reply_intent);
CREATE INDEX IF NOT EXISTS idx_prospect_replies_gmail_id ON prospect_replies(gmail_message_id);

-- View: Recent replies per campaign
CREATE OR REPLACE VIEW v_recent_replies AS
SELECT 
  pr.id,
  pr.prospect_id,
  pr.campaign_id,
  p.name,
  p.email,
  pr.from_email,
  pr.subject,
  pr.reply_intent,
  pr.received_at,
  pr.auto_reply_sent,
  pr.created_at
FROM prospect_replies pr
JOIN prospects p ON pr.prospect_id = p.id
ORDER BY pr.received_at DESC;

-- View: Reply summary by campaign
CREATE OR REPLACE VIEW v_reply_summary_by_campaign AS
SELECT 
  campaign_id,
  COUNT(*) AS total_replies,
  COUNT(CASE WHEN reply_intent = 'positive' THEN 1 END) AS positive_replies,
  COUNT(CASE WHEN reply_intent = 'question' THEN 1 END) AS question_replies,
  COUNT(CASE WHEN reply_intent = 'objection' THEN 1 END) AS objection_replies,
  COUNT(CASE WHEN reply_intent = 'not-interested' THEN 1 END) AS not_interested_replies,
  COUNT(CASE WHEN reply_intent = 'out-of-office' THEN 1 END) AS out_of_office_replies,
  COUNT(CASE WHEN auto_reply_sent = true THEN 1 END) AS auto_replies_sent
FROM prospect_replies
GROUP BY campaign_id;

-- View: Prospects by status with reply count
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
  MAX(pr.received_at) AS last_reply_date,
  p.created_at
FROM prospects p
LEFT JOIN prospect_replies pr ON p.id = pr.prospect_id
GROUP BY p.id, p.campaign_id, p.name, p.email, p.role, p.company, p.status, p.created_at;
