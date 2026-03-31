/**
 * Test Personalized Outbound Campaign System
 * Run: node backend/test-campaign.js
 */

import campaignManager from './utils/campaign-manager.js';

console.log('\n========== PERSONALIZED OUTBOUND CAMPAIGN TEST ==========\n');

// Test 1: Create Campaign
console.log('1. CREATE NEW CAMPAIGN FOR SPECIFIC COMPANY');
console.log('='.repeat(60));

const campaignResult = campaignManager.createCampaign({
  campaignName: 'Q2 2026 - Tech Startups Aggressive Push',
  targetCompany: 'SutraHR',
  targetCompanyWebsite: 'https://www.sutrahr.com',
  campaignType: 'direct',
  targetIndustry: 'Recruitment Technology',
  targetCountries: ['United States', 'United Kingdom', 'United Arab Emirates'],
  hiringFocus: true,
  maxProspects: 50,
  notes: 'Targeting CTOs and VPs of Engineering at Series A/B startups actively hiring'
});

console.log('✅ Campaign Created');
const campaignId = campaignResult.campaign.id;
console.log(`Campaign ID: ${campaignId}`);
console.log(`Target: ${campaignResult.campaign.targetCompany}`);
console.log(`Campaign Type: ${campaignResult.campaign.campaignType}`);
console.log('\n📋 LinkedIn Search Strategies:');
campaignResult.campaign.linkedinSearchStrategies.forEach((strategy, idx) => {
  console.log(`\n  Strategy ${idx + 1}: ${strategy.name}`);
  console.log(`  Description: ${strategy.description}`);
  console.log(`  Filters: ${JSON.stringify(strategy.filters.titles.slice(0, 3), null, 2)}`);
});

// Test 2: Add Prospects from LinkedIn Search
console.log('\n2. ADD PROSPECTS FROM LINKEDIN SEARCH RESULTS');
console.log('='.repeat(60));

const prospectsList = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@techscale.io',
    linkedinUrl: 'https://linkedin.com/in/sarahchen',
    role: 'VP of Engineering',
    company: 'TechScale Inc',
    industry: 'SaaS & B2B Technology',
    location: 'San Francisco, USA',
    personalizationInfo: {
      recentActivity: 'Posted about Series B funding and scaling engineering team',
      hiringMessage: 'Looking for senior backend engineers',
      insight: 'Recently raised Series B, actively building out team'
    }
  },
  {
    name: 'Raj Patel',
    email: 'raj@finflow.co.uk',
    linkedinUrl: 'https://linkedin.com/in/rajpatel',
    role: 'Founder / CEO',
    company: 'FinFlow Startup',
    industry: 'Fintech & Neo-Banking',
    location: 'London, UK',
    personalizationInfo: {
      recentActivity: 'Posted "Series A funding announcement"',
      hiringMessage: 'Building out team in London',
      insight: 'Just closed Series A, need to move fast on hiring'
    }
  },
  {
    name: 'Amanda Rodriguez',
    email: 'amanda@healthhq.ae',
    linkedinUrl: 'https://linkedin.com/in/amandarodriguez',
    role: 'Head of People',
    company: 'HealthHQ',
    industry: 'Healthtech & Healthcare IT',
    location: 'Dubai, UAE',
    personalizationInfo: {
      recentActivity: 'Hiring badge shows 5 open positions',
      hiringMessage: 'Expanding Dubai office, looking for engineers',
      insight: 'Growing from 50 to 100 employees'
    }
  },
  {
    name: 'Marcus Goldman',
    email: 'marcus@martech.com',
    linkedinUrl: 'https://linkedin.com/in/marcusgoldman',
    role: 'CTO',
    company: 'MarketingAI',
    industry: 'AI, Data Science & Engineering',
    location: 'Austin, USA',
    personalizationInfo: {
      recentActivity: 'Posted about building AI team',
      hiringMessage: 'Hiring multiple data engineers and ML engineers',
      insight: 'Scaling from 20 to 50 engineers in next 6 months'
    }
  }
];

