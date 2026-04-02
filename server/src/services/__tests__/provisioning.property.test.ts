import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { Plan } from '../../types/index';

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../cloudflare', () => ({
  CloudflareService: {
    createZone: vi.fn(),
    addMxRecord: vi.fn(),
    addSpfRecord: vi.fn(),
  },
}));

vi.mock('../mailcow', () => ({
  mailcowService: {
    addDomain: vi.fn(),
    addMailbox: vi.fn(),
  },
}));

vi.mock('../resend', () => ({
  ResendService: {
    sendWelcomeEmail: vi.fn(),
    sendDnsInstructions: vi.fn(),
  },
}));

vi.mock('../twilio', () => ({
  TwilioService: {
    sendWhatsApp: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { CloudflareService } from '../cloudflare';
import { mailcowService } from '../mailcow';
import { ResendService } from '../resend';
import { TwilioService } from '../twilio';
import { ProvisioningEngine } from '../provisioning';

// ---------------------------------------------------------------------------
// Plan mailbox counts (mirrors PLAN_MAILBOXES in provisioning.ts)
// ---------------------------------------------------------------------------

const PLAN_MAILBOX_COUNT: Record<Plan, number> = {
  starter: 1,
  business: 5,
  pro: 10,
};

// ---------------------------------------------------------------------------
// Helper: build a fake client record
// ---------------------------------------------------------------------------

function makeFakeClient(plan: Plan, path: 'A' | 'B') {
  return {
    id: 'client-test-id',
    domain: 'testdomain.co.zw',
    plan,
    domain_owned: path === 'A',
    company_name: 'Test Co',
    full_name: 'Test User',
    email: 'test@testdomain.co.zw',
    phone: '+263771234567',
    status: path === 'A' ? 'pending_domain' : 'pending_mailboxes',
    mx_verified: false,
    mx_verified_at: null,
    previous_email_provider: null,
    paynow_reference: null,
    physical_address: '123 Test St',
  };
}

// ---------------------------------------------------------------------------
// Helper: set up supabaseAdmin mock for a given plan/path
// ---------------------------------------------------------------------------

function setupSupabaseMock(plan: Plan, path: 'A' | 'B') {
  const fakeClient = makeFakeClient(plan, path);

  // Track calls to .update() and .insert()
  // update() is called with { status: '...' } and returns { eq: fn }
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: fakeClient, error: null }),
    }),
  });

  const fromMock = vi.fn((table: string) => {
    if (table === 'clients') {
      return {
        select: selectMock,
        update: updateMock,
      };
    }
    if (table === 'mailboxes') {
      return {
        insert: insertMock,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }
    return { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
  });

  vi.mocked(supabaseAdmin.from).mockImplementation(fromMock);

  return { updateMock, insertMock, fromMock, fakeClient };
}

// ---------------------------------------------------------------------------
// Property 13: Path A provisioning produces an active client with correct mailboxes
// ---------------------------------------------------------------------------

// Feature: self-service-onboarding, Property 13: Path A provisioning produces an active client with correct mailboxes
describe('Property 13: Path A provisioning produces an active client with correct mailboxes', () => {
  beforeEach(() => {
    vi.mocked(CloudflareService.createZone).mockResolvedValue({
      id: 'zone-123',
      name: 'testdomain.co.zw',
      nameServers: ['ns1.cloudflare.com'],
    });
    vi.mocked(CloudflareService.addMxRecord).mockResolvedValue({
      id: 'rec-mx',
      type: 'MX',
      name: 'testdomain.co.zw',
      content: 'mail.example.com',
    });
    vi.mocked(CloudflareService.addSpfRecord).mockResolvedValue({
      id: 'rec-spf',
      type: 'TXT',
      name: 'testdomain.co.zw',
      content: 'v=spf1 mx ~all',
    });
    vi.mocked(mailcowService.addDomain).mockResolvedValue({ type: 'success' });
    vi.mocked(mailcowService.addMailbox).mockResolvedValue({ type: 'success' });
    vi.mocked(ResendService.sendWelcomeEmail).mockResolvedValue(undefined);
    vi.mocked(TwilioService.sendWhatsApp).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 11.1–11.6, 13.1–13.3, 13.5**
   *
   * For any plan, after runPathA completes:
   * - supabaseAdmin.from('clients').update is called with { status: 'active' }
   * - supabaseAdmin.from('mailboxes').insert is called exactly N times (per plan)
   */
  it('sets client status to active and inserts correct number of mailboxes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Plan>('starter', 'business', 'pro'),
        async (plan) => {
          vi.clearAllMocks();

          const { updateMock, insertMock } = setupSupabaseMock(plan, 'A');

          await ProvisioningEngine.runPathA('client-test-id');

          // Verify status was set to 'active' at some point
          const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
          expect(statusCalls).toContainEqual({ status: 'active' });

          // Verify mailboxes inserted correct number of times
          const expectedCount = PLAN_MAILBOX_COUNT[plan];
          expect(insertMock).toHaveBeenCalledTimes(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Path B provisioning produces a pending_mx client with correct mailboxes
// ---------------------------------------------------------------------------

// Feature: self-service-onboarding, Property 14: Path B provisioning produces a pending_mx client with correct mailboxes
describe('Property 14: Path B provisioning produces a pending_mx client with correct mailboxes', () => {
  beforeEach(() => {
    vi.mocked(mailcowService.addDomain).mockResolvedValue({ type: 'success' });
    vi.mocked(mailcowService.addMailbox).mockResolvedValue({ type: 'success' });
    vi.mocked(ResendService.sendDnsInstructions).mockResolvedValue(undefined);
    vi.mocked(TwilioService.sendWhatsApp).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 12.1–12.3**
   *
   * For any plan, after runPathB completes:
   * - supabaseAdmin.from('clients').update is called with { status: 'pending_mx' }
   * - supabaseAdmin.from('mailboxes').insert is called exactly N times (per plan)
   */
  it('sets client status to pending_mx and inserts correct number of mailboxes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Plan>('starter', 'business', 'pro'),
        async (plan) => {
          vi.clearAllMocks();

          const { updateMock, insertMock } = setupSupabaseMock(plan, 'B');

          await ProvisioningEngine.runPathB('client-test-id');

          // Verify status was set to 'pending_mx' at some point
          const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
          expect(statusCalls).toContainEqual({ status: 'pending_mx' });

          // Verify mailboxes inserted correct number of times
          const expectedCount = PLAN_MAILBOX_COUNT[plan];
          expect(insertMock).toHaveBeenCalledTimes(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Generated mailbox passwords are unique and sufficiently long
// ---------------------------------------------------------------------------

// Feature: self-service-onboarding, Property 15: Generated mailbox passwords are unique and sufficiently long
describe('Property 15: Generated mailbox passwords are unique and sufficiently long', () => {
  /**
   * **Validates: Requirements 13.4**
   *
   * For any N in [1, 10], generating N passwords should produce:
   * - All passwords >= 16 characters
   * - All passwords unique (no duplicates within the same run)
   */
  it('generates passwords that are all >= 16 chars and all unique', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const passwords = Array.from({ length: count }, () =>
            ProvisioningEngine.generatePassword()
          );

          // All passwords must be at least 16 characters
          for (const pw of passwords) {
            expect(pw.length).toBeGreaterThanOrEqual(16);
          }

          // All passwords must be unique
          const unique = new Set(passwords);
          expect(unique.size).toBe(count);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Task 4.5: Unit test for ProvisioningEngine step ordering
// ---------------------------------------------------------------------------

describe('ProvisioningEngine step ordering — unit tests', () => {
  beforeEach(() => {
    vi.mocked(CloudflareService.createZone).mockResolvedValue({
      id: 'zone-123',
      name: 'testdomain.co.zw',
      nameServers: [],
    });
    vi.mocked(CloudflareService.addMxRecord).mockResolvedValue({
      id: 'rec-mx',
      type: 'MX',
      name: 'testdomain.co.zw',
      content: 'mail.example.com',
    });
    vi.mocked(CloudflareService.addSpfRecord).mockResolvedValue({
      id: 'rec-spf',
      type: 'TXT',
      name: 'testdomain.co.zw',
      content: 'v=spf1 mx ~all',
    });
    vi.mocked(mailcowService.addDomain).mockResolvedValue({ type: 'success' });
    vi.mocked(mailcowService.addMailbox).mockResolvedValue({ type: 'success' });
    vi.mocked(ResendService.sendWelcomeEmail).mockResolvedValue(undefined);
    vi.mocked(ResendService.sendDnsInstructions).mockResolvedValue(undefined);
    vi.mocked(TwilioService.sendWhatsApp).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Path A step ordering
  // -------------------------------------------------------------------------

  describe('runPathA', () => {
    it('calls all steps in correct sequence for Path A', async () => {
      setupSupabaseMock('starter', 'A');

      const callOrder: string[] = [];
      vi.mocked(CloudflareService.createZone).mockImplementation(async () => {
        callOrder.push('createZone');
        return { id: 'zone-123', name: 'testdomain.co.zw', nameServers: [] };
      });
      vi.mocked(CloudflareService.addMxRecord).mockImplementation(async () => {
        callOrder.push('addMxRecord');
        return { id: 'rec-mx', type: 'MX', name: 'testdomain.co.zw', content: 'mail.example.com' };
      });
      vi.mocked(CloudflareService.addSpfRecord).mockImplementation(async () => {
        callOrder.push('addSpfRecord');
        return { id: 'rec-spf', type: 'TXT', name: 'testdomain.co.zw', content: 'v=spf1 mx ~all' };
      });
      vi.mocked(mailcowService.addDomain).mockImplementation(async () => {
        callOrder.push('addDomain');
        return { type: 'success' };
      });
      vi.mocked(mailcowService.addMailbox).mockImplementation(async () => {
        callOrder.push('addMailbox');
        return { type: 'success' };
      });
      vi.mocked(ResendService.sendWelcomeEmail).mockImplementation(async () => {
        callOrder.push('sendWelcomeEmail');
      });
      vi.mocked(TwilioService.sendWhatsApp).mockImplementation(async () => {
        callOrder.push('sendWhatsApp');
      });

      await ProvisioningEngine.runPathA('client-test-id');

      // Verify ordering: Cloudflare zone → MX → SPF → Mailcow domain → mailbox(es) → email → WhatsApp
      expect(callOrder[0]).toBe('createZone');
      expect(callOrder[1]).toBe('addMxRecord');
      expect(callOrder[2]).toBe('addSpfRecord');
      expect(callOrder[3]).toBe('addDomain');
      expect(callOrder[4]).toBe('addMailbox'); // starter has 1 mailbox
      expect(callOrder).toContain('sendWelcomeEmail');
      expect(callOrder).toContain('sendWhatsApp');

      // sendWelcomeEmail must come after addMailbox
      expect(callOrder.indexOf('sendWelcomeEmail')).toBeGreaterThan(callOrder.indexOf('addMailbox'));
    });

    it('sets provisioning_error status when createZone fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'A');
      vi.mocked(CloudflareService.createZone).mockRejectedValue(new Error('Cloudflare error'));

      await expect(ProvisioningEngine.runPathA('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });

    it('sets provisioning_error status when addDomain fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'A');
      vi.mocked(mailcowService.addDomain).mockRejectedValue(new Error('Mailcow error'));

      await expect(ProvisioningEngine.runPathA('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });

    it('sets provisioning_error status when mailbox creation fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'A');
      vi.mocked(mailcowService.addMailbox).mockRejectedValue(new Error('Mailbox error'));

      await expect(ProvisioningEngine.runPathA('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });
  });

  // -------------------------------------------------------------------------
  // Path B step ordering
  // -------------------------------------------------------------------------

  describe('runPathB', () => {
    it('calls all steps in correct sequence for Path B', async () => {
      setupSupabaseMock('starter', 'B');

      const callOrder: string[] = [];
      vi.mocked(mailcowService.addDomain).mockImplementation(async () => {
        callOrder.push('addDomain');
        return { type: 'success' };
      });
      vi.mocked(mailcowService.addMailbox).mockImplementation(async () => {
        callOrder.push('addMailbox');
        return { type: 'success' };
      });
      vi.mocked(ResendService.sendDnsInstructions).mockImplementation(async () => {
        callOrder.push('sendDnsInstructions');
      });
      vi.mocked(TwilioService.sendWhatsApp).mockImplementation(async () => {
        callOrder.push('sendWhatsApp');
      });

      await ProvisioningEngine.runPathB('client-test-id');

      // Verify ordering: Mailcow domain → mailbox(es) → DNS instructions → WhatsApp
      expect(callOrder[0]).toBe('addDomain');
      expect(callOrder[1]).toBe('addMailbox');
      expect(callOrder).toContain('sendDnsInstructions');
      expect(callOrder).toContain('sendWhatsApp');

      // sendDnsInstructions must come after addMailbox
      expect(callOrder.indexOf('sendDnsInstructions')).toBeGreaterThan(
        callOrder.indexOf('addMailbox')
      );
      // sendWhatsApp must come after sendDnsInstructions
      expect(callOrder.indexOf('sendWhatsApp')).toBeGreaterThan(
        callOrder.indexOf('sendDnsInstructions')
      );
    });

    it('does NOT call CloudflareService for Path B', async () => {
      setupSupabaseMock('starter', 'B');

      await ProvisioningEngine.runPathB('client-test-id');

      expect(CloudflareService.createZone).not.toHaveBeenCalled();
      expect(CloudflareService.addMxRecord).not.toHaveBeenCalled();
      expect(CloudflareService.addSpfRecord).not.toHaveBeenCalled();
    });

    it('sets provisioning_error status when addDomain fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'B');
      vi.mocked(mailcowService.addDomain).mockRejectedValue(new Error('Mailcow error'));

      await expect(ProvisioningEngine.runPathB('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });

    it('sets provisioning_error status when mailbox creation fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'B');
      vi.mocked(mailcowService.addMailbox).mockRejectedValue(new Error('Mailbox error'));

      await expect(ProvisioningEngine.runPathB('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });

    it('sets provisioning_error status when sendDnsInstructions fails', async () => {
      const { updateMock } = setupSupabaseMock('starter', 'B');
      vi.mocked(ResendService.sendDnsInstructions).mockRejectedValue(new Error('Resend error'));

      await expect(ProvisioningEngine.runPathB('client-test-id')).rejects.toThrow();

      const statusCalls = updateMock.mock.calls.map(([arg]) => arg);
      expect(statusCalls).toContainEqual({ status: 'provisioning_error' });
    });
  });
});
