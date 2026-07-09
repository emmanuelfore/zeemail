export interface SesRelayConfig {
  region: string;
  postfixContainerName: string;
  relayMapPath: string;
  smtpHost: string;
  spfInclude: string;
}

export function getSesRelayConfig(): SesRelayConfig {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

  return {
    region,
    postfixContainerName: process.env.MAILCOW_CONTAINER_NAME || 'postfix-mailcow',
    relayMapPath: process.env.RELAY_MAP_PATH || '/opt/postfix/conf/sender_dependent_relayhost_maps',
    smtpHost: process.env.SES_SMTP_HOST || `email-smtp.${region}.amazonaws.com`,
    spfInclude: process.env.SES_SPF_INCLUDE || 'amazonses.com',
  };
}

export function buildSesSpfRecord(mailcowHost: string): string {
  const { spfInclude } = getSesRelayConfig();
  return `v=spf1 mx a:${mailcowHost} include:${spfInclude} ~all`;
}

export function buildRelayLine(domain: string): string {
  const { smtpHost } = getSesRelayConfig();
  return `@${domain} [${smtpHost}]:587`;
}
