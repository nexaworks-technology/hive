/**
 * Test the new company insights API
 * Run: node backend/test-company-insights.js
 */

import companyInsights from './utils/company-insights.js';

console.log('\n========== SUTRAHR COMPANY INSIGHTS TEST ==========\n');

// Test 1: ICP Summary
console.log('1. ICP SUMMARY');
console.log('='.repeat(50));
const icp = companyInsights.generateICPSummary('sutraHR');
console.log(JSON.stringify(icp, null, 2));

// Test 2: Email Hooks
console.log('\n2. EMAIL HOOKS FOR A PROSPECT');
console.log('='.repeat(50));
const hooks = companyInsights.getEmailHooks({
  company: 'Acme SaaS',
  role: 'VP Engineering',
  industry: 'SaaS & B2B Technology',
  stage: 'Series B',
  size: 'Mid-market',
  technologies: ['Node.js', 'React', 'Data Science']
});
console.log(hooks.map((h, i) => `${i + 1}. ${h}`).join('\n'));

// Test 3: Email Angle - Founder
console.log('\n3. EMAIL ANGLE - FOUNDER');
console.log('='.repeat(50));
const founderAngle = companyInsights.generateEmailAngle('founder', {
  currentTeam: '25',
  targetCount: '50'
});
console.log(`Subject: ${founderAngle.subject}`);
console.log(`Angle: ${founderAngle.angle}`);
console.log(`CTA: ${founderAngle.cta}`);

// Test 4: Email Angle - CTO
console.log('\n4. EMAIL ANGLE - CTO');
console.log('='.repeat(50));
const ctoAngle = companyInsights.generateEmailAngle('ctoCTech', {
  hiringFor: 'Backend Developers',
  targetCount: '8',
  industries: ['SaaS', 'Fintech']
});
console.log(`Subject: ${ctoAngle.subject}`);
console.log(`Angle: ${ctoAngle.angle}`);
console.log(`CTA: ${ctoAngle.cta}`);

// Test 5: Full Email Draft
console.log('\n5. FULL EMAIL DRAFT');
console.log('='.repeat(50));
const emailDraft = companyInsights.generateEmailDraft({
  prospectName: 'Sarah',
  companyName: 'TechScale Inc',
  role: 'Hiring Manager',
  hiringNeeds: 'Backend engineers',
  prospectType: 'founder',
  recentClient: 'Leena.ai',
  industry: 'Fintech',
  stage: 'Series B',
  team: '35',
  growthRate: '80% YoY'
});
console.log(`Subject: ${emailDraft.subject}`);
console.log(`\nBody:\n${emailDraft.body}`);

// Test 6: Proof Points
console.log('\n6. PROOF POINTS');
console.log('='.repeat(50));
const proofPoints = companyInsights.getProofPoints();
console.log(`Clients Served: ${proofPoints.clients}`);
console.log(`Positions Closed: ${proofPoints.positions}`);
console.log(`Guaranteed Closure Time: ${proofPoints.closureTime}`);
console.log(`Experience: ${proofPoints.experience}`);
console.log(`Recent Clients: ${proofPoints.recentClients.join(', ')}`);

// Test 7: Prospect Fit Analysis
console.log('\n7. PROSPECT FIT ANALYSIS');
console.log('='.repeat(50));
const fitAnalysis = companyInsights.analyzeProspectFit({
  company: 'WebFlow Labs',
  industry: 'SaaS & B2B Technology',
  stage: 'Series B',
  location: 'US (San Francisco)',
  teamSize: 'Mid-market',
  hiringPlan: 'Looking to scale team 2-3x in next 12 months'
});
console.log(`Fit Score: ${fitAnalysis.fitScore}/100`);
console.log(`Recommendation: ${fitAnalysis.recommendation}`);
console.log('Reasons:');
fitAnalysis.reasons.forEach(r => console.log(`  ${r}`));

// Test 8: Campaign Context
console.log('\n8. CAMPAIGN CONTEXT GENERATION');
console.log('='.repeat(50));
const campaignContext = {
  targetRole: 'CTO / VP Engineering',
  targetIndustry: 'SaaS & B2B Technology',
  targetGeography: 'US / EU',
  campaignType: 'outreach'
};
console.log(`Campaign Type: ${campaignContext.campaignType}`);
console.log(`Target Role: ${campaignContext.targetRole}`);
console.log(`Target Industry: ${campaignContext.targetIndustry}`);
console.log(`Message Themes:`);
console.log('  - Speed of hiring (21-day guarantee)');
console.log('  - Cost efficiency (no per-hire fees)');
console.log('  - Dedicated resource model');
console.log('  - India talent pool access');

console.log('\n' + '='.repeat(50));
console.log('✅ All tests completed successfully!');
console.log('='.repeat(50) + '\n');
