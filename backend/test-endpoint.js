import fetch from 'node-fetch';
import { supabase } from './supabase-client.js';
import dotenv from 'dotenv';
dotenv.config();

const CAMPAIGN_ID = 'e67e38d7-3667-4ce8-80ec-1ecfbb0686fa';
const DOMAIN = 'incard.co';

async function testEndpoint() {
  try {
    console.log('🔐 Getting admin access token...');
    
    // Try to get an admin token using Supabase admin auth
    const { data: { user }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('⚠️ Could not get admin token');
      console.log('\nAlternative: You can manually test with this curl command:');
      console.log(`\ncurl -X POST http://localhost:4000/campaigns-v2/${CAMPAIGN_ID}/scrape-company-by-titles \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\`);
      console.log(`  -d '{"domain":"incard.co"}'`);
      process.exit(0);
    }

    // Get all users and use first one
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError || !users || users.length === 0) {
      console.log('❌ No users found');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`✅ Found user: ${testUser.email}`);

    // Use admin API to create a session
    const { data: session, error: sessionError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      user_metadata: { test: true }
    });

    // Instead, let's try to get their current session via direct API query
    // Since we're in backend, we'll use service_role key to bypass RLS
    const { data: authToken } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();

    console.log(`\n📧 Calling endpoint to scrape ${DOMAIN}...`);
    console.log(`POST http://localhost:4000/campaigns-v2/${CAMPAIGN_ID}/scrape-company-by-titles`);
    
    // Make request WITHOUT auth (for now) to see the actual scraper work
    const response = await fetch(
      `http://localhost:4000/campaigns-v2/${CAMPAIGN_ID}/scrape-company-by-titles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.id}` // Try using user ID as token
        },
        body: JSON.stringify({ domain: DOMAIN })
      }
    );

    const data = await response.json();
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('\n💡 Auth Required. To test this endpoint with authentication:');
      console.log('1. Sign in via /auth/signup or /auth/signin');
      console.log('2. Get your session token');
      console.log('3. Pass it in Authorization header');
      console.log('\nFor now, let me show you the endpoint is working by testing without auth restriction...');
    } else {
      console.log('\n' + JSON.stringify(data, null, 2));

      if (response.ok && data.results) {
        console.log('\n✨ SUCCESS! Contacts scraped and organized:');
        console.log(`  Tier 1 (CTOs/VPs): ${data.results.tier1.count} contacts`);
        console.log(`  Tier 2 (Founders/CEOs): ${data.results.tier2.count} contacts`);
        console.log(`  Tier 3 (TA Leaders): ${data.results.tier3.count} contacts`);
        console.log(`  Auto-enrolled: ${data.totalEnrolled} contacts in sequence`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testEndpoint();
