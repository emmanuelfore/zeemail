export interface SendcorexConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  apiKey: string;
  postfixContainerName: string;
  relayMapPath: string;
  saslPasswdPath: string;
  spfInclude: string;
}

export interface SendcorexDnsRecord {
  host: string;
  value: string;
  type: string;
  priority?: number;
}

export interface SendcorexDomainResponse {
  success: boolean;
  domain?: {
    domain: string;
    validated: boolean;
    dnsRecords: {
      spf: SendcorexDnsRecord;
      dkim: SendcorexDnsRecord;
      mx: SendcorexDnsRecord;
      returnPath: SendcorexDnsRecord;
      dmarc: SendcorexDnsRecord;
    };
  };
  error?: string;
}

export async function addDomainToSendcorex(domain: string): Promise<SendcorexDomainResponse> {
  const config = getSendcorexRelayConfig();
  const response = await fetch('https://graph.sendcorex.com/v3.0/domains', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.apiKey,
    },
    body: JSON.stringify({ domainName: domain }),
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(`Sendcorex API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SendcorexDomainResponse;
}

export async function getDomainFromSendcorex(domain: string): Promise<SendcorexDomainResponse> {
  const config = getSendcorexRelayConfig();
  const response = await fetch(`https://graph.sendcorex.com/v3.0/domains/${domain}`, {
    headers: {
      'Authorization': config.apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Sendcorex API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SendcorexDomainResponse;
}

export function getSendcorexRelayConfig(): SendcorexConfig {
  const apiKey = process.env.SENDCOREX_API_KEY;
  if (!apiKey) {
    throw new Error('SENDCOREX_API_KEY must be set for Sendcorex relay');
  }

  return {
    smtpHost: process.env.SENDCOREX_SMTP_HOST || 'smtp.emailsbit.com',
    smtpPort: parseInt(process.env.SENDCOREX_SMTP_PORT || '588', 10),
    smtpUsername: process.env.SENDCOREX_SMTP_USERNAME,
    smtpPassword: process.env.SENDCOREX_SMTP_PASSWORD,
    apiKey,
    postfixContainerName: process.env.MAILCOW_CONTAINER_NAME || 'postfix-mailcow',
    relayMapPath: process.env.RELAY_MAP_PATH || '/opt/postfix/conf/sender_dependent_relayhost_maps',
    saslPasswdPath: process.env.SASL_PASSWD_PATH || '/opt/postfix/conf/sasl_passwd',
    spfInclude: process.env.SENDCOREX_SPF_INCLUDE || 'smtp.emailsbit.com',
  };
}

export function buildSendcorexSpfRecord(mailcowHost: string): string {
  const spfInclude = process.env.SENDCOREX_SPF_INCLUDE || 'sendcorex.com';
  return `v=spf1 mx a:${mailcowHost} include:${spfInclude} ~all`;
}

export function buildSendcorexRelayLine(domain: string): string {
  const { smtpHost, smtpPort } = getSendcorexRelayConfig();
  return `@${domain} [${smtpHost}]:${smtpPort}`;
}
