/**
 * Unit tests for CloudflareService zone and record creation.
 * Validates: Requirements 11.1–11.3
 *
 * The `cloudflare` package is mocked via vi.mock so no real API calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cloudflare from 'cloudflare';
import { CloudflareService } from '../cloudflare';

vi.mock('cloudflare');

const MockCloudflare = vi.mocked(Cloudflare);

// Helpers to build a mock Cloudflare instance with controllable sub-methods
function makeMockInstance(overrides: {
  zonesCreate?: ReturnType<typeof vi.fn>;
  dnsRecordsCreate?: ReturnType<typeof vi.fn>;
} = {}) {
  const zonesCreate = overrides.zonesCreate ?? vi.fn().mockResolvedValue({
    id: 'zone-abc',
    name: 'example.co.zw',
    name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
  });

  const dnsRecordsCreate = overrides.dnsRecordsCreate ?? vi.fn().mockResolvedValue({
    id: 'record-xyz',
    type: 'MX',
    name: 'example.co.zw',
    content: 'mail.yourdomain.com',
  });

  MockCloudflare.mockImplementation(function (this: Record<string, unknown>) {
    this.zones = { create: zonesCreate };
    this.dns = { records: { create: dnsRecordsCreate } };
  });

  return { zonesCreate, dnsRecordsCreate };
}

describe('CloudflareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
    process.env.MAILCOW_HOST = 'mail.example.co.zw';
  });

  // ── createZone ────────────────────────────────────────────────────────────

  describe('createZone', () => {
    it('constructs Cloudflare client with the API token from env', async () => {
      makeMockInstance();
      await CloudflareService.createZone('example.co.zw');
      expect(MockCloudflare).toHaveBeenCalledWith({ apiToken: 'test-token' });
    });

    it('calls zones.create with the correct domain and accountId', async () => {
      const { zonesCreate } = makeMockInstance();
      await CloudflareService.createZone('example.co.zw');

      expect(zonesCreate).toHaveBeenCalledOnce();
      expect(zonesCreate).toHaveBeenCalledWith({
        account: { id: 'test-account-id' },
        name: 'example.co.zw',
        type: 'full',
      });
    });

    it('returns the zone id, name, and nameServers', async () => {
      makeMockInstance({
        zonesCreate: vi.fn().mockResolvedValue({
          id: 'zone-123',
          name: 'acme.co.zw',
          name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        }),
      });

      const result = await CloudflareService.createZone('acme.co.zw');

      expect(result.id).toBe('zone-123');
      expect(result.name).toBe('acme.co.zw');
      expect(result.nameServers).toEqual(['ns1.cloudflare.com', 'ns2.cloudflare.com']);
    });

    it('throws a descriptive error when CLOUDFLARE_API_TOKEN is missing', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;

      await expect(CloudflareService.createZone('example.co.zw')).rejects.toThrow(
        /CLOUDFLARE_API_TOKEN/
      );
    });

    it('throws a descriptive error when CLOUDFLARE_ACCOUNT_ID is missing', async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;

      await expect(CloudflareService.createZone('example.co.zw')).rejects.toThrow(
        /CLOUDFLARE_ACCOUNT_ID/
      );
    });
  });

  // ── addMxRecord ───────────────────────────────────────────────────────────

  describe('addMxRecord', () => {
    it('calls dns.records.create with correct zone_id, domain, type MX, and priority 10', async () => {
      const { dnsRecordsCreate } = makeMockInstance({
        dnsRecordsCreate: vi.fn().mockResolvedValue({
          id: 'rec-mx-1',
          type: 'MX',
          name: 'example.co.zw',
          content: 'mail.example.co.zw',
        }),
      });

      await CloudflareService.addMxRecord('zone-abc', 'example.co.zw');

      expect(dnsRecordsCreate).toHaveBeenCalledOnce();
      const [payload] = dnsRecordsCreate.mock.calls[0] as [Record<string, unknown>];
      expect(payload.zone_id).toBe('zone-abc');
      expect(payload.name).toBe('example.co.zw');
      expect(payload.type).toBe('MX');
      expect(payload.priority).toBe(10);
    });

    it('uses MAILCOW_HOST env var as the MX record content', async () => {
      process.env.MAILCOW_HOST = 'mail.myserver.co.zw';
      const { dnsRecordsCreate } = makeMockInstance({
        dnsRecordsCreate: vi.fn().mockResolvedValue({
          id: 'rec-mx-2',
          type: 'MX',
          name: 'example.co.zw',
          content: 'mail.myserver.co.zw',
        }),
      });

      await CloudflareService.addMxRecord('zone-abc', 'example.co.zw');

      const [payload] = dnsRecordsCreate.mock.calls[0] as [Record<string, unknown>];
      expect(payload.content).toBe('mail.myserver.co.zw');
    });

    it('returns the record id, type, name, and content', async () => {
      makeMockInstance({
        dnsRecordsCreate: vi.fn().mockResolvedValue({
          id: 'rec-mx-99',
          type: 'MX',
          name: 'acme.co.zw',
          content: 'mail.example.co.zw',
        }),
      });

      const result = await CloudflareService.addMxRecord('zone-abc', 'acme.co.zw');

      expect(result.id).toBe('rec-mx-99');
      expect(result.type).toBe('MX');
      expect(result.name).toBe('acme.co.zw');
    });

    it('throws a descriptive error when CLOUDFLARE_API_TOKEN is missing', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;

      await expect(CloudflareService.addMxRecord('zone-abc', 'example.co.zw')).rejects.toThrow(
        /CLOUDFLARE_API_TOKEN/
      );
    });
  });

  // ── addSpfRecord ──────────────────────────────────────────────────────────

  describe('addSpfRecord', () => {
    it('calls dns.records.create with type TXT and SPF content "v=spf1 mx ~all"', async () => {
      const { dnsRecordsCreate } = makeMockInstance({
        dnsRecordsCreate: vi.fn().mockResolvedValue({
          id: 'rec-spf-1',
          type: 'TXT',
          name: 'example.co.zw',
          content: 'v=spf1 mx ~all',
        }),
      });

      await CloudflareService.addSpfRecord('zone-abc', 'example.co.zw');

      expect(dnsRecordsCreate).toHaveBeenCalledOnce();
      const [payload] = dnsRecordsCreate.mock.calls[0] as [Record<string, unknown>];
      expect(payload.zone_id).toBe('zone-abc');
      expect(payload.name).toBe('example.co.zw');
      expect(payload.type).toBe('TXT');
      expect(payload.content).toBe('v=spf1 mx ~all');
    });

    it('returns the record id, type, name, and SPF content', async () => {
      makeMockInstance({
        dnsRecordsCreate: vi.fn().mockResolvedValue({
          id: 'rec-spf-99',
          type: 'TXT',
          name: 'acme.co.zw',
          content: 'v=spf1 mx ~all',
        }),
      });

      const result = await CloudflareService.addSpfRecord('zone-abc', 'acme.co.zw');

      expect(result.id).toBe('rec-spf-99');
      expect(result.type).toBe('TXT');
      expect(result.content).toBe('v=spf1 mx ~all');
    });

    it('throws a descriptive error when CLOUDFLARE_API_TOKEN is missing', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;

      await expect(CloudflareService.addSpfRecord('zone-abc', 'example.co.zw')).rejects.toThrow(
        /CLOUDFLARE_API_TOKEN/
      );
    });
  });
});
