import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

async function testRSCManually() {
  const liAtCookie = process.env.LINKEDIN_COOKIE;
  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  // Use exact structure from working payload, but with jeetchandan's data
  const payload = {
    "requestId": "com.linkedin.sdui.requests.mynetwork.addaAddConnection",
    "serverRequest": {
      "requestId": "com.linkedin.sdui.requests.mynetwork.addaAddConnection",
      "requestedArguments": {
        "$type": "proto.sdui.actions.requests.RequestedArguments",
        "payload": {
          "inviteeUrn": { "memberId": "493105629" },  // Jeet's memberId from profile
          "nonIterableProfileId": "ACoAAB1kMd0Bly3hVSWNA_QnxE245-yLio0o5nw",
          "renderMode": "IconAndText",
          "firstName": "Jeet",
          "lastName": "Chandan",
          "isDisabled": {
            "key": "connect-button-disabled-jeet-chandan-unique",
            "namespace": null
          },
          "connectionState": {
            "key": "state:invitation:urn:li:member:493105629",
            "namespace": null
          },
          "origin": "InvitationOrigin_PYMK_COHORT_SECTION",
          "profileCanonicalUrl": "https://www.linkedin.com/in/jeetchandan",
          "firstFiveInviteCount": {
            "key": "guidedFlowNumSentInvites",
            "namespace": ""
          },
          "guidedFlowUrlandProfileList": {
            "key": "guidedFlowUrlAndPictureList",
            "namespace": "guidedFlowUrlAndPictureListNameSpace"
          },
          "postActionSentConfigs": []
        },
        "requestedStateKeys": [
          {
            "$type": "proto.sdui.StateKey",
            "value": "guidedFlowNumSentInvites",
            "key": {
              "$type": "proto.sdui.Key",
              "value": { "$case": "id", "id": "guidedFlowNumSentInvites" }
            },
            "namespace": "",
            "isEncrypted": false
          },
          {
            "$type": "proto.sdui.StateKey",
            "value": "guidedFlowUrlAndPictureList",
            "key": {
              "$type": "proto.sdui.Key",
              "value": { "$case": "id", "id": "guidedFlowUrlAndPictureList" }
            },
            "namespace": "guidedFlowUrlAndPictureListNameSpace",
            "isEncrypted": false
          }
        ],
        "requestMetadata": {
          "$type": "proto.sdui.common.RequestMetadata"
        }
      },
      "onClientRequestFailureAction": {
        "actions": [
          {
            "$type": "proto.sdui.actions.core.SetState",
            "value": {
              "stateKey": "",
              "stateValue": "",
              "state": {
                "$type": "proto.sdui.State",
                "stateKey": "",
                "key": {
                  "$type": "proto.sdui.StateKey",
                  "value": "state:invitation:urn:li:member:493105629",
                  "key": {
                    "$type": "proto.sdui.Key",
                    "value": { "$case": "id", "id": "state:invitation:urn:li:member:493105629" }
                  },
                  "namespace": "",
                  "isEncrypted": false
                },
                "value": { "$case": "stringValue", "stringValue": "Connect" },
                "isOptimistic": false
              },
              "isOptimistic": false
            }
          },
          {
            "$type": "proto.sdui.actions.core.SetState",
            "value": {
              "stateKey": "",
              "stateValue": "",
              "state": {
                "$type": "proto.sdui.State",
                "stateKey": "",
                "key": {
                  "$type": "proto.sdui.StateKey",
                  "value": "connect-button-disabled-jeet-chandan-unique",
                  "key": {
                    "$type": "proto.sdui.Key",
                    "value": { "$case": "id", "id": "connect-button-disabled-jeet-chandan-unique" }
                  },
                  "namespace": "",
                  "isEncrypted": false
                },
                "value": { "$case": "booleanValue", "booleanValue": false },
                "isOptimistic": false
              },
              "isOptimistic": false
            }
          }
        ]
      },
      "isStreaming": false,
      "rumPageKey": "",
      "isApfcEnabled": false
    },
    "states": [],
    "requestedArguments": {
      "$type": "proto.sdui.actions.requests.RequestedArguments",
      "payload": {
        "inviteeUrn": { "memberId": "493105629" },
        "nonIterableProfileId": "ACoAAB1kMd0Bly3hVSWNA_QnxE245-yLio0o5nw",
        "renderMode": "IconAndText",
        "firstName": "Jeet",
        "lastName": "Chandan",
        "isDisabled": {
          "key": "connect-button-disabled-jeet-chandan-unique",
          "namespace": null
        },
        "connectionState": {
          "key": "state:invitation:urn:li:member:493105629",
          "namespace": null
        },
        "origin": "InvitationOrigin_PYMK_COHORT_SECTION",
        "profileCanonicalUrl": "https://www.linkedin.com/in/jeetchandan",
        "firstFiveInviteCount": {
          "key": "guidedFlowNumSentInvites",
          "namespace": ""
        },
        "guidedFlowUrlandProfileList": {
          "key": "guidedFlowUrlAndPictureList",
          "namespace": "guidedFlowUrlAndPictureListNameSpace"
        },
        "postActionSentConfigs": []
      },
      "requestedStateKeys": [
        {
          "$type": "proto.sdui.StateKey",
          "value": "guidedFlowNumSentInvites",
          "key": {
            "$type": "proto.sdui.Key",
            "value": { "$case": "id", "id": "guidedFlowNumSentInvites" }
          },
          "namespace": "",
          "isEncrypted": false
        },
        {
          "$type": "proto.sdui.StateKey",
          "value": "guidedFlowUrlAndPictureList",
          "key": {
            "$type": "proto.sdui.Key",
            "value": { "$case": "id", "id": "guidedFlowUrlAndPictureList" }
          },
          "namespace": "guidedFlowUrlAndPictureListNameSpace",
          "isEncrypted": false
        }
      ],
      "requestMetadata": {
        "$type": "proto.sdui.common.RequestMetadata"
      },
      "states": [],
      "screenId": "com.linkedin.sdui.flagshipnav.mynetwork.Grow"
    }
  };

  const url = 'https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.requests.mynetwork.addaAddConnection';
  const bodyJson = JSON.stringify(payload);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");

  const curlCmd = `curl -s -D - -X POST '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'Content-Type: application/json' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' ` +
    `-H 'Accept: */*' ` +
    `-d '${escapedBody}'`;

  console.log('📤 Sending manual payload test...\n');
  const { stdout } = await execPromise(curlCmd);

  if (stdout.includes('HTTP/2 200')) {
    console.log('✅ SUCCESS! HTTP 200 response');
    console.log('\n📋 Response preview:');
    console.log(stdout.substring(0, 300));
  } else if (stdout.includes('HTTP/2 500')) {
    console.log('❌ HTTP 500 - Server error');
    console.log(stdout.substring(0, 500));
  } else {
    console.log('Response:', stdout.substring(0, 300));
  }
}

testRSCManually().catch(console.error);
