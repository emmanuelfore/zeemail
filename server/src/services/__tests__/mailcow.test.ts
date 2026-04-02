import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mailcowService,
  MailcowUnavailableError,
} from '../mailcow';

const MAILCOW_HOST = 'https://mail.example.com';
const MAILCOW_API_KEY = 'test-api-key';

function mockFetchSuccess(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchNetworkError(code: string) {
  const err = new Error(`fetch failed: ${code}`);
  (err as NodeJS.ErrnoException & { cause?: { code: string } }).cause = { code };
  return vi.fn().mockRejectedValue(err);
}

describe('MailcowService', () => {
  beforeEach(() => {
    process.env.MAILCOW_HOST = MAILCOW_HOST;
    process.env.MAILCOW_API_KEY = MAILCOW_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MAILCOW_HOST;
    delete process.env.MAILCOW_API_KEY;
  });

  // ── Endpoint construction ──────────────────────────────────────────────────

  describe('addDomain', () => {
    it('calls POST /api/v1/add/domain with correct body and headers', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success', msg: 'Domain added' }]);
      vi.stubGlobal('fetch', mockFetch);

      await mailcowService.addDomain('example.co.zw');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/add/domain`);
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-API-Key']).toBe(MAILCOW_API_KEY);
      const body = JSON.parse(opts.body);
      expect(body.domain).toBe('example.co.zw');
      expect(body.active).toBe(1);
    });
  });

  describe('deleteDomain', () => {
    it('calls POST /api/v1/delete/domain with domain in array body', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success' }]);
      vi.stubGlobal('fetch', mockFetch);

      await mailcowService.deleteDomain('example.co.zw');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/delete/domain`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(['example.co.zw']);
    });
  });

  describe('addMailbox', () => {
    it('calls POST /api/v1/add/mailbox with params as body', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success' }]);
      vi.stubGlobal('fetch', mockFetch);

      const params = {
        local_part: 'user',
        domain: 'example.co.zw',
        password: 'secret',
        password2: 'secret',
        quota: 512,
      };
      await mailcowService.addMailbox(params);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/add/mailbox`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toMatchObject(params);
    });
  });

  describe('getMailboxes', () => {
    it('calls GET /api/v1/get/mailbox/all/:domain', async () => {
      const mockFetch = mockFetchSuccess([{ username: 'user@example.co.zw' }]);
      vi.stubGlobal('fetch', mockFetch);

      const result = await mailcowService.getMailboxes('example.co.zw');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/get/mailbox/all/example.co.zw`);
      expect(opts.method).toBe('GET');
      expect(result).toEqual([{ username: 'user@example.co.zw' }]);
    });
  });

  describe('updateMailbox', () => {
    it('calls POST /api/v1/edit/mailbox with items and attr', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success' }]);
      vi.stubGlobal('fetch', mockFetch);

      await mailcowService.updateMailbox('user@example.co.zw', { active: 0 });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/edit/mailbox`);
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.items).toEqual(['user@example.co.zw']);
      expect(body.attr).toEqual({ active: 0 });
    });
  });

  describe('deleteMailbox', () => {
    it('calls POST /api/v1/delete/mailbox with email in array body', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success' }]);
      vi.stubGlobal('fetch', mockFetch);

      await mailcowService.deleteMailbox('user@example.co.zw');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/delete/mailbox`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(['user@example.co.zw']);
    });
  });

  describe('resetPassword', () => {
    it('calls POST /api/v1/edit/mailbox with password and password2', async () => {
      const mockFetch = mockFetchSuccess([{ type: 'success' }]);
      vi.stubGlobal('fetch', mockFetch);

      await mailcowService.resetPassword('user@example.co.zw', 'newpass123');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/edit/mailbox`);
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.items).toEqual(['user@example.co.zw']);
      expect(body.attr.password).toBe('newpass123');
      expect(body.attr.password2).toBe('newpass123');
    });
  });

  describe('getOverviewStats', () => {
    it('calls GET /api/v1/get/status/containers', async () => {
      const mockFetch = mockFetchSuccess({ postfix: { running: true } });
      vi.stubGlobal('fetch', mockFetch);

      const result = await mailcowService.getOverviewStats();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/get/status/containers`);
      expect(opts.method).toBe('GET');
      expect(result).toEqual({ postfix: { running: true } });
    });
  });

  describe('getMailboxStats', () => {
    it('calls GET /api/v1/get/mailbox/:email', async () => {
      const mockFetch = mockFetchSuccess({ username: 'user@example.co.zw', quota: 512 });
      vi.stubGlobal('fetch', mockFetch);

      const result = await mailcowService.getMailboxStats('user@example.co.zw');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${MAILCOW_HOST}/api/v1/get/mailbox/user@example.co.zw`);
      expect(opts.method).toBe('GET');
      expect(result).toMatchObject({ username: 'user@example.co.zw' });
    });
  });

  // ── API key header ─────────────────────────────────────────────────────────

  it('sends X-API-Key header on every request', async () => {
    const mockFetch = mockFetchSuccess({});
    vi.stubGlobal('fetch', mockFetch);

    await mailcowService.getOverviewStats();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['X-API-Key']).toBe(MAILCOW_API_KEY);
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  // ── Network errors → MailcowUnavailableError ───────────────────────────────

  describe('network error handling', () => {
    it('throws MailcowUnavailableError on ECONNREFUSED (via cause)', async () => {
      const err = new Error('fetch failed');
      (err as NodeJS.ErrnoException & { cause?: { code: string } }).cause = { code: 'ECONNREFUSED' };
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

      await expect(mailcowService.getOverviewStats()).rejects.toThrow(MailcowUnavailableError);
    });

    it('throws MailcowUnavailableError on ETIMEDOUT (via cause)', async () => {
      const err = new Error('fetch failed');
      (err as NodeJS.ErrnoException & { cause?: { code: string } }).cause = { code: 'ETIMEDOUT' };
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

      await expect(mailcowService.addDomain('test.co.zw')).rejects.toThrow(MailcowUnavailableError);
    });

    it('throws MailcowUnavailableError when error message contains ECONNREFUSED', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError('ECONNREFUSED'));

      await expect(mailcowService.getMailboxes('test.co.zw')).rejects.toThrow(MailcowUnavailableError);
    });

    it('throws MailcowUnavailableError when error message contains ETIMEDOUT', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError('ETIMEDOUT'));

      await expect(mailcowService.deleteMailbox('user@test.co.zw')).rejects.toThrow(MailcowUnavailableError);
    });

    it('MailcowUnavailableError has code MAILCOW_UNAVAILABLE', async () => {
      const err = new Error('fetch failed');
      (err as NodeJS.ErrnoException & { cause?: { code: string } }).cause = { code: 'ECONNREFUSED' };
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

      try {
        await mailcowService.getOverviewStats();
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(MailcowUnavailableError);
        expect((e as MailcowUnavailableError).code).toBe('MAILCOW_UNAVAILABLE');
      }
    });
  });

  // ── Non-2xx responses ──────────────────────────────────────────────────────

  describe('non-2xx Mailcow responses', () => {
    it('returns the parsed error body from Mailcow on 4xx (service does not throw)', async () => {
      // The service returns the raw Mailcow response body; route handlers check for errors
      const errorBody = [{ type: 'danger', msg: 'Domain already exists' }];
      vi.stubGlobal('fetch', mockFetchSuccess(errorBody, 400));

      const result = await mailcowService.addDomain('existing.co.zw');
      expect(result).toEqual(errorBody);
    });

    it('returns the parsed error body from Mailcow on 500', async () => {
      const errorBody = { error: 'Internal server error' };
      vi.stubGlobal('fetch', mockFetchSuccess(errorBody, 500));

      const result = await mailcowService.getOverviewStats();
      expect(result).toEqual(errorBody);
    });
  });
});
