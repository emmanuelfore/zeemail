/**
 * TwilioService — sends WhatsApp messages via the Twilio REST API.
 *
 * Uses fetch directly (no twilio npm package required).
 * Credentials are read from environment variables:
 *   TWILIO_ACCOUNT_SID   — Twilio account SID
 *   TWILIO_AUTH_TOKEN    — Twilio auth token
 *   TWILIO_WHATSAPP_FROM — sender number in format "whatsapp:+1234567890"
 *
 * Requirements: 11.8, 12.5, 14.5, 16.4
 */

export class TwilioError extends Error {
  code = 'TWILIO_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'TwilioError';
  }
}

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  from: string;
}

function getCredentials(): TwilioCredentials {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid) {
    throw new TwilioError('TWILIO_ACCOUNT_SID must be set in environment variables');
  }
  if (!authToken) {
    throw new TwilioError('TWILIO_AUTH_TOKEN must be set in environment variables');
  }
  if (!from) {
    throw new TwilioError('TWILIO_WHATSAPP_FROM must be set in environment variables');
  }

  return { accountSid, authToken, from };
}

/**
 * Normalises a phone number to the WhatsApp URI format expected by Twilio.
 * If the number already starts with "whatsapp:", it is returned as-is.
 */
function toWhatsAppAddress(number: string): string {
  return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
}

/**
 * Sends a WhatsApp message to the given number.
 *
 * @param to   Recipient phone number (e.g. "+263771234567" or "whatsapp:+263771234567")
 * @param body Message text
 */
async function sendWhatsApp(to: string, body: string): Promise<void> {
  const { accountSid, authToken, from } = getCredentials();

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: from,
    To: toWhatsAppAddress(to),
    Body: body,
  });

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new TwilioError(
      `Twilio API error ${response.status}: ${errorText}`
    );
  }
}

export const TwilioService = { sendWhatsApp };
