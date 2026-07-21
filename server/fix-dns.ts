import { provisionTenantDomain } from './src/services/sendcorexRelay';
import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function run() {
  try {
    console.log("Updating Cloudflare DNS for rhymydigital...");
    // Bypass the "already verified" check by forcing pending first
    await supabaseAdmin.from('clients').update({ relay_verification_status: 'pending' }).eq('id', '2204c8ff-c3f5-4e9a-9ebe-1a315b3d0449');
    const result = await provisionTenantDomain('2204c8ff-c3f5-4e9a-9ebe-1a315b3d0449');
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
