import { supabase } from './supabase-client.js';

async function quick() {
  const {data} = await supabase.from('prospect_sequences').select('*').limit(1);
  console.log(data?.length || 0, 'records');
  process.exit(0);
}
quick().catch(e => {console.error(e); process.exit(1);});
