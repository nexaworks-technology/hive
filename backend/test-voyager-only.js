import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

async function fetchVoyager(endpoint, liAtCookie) {
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  const url = `https://www.linkedin.com/voyager/api/${endpoint}`;
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  let curlCmd = `curl -s -D - -X GET '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0' ` +
    `-H 'Accept: application/vnd.linkedin.normalized+json+2.1'`;

  const { stdout } = await execPromise(curlCmd);
  
  if (stdout.includes('HTTP/2 401') || stdout.includes('HTTP/2 302')) {
    throw new Error('LinkedIn Voyager API returned 401/302 - Cookie expired');
  }

  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    console.log('No JSON in response. Headers:');
    console.log(stdout.substring(0, 300));
    throw new Error('No JSON in response');
  }
  
  const bodyStr = stdout.substring(jsonStart);
  return JSON.parse(bodyStr);
}

async function test() {
  const liAtCookie = process.env.LINKEDIN_COOKIE;
  console.log('🔍 Testing profile extraction...\n');
  
  try {
    const url = `identity/dash/profiles?q=memberIdentity&memberIdentity=jeetchandan&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85`;
    console.log('📡 Calling Voyager API...');
    const profileData = await fetchVoyager(url, liAtCookie);
    
    console.log('✅ API responded successfully');
    console.log('✅ Found', profileData.included?.length, 'elements');
    
    const elements = profileData.included || [];
    for (const el of elements) {
      if (el.$type === 'com.linkedin.voyager.dash.identity.profile.Profile') {
        console.log('\n✅ Found Profile:');
        console.log('  firstName:', el.firstName);
        console.log('  lastName:', el.lastName);
        
        const memberMatch = el.objectUrn?.match(/urn:li:member:(\d+)/);
        console.log('  memberId:', memberMatch ? memberMatch[1] : 'NOT FOUND');
        
        const profileMatch = el.entityUrn?.match(/urn:li:fsd_profile:(.+)/);
        console.log('  encodedProfileId:', profileMatch ? profileMatch[1].substring(0, 20) + '...' : 'NOT FOUND');
        
        return;
      }
    }
    console.log('❌ Profile element not found');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
