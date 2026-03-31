import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const liAtCookie = 'AQEDAWRu_E0FZmG9AAABnSjKVIUAAAGdTNbYhU0AjE4OxXIRTxpQUKe0vauLK1QO7-yjGsX2oZ6HQX3_e-h8gOZ9LTMWubddE2-x8sRA7E3--5hC08l8rFh1JjdjvTot8OHJcFWWy7ttJVROO-3FIBl0';

async function checkValidity() {
  console.log('🔍 Checking if li_at cookie is still valid...\n');

  let csrfToken = 'ajax:' + Math.random().toString(36).substring(2, 15);
  let cookieString = `li_at=${liAtCookie}; JSESSIONID="${csrfToken}";`;

  const curlCmd = `curl -s -i 'https://www.linkedin.com/voyager/api/me' ` +
    `-H 'Cookie: ${cookieString}' ` +
    `-H 'csrf-token: ${csrfToken}' ` +
    `-H 'x-restli-protocol-version: 2.0.0' ` +
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`;

  const { stdout } = await execPromise(curlCmd);
  
  const firstLine = stdout.split('\n')[0];
  console.log(`Response: ${firstLine}`);

  if (firstLine.includes('401')) {
    console.log('\n❌ Cookie EXPIRED or INVALID');
    console.log('   You need to provide a fresh li_at cookie');
    console.log('\nTo get a fresh cookie:');
    console.log('1. Log in to LinkedIn');
    console.log('2. Open DevTools → Application → Cookies');
    console.log('3. Find "li_at" cookie');
    console.log('4. Copy its value and share it with me');
    return false;
  } else if (firstLine.includes('200') || firstLine.includes('201')) {
    console.log('✅ Cookie is VALID!');
    return true;
  } else {
    console.log(`⚠️  Unexpected response: ${firstLine}`);
    return false;
  }
}

checkValidity();
