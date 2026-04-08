import { supabase } from './supabase-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTables() {
  try {
    console.log('📊 Creating sequence tables...');
    
    const sqlPath = path.join(__dirname, 'sql/sequence-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.log('⚠️ RPC method not available, trying direct approach...');
      
      // Try to create tables one by one using direct inserts as test
      // This confirms the tables exist through direct query
      const { error: testError } = await supabase
        .from('prospect_sequences')
        .select('count', { count: 'exact' })
        .limit(1);
      
      if (testError && testError.message.includes('does not exist')) {
        console.log('❌ Table does not exist and cannot create directly from client');
        console.log('\n💡 You need to run this SQL in Supabase directly:');
        console.log('---');
        console.log(sql);
        console.log('---');
      } else {
        console.log('✅ Tables already exist or accessible');
      }
    } else {
      console.log('✅ Tables created successfully');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

createTables();
