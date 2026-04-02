/**
 * Unit tests for WhatsApp link generation in LeadsTable
 * Validates: Requirements 25.6
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Lead } from '../types/index';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

import { LeadsTable } from '../components/admin/LeadsTable';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'test-lead-1',
    domain: 'acme',
    tld: '.co.zw',
    plan: 'starter',
    company_name: 'Acme Corp',
    registration_type: 'company',
    business_reg_number: null,
    org_description: null,
    contact_name: 'John Doe',
    contact_position: null,
    contact_email: 'john@acme.co.zw',
    contact_phone: '+263 77 123 4567',
    physical_address: null,
    letterhead_ready: null,
    tc_confirmed: null,
    signed_letter_ready: null,
    id_ready: null,
    status: 'new',
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderLeadsTable(lead: Lead) {
  render(
    <LeadsTable
      leads={[lead]}
      onStatusChange={vi.fn()}
      onConvert={vi.fn()}
    />
  );
  return screen.getByTestId('whatsapp-btn') as HTMLAnchorElement;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WhatsApp link generation', () => {
  it('URL starts with https://wa.me/', () => {
    const lead = makeLead();
    const btn = renderLeadsTable(lead);
    const href = btn.getAttribute('href') ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\//);
  });

  it('URL base contains correct phone number with non-digits stripped', () => {
    // "+263 77 123 4567" → "263771234567"
    const lead = makeLead({ contact_phone: '+263 77 123 4567' });
    const btn = renderLeadsTable(lead);
    const href = btn.getAttribute('href') ?? '';
    expect(href).toContain('263771234567');
  });

  it('pre-filled message contains contact_name', () => {
    const lead = makeLead({ contact_name: 'John Doe' });
    const btn = renderLeadsTable(lead);
    const rawHref = btn.getAttribute('href') ?? '';
    const decodedHref = decodeURIComponent(rawHref);
    expect(decodedHref).toContain('John Doe');
  });

  it('pre-filled message contains domain+tld', () => {
    const lead = makeLead({ domain: 'acme', tld: '.co.zw' });
    const btn = renderLeadsTable(lead);
    const rawHref = btn.getAttribute('href') ?? '';
    const decodedHref = decodeURIComponent(rawHref);
    expect(decodedHref).toContain('acme.co.zw');
  });
});
