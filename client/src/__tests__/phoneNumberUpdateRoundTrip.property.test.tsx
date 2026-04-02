import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ToastProvider } from '../components/shared/Toast';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PortalAccountPage } from '../pages/portal/PortalAccountPage';

const mockFrom = vi.mocked(supabase.from);
const mockUseAuth = vi.mocked(useAuth);

function makeClientMock() {
  const singleFn = vi.fn().mockResolvedValue({
    data: { id: 'c1', profile_id: 'p1', company_name: 'Co', domain: 'test.co.zw', plan: 'starter', mailbox_limit: 1, status: 'active', domain_registered_at: null, next_renewal_date: null, notes: null, created_at: '' },
    error: null,
  });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  return { select: vi.fn().mockReturnValue({ eq: eqFn }) };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Property 14: Phone Number Update Round-Trip', () => {
  it('supabase update is called with the exact phone value entered by the user', async () => {
    const phoneArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);
    await fc.assert(
      fc.asyncProperty(phoneArb, async (phone) => {
        mockUseAuth.mockReturnValue({ session: null, profile: { id: 'p1', role: 'client', full_name: 'U', phone: '', created_at: '' }, loading: false, signOut: vi.fn() });
        const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
        mockFrom.mockImplementation((table) => {
          if (table === 'clients') return makeClientMock();
          if (table === 'profiles') return { update: updateSpy };
          return {};
        });
        render(<ToastProvider><PortalAccountPage /></ToastProvider>);
        const input = await waitFor(() => screen.getByTestId('phone-input'));
        fireEvent.change(input, { target: { value: phone } });
        fireEvent.click(screen.getByTestId('save-phone-btn'));
        await waitFor(() => { expect(updateSpy).toHaveBeenCalledWith({ phone }); });
        cleanup(); vi.clearAllMocks();
      }),
      { numRuns: 20 }
    );
  });
});
