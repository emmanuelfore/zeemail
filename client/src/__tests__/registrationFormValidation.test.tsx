/**
 * Task 17.1: Registration form validation unit tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm from '../components/landing/RegistrationForm';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

describe('RegistrationForm validation', () => {
  it('shows inline errors for all required fields when submitted empty', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.click(screen.getByRole('button', { name: /submit registration/i }));

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(9);

    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone / WhatsApp is required')).toBeInTheDocument();
    expect(screen.getByText('Company / organisation name is required')).toBeInTheDocument();
    expect(screen.getByText('Registration type is required')).toBeInTheDocument();
    expect(screen.getByText('Organisation description is required')).toBeInTheDocument();
    expect(screen.getByText('Physical address is required')).toBeInTheDocument();
    expect(screen.getByText('You must accept the ZISPA terms and conditions')).toBeInTheDocument();
    expect(screen.getByText('You must accept the service terms and conditions')).toBeInTheDocument();

    // fetch should NOT have been called (form did not submit)
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('hides business reg number field by default and shows it when type=Company', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    // Not visible initially
    expect(screen.queryByLabelText('Business registration number')).not.toBeInTheDocument();

    // Select "Company"
    await user.selectOptions(screen.getByLabelText('Registration type'), 'company');

    expect(screen.getByLabelText('Business registration number')).toBeInTheDocument();
  });

  it('triggers debounced domain check after 800ms idle', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ available: true }),
    } as Response);

    render(<RegistrationForm />);

    // Use fireEvent to avoid user-event async issues with fake timers
    act(() => {
      fireEvent.change(screen.getByLabelText('Domain name'), { target: { value: 'testdomain' } });
    });

    // Before 800ms — fetch should not have been called
    expect(mockFetch).not.toHaveBeenCalled();

    // Advance exactly 800ms
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/domains/check');

    vi.useRealTimers();
  });

  it('shows degradation message and keeps submit enabled when domain check returns 503', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    render(<RegistrationForm />);

    act(() => {
      fireEvent.change(screen.getByLabelText('Domain name'), { target: { value: 'testdomain' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Allow the async fetch to resolve
    await act(async () => {
      await Promise.resolve();
    });

    const degraded = screen.getByTestId('availability-degraded');
    expect(degraded).toBeInTheDocument();
    expect(degraded).toHaveTextContent(
      "Domain check temporarily unavailable. Submit your details and we'll verify availability for you."
    );

    const submitBtn = screen.getByRole('button', { name: /submit registration/i });
    expect(submitBtn).not.toBeDisabled();

    vi.useRealTimers();
  });
});
