const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'sql/prospect_replies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error executing migration:', error);
      
      // Try alternative: split by semicolon and execute statements individually
      console.log('\nTrying alternative approach (statement by statement)...');
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (stmtError) {
          console.error('Error:', stmtError);
        } else {
          console.log('✓ Statement executed');
        }
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  If Supabase doesn\'t have exec_sql function, apply the SQL manually via dashboard:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Click "SQL Editor"');
    console.log('3. Click "New query"');
    console.log('4. Paste contents of backend/sql/prospect_replies.sql');
    console.log('5. Click "Run"');
  }
}

applyMigration();
