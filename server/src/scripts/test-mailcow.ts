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
    console.log('Domains:');
    domains.forEach(d => {
      console.log(`- ${d.domain}: quota=${d.quota}, def_quota=${d.def_new_mailbox_quota}, max_quota=${d.max_new_mailbox_quota}, mboxes=${d.mboxes_in_domain}/${d.max_mailboxes}`);
    });
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testMailcow();
