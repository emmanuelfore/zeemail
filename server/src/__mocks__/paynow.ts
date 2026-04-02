/**
 * Manual mock for the `paynow` npm package.
 * Used by vitest via the alias in vitest.config.ts.
 * Tests can override behaviour with vi.mocked(...).mockImplementationOnce(...)
 */
import { vi } from 'vitest';

const MockPaynow = vi.fn(function (this: Record<string, unknown>) {
  this.createPayment = vi.fn(() => ({ add: vi.fn() }));
  this.sendMobile = vi.fn().mockResolvedValue({
    success: true,
    redirectUrl: 'https://paynow.co.zw/redirect',
    pollUrl: 'https://paynow.co.zw/poll/abc',
  });
});

// Export as both the default export and as `Paynow` to satisfy loadPaynow()'s
// shape check: `mod.Paynow === 'function'`
export const Paynow = MockPaynow;
export default MockPaynow;
