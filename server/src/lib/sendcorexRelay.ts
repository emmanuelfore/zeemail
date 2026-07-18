export interface SendcorexRelayConfig {
  smtpHost: string;
  smtpPort: number;
  apiKey: string;
  postfixContainerName: string;
  relayMapPath: string;
  spfInclude: string;
}

export function getSendcorexRelayConfig(): SendcorexRelayConfig {
  const apiKey = process.env.SENDCOREX_API_KEY;
  if (!apiKey) {
    throw new Error('SENDCOREX_API_KEY must be set for Sendcorex relay');
  }

  return {
    smtpHost: process.env.SENDCOREX_SMTP_HOST || 'smtp.emailsbit.com',
    smtpPort: parseInt(process.env.SENDCOREX_SMTP_PORT || '588', 10),
    apiKey,
    postfixContainerName: process.env.MAILCOW_CONTAINER_NAME || 'postfix-mailcow',
    relayMapPath: process.env.RELAY_MAP_PATH || '/opt/postfix/conf/sender_dependent_relayhost_maps',
    spfInclude: process.env.SENDCOREX_SPF_INCLUDE || 'sendcorex.com',
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
