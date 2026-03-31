import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const liAtCookie = 'AQEDAWRu_E0ACi2tAAABnSoHFp4AAAGdThOank0AjNp5bNoRyHcIchrvIhl2dh-HBsoz75JN1EBeK_MyaBLa1U3EA5LUbgOhCsre_dbOLf2J2O0V3ArfmeMfy08n_onkqFjUJB4awtZiuNY-pxglQuO8';

async function testRSCEndpoint() {
  console.log('🚀 Testing LinkedIn RSC Endpoint (Modern Architecture)\n');

  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  // The actual payload from LinkedIn's webapp
  const payload = {
    requestId: "com.linkedin.sdui.requests.mynetwork.handlePostInteropConnection",
    serverRequest: {
      requestId: "com.linkedin.sdui.requests.mynetwork.handlePostInteropConnection",
      requestedArguments: {
        "$type": "proto.sdui.actions.requests.RequestedArguments",
        payload: {
          profileId: "ACoAACRIt8wBSQNv0lMiFQC5LtPbD_7uZKUHJFM",  // Ashwani Kalyanakar
          vanityName: "ashwani-kalyanakar-290a4b14b",
          firstName: "Ashwani",
          lastName: "Kalyanakar",
          success: true,
          errorType: "",
          showVerificationPostConnectNBA: true
        },
        requestedStateKeys: []
      },
      isStreaming: false,
      isApfcEnabled: false,
      rumPageKey: ""
    },
    states: [],
    requestedArguments: {
      "$type": "proto.sdui.actions.requests.RequestedArguments",
      payload: {
        profileId: "ACoAACRIt8wBSQNv0lMiFQC5LtPbD_7uZKUHJFM",
        vanityName: "ashwani-kalyanakar-290a4b14b",
        firstName: "Ashwani",
        lastName: "Kalyanakar",
        success: true,
        errorType: "",
        showVerificationPostConnectNBA: true
      },
      requestedStateKeys: [],
      states: [],
      screenId: ""
    }
  };

  const bodyJson = JSON.stringify(payload);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");

  const url = 'https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.requests.mynetwork.handlePostInteropConnection';

  const curlCmd = `curl -s -i -X POST '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'Content-Type: application/json' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' ` +
    `-H 'Accept: */*' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-d '${escapedBody}'`;

  console.log('📤 Sending connection request to: Ashwani Kalyanakar\n');

  try {
    const { stdout } = await execPromise(curlCmd);
    
    const firstLine = stdout.split('\n')[0];
    console.log('Response Status:', firstLine);

    const headerEndIdx = stdout.indexOf('\r\n\r\n');
    const body = headerEndIdx !== -1 ? stdout.substring(headerEndIdx + 4) : '';

    if (firstLine.includes('200')) {
      console.log('\n✅ SUCCESS! Connection request sent!');
      console.log('\nResponse Body:');
      console.log(body.substring(0, 500));
    } else if (firstLine.includes('401')) {
      console.log('❌ 401: Cookie expired or invalid');
    } else if (firstLine.includes('422')) {
      console.log('⚠️  422: Payload validation error');
      console.log('Response:', body.substring(0, 300));
    } else {
      console.log('Response Body:', body.substring(0, 300));
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testRSCEndpoint();
