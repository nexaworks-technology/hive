import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

async function fetchVoyager(endpoint, liAtCookie) {
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  const url = `https://www.linkedin.com/voyager/api/${endpoint}`;
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  let curlCmd = `curl -s -X GET '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0' ` +
    `-H 'Accept: application/vnd.linkedin.normalized+json+2.1' ` +
    `-H 'Content-Type: application/json'`;

  const { stdout } = await execPromise(curlCmd);
  
  // Find where JSON starts (after headers)
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    console.log('No JSON found in response');
    return null;
  }
  
  const bodyStr = stdout.substring(jsonStart);
  
  try {
    return JSON.parse(bodyStr);
  } catch(e) {
    console.log('Parse error:', e.message);
    console.log('Response preview:', stdout.substring(0, 500));
    return null;
  }
}

async function debug() {
  const liAtCookie = process.env.LINKEDIN_COOKIE;
  const vanityName = 'jeetchandan';
  
  const url = `identity/dash/profiles?q=memberIdentity&memberIdentity=${vanityName}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85`;
  const profileData = await fetchVoyager(url, liAtCookie);
  
  if (!profileData) {
    console.log('No response data');
    return;
  }
  
  console.log('Response keys:', Object.keys(profileData));
  console.log('Has included?', !!profileData.included);
  console.log('Included length:', profileData.included ? profileData.included.length : 0);
  
  if (profileData.included && profileData.included.length > 0) {
    console.log('\nFirst 5 elements $types:');
    for (let i = 0; i < Math.min(5, profileData.included.length); i++) {
      const el = profileData.included[i];
      console.log(`  [${i}]:`, el.$type);
      if (el.firstName || el.lastName) {
        console.log(`      firstName: ${el.firstName}, lastName: ${el.lastName}`);
      }
      if (el.objectUrn) {
        console.log(`      objectUrn: ${el.objectUrn}`);
      }
    }
  }
}

debug().catch(console.error);
