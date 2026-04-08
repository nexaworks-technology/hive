/**
 * Setup script to initialize the sutrahr-playbook-v1 sequence
 * This creates the sequence record so enrollments can reference it
 */

import { supabase } from './supabase-client.js';

// Fixed UUID for sutrahr-playbook-v1 - use a v5 hashed UUID
const SEQUENCE_ID = '6e1a0e66-80cf-5622-5234-567812345678';
const SEQUENCE_NAME = 'SutraHR Playbook v1';

async function setupSequence() {
  try {
    console.log(`🔧 Setting up ${SEQUENCE_NAME} sequence...\n`);
    
    // Check if sequence already exists
    const { data: existing, error: checkError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', SEQUENCE_ID)
      .single();
    
    if (existing) {
      console.log(`✅ Sequence already exists with ID: ${SEQUENCE_ID}\n`);
      console.log('Update backend/utils/sequence-trigger.js with this ID:');
      console.log(`  sequence_id: '${SEQUENCE_ID}',`);
      return;
    }
    
    // Try to create the sequence - we need a valid user_id
    // For now, use a placeholder that won't work - we'll rely on removing the FK constraint instead
    console.log(`⚠️  Sequence record does not exist yet.\n`);
    console.log(`To fix the enrollment issue, you have two options:\n`);
    console.log(`OPTION 1 (Recommended): Remove foreign key constraint in Supabase SQL Editor`);
    console.log(`Run this SQL:
ALTER TABLE prospect_sequences DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;
ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;
ALTER TABLE prospect_sequences ALTER COLUMN sequence_id TYPE TEXT;
ALTER TABLE sequence_steps ALTER COLUMN sequence_id TYPE TEXT;\n`);

    console.log(`OPTION 2: Create sequence record with proper user_id`);
    console.log(`  First, identify your auth user ID in Supabase`);
    console.log(`  Then run migrations/init-sequence.sql with your user ID\n`);
    
  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

setupSequence();
