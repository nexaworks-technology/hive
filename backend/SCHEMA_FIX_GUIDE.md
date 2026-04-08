# 🔨 Database Schema Fix - Enrollment Issue

## Issue
The proposed enrollments are failing because the database schema has foreign key constraints that don't match our implementation:

```
Error: insert or update on table "prospect_sequences" violates foreign key constraint "prospect_sequences_sequence_id_fkey"
```

## Root Cause
- The `prospect_sequences.sequence_id` column is typed as `UUID`
- It has a foreign key constraint referencing `sequences.id`
- The enrollment function tries to use string IDs like `'sutrahr-playbook-v1'` which violates the UUID type

## Solution
Run the following SQL queries in your **Supabase SQL Editor** (https://supabase.com/dashboard/project/_/sql):

### Step 1: Drop the Foreign Key Constraints
```sql
ALTER TABLE prospect_sequences DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;
ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;
```

### Step 2: Change sequence_id Column Type to TEXT
This allows using string IDs like 'sutrahr-playbook-v1':

```sql
ALTER TABLE prospect_sequences ALTER COLUMN sequence_id TYPE TEXT;
ALTER TABLE sequence_steps ALTER COLUMN sequence_id TYPE TEXT;
```

### Step 3 (Optional): Also Update sequences.id if You Want
If you want to use string-based IDs throughout:

```sql
ALTER TABLE sequences ALTER COLUMN id DROP DEFAULT;
ALTER TABLE sequences ALTER COLUMN id TYPE TEXT;
```

## Instructions
1. Go to your Supabase project dashboard
2. Click on the "SQL Editor" tab in the left sidebar
3. Copy-paste each SQL statement above into a new query
4. Click "Run" for each query
5. Return to Hive and test the scraper again - enrollment should now work!

## After the Fix
Once you've run the SQL, the scraper will be able to enroll contacts in the 7-touch sequence:
- Tier 1 contacts (CTOs/VPs) 🎯
- Tier 2 contacts (Founders/CEOs) 🎯
- Tier 3 contacts (TA Leaders) 🎯

Test with a domain like `incard.co` or `n8n.io` using the "Scrape Contacts by Title" button in the campaigns page.
