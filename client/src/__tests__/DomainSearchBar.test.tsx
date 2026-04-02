import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DomainSearchBar from '../components/landing/DomainSearchBar';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeAvailableResponse(available: boolean) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ available }),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function searchDomain(name: string, tld = '.co.zw') {
  const user = userEvent.setup();
  render(<DomainSearchBar />);

  await user.clear(screen.getByLabelText('Domain name'));
  await user.type(screen.getByLabelText('Domain name'), name);

  if (tld !== '.co.zw') {
    await user.selectOptions(screen.getByLabelText('TLD'), tld);
  }

  await user.click(screen.getByLabelText('Check availability'));
}

describe('DomainSearchBar', () => {
  it('shows green pill and register button when domain is available', async () => {
    // .co.zw search triggers parallel .com check too
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: true }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: true }) } as Response);

    await searchDomain('acme');

    await waitFor(() => {
      expect(screen.getByTestId('pill-available-.co.zw')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Register this domain').length).toBeGreaterThan(0);
  });

  it('shows red pill and alternative chips when domain is taken', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: false }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: false }) } as Response);

    await searchDomain('acme');

    await waitFor(() => {
      expect(screen.getByTestId('pill-taken-.co.zw')).toBeInTheDocument();
    });
    // chips are scoped by parent TLD (cozw = .co.zw row)
    expect(screen.getByTestId('chip-cozw-acme.com')).toBeInTheDocument();
    expect(screen.getByTestId('chip-cozw-getacme.co.zw')).toBeInTheDocument();
    expect(screen.getByTestId('chip-cozw-myacme.co.zw')).toBeInTheDocument();
  });

  it('chip click triggers a new availability check', async () => {
    const user = userEvent.setup();

    // Initial search: taken
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: false }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: false }) } as Response);

    render(<DomainSearchBar />);
    await user.type(screen.getByLabelText('Domain name'), 'acme');
    await user.click(screen.getByLabelText('Check availability'));

    await waitFor(() => {
      expect(screen.getByTestId('chip-cozw-acme.com')).toBeInTheDocument();
    });

    // Chip click: available
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: () => Promise.resolve({ available: true }),
    } as Response);

    await user.click(screen.getByTestId('chip-cozw-acme.com'));

    await waitFor(() => {
      expect(screen.getByTestId('pill-available-.com')).toBeInTheDocument();
    });
    // fetch called 3 times total (2 for initial .co.zw, 1 for .com chip)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('.co.zw search triggers parallel .com check and shows both results', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: true }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: false }) } as Response);

    await searchDomain('acme', '.co.zw');

    await waitFor(() => {
      expect(screen.getByTestId('pill-available-.co.zw')).toBeInTheDocument();
      expect(screen.getByTestId('pill-taken-.com')).toBeInTheDocument();
    });

    // Both TLDs were fetched
    const calls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(calls.some((u) => u.includes('tld=.co.zw') || u.includes('tld=%2Eco%2Ezw') || u.includes('.co.zw'))).toBe(true);
    expect(calls.some((u) => u.includes('tld=.com') || u.includes('tld=%2Ecom') || u.includes('.com'))).toBe(true);
  });

  it('shows inline error for invalid characters without calling API', async () => {
    const user = userEvent.setup();
    render(<DomainSearchBar />);

    await user.type(screen.getByLabelText('Domain name'), 'acme!');
    await user.click(screen.getByLabelText('Check availability'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Domain names can only contain letters, numbers and hyphens'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows inline error for domain name shorter than 3 chars', async () => {
    const user = userEvent.setup();
    render(<DomainSearchBar />);

    await user.type(screen.getByLabelText('Domain name'), 'ab');
    await user.click(screen.getByLabelText('Check availability'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Domain name must be at least 3 characters'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows connection error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await searchDomain('acme');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Connection error. Please check your internet and try again.'
      );
    });
  });

  it('shows WHOIS unavailable message on 503', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) } as Response);

    await searchDomain('acme');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Domain check temporarily unavailable. Submit your details and we'll verify availability for you."
      );
    });
  });
});
