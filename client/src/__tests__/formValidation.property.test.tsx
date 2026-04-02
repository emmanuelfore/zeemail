/**
 * Property 9: Form Validation Prevents Submission
 * For any form state where one or more required fields are empty or
 * whitespace-only, the form must not submit to the backend and inline
 * validation errors must be shown for each invalid field.
 *
 * Validates: Requirements 5.7, 14.3
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { AddClientForm } from '../components/admin/AddClientForm';
import { ToastProvider } from '../components/shared/Toast';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockApiRequest = vi.fn();
vi.mock('../lib/api', () => ({ apiRequest: (...args: unknown[]) => mockApiRequest(...args) }));

const mockSupabaseInsert = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (...args: unknown[]) => mockSupabaseInsert(...args),
    }),
  },
}));

afterEach(() => {
  cleanup();
  mockApiRequest.mockReset();
  mockSupabaseInsert.mockReset();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'company_name',
  'domain',
  'plan',
  'contact_name',
  'contact_email',
  'contact_phone',
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

// Valid values for each field
const VALID_VALUES: Record<RequiredField, string> = {
  company_name: 'Acme Corp',
  domain: 'acme.co.zw',
  plan: 'starter',
  contact_name: 'Jane Doe',
  contact_email: 'jane@acme.co.zw',
  contact_phone: '+263771234567',
};

// Label text used to find inputs in the rendered form
const FIELD_LABELS: Record<RequiredField, string> = {
  company_name: 'Company name',
  domain: 'Domain',
  plan: 'Plan',
  contact_name: 'Contact name',
  contact_email: 'Contact email',
  contact_phone: 'Contact phone',
};

// Arbitrary: a non-empty subset of required fields to leave empty/whitespace
const emptySubsetArb = fc
  .subarray([...REQUIRED_FIELDS] as RequiredField[], { minLength: 1 })
  .map((arr) => new Set(arr));

// Whitespace-only strings to use as "empty" values
const whitespaceArb = fc.stringMatching(/^\s+$/);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 9: Form Validation Prevents Submission', () => {
  it('never submits and shows inline errors when required fields are empty', async () => {
    await fc.assert(
      fc.asyncProperty(emptySubsetArb, async (emptyFields) => {
        mockApiRequest.mockReset();
        mockSupabaseInsert.mockReset();

        render(
          <ToastProvider>
            <AddClientForm />
          </ToastProvider>
        );

        // Fill in all fields that are NOT in the empty set
        for (const field of REQUIRED_FIELDS) {
          if (emptyFields.has(field)) continue; // leave empty

          const label = FIELD_LABELS[field];
          if (field === 'plan') {
            const select = screen.getByLabelText(label);
            fireEvent.change(select, { target: { value: VALID_VALUES[field] } });
          } else {
            const input = screen.getByLabelText(label);
            fireEvent.change(input, { target: { value: VALID_VALUES[field] } });
          }
        }

        // Submit the form
        await act(async () => {
          const form = screen.getByTestId('add-client-form');
          fireEvent.submit(form);
        });

        // Backend must NOT have been called
        expect(mockApiRequest).not.toHaveBeenCalled();
        expect(mockSupabaseInsert).not.toHaveBeenCalled();

        // At least one inline error alert must be visible
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);

        cleanup();
      }),
      { numRuns: 20 }
    );
  }, 30000);

  it('never submits when required fields contain only whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(emptySubsetArb, whitespaceArb, async (emptyFields, ws) => {
        mockApiRequest.mockReset();
        mockSupabaseInsert.mockReset();

        render(
          <ToastProvider>
            <AddClientForm />
          </ToastProvider>
        );

        // Fill non-empty fields with valid values; fill empty fields with whitespace
        for (const field of REQUIRED_FIELDS) {
          const label = FIELD_LABELS[field];
          const value = emptyFields.has(field) ? ws : VALID_VALUES[field];

          if (field === 'plan') {
            // plan is a select — whitespace won't be a valid option, so skip filling
            if (!emptyFields.has(field)) {
              fireEvent.change(screen.getByLabelText(label), {
                target: { value: VALID_VALUES[field] },
              });
            }
          } else {
            fireEvent.change(screen.getByLabelText(label), { target: { value } });
          }
        }

        await act(async () => {
          fireEvent.submit(screen.getByTestId('add-client-form'));
        });

        expect(mockApiRequest).not.toHaveBeenCalled();
        expect(mockSupabaseInsert).not.toHaveBeenCalled();

        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);

        cleanup();
      }),
      { numRuns: 20 }
    );
  }, 30000);
});
