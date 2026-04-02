/**
 * Unit tests for TwilioService.sendWhatsApp
 * Validates: Requirements 11.8, 12.5, 14.5, 16.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TwilioService, TwilioError } from '../twilio';

const mockFetch = vi.fn();

describe('TwilioService.sendWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
    process.env.TWILIO_AUTH_TOKEN = 'auth-token-abc';
    process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => '{"sid":"SM123"}',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
  });

  it('calls the correct Twilio Messages endpoint', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Hello');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json'
    );
  });

  it('uses POST method with correct Content-Type', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Hello');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    );
  });

  it('sends Basic auth header with base64-encoded credentials', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Hello');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const expected = Buffer.from('ACtest123:auth-token-abc').toString('base64');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Basic ${expected}`
    );
  });

  it('prefixes "to" number with "whatsapp:" when not already prefixed', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Test message');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = init.body as string;
    expect(body).toContain('To=whatsapp%3A%2B263771234567');
  });

  it('does not double-prefix "to" number already starting with "whatsapp:"', async () => {
    await TwilioService.sendWhatsApp('whatsapp:+263771234567', 'Test message');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = init.body as string;
    // Should appear exactly once
    expect(body).toContain('To=whatsapp%3A%2B263771234567');
    expect(body).not.toContain('whatsapp%3Awhatsapp');
  });

  it('sends the From number from TWILIO_WHATSAPP_FROM env var', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Hello');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = init.body as string;
    expect(body).toContain('From=whatsapp%3A%2B14155238886');
  });

  it('sends the message body in the request', async () => {
    await TwilioService.sendWhatsApp('+263771234567', 'Your account is active!');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = init.body as string;
    expect(body).toContain('Body=Your+account+is+active%21');
  });

  it('throws TwilioError when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '{"code":20003,"message":"Authenticate"}',
    });

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      TwilioError
    );
  });

  it('throws TwilioError when TWILIO_ACCOUNT_SID is missing', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      TwilioError
    );
  });

  it('throws TwilioError when TWILIO_AUTH_TOKEN is missing', async () => {
    delete process.env.TWILIO_AUTH_TOKEN;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      TwilioError
    );
  });

  it('throws TwilioError when TWILIO_WHATSAPP_FROM is missing', async () => {
    delete process.env.TWILIO_WHATSAPP_FROM;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      TwilioError
    );
  });

  it('error message names the missing TWILIO_ACCOUNT_SID variable', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      'TWILIO_ACCOUNT_SID'
    );
  });

  it('error message names the missing TWILIO_AUTH_TOKEN variable', async () => {
    delete process.env.TWILIO_AUTH_TOKEN;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      'TWILIO_AUTH_TOKEN'
    );
  });

  it('error message names the missing TWILIO_WHATSAPP_FROM variable', async () => {
    delete process.env.TWILIO_WHATSAPP_FROM;

    await expect(TwilioService.sendWhatsApp('+263771234567', 'Hello')).rejects.toThrow(
      'TWILIO_WHATSAPP_FROM'
    );
  });
});
