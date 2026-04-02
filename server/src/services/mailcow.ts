export class MailcowUnavailableError extends Error {
  code = 'MAILCOW_UNAVAILABLE';

  constructor(message = 'Mailcow unreachable') {
    super(message);
    this.name = 'MailcowUnavailableError';
  }
}

export interface MailcowResponse {
  type?: string;
  msg?: string | string[];
  [key: string]: unknown;
}

export interface AddMailboxParams {
  local_part: string;
  domain: string;
  password: string;
  password2: string;
  quota: number;
  active?: number;
  force_pw_update?: number;
  tls_enforce_in?: number;
  tls_enforce_out?: number;
}

export interface MailcowMailbox {
  username?: string;
  local_part?: string;
  domain?: string;
  quota?: number;
  quota_used?: number;
  active?: number;
  [key: string]: unknown;
}

export interface MailcowStats {
  [key: string]: unknown;
}

export interface MailcowMailboxStats {
  [key: string]: unknown;
}

export interface MailcowService {
  addDomain(domain: string): Promise<MailcowResponse>;
  deleteDomain(domain: string): Promise<MailcowResponse>;
  addMailbox(params: AddMailboxParams): Promise<MailcowResponse>;
  getMailboxes(domain: string): Promise<MailcowMailbox[]>;
  updateMailbox(email: string, attrs: Partial<MailcowMailbox>): Promise<MailcowResponse>;
  deleteMailbox(email: string): Promise<MailcowResponse>;
  resetPassword(email: string, password: string): Promise<MailcowResponse>;
  getOverviewStats(): Promise<MailcowStats>;
  getMailboxStats(email: string): Promise<MailcowMailboxStats>;
  getDkim(domain: string): Promise<{ dkim_txt: string; pubkey: string } | null>;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const cause = (err as NodeJS.ErrnoException & { cause?: { code?: string } }).cause;
    if (cause?.code === 'ECONNREFUSED' || cause?.code === 'ETIMEDOUT') return true;
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) return true;
    // Node fetch wraps network errors
    if (err.message.includes('fetch failed')) return true;
  }
  return false;
}

function getEnv(): { host: string; apiKey: string } {
  const host = process.env.MAILCOW_HOST;
  const apiKey = process.env.MAILCOW_API_KEY;
  if (!host || !apiKey) {
    throw new Error('MAILCOW_HOST and MAILCOW_API_KEY must be set in environment variables');
  }
  return { host, apiKey };
}

async function mailcowFetch(
  url: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    return response;
  } catch (err) {
    if (isNetworkError(err)) {
      throw new MailcowUnavailableError();
    }
    throw err;
  }
}

export const mailcowService: MailcowService = {
  async addDomain(domain: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/add/domain`, apiKey, {
      method: 'POST',
      body: JSON.stringify({
        domain,
        description: '',
        aliases: 0,
        mailboxes: 10,
        defquota: 3072,
        maxquota: 10240,
        quota: 10240,
        active: 1,
        relay_all_recipients: 0,
      }),
    });
    return response.json();
  },

  async deleteDomain(domain: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/delete/domain`, apiKey, {
      method: 'POST',
      body: JSON.stringify([domain]),
    });
    return response.json();
  },

  async addMailbox(params: AddMailboxParams): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/add/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.json();
  },

  async getMailboxes(domain: string): Promise<MailcowMailbox[]> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(
      `${host}/api/v1/get/mailbox/all/${domain}`,
      apiKey,
      { method: 'GET' }
    );
    return response.json();
  },

  async updateMailbox(email: string, attrs: Partial<MailcowMailbox>): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/edit/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ items: [email], attr: attrs }),
    });
    return response.json();
  },

  async deleteMailbox(email: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/delete/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify([email]),
    });
    return response.json();
  },

  async resetPassword(email: string, password: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(`${host}/api/v1/edit/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ items: [email], attr: { password, password2: password } }),
    });
    return response.json();
  },

  async getOverviewStats(): Promise<MailcowStats> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(
      `${host}/api/v1/get/status/containers`,
      apiKey,
      { method: 'GET' }
    );
    return response.json();
  },

  async getMailboxStats(email: string): Promise<MailcowMailboxStats> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(
      `${host}/api/v1/get/mailbox/${email}`,
      apiKey,
      { method: 'GET' }
    );
    return response.json();
  },

  async getDkim(domain: string): Promise<{ dkim_txt: string; pubkey: string } | null> {
    const { host, apiKey } = getEnv();
    const response = await mailcowFetch(
      `${host}/api/v1/get/dkim/${domain}`,
      apiKey,
      { method: 'GET' }
    );
    const data = (await response.json()) as any;
    if (data && data.dkim_txt) {
      // Sometimes it returns the exact string like v=DKIM1;k=rsa;p=...
      return { dkim_txt: data.dkim_txt, pubkey: data.pubkey };
    }
    return null;
  },
};
