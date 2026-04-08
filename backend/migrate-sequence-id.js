/**
 * Migration: Change sequence_id from UUID to TEXT to support string identifiers
 * This fixes the foreign key constraint issue with 'sutrahr-playbook-v1'
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sqlCommands = [
  // Drop the foreign key constraint on prospect_sequences.sequence_id
  `ALTER TABLE prospect_sequences DROP CONSTRAINT IF EXISTS prospect_sequences_sequence_id_fkey;`,
  
  // Change the column type from UUID to TEXT
  `ALTER TABLE prospect_sequences ALTER COLUMN sequence_id TYPE TEXT;`,
  
  // Also update sequence_steps if it has the same constraint
  `ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;`,
  `ALTER TABLE sequence_steps ALTER COLUMN sequence_id TYPE TEXT;`,
  
  // Change sequences.id from UUID to TEXT as well
  `ALTER TABLE sequences ALTER COLUMN id DROP DEFAULT;`,
  `ALTER TABLE sequences ALTER COLUMN id TYPE TEXT;`
];

async function runMigrations() {
  console.log('🔧 Running database migrations...\n');
  
  for (const sql of sqlCommands) {
    try {
      console.log(`Executing: ${sql.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        console.error(`❌ Error:`, error.message);
      } else {
        console.log(`✅ Success\n`);
      }
    } catch (err) {
      console.error(`❌ Error:`, err.message);
      console.log(`   Note: Some migrations may fail if RPC is not available.\n`);
    }
  }
  
  console.log('\n📝 NOTE: If migrations failed, please manually run these SQL commands in your Supabase SQL editor:\n');
  sqlCommands.forEach(sql => console.log(sql));
  console.log('\nAfter running the migrations, try the scraper again!');
}

runMigrations().catch(console.error);
