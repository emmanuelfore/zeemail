const REQUIRED_ENV_VARS = [
  'PAYNOW_INTEGRATION_ID',
  'PAYNOW_INTEGRATION_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'APP_URL',
];

export default function envGuard(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  for (const key of missing) {
    console.error(`Missing required environment variable: ${key}`);
  }

  if (missing.length > 0) {
    process.exit(1);
  }
}
