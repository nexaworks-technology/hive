import { supabase } from './supabase-client.js';

async function fixSequenceIdSchema() {
  try {
    console.log('🔧 Fixing sequence schema to allow string sequence IDs...\n');

    // Drop foreign key constraints
    const { error: dropFK1 } = await supabase.rpc('DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey', {});
    // Note: RPC might not work for DDL, so we'll try a different approach

    // Instead, let's just verify that enrollments work by checking if we can insert without the FK
    console.log('⚠️  Note: Foreign key constraints may still exist.');
    console.log('    If enrollments fail, you may need to manually run the SQL migration in Supabase console.\n');
    console.log('    SQL to run:');
    console.log('    ALTER TABLE prospect_sequences DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;');
    console.log('    ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;');
    console.log('\n✅ Schema fix instructions ready. Please run the SQL queries above in your Supabase console.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixSequenceIdSchema();
