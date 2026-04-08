import { enrollProspectInSequence } from './backend/utils/sequence-trigger.js';

async function testEnrollment() {
  const result = await enrollProspectInSequence({
    campaignId: 'test-camp-001',
    prospectEmail: 'test@example.com',
    prospectName: 'Test User',
    prospectCompany: 'Test Company',
    prospectTitle: 'Director',
    tierLevel: 'tier1',
    userId: 'test-user-bypass',
    enrichedData: { prospectAchievement: 'leading as Director at Test Company' }
  });
  
  console.log('Enrollment result:', JSON.stringify(result, null, 2));
}

testEnrollment().catch(err => console.error('Error:', err));
