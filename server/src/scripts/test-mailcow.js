const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testMailcow() {
  const host = process.env.MAILCOW_HOST;
  const apiKey = process.env.MAILCOW_API_KEY;

  try {
    const res = await fetch(`${host}/api/v1/get/domain/all`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    });
    const domains = await res.json();
    if (Array.isArray(domains) && domains.length > 0) {
      console.log('First domain full details:', JSON.stringify(domains[0], null, 2));
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testMailcow();
