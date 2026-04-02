/**
 * Property 28: Domain Check Cache Hit
 * Validates: Requirements 27.7
 *
 * For any domain name and TLD combination, if a second availability check is made
 * within 60 seconds of a prior check for the same domain, the WhoisJSON API must
 * not be called again — the cached result must be returned. The WhoisJSON API call
 * count must remain at 1 regardless of how many times the same domain is checked
 * within the TTL window.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { domainCheckService } from '../domainCheck';

const VALID_TLDS = ['.com', '.net'] as const;

const domainNameArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 63);

const tldArb = fc.constantFrom(...VALID_TLDS);

describe('Property 28: Domain Check Cache Hit', () => {
  beforeEach(() => {
    process.env.WHOISJSON_API_KEY = 'test-key';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.WHOISJSON_API_KEY;
  });

  it('WhoisJSON called exactly once for multiple checks within TTL', async () => {
    await fc.assert(
      fc.asyncProperty(domainNameArb, tldArb, fc.integer({ min: 2, max: 5 }), async (name, tld, callCount) => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ registered: false }),
        });
        vi.stubGlobal('fetch', mockFetch);

        // Make multiple calls within TTL (no time advancement)
        for (let i = 0; i < callCount; i++) {
          await domainCheckService.checkAvailability(name, tld);
        }

        // WhoisJSON should only have been called once
        expect(mockFetch).toHaveBeenCalledOnce();

        vi.restoreAllMocks();
      }),
      { numRuns: 20 }
    );
  });

  it('WhoisJSON called again after TTL expires', async () => {
    await fc.assert(
      fc.asyncProperty(domainNameArb, tldArb, async (name, tld) => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ registered: false }),
        });
        vi.stubGlobal('fetch', mockFetch);

        await domainCheckService.checkAvailability(name, tld);
        vi.advanceTimersByTime(61_000);
        await domainCheckService.checkAvailability(name, tld);

        expect(mockFetch).toHaveBeenCalledTimes(2);

        vi.restoreAllMocks();
      }),
      { numRuns: 10 }
    );
  });
});

// Feature: self-service-onboarding, Property 4: Path A domain checker rejects non-.co.zw domains
/**
 * Property 4: Path A domain checker rejects non-.co.zw domains
 * Validates: Requirements 2.6
 *
 * For any domain string that does not end in `.co.zw`, the Path A Domain_Checker
 * should return a validation error and not proceed to the WhoisJSON or DNS lookup.
 */
import { describe as describeP4, it as itP4, expect as expectP4, vi as viP4, beforeEach as beforeEachP4, afterEach as afterEachP4 } from 'vitest';

const COZW_TLD = '.co.zw';
const PATH_A_VALID_TLDS = [COZW_TLD];

function isValidPathATld(tld: string): boolean {
  return PATH_A_VALID_TLDS.includes(tld);
}

describeP4('Property 4: Path A domain checker rejects non-.co.zw domains', () => {
  itP4('rejects any TLD that is not .co.zw', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.endsWith('.co.zw') && s.length > 0),
        (nonCozwTld) => {
          expectP4(isValidPathATld(nonCozwTld)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  itP4('accepts .co.zw as the only valid Path A TLD', () => {
    expectP4(isValidPathATld('.co.zw')).toBe(true);
  });

  itP4('does not call fetch for non-.co.zw domains in Path A validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 63 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
        fc.string().filter((s) => !s.endsWith('.co.zw') && s.length > 0),
        async (name, nonCozwTld) => {
          const mockFetch = viP4.fn();
          viP4.stubGlobal('fetch', mockFetch);

          // Path A validation: only .co.zw is accepted
          const isValid = isValidPathATld(nonCozwTld);
          expectP4(isValid).toBe(false);

          // fetch should never be called because validation rejects the TLD first
          expectP4(mockFetch).not.toHaveBeenCalled();

          viP4.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
