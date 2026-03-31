import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Executes an action against the internal LinkedIn Voyager API.
 * Uses native OS curl to completely bypass Node.js TLS and fetch issues.
 */
async function fetchVoyager(endpoint, liAtCookie, options = {}) {
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  const url = endpoint.startsWith('http') ? endpoint : `https://www.linkedin.com/voyager/api/${endpoint}`;
  const method = options.method || 'GET';
  
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  let curlCmd = `curl -s -D - -X ${method} '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' ` +
    `-H 'Accept: application/vnd.linkedin.normalized+json+2.1' ` +
    `-H 'Content-Type: application/json'`;

  if (method.toUpperCase() === 'POST' && options.body) {
    const escapedBody = typeof options.body === 'string' ? options.body.replace(/'/g, "'\\''") : JSON.stringify(options.body).replace(/'/g, "'\\''");
    curlCmd += ` -d '${escapedBody}'`;
  }

  try {
    const { stdout } = await execPromise(curlCmd);
    
    const headerEndIndex = stdout.indexOf('\r\n\r\n');
    if (headerEndIndex === -1 && stdout.includes('HTTP/')) {
        if (stdout.includes('401 ') || stdout.includes('302 ')) {
            throw new Error('LinkedIn Cookie Expired or Invalid (401/302). Please update your li_at cookie.');
        }
    }
    
    const bodyStr = stdout.substring(headerEndIndex + 4);
    
    if (stdout.includes('HTTP/2 401') || stdout.includes('HTTP/1.1 401') || stdout.includes('HTTP/2 302')) {
      throw new Error('LinkedIn Cookie Expired or Invalid (401/302). Please update your li_at cookie.');
    }

    if (!stdout.includes('HTTP/2 200') && !stdout.includes('HTTP/2 201') && !stdout.includes('HTTP/1.1 200')) {
      throw new Error(`LinkedIn API Error during curl.\nResponse: ${stdout.substring(0, 300)}`);
    }

    try {
      return JSON.parse(bodyStr);
    } catch(e) {
      return bodyStr;
    }
  } catch (err) {
    if (err.message.includes('401/302')) throw err;
    throw new Error(`Curl execution failed: ${err.message}`);
  }
}

/**
 * Sends a connection request using LinkedIn's modern RSC (React Server Components) endpoint.
 * This is the current working method that LinkedIn's official webapp uses.
 */
async function sendViaRSC(encodedProfileId, vanityName, firstName, lastName, memberId, liAtCookie) {
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  // Unique identifiers for state management
  // Use vanity name to create unique identifiers
  const buttonDisabledKey = `connect-button-disabled-${vanityName}`;
  const connectionStateKey = `state:invitation:urn:li:member:${memberId}`;

  const payload = {
    requestId: "com.linkedin.sdui.requests.mynetwork.addaAddConnection",
    serverRequest: {
      requestId: "com.linkedin.sdui.requests.mynetwork.addaAddConnection",
      requestedArguments: {
        "$type": "proto.sdui.actions.requests.RequestedArguments",
        payload: {
          inviteeUrn: { memberId: memberId },
          nonIterableProfileId: encodedProfileId,
          renderMode: "IconAndText",
          firstName: firstName,
          lastName: lastName,
          isDisabled: {
            key: buttonDisabledKey,
            namespace: null
          },
          connectionState: {
            key: connectionStateKey,
            namespace: null
          },
          origin: "InvitationOrigin_PYMK_COHORT_SECTION",
          profileCanonicalUrl: `https://www.linkedin.com/in/${vanityName}`,
          firstFiveInviteCount: {
            key: "guidedFlowNumSentInvites",
            namespace: ""
          },
          guidedFlowUrlandProfileList: {
            key: "guidedFlowUrlAndPictureList",
            namespace: "guidedFlowUrlAndPictureListNameSpace"
          },
          postActionSentConfigs: []
        },
        requestedStateKeys: [
          {
            "$type": "proto.sdui.StateKey",
            value: "guidedFlowNumSentInvites",
            key: {
              "$type": "proto.sdui.Key",
              value: { "$case": "id", id: "guidedFlowNumSentInvites" }
            },
            namespace: "",
            isEncrypted: false
          },
          {
            "$type": "proto.sdui.StateKey",
            value: "guidedFlowUrlAndPictureList",
            key: {
              "$type": "proto.sdui.Key",
              value: { "$case": "id", id: "guidedFlowUrlAndPictureList" }
            },
            namespace: "guidedFlowUrlAndPictureListNameSpace",
            isEncrypted: false
          }
        ],
        requestMetadata: {
          "$type": "proto.sdui.common.RequestMetadata"
        }
      },
      onClientRequestFailureAction: {
        actions: [
          {
            "$type": "proto.sdui.actions.core.SetState",
            value: {
              stateKey: "",
              stateValue: "",
              state: {
                "$type": "proto.sdui.State",
                stateKey: "",
                key: {
                  "$type": "proto.sdui.StateKey",
                  value: connectionStateKey,
                  key: {
                    "$type": "proto.sdui.Key",
                    value: { "$case": "id", id: connectionStateKey }
                  },
                  namespace: "",
                  isEncrypted: false
                },
                value: { "$case": "stringValue", stringValue: "Connect" },
                isOptimistic: false
              },
              isOptimistic: false
            }
          },
          {
            "$type": "proto.sdui.actions.core.SetState",
            value: {
              stateKey: "",
              stateValue: "",
              state: {
                "$type": "proto.sdui.State",
                stateKey: "",
                key: {
                  "$type": "proto.sdui.StateKey",
                  value: buttonDisabledKey,
                  key: {
                    "$type": "proto.sdui.Key",
                    value: { "$case": "id", id: buttonDisabledKey }
                  },
                  namespace: "",
                  isEncrypted: false
                },
                value: { "$case": "booleanValue", booleanValue: false },
                isOptimistic: false
              },
              isOptimistic: false
            }
          }
        ]
      },
      isStreaming: false,
      rumPageKey: "",
      isApfcEnabled: false
    },
    states: [],
    requestedArguments: {
      "$type": "proto.sdui.actions.requests.RequestedArguments",
      payload: {
        inviteeUrn: { memberId: memberId },
        nonIterableProfileId: encodedProfileId,
        renderMode: "IconAndText",
        firstName: firstName,
        lastName: lastName,
        isDisabled: {
          key: buttonDisabledKey,
          namespace: null
        },
        connectionState: {
          key: connectionStateKey,
          namespace: null
        },
        origin: "InvitationOrigin_PYMK_COHORT_SECTION",
        profileCanonicalUrl: `https://www.linkedin.com/in/${vanityName}`,
        firstFiveInviteCount: {
          key: "guidedFlowNumSentInvites",
          namespace: ""
        },
        guidedFlowUrlandProfileList: {
          key: "guidedFlowUrlAndPictureList",
          namespace: "guidedFlowUrlAndPictureListNameSpace"
        },
        postActionSentConfigs: []
      },
      requestedStateKeys: [
        {
          "$type": "proto.sdui.StateKey",
          value: "guidedFlowNumSentInvites",
          key: {
            "$type": "proto.sdui.Key",
            value: { "$case": "id", id: "guidedFlowNumSentInvites" }
          },
          namespace: "",
          isEncrypted: false
        },
        {
          "$type": "proto.sdui.StateKey",
          value: "guidedFlowUrlAndPictureList",
          key: {
            "$type": "proto.sdui.Key",
            value: { "$case": "id", id: "guidedFlowUrlAndPictureList" }
          },
          namespace: "guidedFlowUrlAndPictureListNameSpace",
          isEncrypted: false
        }
      ],
      requestMetadata: {
        "$type": "proto.sdui.common.RequestMetadata"
      },
      states: [],
      screenId: "com.linkedin.sdui.flagshipnav.mynetwork.Grow"
    }
  };

  const url = 'https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.requests.mynetwork.addaAddConnection';
  const bodyJson = JSON.stringify(payload);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");

  console.log('\n📤 Payload being sent:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  const curlCmd = `curl -s -D - -X POST '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'Content-Type: application/json' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' ` +
    `-H 'Accept: */*' ` +
    `-d '${escapedBody}'`;

  const { stdout } = await execPromise(curlCmd);

  if (stdout.includes('HTTP/2 200') || stdout.includes('HTTP/1.1 200')) {
    return { success: true, status: 200 };
  } else if (stdout.includes('401')) {
    throw new Error('LinkedIn Cookie Expired or Invalid (401)');
  } else {
    throw new Error(`RSC Endpoint Error: ${stdout.substring(0, 200)}`);
  }
}

/**
 * Extracts the "vanity name" from a standard LinkedIn URL.
 * e.g., "https://www.linkedin.com/in/pavan-kumar-123/" -> "pavan-kumar-123"
 */
function extractVanityName(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Sends a connection request to a LinkedIn profile.
 * Can work in two modes:
 * 1. With just profileUrl - requires valid cookie (may expire)
 * 2. With memberId + encodedProfileId + firstName + lastName - fastest, no profile lookup needed
 */
export async function sendConnectionRequest(profileUrl, message, liAtCookie, { memberId = null, encodedProfileId = null, firstName = null, lastName = null } = {}) {
  if (!liAtCookie) throw new Error('Missing li_at cookie');
  
  const vanityName = extractVanityName(profileUrl);
  if (!vanityName) throw new Error(`Could not extract vanity name from URL: ${profileUrl}`);

  // If memberId and encodedProfileId not provided, extract from profile API
  if (!memberId || !encodedProfileId) {
    console.log('⏳ Resolving profile via Voyager API...');
    const url = `identity/dash/profiles?q=memberIdentity&memberIdentity=${vanityName}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85`;
    const profileData = await fetchVoyager(url, liAtCookie, { method: 'GET' });
    
    const elements = profileData?.included || [];
    for (const el of elements) {
      if (el.$type === 'com.linkedin.voyager.dash.identity.profile.Profile') {
        if (!firstName) firstName = el.firstName;
        if (!lastName) lastName = el.lastName;
        
        if (!memberId && el.objectUrn) {
          const memberMatch = el.objectUrn.match(/urn:li:member:(\d+)/);
          if (memberMatch) {
            memberId = memberMatch[1];
          }
        }
        
        if (!encodedProfileId && el.entityUrn) {
          const profileMatch = el.entityUrn.match(/urn:li:fsd_profile:(.+)/);
          if (profileMatch) {
            encodedProfileId = profileMatch[1];
          }
        }
        break;
      }
    }
  }
  
  if (!encodedProfileId || !memberId) {
    throw new Error(`Missing required profile data: encodedProfileId=${encodedProfileId}, memberId=${memberId}`);
  }

  // If names still not provided, try to parse from vanity name (fallback only)
  if (!firstName || !lastName) {
    const parts = vanityName.split('-').filter(p => p);
    firstName = firstName || (parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'User');
    lastName = lastName || (parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() : '');
  }

  // Step 2: Send connection request via RSC endpoint
  const result = await sendViaRSC(encodedProfileId, vanityName, firstName, lastName, memberId, liAtCookie);
  
  return { 
    success: true, 
    encodedProfileId,
    vanityName,
    firstName,
    lastName,
    memberId,
    status: result.status
  };
}

/**
 * Example function to check if a specific user accepted the connection.
 */
export async function checkConnectionStatus(profileUrl, liAtCookie) {
  // Can be implemented later for automated sequence checking
  return { connected: false };
}
