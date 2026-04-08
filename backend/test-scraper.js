import { supabase } from './supabase-client.js';
import dotenv from 'dotenv';
dotenv.config();

async function testScraper() {
  try {
    console.log('🚀 Getting test user...');
    
    // Get first user from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️ No existing users. Using direct Supabase insert with placeholder user_id...');
      
      // Create campaign with placeholder UUID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          title: 'InCard Lead Scraping Test',
          stage: 'outbound-sequences',
          status: 'draft',
          user_id: testUserId,
          payload: {
            type: 'email',
            targetCompany: 'InCard',
            targetCompanyWebsite: 'https://www.incard.co'
          }
        })
        .select()
        .single();

      if (campaignError) {
        console.error('❌ Campaign creation failed:', campaignError.message);
        return;
      }

      console.log('✅ Campaign created:', campaign.id);
      logCampaignDetails(campaign);
    } else {
      const userId = users[0].id;
      console.log('✅ Found user:', userId);
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          title: 'InCard Lead Scraping Test',
          stage: 'outbound-sequences',
          status: 'draft',
          user_id: userId,
          payload: {
            type: 'email',
            targetCompany: 'InCard',
            targetCompanyWebsite: 'https://www.incard.co'
          }
        })
        .select()
        .single();

      if (campaignError) {
        console.error('❌ Campaign creation failed:', campaignError.message);
        return;
      }

      console.log('✅ Campaign created:', campaign.id);
      logCampaignDetails(campaign);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

function logCampaignDetails(campaign) {
  console.log('\n📋 Campaign Details:');
  console.log('  ID:', campaign.id);
  console.log('  Title:', campaign.title);
  console.log('  Status:', campaign.status);
  
  console.log('\n✨ Ready to scrape! Use this campaign ID:');
  console.log('\nCURL command:');
  console.log(`curl -X POST http://localhost:4000/campaigns-v2/${campaign.id}/scrape-company-by-titles \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Authorization: Bearer YOUR_TOKEN" \\`);
  console.log(`  -d '{"domain":"incard.co"}'`);
}

testScraper();
