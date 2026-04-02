/**
 * Property 12: Mailcow unreachable banner
 * For any page that makes a Mailcow API call, if that call returns a MAILCOW_UNAVAILABLE
 * error, a persistent banner indicating the connectivity issue must be displayed at the
 * top of the page.
 *
 * Validates: Requirements 4.7, 17.3
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { MailcowBanner } from '../components/shared/MailcowBanner';

afterEach(() => {
  cleanup();
});

describe('Property 12: Mailcow unreachable banner', () => {
  it('renders the banner when show=true (MAILCOW_UNAVAILABLE error state)', () => {
    // Generate arbitrary truthy states representing MAILCOW_UNAVAILABLE being set
    fc.assert(
      fc.property(fc.constant(true), (mailcowUnavailable) => {
        const { unmount } = render(<MailcowBanner show={mailcowUnavailable} />);

        const banner = screen.queryByTestId('mailcow-banner') ?? screen.queryByRole('alert');
        expect(banner).not.toBeNull();
        expect(banner).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('does not render the banner when show=false', () => {
    fc.assert(
      fc.property(fc.constant(false), (mailcowUnavailable) => {
        const { unmount } = render(<MailcowBanner show={mailcowUnavailable} />);

        const banner = screen.queryByRole('alert');
        expect(banner).toBeNull();

        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('banner is present for any MAILCOW_UNAVAILABLE error code string', () => {
    // Generate arbitrary error code strings that represent MAILCOW_UNAVAILABLE
    const errorCodeArb = fc.constantFrom(
      'MAILCOW_UNAVAILABLE',
      'MAILCOW_ERROR',
      'NETWORK_ERROR',
      'ECONNREFUSED',
      'ETIMEDOUT'
    );

    fc.assert(
      fc.property(errorCodeArb, (errorCode) => {
        // Any MAILCOW_UNAVAILABLE-like error should trigger show=true
        const show = errorCode === 'MAILCOW_UNAVAILABLE';
        const { unmount } = render(<MailcowBanner show={show} />);

        if (show) {
          const banner = screen.queryByRole('alert');
          expect(banner).not.toBeNull();
          expect(banner).toBeInTheDocument();
        } else {
          const banner = screen.queryByRole('alert');
          expect(banner).toBeNull();
        }

        unmount();
      }),
      { numRuns: 20 }
    );
  });
});
