import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Cloudflare from 'cloudflare';

async function main() {
  const domain = 'rhymydigital.co.zw';
  console.log(`Checking CF for: ${domain}`);
  try {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const cf = new Cloudflare({ apiToken });
    const zones = await cf.zones.list();
    const allZoneNames = (zones as any).result?.map((z: any) => z.name) || [];
    console.log('All available zones:', allZoneNames);
    
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
