/**
 * Manual mock for the `resend` npm package.
 * Used by vitest via the alias in vitest.config.ts.
 */
import { vi } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' });

const MockResend = vi.fn(function (this: Record<string, unknown>) {
  this.emails = { send: mockSend };
});

export { mockSend };
export const Resend = MockResend;
export default MockResend;
