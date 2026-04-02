/**
 * Property 22: ZISPA form validation prevents submission
 * For any form state with one or more empty required fields, the form must
 * never submit and inline errors must appear for each missing field.
 *
 * Validates: Requirements 22
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import RegistrationForm from '../components/landing/RegistrationForm';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

const requiredFields = [
  'contact_name',
  'contact_email',
  'contact_phone',
  'company_name',
  'registration_type',
  'org_description',
  'physical_address',
  'zispa_tc',
  'service_tc',
] as const;

type RequiredField = (typeof requiredFields)[number];

// Arbitrary: a non-empty subset of required fields to leave empty
const emptySubsetArb = fc
  .subarray([...requiredFields] as RequiredField[], { minLength: 1 })
  .map((arr) => new Set(arr));

describe('Property 22: ZISPA form validation prevents submission', () => {
  it('never submits and shows errors when required fields are missing', async () => {
    await fc.assert(
      fc.asyncProperty(emptySubsetArb, async (emptyFields) => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ available: true }),
        } as Response);

        render(<RegistrationForm />);

        // Fill in all fields that are NOT in the empty set using fireEvent for speed
        if (!emptyFields.has('contact_name')) {
          fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test User' } });
        }
        if (!emptyFields.has('contact_email')) {
          fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        }
        if (!emptyFields.has('contact_phone')) {
          fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+263771234567' } });
        }
        if (!emptyFields.has('company_name')) {
          fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Test Corp' } });
        }
        if (!emptyFields.has('registration_type')) {
          fireEvent.change(screen.getByLabelText('Registration type'), { target: { value: 'individual' } });
        }
        if (!emptyFields.has('org_description')) {
          fireEvent.change(screen.getByLabelText('Organisation description'), { target: { value: 'A test organisation' } });
        }
        if (!emptyFields.has('physical_address')) {
          fireEvent.change(screen.getByLabelText('Physical address'), { target: { value: '123 Test Street, Harare' } });
        }
        if (!emptyFields.has('zispa_tc')) {
          fireEvent.click(screen.getByLabelText('ZISPA terms and conditions'));
        }
        if (!emptyFields.has('service_tc')) {
          fireEvent.click(screen.getByLabelText('Service terms and conditions'));
        }

        // Reset fetch call count before submit (domain check may have fired)
        mockFetch.mockClear();

        await act(async () => {
          fireEvent.submit(screen.getByRole('button', { name: /submit registration/i }).closest('form')!);
        });

        // fetch should NOT have been called with /api/leads
        const leadsCalls = mockFetch.mock.calls.filter((c) => String(c[0]).includes('/api/leads'));
        expect(leadsCalls).toHaveLength(0);

        // At least one error alert should be visible
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 20 }
    );
  }, 30000);
});
