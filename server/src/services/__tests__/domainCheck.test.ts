import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domainCheckService, WhoisUnavailableError } from '../domainCheck';

function mockFetchAvailable() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ registered: false }),
  });
}

function mockFetchTaken() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ registrar: 'GoDaddy' }),
  });
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'error' }),
  });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
}

describe('DomainCheckService', () => {
  beforeEach(() => {
    process.env.WHOISJSON_API_KEY = 'test-key';
    // Clear module-level cache between tests by re-importing or using time manipulation
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.WHOISJSON_API_KEY;
  });

  describe('cache hit within 60s', () => {
    it('does not call WhoisJSON again for the same domain within TTL', async () => {
      const mockFetch = mockFetchAvailable();
      vi.stubGlobal('fetch', mockFetch);

      await domainCheckService.checkAvailability('example', '.com');
      await domainCheckService.checkAvailability('example', '.com');

      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('returns the cached result on second call', async () => {
      vi.stubGlobal('fetch', mockFetchAvailable());

      const first = await domainCheckService.checkAvailability('cached', '.com');
      const second = await domainCheckService.checkAvailability('cached', '.com');

      expect(first).toEqual(second);
      expect(first.available).toBe(true);
    });
  });

  describe('cache miss after 60s', () => {
    it('calls WhoisJSON again after TTL expires', async () => {
      const mockFetch = mockFetchAvailable();
      vi.stubGlobal('fetch', mockFetch);

      await domainCheckService.checkAvailability('expired', '.com');

      // Advance time past TTL
      vi.advanceTimersByTime(61_000);

      await domainCheckService.checkAvailability('expired', '.com');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('WhoisJSON error handling', () => {
    it('throws WhoisUnavailableError on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError());

      await expect(domainCheckService.checkAvailability('fail', '.com')).rejects.toThrow(
        WhoisUnavailableError
      );
    });

    it('throws WhoisUnavailableError on non-2xx non-404 response', async () => {
      vi.stubGlobal('fetch', mockFetchError(500));

      await expect(domainCheckService.checkAvailability('servererr', '.com')).rejects.toThrow(
        WhoisUnavailableError
      );
    });

    it('WhoisUnavailableError has code WHOIS_UNAVAILABLE', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError());

      try {
        await domainCheckService.checkAvailability('fail2', '.com');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(WhoisUnavailableError);
        expect((e as WhoisUnavailableError).code).toBe('WHOIS_UNAVAILABLE');
      }
    });

    it('treats 404 response as available', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }));

      const result = await domainCheckService.checkAvailability('notfound', '.com');
      expect(result.available).toBe(true);
    });
  });

  describe('availability detection', () => {
    it('returns available=true when registered is false', async () => {
      vi.stubGlobal('fetch', mockFetchAvailable());

      const result = await domainCheckService.checkAvailability('free', '.com');
      expect(result.available).toBe(true);
      expect(result.domain).toBe('free.com');
    });

    it('returns available=false when registrar is set', async () => {
      vi.stubGlobal('fetch', mockFetchTaken());

      const result = await domainCheckService.checkAvailability('taken', '.com');
      expect(result.available).toBe(false);
      expect(result.domain).toBe('taken.com');
    });
  });
});
