/**
 * Test the outbound lead qualification system
 * Run: node backend/test-outbound.js
 */

import leadQualifier from './utils/lead-qualifier.js';
import companyInsights from './utils/company-insights.js';

console.log('\n========== OUTBOUND LEAD QUALIFICATION TEST ==========\n');

// Test 1: Get ICP Summary
console.log('1. OUTBOUND ICP SUMMARY');
console.log('='.repeat(50));
const icpSummary = leadQualifier.getICPSummary();
console.log('Target Stages:', icpSummary.targetICP.companyStage);
console.log('Target Geographies:', icpSummary.targetICP.geography);
console.log('Excluded Geographies:', icpSummary.excludeCriteria.locations);
console.log('Target Industries:', icpSummary.targetIndustries.slice(0, 3), '...');
console.log('High Priority Roles:', icpSummary.targetRoles.highPriority);
console.log('Min Qualification Score:', icpSummary.minQualificationScore);

// Test 2: Score a High-Quality Lead
console.log('\n2. SCORE HIGH-QUALITY LEAD (Series B, USA, Hiring)');
console.log('='.repeat(50));
const highQualityLead = {
  companyName: 'TechScale Inc',
  stage: 'Series B',
  location: 'San Francisco, USA',
  industry: 'SaaS & B2B Technology',
  teamSize: '45',
  hiringActivity: ['Currently hiring', 'VP Engineering position open', 'expanding team'],
  role: 'VP Engineering'
};

const highQualityScore = leadQualifier.scoreLead(highQualityLead);
console.log(`Company: ${highQualityScore.prospectId}`);
console.log(`Score: ${highQualityScore.qualifyingScore}/100`);
console.log(`Recommendation: ${highQualityScore.recommendation}`);
console.log(`Qualified: ${highQualityScore.qualified}`);
console.log('\nDetailed Breakdown:');
Object.entries(highQualityScore.breakdown).forEach(([key, value]) => {
  console.log(`  ${key}: ${value.score}/25 (weighted: ${value.weighted.toFixed(1)})`);
});

// Test 3: Score a Low-Quality Lead
console.log('\n3. SCORE LOW-QUALITY LEAD (Excluded Geography)');
console.log('='.repeat(50));
const lowQualityLead = {
  companyName: 'IndianTech Corp',
  stage: 'Series A',
  location: 'Bangalore, India',
  industry: 'SaaS & B2B Technology',
  teamSize: '30',
  hiringActivity: ['Hiring developers'],
  role: 'VP Engineering',
  hiringStatus: 'Hiring freeze announced'
};

const lowQualityScore = leadQualifier.scoreLead(lowQualityLead);
console.log(`Company: ${lowQualityScore.prospectId}`);
console.log(`Score: ${lowQualityScore.qualifyingScore}/100`);
console.log(`Recommendation: ${lowQualityScore.recommendation}`);
console.log(`Qualified: ${lowQualityScore.qualified}`);
console.log(`Disqualification Reasons: ${lowQualityScore.reasons.join(', ')}`);

// Test 4: Score Multiple Leads
console.log('\n4. SCORE MULTIPLE LEADS (Batch Scoring)');
console.log('='.repeat(50));
const leadsList = [
  {
    companyName: 'FinFlow Startup',
    stage: 'Series A',
    location: 'London, UK',
    industry: 'Fintech & Neo-Banking',
    teamSize: '28',
    hiringActivity: ['scaling team', 'hiring backend engineers'],
    role: 'Founder & CEO'
  },
  {
    companyName: 'HealthHQ',
    stage: 'Series B',
    location: 'Dubai, UAE',
    industry: 'Healthtech & Healthcare IT',
    teamSize: '67',
    hiringActivity: ['Recent Series B funding', 'building out Dubai office'],
    role: 'Head of People'
  },
  {
    companyName: 'ManufactureCo',
    stage: 'Seed',
    location: 'Germany',
    industry: 'Manufacturing',
    teamSize: '12',
    hiringActivity: null,
    role: 'CEO'
  },
  {
    companyName: 'E-Commerce Store',
    stage: 'Bootstrap',
    location: 'India',
    industry: 'E-commerce & D2C',
    teamSize: '5',
    hiringActivity: ['looking to hire'],
    role: 'Founder'
  }
];

const scores = leadQualifier.scoreLeads(leadsList);
console.log(`\nTotal Leads Scored: ${scores.length}`);
console.log('\nScores (sorted by qualification):');
scores.forEach((score, idx) => {
  console.log(`${idx + 1}. ${score.prospectId}: ${score.qualifyingScore}/100 - ${score.recommendation}`);
});

