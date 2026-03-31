import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const liAtCookie = 'AQEDAWRu_E0FZmG9AAABnSjKVIUAAAGdTNbYhU0AjE4OxXIRTxpQUKe0vauLK1QO7-yjGsX2oZ6HQX3_e-h8gOZ9LTMWubddE2-x8sRA7E3--5hC08l8rFh1JjdjvTot8OHJcFWWy7ttJVROO-3FIBl0';
const memberUrn = 'urn:li:member:1321956620'; // Pavan Babar

async function testPayload(name, endpoint, payload) {
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
    
    // Extract HTTP status from first line
    const firstLine = stdout.split('\n')[0];
    const statusMatch = firstLine.match(/(\d{3})/);
    const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

    // Extract body
    const headerEndIdx = stdout.indexOf('\r\n\r\n');
    const body = headerEndIdx !== -1 ? stdout.substring(headerEndIdx + 4) : '';
    
    let parsed = null;
    try { parsed = JSON.parse(body); } catch (e) {}

    console.log(`${status}`);
    
    // Look for success indicators
    if (status === '200' || status === '201' || status === '204') {
      return { status, success: true, body: parsed };
    } else if (parsed?.data?.invitationId || parsed?.id) {
      return { status, success: true, body: parsed, method: 'has_id' };
    } else if (parsed?.data?.status === 200 || parsed?.data?.status === 201) {
      return { status, success: true, body: parsed, method: 'data_status_ok' };
    } else {
      return { status, success: false, body: parsed };
    }

  } catch (err) {
    console.log(`ERROR`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('🧪 Testing LinkedIn Connection Request Payloads\n');
  console.log('Target: Pavan Babar (urn:li:member:1321956620)\n');

  // Different payload approaches
  const payloads = [
    // APPROACH 1: Simple invitation
    {
      name: 'Approach 1: Simple POST',
      endpoint: 'growth/normInvitations',
      payload: {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            profileId: memberUrn
          }
        }
      }
    },

    // APPROACH 2: With all fields
    {
      name: 'Approach 2: Full payload',
      endpoint: 'growth/normInvitations',
      payload: {
        trackingId: 'test123',
        message: 'Hi Pavan!',
        invitations: [{
          invitee: {
            'com.linkedin.voyager.growth.invitation.InviteeProfile': {
              profileId: memberUrn
            }
          }
        }],
        excludeInvitations: []
      }
    },

    // APPROACH 3: Try graphQL-like endpoint
    {
      name: 'Approach 3: GraphQL mutations',
      endpoint: 'graphql',
      payload: {
        operationName: 'SendInvitation',
        query: `mutation SendInvitation($input: InvitationInput!) {
          sendInvitation(input: $input) {
            success
          }
        }`,
        variables: {
          input: {
            invitee: memberUrn,
            message: 'Hi Pavan!'
          }
        }
      }
    },

    // APPROACH 4: Try REST-like with direct profile ID
    {
      name: 'Approach 4: Direct profile action',
      endpoint: 'identity/profiles/actions',
      payload: {
        targetProfileId: memberUrn.replace('urn:li:member:', ''),
        actionType: 'SEND_CONNECTION_REQUEST',
        message: 'Hi Pavan!'
      }
    },

    // APPROACH 5: Try with fsd_profile format
    {
      name: 'Approach 5: fsd_profile format',
      endpoint: 'growth/normInvitations',
      payload: {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            profileId: 'urn:li:fsd_profile:1321956620'
          }
        },
        message: 'Hi Pavan!'
      }
    },

    // APPROACH 6: Array-based invitations
    {
      name: 'Approach 6: Invitations array',
      endpoint: 'growth/normInvitations',
      payload: {
        invitations: [{
          invitee: {
            'com.linkedin.voyager.growth.invitation.InviteeProfile': {
              profileId: memberUrn
            }
          },
          message: 'Hi Pavan!'
        }]
      }
    },

    // APPROACH 7: Try connections endpoint
    {
      name: 'Approach 7: Connections API',
      endpoint: 'relationships/connectionRequests',
      payload: {
        recipientId: memberUrn.replace('urn:li:member:', ''),
        message: 'Hi Pavan!'
      }
    },

    // APPROACH 8: Try with entityUrn
    {
      name: 'Approach 8: entityUrn field',
      endpoint: 'growth/normInvitations',
      payload: {
        entityUrn: memberUrn,
        message: 'Hi Pavan!'
      }
    }
  ];

  let successCount = 0;
  for (const test of payloads) {
    const result = await testPayload(test.name, test.endpoint, test.payload);
    if (result.success) {
      successCount++;
      console.log(`   ✅ WORKING! Response:`, JSON.stringify(result.body).substring(0, 100));
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n✨ Results: ${successCount}/${payloads.length} working`);
  if (successCount === 0) {
    console.log('\n⚠️  No payloads returned success status.');
    console.log('Next steps: Check actual LinkedIn network requests with browser DevTools');
    console.log('to see what the real webapp sends when creating connection requests.');
  }
}

main();
