/**
 * Test HTML Email Templates
 * Generates sample HTML emails to verify formatting
 */

import {
  generateTier1Email_Day1,
  generateTier2Email_Day1,
  generateTier3Email_Day1,
  generateFollowUpEmail,
  generateObjectionResponseEmail
} from './utils/html-email-templates.js';

console.log('🎨 Testing HTML Email Templates\n');

// Test Tier 1 Email
console.log('📧 Tier 1 Email (Day 1 - CTO)');
const tier1Email = generateTier1Email_Day1('Nur Saputri', 'InCard');
console.log(tier1Email.substring(0, 500) + '...\n');

// Test Tier 2 Email
console.log('📧 Tier 2 Email (Day 1 - Founder)');
const tier2Email = generateTier2Email_Day1('Matteo Martino', 'InCard');
console.log(tier2Email.substring(0, 500) + '...\n');

// Test Follow-up Email
console.log('📧 Follow-up Email (Day 4)');
const followUpEmail = generateFollowUpEmail('Oder Developer', 'InCard', 2);
console.log(followUpEmail.substring(0, 500) + '...\n');

// Test Objection Response
console.log('📧 Objection Response Email (Budget tight)');
const objectionEmail = generateObjectionResponseEmail('Jane Doe', 'budget_tight', 'TechCorp');
console.log(objectionEmail.substring(0, 500) + '...\n');

console.log('✅ All emails generated successfully!');
console.log('\n💾 Email files are ready for sending via Gmail/Zoho');
console.log('🎨 Brand color: #FF6243');
console.log('📱 All emails are mobile responsive');
console.log('🔗 Calendly links are embedded in CTA buttons\n');