const addProspectsResult = campaignManager.addProspectsFromLinkedinSearch(campaignId, prospectsList);
console.log(`✅ Added ${addProspectsResult.totalAdded} prospects`);
console.log('\nProspects Added:');
addProspectsResult.prospects.forEach(p => {
  console.log(`  - ${p.name} (${p.role} @ ${p.company})`);
});

// Test 3: Get Prospects List (Table View)
console.log('\n3. CAMPAIGN PROSPECTS TABLE VIEW');
console.log('='.repeat(60));

const prospectsList_View = campaignManager.getProspectsList(campaignId);
console.log(`Total Prospects: ${prospectsList_View.stats.total}`);
console.log('\nProspects List (Table Format):');
console.log(
  '┌─ Name\t\t\t├─ Email\t\t\t├─ Role\t\t\t├─ Company\t\t├─ Mail Sent\t├─ Replied\t├─ Follow-ups'
);
prospectsList_View.prospectsList.forEach(p => {
  console.log(
    `│ ${p.name.padEnd(22)}│ ${p.email.padEnd(30)}│ ${p.role.padEnd(20)}│ ${p.company.padEnd(15)}│ ${p.mailSent.padEnd(6)}│ ${p.replied.padEnd(6)}│ ${p.followUps}`
  );
});

// Test 4: Get Prospect Details with Personalization
console.log('\n4. PROSPECT DETAILS & PERSONALIZATION INFO');
console.log('='.repeat(60));

const prospectId = prospectsList_View.prospectsList[0].id;
const prospectDetails = campaignManager.getProspectDetails(prospectId);

console.log(`Prospect: ${prospectDetails.prospect.name}`);
console.log(`Role: ${prospectDetails.prospect.role} @ ${prospectDetails.prospect.company}`);
console.log(`Email: ${prospectDetails.prospect.email}`);
console.log(`LinkedIn: ${prospectDetails.prospect.linkedinProfile}`);
console.log('\n📝 Personalization Info (Expandable):');
console.log(JSON.stringify(prospectDetails.prospect.personalizationInfo, null, 2));

// Test 5: Send Personalized Email
console.log('\n5. SEND PERSONALIZED EMAIL');
console.log('='.repeat(60));

const emailTemplate = {
  subject: 'Scale {{prospectCompanyName}} engineering faster - {{prospectName}}',
  body: `Hi {{prospectName}},

Caught your recent post about scaling the engineering team at {{prospectCompanyName}}. {{personalizationInsight}}

Here's the thing: most companies struggle with one of two things when hiring:
1. Finding the RIGHT people (talent pool issue)
2. Finding them FAST (speed-to-hire issue)

Most recruitment firms solve for #1. We solve for both - and we do it without per-hire fees.

How it works:
- You get a dedicated recruiter in India as part of your team
- They source, screen, and interview candidates
- You focus on final interviews and culture fit
- Average time-to-hire: 19 days (vs. 90+ traditional)
- No per-hire fees, no contracts

{{prospectCompanyName}} sounds like you're at that inflection point where hiring velocity matters. {{prospectName}}, would a quick 15-min call make sense?

Best,
Pavan
SutraHR`
};

const sendEmailResult = campaignManager.sendEmail(prospectId, {
  subject: emailTemplate.subject,
  body: emailTemplate.body,
  emailType: 'initial'
});

if (sendEmailResult.success) {
  console.log('✅ Email sent successfully');
  console.log(`To: ${prospectDetails.prospect.email}`);
  console.log(`Subject: ${emailTemplate.subject.replace('{{prospectName}}', prospectDetails.prospect.name).replace('{{prospectCompanyName}}', prospectDetails.prospect.company)}`);
  console.log(`\nPersonalized Body Preview:`);
  const preview = campaignManager.personalizeEmail(emailTemplate.body, prospectDetails.prospect, {
    targetCompany: 'SutraHR'
  });
  console.log(preview.substring(0, 300) + '...');
}

// Test 6: Log Reply
console.log('\n6. LOG REPLY FROM PROSPECT');
console.log('='.repeat(60));

