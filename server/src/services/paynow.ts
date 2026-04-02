/**
 * PaynowService — wraps the `paynow` npm package.
 *
 * The paynow package is imported at the top level so that the vitest alias
 * in vitest.config.ts can substitute the mock during tests.
 *
 * Requirements: 7.1, 7.2, 7.5
 */
import * as paynowMod from 'paynow';

export class PaynowUnavailableError extends Error {
  code = 'PAYNOW_UNAVAILABLE';

  constructor(message = 'Paynow gateway unavailable') {
    super(message);
    this.name = 'PaynowUnavailableError';
  }
}

export interface PaynowResult {
  redirectUrl: string;
  pollUrl: string;
  reference: string;
}

// Thin interface over the parts of the paynow package we use.
interface PaynowPayment {
  add(description: string, amount: number): void;
}

interface PaynowPackage {
  new (integrationId: string, integrationKey: string): {
    createPayment(reference: string, email: string): PaynowPayment;
    sendMobile(
      payment: PaynowPayment,
      phone: string,
      method: string
    ): Promise<{ success: boolean; redirectUrl: string; pollUrl: string }>;
  };
}

/**
 * Resolves the Paynow constructor from the imported module.
 * The package may export the class as the default export or as a named `Paynow` export.
 */
function resolvePaynowClass(): PaynowPackage {
  const mod = paynowMod as unknown as { Paynow?: PaynowPackage; default?: PaynowPackage };
  if (typeof mod.Paynow === 'function') return mod.Paynow as PaynowPackage;
  if (typeof mod.default === 'function') return mod.default as PaynowPackage;
  if (typeof mod === 'function') return mod as unknown as PaynowPackage;
  throw new PaynowUnavailableError('Unexpected paynow module shape');
}

function getCredentials(): { integrationId: string; integrationKey: string } {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  if (!integrationId || !integrationKey) {
    throw new Error(
      'PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY must be set in environment variables'
    );
  }
  return { integrationId, integrationKey };
}

async function initiatePayment(
  clientId: string,
  amount: number,
  email: string,
  phone: string
): Promise<PaynowResult> {
  const { integrationId, integrationKey } = getCredentials();
  const PaynowClass = resolvePaynowClass();

  const paynow = new PaynowClass(integrationId, integrationKey);

  const reference = `client-${clientId}-${Date.now()}`;
  const payment = paynow.createPayment(reference, email);
  payment.add(`Mailcow hosting — ${reference}`, amount);

  const response = await paynow.sendMobile(payment, phone, 'ecocash');

  if (!response.success) {
    throw new PaynowUnavailableError('Paynow payment initiation failed');
  }

  return {
    redirectUrl: response.redirectUrl,
    pollUrl: response.pollUrl,
    reference,
  };
}

export const PaynowService = { initiatePayment };
