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
  const headerEndIndex = stdout.indexOf('\r\n\r\n');
  const bodyStr = stdout.substring(headerEndIndex + 4);
  
  try {
    return JSON.parse(bodyStr);
  } catch(e) {
    return bodyStr;
  }
}

function extractVanityName(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/?#]+)/i);
  return match ? match[1] : null;
}

async function debugPayload() {
  const liAtCookie = process.env.LINKEDIN_COOKIE;
  const vanityName = extractVanityName('https://www.linkedin.com/in/jeetchandan/');
  
  console.log('🔍 Extracting profile data for:', vanityName, '\n');
  
  const url = `identity/dash/profiles?q=memberIdentity&memberIdentity=${vanityName}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85`;
  const profileData = await fetchVoyager(url, liAtCookie);
  
  console.log('📦 Looking for Profile element...\n');
  const elements = profileData?.included || [];
  
  for (const el of elements) {
    if (el.$type === 'com.linkedin.voyager.dash.identity.profile.Profile') {
      console.log('✅ Found Profile element:');
      console.log('  firstName:', el.firstName);
      console.log('  lastName:', el.lastName);
      console.log('  objectUrn:', el.objectUrn);
      console.log('  entityUrn:', el.entityUrn);
      console.log('  publicIdentifier:', el.publicIdentifier);
      
      let memberId = null;
      let encodedProfileId = null;
      
      if (el.objectUrn) {
        const memberMatch = el.objectUrn.match(/urn:li:member:(\d+)/);
        console.log('\n  Raw match from objectUrn:', memberMatch);
        if (memberMatch) {
          memberId = memberMatch[1];
          console.log('  memberId extracted:', memberId);
        }
      }
      
      if (el.entityUrn) {
        const profileMatch = el.entityUrn.match(/urn:li:fsd_profile:(.+)/);
        console.log('  Raw match from entityUrn:', profileMatch);
        if (profileMatch) {
          encodedProfileId = profileMatch[1];
          console.log('  encodedProfileId extracted:', encodedProfileId);
        }
      }
      
      console.log('\n📝 What we will send to RSC:');
      console.log(JSON.stringify({
        inviteeUrn: { memberId: memberId },
        nonIterableProfileId: encodedProfileId,
        firstName: el.firstName,
        lastName: el.lastName,
        profileCanonicalUrl: `https://www.linkedin.com/in/${vanityName}`
      }, null, 2));
      
      break;
    }
  }
}

debugPayload().catch(console.error);
