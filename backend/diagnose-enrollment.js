/**
 * Helper script to diagnose and resolve enrollment issues
 * The main issue is that the schema has foreign key constraints that don't match our usage
 */

import { supabase } from './supabase-client.js';

async function diagnoseIssue() {
  console.log(`\n🔍 Diagnosing database schema...\n`);
  
  try {
    // Check if Supabase allows bypassing FK constraints with service role
    console.log('✅ Using Supabase service role client (bypasses RLS but may still have schema constraints)\n');
    
    // Try to insert a test record
    console.log(`Testing enrollment insert...`);
    const testResult = await supabase
      .from('prospect_sequences')
      .insert({
        campaign_id: 'test-campaign',
        prospect_id: 'test-prospect',
        sequence_id: '6e1a0e66-80cf-5622-5234-567812345678',  // Fixed UUID
        user_id: '00000000-0000-0000-0000-000000000000',  // System user
        enrolled_at: new Date().toISOString(),
        next_touch_date: new Date().toISOString(),
        next_touch_index: 1,
        status: 'active'
      })
      .select()
      .single();
    
    if (testResult.error) {
      console.error(`❌ Error:`, testResult.error.message);
      
      if (testResult.error.message.includes('foreign key')) {
        console.log(`\n🚨 ISSUE: Foreign key constraint is blocking enrollment.\n`);
        console.log(`SOLUTION: Run this SQL in your Supabase SQL Editor:\n`);
        console.log(`
-- Step 1: Remove foreign key constraints
ALTER TABLE prospect_sequences DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;
ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;

-- Step 2: Change sequence_id column type from UUID to TEXT (so you can use string IDs)
ALTER TABLE prospect_sequences ALTER COLUMN sequence_id TYPE TEXT;
ALTER TABLE sequence_steps ALTER COLUMN sequence_id TYPE TEXT;

-- Step 3: (Optional) Also change sequences.id to TEXT if you want string-based sequence IDs
ALTER TABLE sequences ALTER COLUMN id DROP DEFAULT;
ALTER TABLE sequences ALTER COLUMN id TYPE TEXT;
        `);
      } else if (testResult.error.message.includes('auth.users')) {
        console.log(`\n🚨 ISSUE: The user_id doesn't exist or foreign key constraint is enforced.\n`);
        console.log(`SOLUTION: Either\n`);
        console.log(`  1. Remove the FK constraint on user_id, OR`);
        console.log(`  2. Provide a valid auth.users.id when enrolling\n`);
      }
      return;
    }
    
    // If we got here, the test record was inserted successfully
    console.log(`✅ Test insert successful! Enrollment should work now.\n`);
    
    // Clean up test record
    await supabase
      .from('prospect_sequences')
      .delete()
      .eq('campaign_id', 'test-campaign');
      
  } catch (err) {
    console.error(`Error during diagnosis:`, err.message);
  }
}

diagnoseIssue();
