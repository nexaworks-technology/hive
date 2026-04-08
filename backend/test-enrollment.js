import { supabase } from './supabase-client.js';
import dotenv from 'dotenv';
dotenv.config();

async function testEnrollment() {
  try {
    console.log('Testing auto-enrollment...\n');
    
    // Check if prospect_sequences table has any records
    const { data: enrolled, error: enrollError } = await supabase
      .from('prospect_sequences')
      .select('*')
      .order('enrolled_at', { ascending: false })
      .limit(10);
    
    if (enrollError) {
      console.log('❌ Error querying enrollments:', enrollError.message);
      return;
    }
    
    console.log(`✅ Found ${enrolled.length} enrollments:`);
    console.log('\n' + JSON.stringify(enrolled, null, 2));
    
    if (enrolled.length > 0) {
      console.log('\n📊 Enrollment Summary:');
      enrolled.forEach((e, i) => {
        console.log(`  ${i+1}. Prospect: ${e.prospect_id}, Campaign: ${e.campaign_id}`);
        console.log(`     Status: ${e.status}, Next Touch: ${e.next_touch_date}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testEnrollment();
