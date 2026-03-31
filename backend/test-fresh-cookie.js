import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const liAtCookie = 'AQEDAWRu_E0ACi2tAAABnSoHFp4AAAGdThOank0AjNp5bNoRyHcIchrvIhl2dh-HBsoz75JN1EBeK_MyaBLa1U3EA5LUbgOhCsre_dbOLf2J2O0V3ArfmeMfy08n_onkqFjUJB4awtZiuNY-pxglQuO8';

async function test(name, endpoint, payload) {
  process.stdout.write(`${name}... `);

  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  const bodyJson = JSON.stringify(payload);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");

  const curlCmd = `curl -s -i -X POST 'https://www.linkedin.com/voyager/api/${endpoint}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' ` +
    `-H 'Accept: application/vnd.linkedin.normalized+json+2.1' ` +
    `-H 'Content-Type: application/json' ` +
    `-d '${escapedBody}'`;

  try {
    const { stdout } = await execPromise(curlCmd);
    
    const firstLine = stdout.split('\n')[0];
    const statusMatch = firstLine.match(/(\d{3})/);
    const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

    const headerEndIdx = stdout.indexOf('\r\n\r\n');
    const body = headerEndIdx !== -1 ? stdout.substring(headerEndIdx + 4) : '';
    
    let parsed = null;
    try { parsed = JSON.parse(body); } catch (e) {}

    if (status === '200' || status === '201' || status === '204') {
      console.log(`✅ ${status}`);
      return { status, success: true, response: parsed };
    } else if (status === '401') {
      console.log(`❌ 401 (Bad Cookie)`);
      return { status, success: false, response: parsed };
    } else if (status === '422') {
      console.log(`⚠️  422 (Bad Payload)`);
      return { status, success: false, response: parsed };
    } else {
      console.log(`${status}`);
      return { status, success: false, response: parsed };
    }

  } catch (err) {
    console.log(`ERROR`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('🚀 Testing LinkedIn Connection Requests (Fresh Cookie)\n');
  console.log('Target: Pavan Babar (urn:li:member:1321956620)\n');

  // First verify cookie works
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;
  const checkCmd = `curl -s -i 'https://www.linkedin.com/voyager/api/me' -H 'Cookie: ${cookieString}' -H 'csrf-token: ${csrfToken}'`;
  const { stdout: checkStdout } = await execPromise(checkCmd);
  const checkStatus = checkStdout.split('\n')[0];
  
  if (checkStatus.includes('401') || checkStatus.includes('302')) {
    console.log('❌ Cookie is INVALID or EXPIRED');
    console.log('Response:', checkStatus);
    process.exit(1);
  }
  console.log('✅ Cookie is VALID\n');
  console.log('═══════════════════════════════════════════\n');

  const memberUrn = 'urn:li:member:1321956620';

  const tests = [
    {
      name: '[1] Standard approach',
      endpoint: 'growth/normInvitations',
      payload: {
        trackingId: Buffer.from(Date.now().toString()).toString('base64').substring(0, 16),
        message: 'Hi Pavan! Great to connect.',
        invitations: [],
        excludeInvitations: [],
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            'profileId': memberUrn
          }
        }
      }
    },

    {
      name: '[2] Minimal payload',
      endpoint: 'growth/normInvitations',
      payload: {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            'profileId': memberUrn
          }
        },
        message: 'Hi Pavan! Great to connect.'
      }
    },

    {
      name: '[3] With invitations array',
      endpoint: 'growth/normInvitations',
      payload: {
        invitations: [{
          invitee: {
            'com.linkedin.voyager.growth.invitation.InviteeProfile': {
              'profileId': memberUrn
            }
          },
          message: 'Hi Pavan! Great to connect.'
        }]
      }
    },

    {
      name: '[4] Using memberPayload type',
      endpoint: 'growth/normInvitations',
      payload: {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeMember': {
            'entityUrn': memberUrn
          }
        },
        message: 'Hi Pavan! Great to connect.'
      }
    },

    {
      name: '[5] Bare ID (just number)',
      endpoint: 'growth/normInvitations',
      payload: {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            'profileId': '1321956620'
          }
        },
        message: 'Hi Pavan! Great to connect.'
      }
    },

    {
      name: '[6] Try identity endpoint',
      endpoint: 'identity/profiles/connections',
      payload: {
        profileId: memberUrn,
        message: 'Hi Pavan! Great to connect.'
      }
    },

    {
      name: '[7] Try relationships endpoint',
      endpoint: 'relationships/connectionRequests',
      payload: {
        invitee: memberUrn,
        message: 'Hi Pavan! Great to connect.'
      }
    },

    {
      name: '[8] Direct action format',
      endpoint: 'identity/dash/profileActions',
      payload: {
        targetEntityUrn: memberUrn,
        action: 'SEND_CONNECTION_REQUEST',
        message: 'Hi Pavan! Great to connect.'
      }
    }
  ];

  let successCount = 0;
  for (const t of tests) {
    const result = await test(t.name, t.endpoint, t.payload);
    if (result.success) {
      successCount++;
      console.log(`   Response: ${JSON.stringify(result.response).substring(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`\n✨ Results: ${successCount}/${tests.length} passed\n`);

  if (successCount > 0) {
    console.log('🎉 Found working payload(s)! Check above for ✅');
  } else {
    console.log('⚠️  No 200/201 responses yet.');
    console.log('\nNext: I need to capture what the real LinkedIn webapp sends.');
    console.log('Can you share a browser DevTools Network tab capture when you send a connection request?');
  }
}

main();
