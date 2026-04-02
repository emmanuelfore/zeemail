/**
 * Unit tests for AdminQueue component — rendering and button states
 * Validates: Requirements 10.1, 10.6
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AdminQueue } from '../components/admin/AdminQueue';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock apiRequest
vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';

const mockSupabase = supabase as unknown as { from: ReturnType<typeof vi.fn> };
const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

function buildClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    company_name: 'Acme Corp',
    domain: 'acme.co.zw',
    plan: 'starter',
    status: 'pending_domain',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    profile_id: null,
    mailbox_limit: 1,
    domain_registered_at: null,
    next_renewal_date: null,
    notes: null,
    domain_owned: true,
    mx_verified: false,
    mx_verified_at: null,
    previous_email_provider: null,
    paynow_reference: null,
    physical_address: null,
    ...overrides,
  };
}

function setupSupabaseMock(data: unknown[], error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error });
  const inMock = vi.fn().mockReturnValue({ order: orderMock });
  const selectMock = vi.fn().mockReturnValue({ in: inMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });
  mockSupabase.from = fromMock;
  return { fromMock, selectMock, inMock, orderMock };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminQueue — no pending clients', () => {
  it('returns null when no pending clients exist', async () => {
    setupSupabaseMock([]);
    const { container } = render(<AdminQueue />);
    // Wait for the async fetch to complete
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

describe('AdminQueue — row rendering', () => {
  it('renders rows with domain, company name, plan, and status for each pending client', async () => {
    const clients = [
      buildClient({ id: 'c1', domain: 'acme.co.zw', company_name: 'Acme Corp', plan: 'starter', status: 'pending_domain' }),
      buildClient({ id: 'c2', domain: 'beta.co.zw', company_name: 'Beta Ltd', plan: 'business', status: 'pending_mailboxes' }),
    ];
    setupSupabaseMock(clients);

    render(<AdminQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-queue')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('queue-row');
    expect(rows).toHaveLength(2);

    // First row — acme.co.zw
    expect(rows[0]).toHaveTextContent('acme.co.zw');
    expect(rows[0]).toHaveTextContent('Acme Corp');
    expect(rows[0]).toHaveTextContent('pending domain'); // StatusPill replaces _ with space

    // Second row — beta.co.zw
    expect(rows[1]).toHaveTextContent('beta.co.zw');
    expect(rows[1]).toHaveTextContent('Beta Ltd');
    expect(rows[1]).toHaveTextContent('pending mailboxes');
  });
});

describe('AdminQueue — Urgent badge', () => {
  it('shows "Urgent" badge for pending_domain clients', async () => {
    setupSupabaseMock([
      buildClient({ id: 'c1', status: 'pending_domain' }),
    ]);

    render(<AdminQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('urgent-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('urgent-badge')).toHaveTextContent('Urgent');
  });

  it('does NOT show "Urgent" badge for pending_mailboxes clients', async () => {
    setupSupabaseMock([
      buildClient({ id: 'c1', status: 'pending_mailboxes' }),
    ]);

    render(<AdminQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('queue-row')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('urgent-badge')).not.toBeInTheDocument();
  });
});

describe('AdminQueue — spinner during in-flight request', () => {
  it('shows spinner on the button while provision request is in-flight', async () => {
    setupSupabaseMock([buildClient({ id: 'c1', status: 'pending_domain' })]);

    // Make apiRequest hang so we can observe the in-flight state
    let resolveProvision!: () => void;
    mockApiRequest.mockReturnValue(
      new Promise<void>((resolve) => { resolveProvision = resolve; })
    );

    render(<AdminQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('run-setup-btn')).toBeInTheDocument();
    });

    // No spinner before click
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('run-setup-btn'));

    // Spinner should appear while request is pending
    await waitFor(() => {
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    // Button should be disabled during in-flight
    expect(screen.getByTestId('run-setup-btn')).toBeDisabled();

    // Resolve the request
    resolveProvision();
  });
});

describe('AdminQueue — row removal after provision', () => {
  it('removes the row after successful provision', async () => {
    setupSupabaseMock([buildClient({ id: 'c1', status: 'pending_domain' })]);
    mockApiRequest.mockResolvedValue({});

    render(<AdminQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('queue-row')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('run-setup-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('queue-row')).not.toBeInTheDocument();
    });
  });
});
