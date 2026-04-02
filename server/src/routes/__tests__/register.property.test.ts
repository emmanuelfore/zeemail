/**
 * Property tests for POST /api/register
 *
 * Property 19: Registration round-trip data integrity
 * Property 9:  Duplicate email check prevents re-registration
 * Property 5:  Detected email provider stored on client record
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the router
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: vi.fn(),
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  },
}));

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import registerRouter from '../register';

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/register', registerRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLANS = ['starter', 'business', 'pro'] as const;

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    path: 'B' as const,
    domain: 'example.co.zw',
    plan: 'starter' as const,
    company_name: 'Test Co',
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '+263771234567',
    physical_address: '123 Test St, Harare',
    ...overrides,
  };
}

function setupSuccessfulMocks(clientId = 'client-uuid-123', userId = 'user-uuid-456') {
  vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
    data: { users: [], aud: '' },
    error: null,
  } as ReturnType<typeof supabaseAdmin.auth.admin.listUsers> extends Promise<infer T> ? T : never);

  vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  } as ReturnType<typeof supabaseAdmin.auth.admin.createUser> extends Promise<infer T> ? T : never);

  vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
    data: {},
    error: null,
  } as ReturnType<typeof supabaseAdmin.auth.admin.deleteUser> extends Promise<infer T> ? T : never);

  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: clientId },
        error: null,
      }),
    }),
  });
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (table === 'profiles') {
      return { upsert: upsertMock, select: selectMock } as ReturnType<typeof supabaseAdmin.from>;
    }
    if (table === 'clients') {
      return { insert: insertMock } as ReturnType<typeof supabaseAdmin.from>;
    }
    return { select: vi.fn(), insert: vi.fn(), upsert: vi.fn() } as ReturnType<typeof supabaseAdmin.from>;
  });

  return { upsertMock, insertMock, selectMock };
}

// ---------------------------------------------------------------------------
// Property 19: Registration round-trip data integrity
// Feature: self-service-onboarding, Property 19: Registration round-trip data integrity
// ---------------------------------------------------------------------------

describe('Property 19: Registration round-trip data integrity', () => {
  /**
   * **Validates: Requirements 17.1–17.4**
   *
   * For any valid registration payload, the data passed to the clients insert
   * should contain all submitted fields: domain, plan, company_name,
   * physical_address, and domain_owned flag set correctly per path.
   */
  it('persists all submitted fields to the client record', async () => {
    // Feature: self-service-onboarding, Property 19: Registration round-trip data integrity
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom('A' as const, 'B' as const),
          domain: fc.stringMatching(/^[a-z]{3,10}\.co\.zw$/),
          plan: fc.constantFrom(...PLANS),
          company_name: fc.string({ minLength: 1, maxLength: 50 }),
          full_name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          phone: fc.string({ minLength: 7, maxLength: 15 }),
          physical_address: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (payload) => {
          vi.clearAllMocks();
          const { insertMock } = setupSuccessfulMocks();

          const res = await request(app)
            .post('/api/register')
            .send(payload)
            .set('Content-Type', 'application/json');

          // Should succeed
          expect(res.status).toBe(201);
          expect(res.body).toHaveProperty('clientId');
          expect(res.body).toHaveProperty('userId');

          // Verify the insert was called with the correct fields
          expect(insertMock).toHaveBeenCalledOnce();
          const insertedData = insertMock.mock.calls[0][0] as Record<string, unknown>;

          expect(insertedData.domain).toBe(payload.domain);
          expect(insertedData.plan).toBe(payload.plan);
          expect(insertedData.company_name).toBe(payload.company_name);
          expect(insertedData.physical_address).toBe(payload.physical_address);
          // domain_owned = true for Path A, false for Path B (Requirements 17.3, 17.4)
          expect(insertedData.domain_owned).toBe(payload.path === 'A');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Duplicate email check prevents re-registration
// Feature: self-service-onboarding, Property 9: Duplicate email check prevents re-registration
// ---------------------------------------------------------------------------

describe('Property 9: Duplicate email check prevents re-registration', () => {
  /**
   * **Validates: Requirements 5.5, 6.5**
   *
   * For any email address that already exists in the auth users list,
   * POST /api/register should return 409 with code EMAIL_EXISTS.
   */
  it('returns 409 EMAIL_EXISTS when email already registered', async () => {
    // Feature: self-service-onboarding, Property 9: Duplicate email check prevents re-registration
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          vi.clearAllMocks();

          // Simulate email already existing in auth
          vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
            data: {
              users: [{ id: 'existing-user', email }],
              aud: '',
            },
            error: null,
          } as ReturnType<typeof supabaseAdmin.auth.admin.listUsers> extends Promise<infer T> ? T : never);

          const payload = makeValidPayload({ email });

          const res = await request(app)
            .post('/api/register')
            .send(payload)
            .set('Content-Type', 'application/json');

          expect(res.status).toBe(409);
          expect(res.body.code).toBe('EMAIL_EXISTS');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('GET /check-email returns exists:true for registered email', async () => {
    // Feature: self-service-onboarding, Property 9: Duplicate email check prevents re-registration
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          vi.clearAllMocks();

          // Simulate email existing in auth
          vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
            data: {
              users: [{ id: 'existing-user', email }],
              aud: '',
            },
            error: null,
          } as ReturnType<typeof supabaseAdmin.auth.admin.listUsers> extends Promise<infer T> ? T : never);

          // profiles table returns null (auth check is primary)
          vi.mocked(supabaseAdmin.from).mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as ReturnType<typeof supabaseAdmin.from>));

          const res = await request(app)
            .get(`/api/register/check-email?email=${encodeURIComponent(email)}`);

          expect(res.status).toBe(200);
          expect(res.body.exists).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Detected email provider stored on client record
// Feature: self-service-onboarding, Property 5: Detected email provider stored on client record
// ---------------------------------------------------------------------------

describe('Property 5: Detected email provider stored on client record', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * For any Path B registration where previous_email_provider is provided,
   * the client record insert should include that provider value.
   */
  it('stores previous_email_provider on client record for Path B', async () => {
    // Feature: self-service-onboarding, Property 5: Detected email provider stored on client record
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (provider) => {
          vi.clearAllMocks();
          const { insertMock } = setupSuccessfulMocks();

          const payload = makeValidPayload({
            path: 'B',
            previous_email_provider: provider,
          });

          const res = await request(app)
            .post('/api/register')
            .send(payload)
            .set('Content-Type', 'application/json');

          expect(res.status).toBe(201);

          // Verify previous_email_provider was stored
          expect(insertMock).toHaveBeenCalledOnce();
          const insertedData = insertMock.mock.calls[0][0] as Record<string, unknown>;
          expect(insertedData.previous_email_provider).toBe(provider);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not store previous_email_provider for Path A', async () => {
    // Feature: self-service-onboarding, Property 5: Detected email provider stored on client record
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (provider) => {
          vi.clearAllMocks();
          const { insertMock } = setupSuccessfulMocks();

          const payload = makeValidPayload({
            path: 'A',
            previous_email_provider: provider,
          });

          const res = await request(app)
            .post('/api/register')
            .send(payload)
            .set('Content-Type', 'application/json');

          expect(res.status).toBe(201);

          const insertedData = insertMock.mock.calls[0][0] as Record<string, unknown>;
          // Path A should not store previous_email_provider
          expect(insertedData.previous_email_provider).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
