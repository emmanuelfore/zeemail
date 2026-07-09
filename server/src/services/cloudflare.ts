/**
 * CloudflareService — wraps the `cloudflare` npm package.
 *
 * Exposes:
 *   createZone(domain)              — creates a Cloudflare DNS zone
 *   addMxRecord(zoneId, domain)     — adds an MX record pointing to the Mailcow server
 *   addSpfRecord(zoneId, domain)    — adds an SPF TXT record for the domain
 *
 * Credentials are read from CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
 *
 * Requirements: 11.1–11.3, 16.2
 */
import Cloudflare from 'cloudflare';
import { buildSesSpfRecord } from '../lib/sesRelay';

export interface CloudflareZone {
  id: string;
  name: string;
  nameServers: string[];
}

export interface CloudflareDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

function getCredentials(): { apiToken: string; accountId: string } {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiToken || !accountId) {
    throw new Error(
      'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in environment variables'
    );
  }
  return { apiToken, accountId };
}

function buildClient(apiToken: string): Cloudflare {
  return new Cloudflare({ apiToken });
}

/**
 * Creates a Cloudflare DNS zone for the given domain.
 * Returns the zone ID, name, and assigned name servers.
 */
async function createZone(domain: string): Promise<CloudflareZone> {
  const { apiToken, accountId } = getCredentials();
  const cf = buildClient(apiToken);

  const zone = await cf.zones.create({
    account: { id: accountId },
    name: domain,
    type: 'full',
  });

  return {
    id: zone.id,
    name: zone.name,
    nameServers: zone.name_servers ?? [],
  };
}

async function findZoneByName(domain: string): Promise<CloudflareZone | null> {
  const { apiToken } = getCredentials();
  const cf = buildClient(apiToken);
  const zones = await cf.zones.list({ name: domain } as Parameters<typeof cf.zones.list>[0]);
  const first = Array.isArray((zones as any).result) ? (zones as any).result[0] : (zones as any).data?.[0] ?? (zones as any)[0];

  if (!first) return null;

  return {
    id: first.id,
    name: first.name,
    nameServers: first.name_servers ?? [],
  };
}

/**
 * Adds an MX record for the domain pointing to the Mailcow server.
 * The Mailcow host is read from MAILCOW_HOST env var, defaulting to 'mail.yourdomain.com'.
 */
async function addMxRecord(zoneId: string, domain: string): Promise<CloudflareDnsRecord> {
  const { apiToken } = getCredentials();
  const cf = buildClient(apiToken);

  const mailcowHostRaw = process.env.MAILCOW_HOST ?? 'mail.yourdomain.com';
  const mailcowHost = mailcowHostRaw.replace(/^https?:\/\//, '');

  const record = await cf.dns.records.create({
    zone_id: zoneId,
    type: 'MX',
    name: domain,
    content: mailcowHost,
    priority: 10,
    ttl: 3600,
  } as Parameters<typeof cf.dns.records.create>[0]);

  return {
    id: record.id ?? '',
    type: record.type ?? 'MX',
    name: record.name ?? domain,
    content: record.content ?? mailcowHost,
  };
}

/**
 * Adds an SPF TXT record for the domain.
 * SPF value includes the Mailcow host and Amazon SES outbound relay.
 */
async function addSpfRecord(zoneId: string, domain: string): Promise<CloudflareDnsRecord> {
  const { apiToken } = getCredentials();
  const cf = buildClient(apiToken);

  const mailcowHostRaw = process.env.MAILCOW_HOST ?? 'mail.yourdomain.com';
  const mailcowHost = mailcowHostRaw.replace(/^https?:\/\//, '');
  const spfValue = buildSesSpfRecord(mailcowHost);

  const record = await cf.dns.records.create({
    zone_id: zoneId,
    type: 'TXT',
    name: domain,
    content: spfValue,
    ttl: 3600,
  } as Parameters<typeof cf.dns.records.create>[0]);

  return {
    id: record.id ?? '',
    type: record.type ?? 'TXT',
    name: record.name ?? domain,
    content: record.content ?? spfValue,
  };
}

/**
 * Adds any arbitrary DNS record to a Cloudflare zone.
 */
async function addDnsRecord(zoneId: string, params: { type: string; name: string; content: string; priority?: number; ttl?: number }): Promise<CloudflareDnsRecord> {
  const { apiToken } = getCredentials();
  const cf = buildClient(apiToken);

  const record = await cf.dns.records.create({
    zone_id: zoneId,
    type: params.type as any,
    name: params.name,
    content: params.content,
    priority: params.priority,
    ttl: params.ttl ?? 3600,
  });

  return {
    id: record.id ?? '',
    type: record.type ?? params.type,
    name: record.name ?? params.name,
    content: record.content ?? params.content,
  };
}

async function upsertDnsRecord(zoneId: string, params: { type: string; name: string; content: string; priority?: number; ttl?: number }): Promise<CloudflareDnsRecord> {
  const { apiToken } = getCredentials();
  const cf = buildClient(apiToken);
  const records = await cf.dns.records.list({
    zone_id: zoneId,
    type: params.type as any,
    name: params.name,
  } as Parameters<typeof cf.dns.records.list>[0]);
  const existing = Array.isArray((records as any).result) ? (records as any).result[0] : (records as any).data?.[0] ?? (records as any)[0];

  const payload = {
    zone_id: zoneId,
    type: params.type as any,
    name: params.name,
    content: params.content,
    priority: params.priority,
    ttl: params.ttl ?? 3600,
  };

  const record = existing
    ? await cf.dns.records.edit(existing.id, payload as Parameters<typeof cf.dns.records.edit>[1])
    : await cf.dns.records.create(payload as Parameters<typeof cf.dns.records.create>[0]);

  return {
    id: record.id ?? '',
    type: record.type ?? params.type,
    name: record.name ?? params.name,
    content: record.content ?? params.content,
  };
}

export const CloudflareService = { createZone, findZoneByName, addMxRecord, addSpfRecord, addDnsRecord, upsertDnsRecord };