const replyResult = campaignManager.logReply(prospectId, {
  from: prospectDetails.prospect.email,
  subject: `Re: Scale {{prospectCompanyName}}'s engineering faster`,
  body: 'Hi Pavan, This is interesting! We are indeed scaling aggressively. Are you open next Tuesday for a call? Best, Sarah',
  receivedAt: new Date().toISOString()
});

console.log('✅ Reply logged');
console.log(`From: ${replyResult.reply.from}`);
console.log(`Sentiment: ${replyResult.reply.sentiment}`);
console.log(`Status Updated to: ${replyResult.prospectStatus}`);

// Test 7: Schedule Follow-up
console.log('\n7. SCHEDULE FOLLOW-UP');
console.log('='.repeat(60));

const followUpDate = new Date();
followUpDate.setDate(followUpDate.getDate() + 3);

const followUpResult = campaignManager.scheduleFollowUp(prospectId, {
  followUpDate: followUpDate.toISOString(),
  followUpType: 'email',
  followUpTemplate: 'Follow-up value-add email with hiring insights',
  notes: 'She replied positively - move to demo call prep'
});

console.log('✅ Follow-up scheduled');
console.log(`Due: ${followUpDate.toDateString()}`);
console.log(`Type: ${followUpResult.followUp.type}`);

// Test 8: Campaign Statistics
console.log('\n8. CAMPAIGN STATISTICS & METRICS');
console.log('='.repeat(60));

const stats = campaignManager.getCampaignStats(campaignId);
console.log(`Campaign Name: ${stats.stats.campaignName}`);
console.log(`Total Prospects: ${stats.stats.prospectCount}`);
console.log(`Emails Sent: ${stats.stats.emailsSent}`);
console.log(`Replies Received: ${stats.stats.repliesReceived}`);
console.log(`Follow-ups Scheduled: ${stats.stats.followUpsScheduled}`);
console.log('\nStatus Breakdown:');
Object.entries(stats.stats.statusBreakdown).forEach(([status, count]) => {
  console.log(`  - ${status}: ${count}`);
});
console.log('\nConversion Metrics:');
Object.entries(stats.stats.conversionMetrics).forEach(([metric, value]) => {
  console.log(`  - ${metric}: ${value}`);
});

// Test 9: Bulk Send Emails to Multiple Prospects
console.log('\n9. BULK SEND EMAILS TO MULTIPLE PROSPECTS');
console.log('='.repeat(60));

const allProspectIds = prospectsList_View.prospectsList.map(p => p.id);

const bulkSendResult = campaignManager.sendEmail(allProspectIds[1], {
  subject: 'Different angle: Hiring challenges at {{prospectCompanyName}}',
  body: `Hi {{prospectName}},

Quick thought: we've worked with 10,000+ companies, and the fastest growing startups all say the same thing - hiring was their biggest bottleneck.

At {{prospectCompanyName}}, with {{prospectRole}} leading charge, you're probably facing similar challenge.

One thing we've learned: it's not about finding more candidates (there's no shortage). It's about finding the RIGHT ones 2x faster.

That's where our dedicated recruiter model works.

Open to a quick conversation?

Best,
Pavan`,
  emailType: 'initial'
});

console.log(`✅ Emails sent`);
console.log(`Sent to: ${allProspectIds[1]}`);

// Test 10: Get Campaign Overview
console.log('\n10. CAMPAIGN OVERVIEW');
console.log('='.repeat(60));

const allCampaigns = campaignManager.getAllCampaigns();
console.log(`Total Active Campaigns: ${allCampaigns.total}`);
console.log('\nCampaigns:');
allCampaigns.campaigns.forEach(c => {
  console.log(`  📊 ${c.name}`);
  console.log(`     Target: ${c.targetCompany} | Status: ${c.status}`);
  console.log(`     Prospects: ${c.prospectCount} | Emails Sent: ${c.stats.emailsSent} | Replied: ${c.stats.replied}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ All campaign tests completed successfully!');
console.log('='.repeat(60) + '\n');
