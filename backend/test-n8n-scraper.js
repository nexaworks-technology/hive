import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function scrapeN8n() {
  const CAMPAIGN_ID = 'e67e38d7-3667-4ce8-80ec-1ecfbb0686fa';
  const DOMAIN = 'n8n.io';

  try {
    console.log(`\n🚀 Scraping ${DOMAIN}...\n`);
    
    const response = await fetch(
      `http://localhost:4000/campaigns-v2/${CAMPAIGN_ID}/scrape-company-by-titles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: DOMAIN })
      }
    );

    const data = await response.json();
    
    console.log('✅ SCRAPER RESULTS:\n');
    console.log(`📊 Total Contacts Found: ${data.totalFound}`);
    console.log(`✉️ Total Enrolled in Sequence: ${data.totalEnrolled}\n`);
    
    console.log('📋 TIER BREAKDOWN:\n');
    
    console.log(`Tier 1 (CTOs/VPs Engineering): ${data.results.tier1.count}`);
    data.results.tier1.contacts.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.name} - ${c.email}`);
      console.log(`     Position: ${c.position}`);
    });
    
    console.log(`\nTier 2 (Founders/CEOs): ${data.results.tier2.count}`);
    data.results.tier2.contacts.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.name} - ${c.email}`);
      console.log(`     Position: ${c.position}`);
    });
    
    console.log(`\nTier 3 (TA/Recruiting Leaders): ${data.results.tier3.count}`);
    if (data.results.tier3.contacts.length === 0) {
      console.log('  (No TA leaders found)');
    } else {
      data.results.tier3.contacts.forEach((c, i) => {
        console.log(`  ${i+1}. ${c.name} - ${c.email}`);
        console.log(`     Position: ${c.position}`);
      });
    }
    
    console.log(`\n🎯 ENROLLMENT STATUS: ${data.enrolledContacts.length} enrolled`);
    console.log('\n' + data.summary);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

scrapeN8n();
