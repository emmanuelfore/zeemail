/**
 * Property 24: Lead status update round-trip
 * For any lead record and any new status value, calling updateLeadStatus(id, newStatus)
 * must result in the lead's status being newStatus in the returned leads array,
 * and the old status must not persist.
 *
 * Validates: Requirements 25.4
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import type { ReactNode } from 'react';
import type { Lead, LeadStatus } from '../types/index';
import { ToastProvider } from '../components/shared/Toast';

// Mock supabase before importing the hook
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  },
}));

import { supabase } from '../lib/supabase';
import { useLeads } from '../hooks/useLeads';

const mockFrom = vi.mocked(supabase.from);

// Wrapper that provides ToastProvider context required by useLeads → useToast
function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const leadStatusArb = fc.constantFrom<LeadStatus>('new', 'contacted', 'converted', 'rejected');

const leadArb: fc.Arbitrary<Lead> = fc.record({
  id: fc.uuid(),
  domain: fc.option(fc.stringMatching(/^[a-z]{2,10}\.(co\.zw|com)$/), { nil: null }),
  tld: fc.option(fc.constantFrom<'.co.zw' | '.com'>('.co.zw', '.com'), { nil: null }),
  plan: fc.option(fc.constantFrom('starter' as const, 'business' as const, 'pro' as const), { nil: null }),
  company_name: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
  registration_type: fc.option(
    fc.constantFrom('company' as const, 'individual' as const, 'ngo' as const),
    { nil: null }
  ),
  business_reg_number: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  org_description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  contact_name: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
  contact_position: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
  contact_email: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
  contact_phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  physical_address: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  letterhead_ready: fc.option(fc.boolean(), { nil: null }),
  tc_confirmed: fc.option(fc.boolean(), { nil: null }),
  signed_letter_ready: fc.option(fc.boolean(), { nil: null }),
  id_ready: fc.option(fc.boolean(), { nil: null }),
  status: leadStatusArb,
  notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 24: Lead status update round-trip', () => {
  it('after updateLeadStatus, the lead reflects the new status in the leads array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        leadStatusArb,
        async (leads, indexSeed, newStatus) => {
          const targetIndex = indexSeed % leads.length;
          const targetLead = leads[targetIndex];

          mockFrom.mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: leads, error: null }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as unknown as ReturnType<typeof supabase.from>));

          const { result } = renderHook(() => useLeads(), { wrapper });

          // Wait for initial fetch to complete
          await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
          });

          // Call updateLeadStatus
          await act(async () => {
            await result.current.updateLeadStatus(targetLead.id, newStatus);
          });

          // Assert: the lead with targetLead.id now has newStatus
          const updatedLead = result.current.leads.find((l) => l.id === targetLead.id);
          expect(updatedLead).toBeDefined();
          expect(updatedLead!.status).toBe(newStatus);

          cleanup();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('after updateLeadStatus, the old status does not persist for the updated lead', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArb,
        leadStatusArb.filter((s) => s !== 'new'),
        async (lead, newStatus) => {
          // Ensure the lead starts with a different status so we can verify the change
          const leadWithOldStatus: Lead = { ...lead, status: 'new' };

          mockFrom.mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [leadWithOldStatus], error: null }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as unknown as ReturnType<typeof supabase.from>));

          const { result } = renderHook(() => useLeads(), { wrapper });

          await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
          });

          await act(async () => {
            await result.current.updateLeadStatus(leadWithOldStatus.id, newStatus);
          });

          const updatedLead = result.current.leads.find((l) => l.id === leadWithOldStatus.id);
          expect(updatedLead).toBeDefined();
          // New status is applied
          expect(updatedLead!.status).toBe(newStatus);
          // Old status ('new') does not persist
          expect(updatedLead!.status).not.toBe('new');

          cleanup();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('other leads are not affected when one lead status is updated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb, { minLength: 2, maxLength: 8 }),
        leadStatusArb,
        async (leads, newStatus) => {
          // Ensure all lead ids are unique
          const uniqueLeads = leads.filter(
            (l, i, arr) => arr.findIndex((x) => x.id === l.id) === i
          );
          if (uniqueLeads.length < 2) return;

          const targetLead = uniqueLeads[0];
          const otherLeads = uniqueLeads.slice(1);

          mockFrom.mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: uniqueLeads, error: null }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as unknown as ReturnType<typeof supabase.from>));

          const { result } = renderHook(() => useLeads(), { wrapper });

          await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
          });

          await act(async () => {
            await result.current.updateLeadStatus(targetLead.id, newStatus);
          });

          // Other leads must retain their original statuses
          for (const other of otherLeads) {
            const found = result.current.leads.find((l) => l.id === other.id);
            expect(found).toBeDefined();
            expect(found!.status).toBe(other.status);
          }

          cleanup();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });
});
