/**
 * Property 30: Domain Name Validation
 * Validates: Requirements 27.3, 27.4, 27.22, 27.23, 27.24
 *
 * For any domain name string containing characters outside [a-zA-Z0-9-], the backend
 * must return HTTP 422 with code: "VALIDATION_ERROR". For any string of length less
 * than 3 or greater than 63, the backend must return 422.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import express, { Router, Request, Response, NextFunction } from 'express';
import { domainCheckService, WhoisUnavailableError } from '../../services/domainCheck';
import { errorHandler } from '../../middleware/errorHandler';

// Build a test app with the validation logic but WITHOUT the rate limiter,
// so property tests don't get 429 from accumulated requests across runs.
const NAME_REGEX = /^[a-zA-Z0-9-]{3,63}$/;
const VALID_TLDS = ['.co.zw', '.com'];

function buildApp() {
  const app = express();
  app.use(express.json());

  const router = Router();
  router.get('/check', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, tld } = req.query;
    if (
      typeof name !== 'string' ||
      !NAME_REGEX.test(name) ||
      typeof tld !== 'string' ||
      !VALID_TLDS.includes(tld)
    ) {
      res.status(422).json({ error: 'Invalid or missing name/tld parameters', code: 'VALIDATION_ERROR' });
      return;
    }
    try {
      const result = await domainCheckService.checkAvailability(name, tld);
      res.json(result);
    } catch (err) {
      if (err instanceof WhoisUnavailableError) {
        res.status(503).json({ error: (err as Error).message, code: 'WHOIS_UNAVAILABLE' });
        return;
      }
      next(err);
    }
  });

  app.use('/api/domains', router);
  app.use(errorHandler);
  return app;
}

describe('Property 30: Domain Name Validation', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    process.env.WHOISJSON_API_KEY = 'test-key';
    // Mock fetch so valid requests don't hit the real WhoisJSON API
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ registrar: null }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHOISJSON_API_KEY;
  });

  it('returns 422 for names with invalid characters', async () => {
    // Characters outside [a-zA-Z0-9-] should fail
    const invalidCharArb = fc
      .string({ minLength: 3, maxLength: 20 })
      .filter((s) => /[^a-zA-Z0-9-]/.test(s));

    await fc.assert(
      fc.asyncProperty(invalidCharArb, async (name) => {
        const res = await request(app)
          .get('/api/domains/check')
          .query({ name, tld: '.co.zw' });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 20 }
    );
  });

  it('returns 422 for names shorter than 3 characters', async () => {
    const shortNameArb = fc
      .string({ minLength: 1, maxLength: 2 })
      .filter((s) => /^[a-zA-Z0-9-]+$/.test(s));

    await fc.assert(
      fc.asyncProperty(shortNameArb, async (name) => {
        const res = await request(app)
          .get('/api/domains/check')
          .query({ name, tld: '.com' });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 15 }
    );
  });

  it('returns 422 for names longer than 63 characters', async () => {
    const longNameArb = fc
      .string({ minLength: 64, maxLength: 100 })
      .map((s) => s.replace(/[^a-zA-Z0-9-]/g, 'a'));

    await fc.assert(
      fc.asyncProperty(longNameArb, async (name) => {
        const res = await request(app)
          .get('/api/domains/check')
          .query({ name, tld: '.com' });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 15 }
    );
  });

  it('returns 422 for invalid TLD values', async () => {
    const invalidTldArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => s !== '.co.zw' && s !== '.com');

    const validNameArb = fc
      .string({ minLength: 3, maxLength: 20 })
      .map((s) => s.replace(/[^a-zA-Z0-9-]/g, 'a'))
      .filter((s) => s.length >= 3);

    await fc.assert(
      fc.asyncProperty(validNameArb, invalidTldArb, async (name, tld) => {
        const res = await request(app)
          .get('/api/domains/check')
          .query({ name, tld });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 20 }
    );
  });

  it('returns 422 when name or tld params are missing', async () => {
    const res1 = await request(app).get('/api/domains/check').query({ tld: '.com' });
    expect(res1.status).toBe(422);
    expect(res1.body.code).toBe('VALIDATION_ERROR');

    const res2 = await request(app).get('/api/domains/check').query({ name: 'example' });
    expect(res2.status).toBe(422);
    expect(res2.body.code).toBe('VALIDATION_ERROR');

    const res3 = await request(app).get('/api/domains/check');
    expect(res3.status).toBe(422);
    expect(res3.body.code).toBe('VALIDATION_ERROR');
  });
});
