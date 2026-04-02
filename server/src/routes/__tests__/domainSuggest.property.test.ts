// Feature: self-service-onboarding, Property 2: Unavailable domain returns at least 3 alternatives
/**
 * Property 2: Unavailable domain returns at least 3 alternatives
 * Validates: Requirements 2.3
 *
 * For any domain name that is reported as taken by the Domain_Checker,
 * the suggestions endpoint should return at least 3 distinct alternative
 * domain names, each ending in `.co.zw`.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock supabase and other heavy dependencies before importing the router
vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('../../services/mailcow', () => ({
  mailcowService: { addDomain: vi.fn(), deleteDomain: vi.fn() },
}));
vi.mock('../../middleware/auth', () => ({
  auth: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));
vi.mock('../../middleware/requireRole', () => ({
  requireRole: () => vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));
vi.mock('../../middleware/rateLimiter', () => ({
  domainCheckRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

import { generateSuggestions } from '../domains';

describe('Property 2: Unavailable domain returns at least 3 alternatives', () => {
  it('returns at least 3 suggestions for any domain name input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const suggestions = generateSuggestions(name);
        expect(suggestions.length).toBeGreaterThanOrEqual(3);
      }),
      { numRuns: 100 }
    );
  });

  it('all suggestions end in .co.zw', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const suggestions = generateSuggestions(name);
        for (const suggestion of suggestions) {
          expect(suggestion.endsWith('.co.zw')).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all suggestions are distinct', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const suggestions = generateSuggestions(name);
        const unique = new Set(suggestions);
        expect(unique.size).toBe(suggestions.length);
      }),
      { numRuns: 100 }
    );
  });
});
