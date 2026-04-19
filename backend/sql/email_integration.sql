-- Email Accounts Table: Store encrypted user email credentials
CREATE TABLE email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  imap_host VARCHAR(255) NOT NULL,
  imap_port INT NOT NULL DEFAULT 993,
  imap_encrypted_password TEXT NOT NULL, -- AES-256 encrypted
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_encrypted_password TEXT NOT NULL, -- AES-256 encrypted
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, email_address)
);

-- Email Threads Table: Store all sent/received emails
CREATE TABLE email_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  lead_id VARCHAR(255), -- Link to lead if known
  thread_id VARCHAR(255) UNIQUE, -- Gmail/Outlook thread ID
  subject VARCHAR(512) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  recipient_email VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  message_id VARCHAR(512) UNIQUE,
  in_reply_to VARCHAR(512),
  email_type VARCHAR(50), -- 'sent' or 'received'
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  received_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Email Sync Logs: Track polling history
CREATE TABLE email_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(50), -- 'imap_fetch', 'smtp_test', etc
  status VARCHAR(50), -- 'success', 'failed', 'partial'
  emails_fetched INT DEFAULT 0,
  errors_encountered INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX idx_email_accounts_active ON email_accounts(user_id, is_active);
CREATE INDEX idx_email_threads_campaign ON email_threads(campaign_id);
CREATE INDEX idx_email_threads_account ON email_threads(email_account_id);
CREATE INDEX idx_email_threads_received_at ON email_threads(received_at DESC);
CREATE INDEX idx_email_sync_logs_account ON email_sync_logs(email_account_id);

-- Enable RLS (Row Level Security)
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own email accounts"
  ON email_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create email accounts"
  ON email_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts"
  ON email_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts"
  ON email_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Email threads inherit campaign visibility
CREATE POLICY "Users can view threads from their campaigns"
  ON email_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_threads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create email threads"
  ON email_threads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      WHERE ea.id = email_account_id
      AND ea.user_id = auth.uid()
    )
  );
