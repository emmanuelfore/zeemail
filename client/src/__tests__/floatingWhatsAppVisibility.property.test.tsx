/**
 * Property 26: Floating WhatsApp button visibility
 * The floating WhatsApp button must be absent on /admin/* routes
 * and present on all other routes.
 *
 * Validates: Requirements 26.4
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import { FloatingWhatsApp } from '../components/shared/FloatingWhatsApp';

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FloatingWhatsApp />
    </MemoryRouter>
  );
}

// Arbitrary for /admin/* paths
const adminPathArb = fc.oneof(
  fc.constant('/admin'),
  fc.string({ minLength: 1, maxLength: 30 }).map(s => `/admin/${s}`)
);

// Arbitrary for non-admin paths
const nonAdminPathArb = fc.oneof(
  fc.constantFrom('/', '/portal', '/portal/mailboxes', '/login', '/about'),
  fc.string({ minLength: 0, maxLength: 30 })
    .map(s => `/${s}`)
    .filter(s => !s.startsWith('/admin'))
);

describe('Property 26: Floating WhatsApp button visibility', () => {
  it('button is absent on /admin/* routes', () => {
    fc.assert(
      fc.property(adminPathArb, (path) => {
        const { unmount } = renderAtPath(path);
        const button = screen.queryByLabelText('Chat with support on WhatsApp');
        unmount();
        expect(button).toBeNull();
      }),
      { numRuns: 50 }
    );
  });

  it('button is present on non-admin routes', () => {
    fc.assert(
      fc.property(nonAdminPathArb, (path) => {
        const { unmount } = renderAtPath(path);
        const button = screen.queryByLabelText('Chat with support on WhatsApp');
        unmount();
        expect(button).not.toBeNull();
      }),
      { numRuns: 50 }
    );
  });
});
