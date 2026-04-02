// Feature: self-service-onboarding, Property 18: Missing required env var causes startup failure
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import envGuard from '../envGuard';

const REQUIRED_VARS = [
  'PAYNOW_INTEGRATION_ID',
  'PAYNOW_INTEGRATION_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'APP_URL',
];

describe('envGuard — Property 18: Missing required env var causes startup failure', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of REQUIRED_VARS) {
      savedEnv[key] = process.env[key];
    }
    // Mock process.exit so it doesn't actually exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);
  });

  afterEach(() => {
    // Restore env vars
    for (const key of REQUIRED_VARS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
    exitSpy.mockRestore();
  });

  /**
   * **Validates: Requirements 16.6**
   *
   * Property 18: For any non-empty subset of required env vars that are missing,
   * envGuard() must call process.exit(1).
   */
  it('calls process.exit(1) when any required env var is missing', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_VARS, { minLength: 1 }),
        (missingVars) => {
          // Set all required vars to a dummy value first
          for (const key of REQUIRED_VARS) {
            process.env[key] = 'dummy-value';
          }
          // Delete the subset that should be missing
          for (const key of missingVars) {
            delete process.env[key];
          }

          exitSpy.mockClear();
          envGuard();

          expect(exitSpy).toHaveBeenCalledWith(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Inverse: when all required vars are present, process.exit should NOT be called.
   */
  it('does NOT call process.exit when all required env vars are present', () => {
    for (const key of REQUIRED_VARS) {
      process.env[key] = 'dummy-value';
    }

    exitSpy.mockClear();
    envGuard();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
