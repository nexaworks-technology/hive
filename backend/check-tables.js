import { supabase } from './supabase-client.js';

async function checkTables() {
  try {
    console.log('Checking prospect_sequences table...');
    
    const { data, error } = await supabase
      .from('prospect_sequences')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
      
      if (error.message.includes('does not exist')) {
        console.log('\n🔧 Need to create the table. This SQL needs to be run in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS prospect_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  sequence_id TEXT NOT NULL DEFAULT 'sutrahr-playbook-v1',
  user_id UUID,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  next_touch_date TIMESTAMP,
  next_touch_index INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, paused, completed
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
        `);
      }
    } else {
      console.log('✅ Table exists! Current records:', data.length);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkTables();