// Test 5: Group by Recommendation
console.log('\n5. GROUP LEADS BY RECOMMENDATION');
console.log('='.repeat(50));
const grouped = leadQualifier.groupByRecommendation(scores);
console.log(`🟢 Highly Qualified: ${grouped.highlyQualified.length}`);
grouped.highlyQualified.forEach(l => console.log(`   - ${l.prospectId} (${l.qualifyingScore}/100)`));
console.log(`🟡 Qualified: ${grouped.qualified.length}`);
grouped.qualified.forEach(l => console.log(`   - ${l.prospectId} (${l.qualifyingScore}/100)`));
console.log(`🔴 Not Qualified: ${grouped.notQualified.length}`);
grouped.notQualified.forEach(l => console.log(`   - ${l.prospectId} (${l.qualifyingScore}/100)`));

// Test 6: Prepare Outreach for High-Quality Lead
console.log('\n6. PREPARE OUTREACH STRATEGY');
console.log('='.repeat(50));
const outreachLead = {
  companyName: 'TechScale Inc',
  stage: 'Series B',
  location: 'San Francisco, USA',
  industry: 'SaaS & B2B Technology',
  teamSize: '45',
  hiringActivity: ['Currently hiring', 'VP Engineering position open'],
  role: 'VP Engineering',
  prospectName: 'Sarah Chen',
  linkedinUrl: 'https://linkedin.com/in/sarahchen'
};

const leadScore = leadQualifier.scoreLead(outreachLead);
if (leadScore.qualified) {
  const emailDraft = companyInsights.generateEmailDraft({
    prospectName: outreachLead.prospectName,
    companyName: outreachLead.companyName,
    prospectType: 'ctoCTech',
    industry: outreachLead.industry,
    stage: outreachLead.stage
  });

  console.log(`Lead: ${outreachLead.prospectName} @ ${outreachLead.companyName}`);
  console.log(`Qualification Score: ${leadScore.qualifyingScore}/100 ✅`);
  console.log(`\nEmail To Send:`);
  console.log(`Subject: ${emailDraft.subject}`);
  console.log(`\n${emailDraft.body}`);
  console.log(`\nSequence:`);
  console.log('  Day 0: LinkedIn Connection Request');
  console.log('  Day 3: Follow-up Email');
  console.log('  Day 7: LinkedIn Direct Message (if connected)');
  console.log('  Day 14: Second Email');
}

// Test 7: Campaign Plan
console.log('\n7. CAMPAIGN PLANNING (30-day campaign)');
console.log('='.repeat(50));
const campaignLeads = [
  ...leadsList,
  {
    companyName: 'MarketingAI',
    stage: 'Series A',
    location: 'Austin, USA',
    industry: 'AI, Data Science & Engineering',
    teamSize: '22',
    hiringActivity: ['hiring data engineers', 'scaling ML team'],
    role: 'VP Engineering'
  },
  {
    companyName: 'D2C Beauty',
    stage: 'Series B',
    location: 'London, UK',
    industry: 'E-commerce & D2C',
    teamSize: '95',
    hiringActivity: ['post-Series B expansion'],
    role: 'Head of People'
  }
];

const campaignScores = leadQualifier.scoreLeads(campaignLeads);
const campaignGrouped = leadQualifier.groupByRecommendation(campaignScores);
const campaignQualified = leadQualifier.filterQualifiedLeads(campaignScores);

console.log(`Total Leads: ${campaignLeads.length}`);
console.log(`Highly Qualified: ${campaignGrouped.highlyQualified.length}`);
console.log(`Qualified: ${campaignGrouped.qualified.length}`);
console.log(`Not Qualified: ${campaignGrouped.notQualified.length}`);
console.log(`Total Qualified for Outreach: ${campaignQualified.length}`);
console.log(`Qualification Rate: ${Math.round((campaignQualified.length / campaignLeads.length) * 100)}%`);
console.log(`\nProjected 30-Day Results:`);
console.log(`  Connections (20% rate): ${Math.round(campaignQualified.length * 0.20)}`);
console.log(`  Responses (12% rate): ${Math.round(campaignQualified.length * 0.20 * 0.12)}`);
console.log(`  Closures (2.5% conversion): ${Math.round(campaignQualified.length * 0.20 * 0.12 * 0.025)}`);

console.log('\n' + '='.repeat(50));
console.log('✅ All outbound system tests completed!');
console.log('='.repeat(50) + '\n');
