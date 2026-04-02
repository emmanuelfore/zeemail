/**
 * Unit tests for ResendService
 * Validates: Requirements 11.7, 12.4, 16.3
 *
 * The resend package is aliased to server/src/__mocks__/resend.ts via vitest.config.ts,
 * so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Resend } from 'resend';
import { ResendService } from '../resend';
import type { ResendClient, MailboxCredential } from '../resend';

const MockResend = vi.mocked(Resend);

const baseClient: ResendClient = {
  id: 'client-1',
  domain: 'acme.co.zw',
  plan: 'starter',
  company_name: 'Acme Corp',
  full_name: 'John Doe',
  email: 'john@acme.co.zw',
  phone: '0771234567',
  status: 'active',
  domain_owned: true,
  mx_verified: true,
  mx_verified_at: null,
  previous_email_provider: null,
  paynow_reference: null,
  physical_address: '1 Main St, Harare',
};

const mailboxes: MailboxCredential[] = [
  { localPart: 'info', quotaMb: 500, password: 'SecurePass1234567', address: 'info@acme.co.zw' },
];

describe('ResendService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.MAILCOW_HOST = 'mail.zeemail.co.zw';
  });

  describe('sendWelcomeEmail', () => {
    it('constructs Resend with the API key from env', async () => {
      await ResendService.sendWelcomeEmail(baseClient, mailboxes);
      expect(MockResend).toHaveBeenCalledWith('test-resend-key');
    });

    it('calls emails.send with the client email as recipient', async () => {
      await ResendService.sendWelcomeEmail(baseClient, mailboxes);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      expect(instance.emails.send).toHaveBeenCalledOnce();
      const [payload] = instance.emails.send.mock.calls[0] as [{ to: string }];
      expect(payload.to).toBe('john@acme.co.zw');
    });

    it('includes the domain in the subject line', async () => {
      await ResendService.sendWelcomeEmail(baseClient, mailboxes);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ subject: string }];
      expect(payload.subject).toContain('acme.co.zw');
    });

    it('includes all mailbox addresses in the email HTML', async () => {
      const multiMailboxes: MailboxCredential[] = [
        { localPart: 'info', quotaMb: 1024, password: 'Pass1111111111111', address: 'info@acme.co.zw' },
        { localPart: 'admin', quotaMb: 1024, password: 'Pass2222222222222', address: 'admin@acme.co.zw' },
      ];

      await ResendService.sendWelcomeEmail(baseClient, multiMailboxes);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ html: string }];
      expect(payload.html).toContain('info@acme.co.zw');
      expect(payload.html).toContain('admin@acme.co.zw');
    });

    it('includes mailbox passwords in the email HTML', async () => {
      await ResendService.sendWelcomeEmail(baseClient, mailboxes);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ html: string }];
      expect(payload.html).toContain('SecurePass1234567');
    });

    it('includes the Mailcow host in the email HTML', async () => {
      await ResendService.sendWelcomeEmail(baseClient, mailboxes);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ html: string }];
      expect(payload.html).toContain('mail.zeemail.co.zw');
    });

    it('throws when RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;

      await expect(ResendService.sendWelcomeEmail(baseClient, mailboxes)).rejects.toThrow(
        'RESEND_API_KEY'
      );
    });
  });

  describe('sendDnsInstructions', () => {
    it('constructs Resend with the API key from env', async () => {
      await ResendService.sendDnsInstructions(baseClient);
      expect(MockResend).toHaveBeenCalledWith('test-resend-key');
    });

    it('calls emails.send with the client email as recipient', async () => {
      await ResendService.sendDnsInstructions(baseClient);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      expect(instance.emails.send).toHaveBeenCalledOnce();
      const [payload] = instance.emails.send.mock.calls[0] as [{ to: string }];
      expect(payload.to).toBe('john@acme.co.zw');
    });

    it('includes the domain in the subject line', async () => {
      await ResendService.sendDnsInstructions(baseClient);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ subject: string }];
      expect(payload.subject).toContain('acme.co.zw');
    });

    it('includes the MX record value in the HTML', async () => {
      await ResendService.sendDnsInstructions(baseClient);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ html: string }];
      // MX record should reference the mailcow host
      expect(payload.html).toContain('mail.zeemail.co.zw');
      expect(payload.html).toContain('MX');
    });

    it('includes the SPF record value in the HTML', async () => {
      await ResendService.sendDnsInstructions(baseClient);

      const instance = MockResend.mock.instances[0] as { emails: { send: ReturnType<typeof vi.fn> } };
      const [payload] = instance.emails.send.mock.calls[0] as [{ html: string }];
      expect(payload.html).toContain('v=spf1');
    });

    it('throws when RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;

      await expect(ResendService.sendDnsInstructions(baseClient)).rejects.toThrow(
        'RESEND_API_KEY'
      );
    });
  });
});
