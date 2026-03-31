import { sendConnectionRequest } from './utils/linkedin.js';
import dotenv from 'dotenv';

dotenv.config();

const liAtCookie = process.env.LINKEDIN_COOKIE;

if (!liAtCookie) {
  console.error('❌ Missing LINKEDIN_COOKIE env var');
  process.exit(1);
}

async function testE2E() {
  try {
    console.log('🚀 Testing Connection Request: pavanbabar → jeetchandan\n');
    
    // Test with Jeet Chandan profile
    const result = await sendConnectionRequest(
      'https://www.linkedin.com/in/jeetchandan/',
      'Hi Jeet! Would love to connect and explore opportunities together!',
      liAtCookie,
      {
        memberId: '493105629',
        encodedProfileId: 'ACoAAB1kMd0Bly3hVSWNA_QnxE245-yLio0o5nw',
        firstName: 'Jeet',
        lastName: 'Chandan'
      }
    );

    console.log('\n✅ SUCCESS! Connection request sent\n');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

testE2E();
