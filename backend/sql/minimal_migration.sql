-- Minimal migration - run this as a single query
DROP TABLE IF EXISTS prospect_replies CASCADE;
DROP TABLE IF EXISTS prospects CASCADE;

-- Create prospects table
CREATE TABLE prospects (
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

-- Create prospect_replies table
CREATE TABLE prospect_replies (
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

-- Create all indexes at once
CREATE INDEX idx_prospects_email ON prospects(email);
CREATE INDEX idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospect_replies_prospect ON prospect_replies(prospect_id);
CREATE INDEX idx_prospect_replies_campaign ON prospect_replies(campaign_id);
CREATE INDEX idx_prospect_replies_received ON prospect_replies(received_at DESC);
CREATE INDEX idx_prospect_replies_intent ON prospect_replies(reply_intent);
CREATE INDEX idx_prospect_replies_gmail_id ON prospect_replies(gmail_message_id);

-- Don't create views yet until tables are verified
