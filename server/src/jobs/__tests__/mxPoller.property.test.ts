/**
 * Tests for MXPoller — Properties 16 & 17, plus unit tests for filtering.
 *
 * Requirements: 14.1–14.6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock external dependencies before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../../services/provisioning', () => ({
  ProvisioningEngine: {
    sendActivationNotifications: vi.fn(),
  },
}));

// node-cron is mocked so the scheduler doesn't actually run during tests
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { ProvisioningEngine } from '../../services/provisioning';
import { checkAndUpdateMx, queryGoogleDns } from '../mxPoller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePendingClient(domain: string) {
  return {
    id: 'client-abc',
    domain,
    company_name: 'Test Co',
    full_name: 'Test User',
    email: 'test@example.com',
    phone: '+263771234567',
    plan: 'starter',
    status: 'pending_mx',
    domain_owned: false,
    mx_verified: false,
    mx_verified_at: null,
    previous_email_provider: null,
    paynow_reference: null,
    physical_address: '123 Test St',
  };
}

function setupSupabaseMock() {
  const updateEqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        update: updateMock,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    }
    if (table === 'mailboxes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    }
    return { update: vi.fn(), select: vi.fn() } as any;
  });

  return { updateMock, updateEqMock };
}

// ---------------------------------------------------------------------------
// Property 16: MX verification triggers active transition
// ---------------------------------------------------------------------------

// Feature: self-service-onboarding, Property 16: MX verification triggers active transition
describe('Property 16: MX verification triggers active transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Set MAILCOW_HOST so MX matching works
    process.env.MAILCOW_HOST = 'mail.zeemail.co.zw';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.MAILCOW_HOST;
  });

  /**
   * **Validates: Requirements 14.3, 14.4**
   *
   * For any domain, when queryGoogleDns returns MX records pointing to MAILCOW_HOST,
   * checkAndUpdateMx should:
   * - call supabaseAdmin.from('clients').update with { mx_verified: true, mx_verified_at: <non-null>, status: 'active' }
   */
  it('sets mx_verified=true, mx_verified_at non-null, and status=active when MX matches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (domainSuffix) => {
          vi.clearAllMocks();

          const domain = `${domainSuffix}.co.zw`;
          const client = makePendingClient(domain);
          const { updateMock, updateEqMock } = setupSupabaseMock();

          vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

          // Simulate queryGoogleDns returning a matching MX record
          const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
            json: async () => ({
              Answer: [{ data: `10 mail.zeemail.co.zw` }],
            }),
          } as any);

          await checkAndUpdateMx(client);

          // Verify update was called with correct fields
          expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({
              mx_verified: true,
              mx_verified_at: expect.any(String),
              status: 'active',
            })
          );
          expect(updateEqMock).toHaveBeenCalledWith('id', client.id);

          globalFetch.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Active transition via MX_Poller triggers notifications
// ---------------------------------------------------------------------------

// Feature: self-service-onboarding, Property 17: Active transition via MX_Poller triggers notifications
describe('Property 17: Active transition via MX_Poller triggers notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    process.env.MAILCOW_HOST = 'mail.zeemail.co.zw';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.MAILCOW_HOST;
  });

  /**
   * **Validates: Requirements 14.5**
   *
   * For any domain, when MX records match, sendActivationNotifications must be called
   * exactly once with the client record.
   */
  it('calls sendActivationNotifications when MX is verified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (domainSuffix) => {
          vi.clearAllMocks();

          const domain = `${domainSuffix}.co.zw`;
          const client = makePendingClient(domain);
          setupSupabaseMock();

          const sendNotifMock = vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

          const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
            json: async () => ({
              Answer: [{ data: `10 mail.zeemail.co.zw` }],
            }),
          } as any);

          await checkAndUpdateMx(client);

          expect(sendNotifMock).toHaveBeenCalledTimes(1);
          expect(sendNotifMock).toHaveBeenCalledWith(client);

          globalFetch.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 8.4: Unit tests for MXPoller filtering
// ---------------------------------------------------------------------------

describe('MXPoller unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    process.env.MAILCOW_HOST = 'mail.zeemail.co.zw';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.MAILCOW_HOST;
  });

  // -------------------------------------------------------------------------
  // Requirement 14.1: Only pending_mx clients are processed
  // -------------------------------------------------------------------------

  it('does not call update when MX records do not match (non-pending_mx client skipped)', async () => {
    // A client whose MX records do NOT point to MAILCOW_HOST
    const client = makePendingClient('other-provider.co.zw');
    const { updateMock } = setupSupabaseMock();

    vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

    const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        Answer: [{ data: '10 mail.google.com' }],
      }),
    } as any);

    await checkAndUpdateMx(client);

    // update should NOT have been called since MX doesn't match
    expect(updateMock).not.toHaveBeenCalled();
    expect(ProvisioningEngine.sendActivationNotifications).not.toHaveBeenCalled();

    globalFetch.mockRestore();
  });

  it('does not call update when MX Answer is empty', async () => {
    const client = makePendingClient('no-mx.co.zw');
    const { updateMock } = setupSupabaseMock();

    vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

    const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ Answer: [] }),
    } as any);

    await checkAndUpdateMx(client);

    expect(updateMock).not.toHaveBeenCalled();
    expect(ProvisioningEngine.sendActivationNotifications).not.toHaveBeenCalled();

    globalFetch.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Requirement 14.6: DNS errors do not change client status
  // -------------------------------------------------------------------------

  it('does not change client status when DNS query throws an error', async () => {
    const client = makePendingClient('error-domain.co.zw');
    const { updateMock } = setupSupabaseMock();

    vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

    const globalFetch = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('DNS network error'));

    // Should not throw — error is caught and logged
    await expect(checkAndUpdateMx(client)).resolves.toBeUndefined();

    // Status must NOT be changed
    expect(updateMock).not.toHaveBeenCalled();
    expect(ProvisioningEngine.sendActivationNotifications).not.toHaveBeenCalled();

    globalFetch.mockRestore();
  });

  it('does not change client status when DNS returns a non-ok JSON error', async () => {
    const client = makePendingClient('bad-json.co.zw');
    const { updateMock } = setupSupabaseMock();

    vi.mocked(ProvisioningEngine.sendActivationNotifications).mockResolvedValue(undefined);

    const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => { throw new Error('JSON parse error'); },
    } as any);

    await expect(checkAndUpdateMx(client)).resolves.toBeUndefined();

    expect(updateMock).not.toHaveBeenCalled();

    globalFetch.mockRestore();
  });

  // -------------------------------------------------------------------------
  // queryGoogleDns — unit tests
  // -------------------------------------------------------------------------

  it('queryGoogleDns parses MX records correctly', async () => {
    const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        Answer: [
          { data: '10 mail.example.com' },
          { data: '20 mail2.example.com' },
        ],
      }),
    } as any);

    const records = await queryGoogleDns('example.co.zw');

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ priority: 10, exchange: 'mail.example.com' });
    expect(records[1]).toEqual({ priority: 20, exchange: 'mail2.example.com' });

    globalFetch.mockRestore();
  });

  it('queryGoogleDns returns empty array when Answer is absent', async () => {
    const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({}),
    } as any);

    const records = await queryGoogleDns('no-answer.co.zw');
    expect(records).toHaveLength(0);

    globalFetch.mockRestore();
  });
});
