import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const liAtCookie = 'AQEDAWRu_E0ACi2tAAABnSoHFp4AAAGdThOank0AjNp5bNoRyHcIchrvIhl2dh-HBsoz75JN1EBeK_MyaBLa1U3EA5LUbgOhCsre_dbOLf2J2O0V3ArfmeMfy08n_onkqFjUJB4awtZiuNY-pxglQuO8';

async function resolveProfileData() {
  console.log('Fetching profile data for Pavan Babar...\n');

  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  const url = 'https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=pavanbabar&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85';

  const curlCmd = `curl -s '${url}' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`;

  try {
    const { stdout } = await execPromise(curlCmd);
    const data = JSON.parse(stdout);

    console.log('Response keys:', Object.keys(data));
    console.log('\nElements:', data.elements);
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2).substring(0, 2000));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

resolveProfileData();
