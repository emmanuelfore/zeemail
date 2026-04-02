/**
 * ResendService — wraps the `resend` npm package.
 *
 * Exposes:
 *   sendWelcomeEmail(client, mailboxes) — sends welcome email with all mailbox credentials
 *   sendDnsInstructions(client)         — sends DNS setup instructions for Path B clients
 *
 * Requirements: 11.7, 12.4, 16.3
 */
import { Resend } from 'resend';

export interface MailboxCredential {
  localPart: string;
  quotaMb: number;
  password: string;
  address: string;
}

export interface ResendClient {
  id: string;
  domain: string;
  plan: string;
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  domain_owned: boolean;
  mx_verified: boolean;
  mx_verified_at: string | null;
  previous_email_provider: string | null;
  paynow_reference: string | null;
  physical_address: string | null;
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY must be set in environment variables');
  }
  return new Resend(apiKey);
}

function getMailcowHost(): string {
  return process.env.MAILCOW_HOST ?? 'mail.example.com';
}

function buildWelcomeEmailHtml(client: ResendClient, mailboxes: MailboxCredential[]): string {
  const mailboxRows = mailboxes
    .map(
      (mb) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${mb.address}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${mb.password}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${mb.quotaMb} MB</td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#1a202c;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="color:#2b6cb0;">Welcome to Zeemail, ${client.company_name}!</h1>
  <p>Hi ${client.full_name},</p>
  <p>Your email hosting is now active for <strong>${client.domain}</strong>. Below are your mailbox credentials:</p>

  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <thead>
      <tr style="background:#ebf8ff;">
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">Email Address</th>
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">Password</th>
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">Quota</th>
      </tr>
    </thead>
    <tbody>${mailboxRows}</tbody>
  </table>

  <p>You can access your webmail at: <a href="https://${getMailcowHost()}">https://${getMailcowHost()}</a></p>
  <p>Please change your passwords after first login.</p>

  <p style="margin-top:32px;color:#718096;font-size:14px;">
    If you have any questions, reply to this email or contact us on WhatsApp.
  </p>
</body>
</html>`;
}

function buildDnsInstructionsHtml(client: ResendClient): string {
  const mailcowHost = getMailcowHost();
  const spfValue = `v=spf1 mx a:${mailcowHost} ~all`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#1a202c;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="color:#2b6cb0;">DNS Setup Instructions for ${client.domain}</h1>
  <p>Hi ${client.full_name},</p>
  <p>Your mailboxes have been created! To activate your email, please complete <strong>one</strong> of the two options below depending on how you want your DNS managed.</p>

  <div style="background:#f7fafc;padding:20px;border-left:4px solid #3182ce;margin:24px 0;">
    <h2 style="color:#2b6cb0;font-size:18px;margin-top:0;">Option 1: Recommended (Full Setup)</h2>
    <p>Update your domain's Name Servers (e.g. on WebZim/ZISPA) to point to our Cloudflare network. This allows us to handle all email routing, SPAM protection, and future DNS updates for you automatically.</p>
    <ul style="font-family:monospace;background:#edf2f7;padding:12px 12px 12px 32px;border-radius:4px;">
      <li>Primary: <strong>magali.ns.cloudflare.com</strong></li>
      <li>Secondary: <strong>yichun.ns.cloudflare.com</strong></li>
    </ul>
    <p style="font-size:14px;color:#718096;margin-bottom:0;"><em>Note: Please delete any existing name servers first.</em></p>
  </div>

  <div style="background:#fff;padding:20px;border:1px solid #e2e8f0;margin:24px 0;border-radius:8px;">
    <h2 style="color:#4a5568;font-size:18px;margin-top:0;">Option 2: Manual Setup (Advanced)</h2>
    <p>If you prefer to manage your own DNS, please add the following records to your existing DNS provider.</p>

    <h3 style="color:#2d3748;font-size:14px;margin-top:16px;">MX Record</h3>
    <table style="border-collapse:collapse;width:100%;margin:8px 0;font-size:14px;">
      <tr style="background:#ebf8ff;">
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Type</th>
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Name</th>
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Value</th>
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Priority</th>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">MX</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">@</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-family:monospace;">${mailcowHost}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">10</td>
      </tr>
    </table>

    <h3 style="color:#2d3748;font-size:14px;margin-top:20px;">SPF Record (TXT)</h3>
    <table style="border-collapse:collapse;width:100%;margin:8px 0;font-size:14px;">
      <tr style="background:#ebf8ff;">
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Type</th>
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Name</th>
        <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Value</th>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">TXT</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">@</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-family:monospace;">${spfValue}</td>
      </tr>
    </table>
  </div>

  <p style="margin-top:24px;">DNS changes can take up to 24–48 hours to propagate. We will notify you automatically once your records are detected.</p>

  <p style="margin-top:32px;color:#718096;font-size:14px;">
    If you need help, simply reply to this email!
  </p>
</body>
</html>`;
}

async function sendWelcomeEmail(
  client: ResendClient,
  mailboxes: MailboxCredential[]
): Promise<void> {
  const resend = getResendClient();

  await resend.emails.send({
    from: 'Zeemail <noreply@zeemail.co.zw>',
    to: client.email,
    subject: `Your Zeemail account is active — ${client.domain}`,
    html: buildWelcomeEmailHtml(client, mailboxes),
  });
}

async function sendDnsInstructions(client: ResendClient): Promise<void> {
  const resend = getResendClient();

  await resend.emails.send({
    from: 'Zeemail <noreply@zeemail.co.zw>',
    to: client.email,
    subject: `DNS setup instructions for ${client.domain}`,
    html: buildDnsInstructionsHtml(client),
  });
}

export const ResendService = { sendWelcomeEmail, sendDnsInstructions };
