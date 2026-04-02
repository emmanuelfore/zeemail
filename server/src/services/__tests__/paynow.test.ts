/**
 * Unit tests for PaynowService.initiatePayment
 * Validates: Requirements 7.2, 7.5
 *
 * The paynow package is aliased to server/src/__mocks__/paynow.ts via vitest.config.ts,
 * so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Paynow } from 'paynow';
import { PaynowService, PaynowUnavailableError } from '../paynow';

const MockPaynow = vi.mocked(Paynow);

describe('PaynowService.initiatePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYNOW_INTEGRATION_ID = 'test-id';
    process.env.PAYNOW_INTEGRATION_KEY = 'test-key';
  });

  it('constructs Paynow with credentials from env vars', async () => {
    await PaynowService.initiatePayment('client-1', 50, 'user@example.com', '0771234567');

    expect(MockPaynow).toHaveBeenCalledWith('test-id', 'test-key');
  });

  it('calls createPayment with a reference containing the clientId', async () => {
    const result = await PaynowService.initiatePayment(
      'client-42',
      50,
      'user@example.com',
      '0771234567'
    );

    const instance = MockPaynow.mock.instances[0] as {
      createPayment: ReturnType<typeof vi.fn>;
    };

    expect(instance.createPayment).toHaveBeenCalledOnce();
    const [referenceArg] = instance.createPayment.mock.calls[0] as [string, string];
    expect(referenceArg).toContain('client-42');
    expect(result.reference).toContain('client-42');
  });

  it('calls createPayment with the email address', async () => {
    await PaynowService.initiatePayment('client-1', 50, 'billing@acme.co.zw', '0771234567');

    const instance = MockPaynow.mock.instances[0] as {
      createPayment: ReturnType<typeof vi.fn>;
    };
    const [, emailArg] = instance.createPayment.mock.calls[0] as [string, string];
    expect(emailArg).toBe('billing@acme.co.zw');
  });

  it('calls payment.add with a non-empty description and the correct amount', async () => {
    const mockAdd = vi.fn();
    MockPaynow.mockImplementationOnce(function (this: Record<string, unknown>) {
      const mockPayment = { add: mockAdd };
      this.createPayment = vi.fn(() => mockPayment);
      this.sendMobile = vi.fn().mockResolvedValue({
        success: true,
        redirectUrl: 'https://paynow.co.zw/redirect',
        pollUrl: 'https://paynow.co.zw/poll/abc',
      });
    });

    await PaynowService.initiatePayment('client-99', 120, 'user@example.com', '0771234567');

    expect(mockAdd).toHaveBeenCalledOnce();
    const [description, amount] = mockAdd.mock.calls[0] as [string, number];
    expect(typeof description).toBe('string');
    expect(description.length).toBeGreaterThan(0);
    expect(amount).toBe(120);
  });

  it('calls sendMobile with the payment object, correct phone, and "ecocash"', async () => {
    const mockSendMobile = vi.fn().mockResolvedValue({
      success: true,
      redirectUrl: 'https://paynow.co.zw/redirect',
      pollUrl: 'https://paynow.co.zw/poll/abc',
    });

    MockPaynow.mockImplementationOnce(function (this: Record<string, unknown>) {
      this.createPayment = vi.fn(() => ({ add: vi.fn() }));
      this.sendMobile = mockSendMobile;
    });

    await PaynowService.initiatePayment('client-7', 75, 'user@example.com', '0779876543');

    expect(mockSendMobile).toHaveBeenCalledOnce();
    const [, phone, method] = mockSendMobile.mock.calls[0] as [unknown, string, string];
    expect(phone).toBe('0779876543');
    expect(method).toBe('ecocash');
  });

  it('returns redirectUrl, pollUrl, and reference from the Paynow response', async () => {
    MockPaynow.mockImplementationOnce(function (this: Record<string, unknown>) {
      this.createPayment = vi.fn(() => ({ add: vi.fn() }));
      this.sendMobile = vi.fn().mockResolvedValue({
        success: true,
        redirectUrl: 'https://paynow.co.zw/redirect/xyz',
        pollUrl: 'https://paynow.co.zw/poll/xyz',
      });
    });

    const result = await PaynowService.initiatePayment(
      'client-5',
      200,
      'user@example.com',
      '0771111111'
    );

    expect(result.redirectUrl).toBe('https://paynow.co.zw/redirect/xyz');
    expect(result.pollUrl).toBe('https://paynow.co.zw/poll/xyz');
    expect(result.reference).toContain('client-5');
  });

  it('throws PaynowUnavailableError when sendMobile returns success: false', async () => {
    MockPaynow.mockImplementationOnce(function (this: Record<string, unknown>) {
      this.createPayment = vi.fn(() => ({ add: vi.fn() }));
      this.sendMobile = vi.fn().mockResolvedValue({ success: false });
    });

    await expect(
      PaynowService.initiatePayment('client-1', 50, 'user@example.com', '0771234567')
    ).rejects.toThrow(PaynowUnavailableError);
  });

  it('throws when PAYNOW_INTEGRATION_ID is missing', async () => {
    delete process.env.PAYNOW_INTEGRATION_ID;

    await expect(
      PaynowService.initiatePayment('client-1', 50, 'user@example.com', '0771234567')
    ).rejects.toThrow();
  });

  it('throws when PAYNOW_INTEGRATION_KEY is missing', async () => {
    delete process.env.PAYNOW_INTEGRATION_KEY;

    await expect(
      PaynowService.initiatePayment('client-1', 50, 'user@example.com', '0771234567')
    ).rejects.toThrow();
  });
});
