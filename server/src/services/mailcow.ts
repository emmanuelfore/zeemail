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
): Promise<MailcowResponse> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  }).catch((err) => {
    if (isNetworkError(err)) {
      throw new MailcowUnavailableError();
    }
    throw err;
  });

  const data = await response.json() as any;

  // Handle Mailcow error responses
  // They often come as an array of objects: [{ type: 'error', msg: '...' }]
  // or a single object: { type: 'error', msg: '...' }
  const normalized = Array.isArray(data) ? data[0] : data;
  if (normalized?.type === 'error' && !normalized.msg?.includes('already exists')) {
    throw new Error(`Mailcow error: ${normalized.msg}`);
  }

  return data;
}

export const mailcowService: MailcowService = {
  async addDomain(domain: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/add/domain`, apiKey, {
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
  },

  async deleteDomain(domain: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/delete/domain`, apiKey, {
      method: 'POST',
      body: JSON.stringify([domain]),
    });
  },

  async addMailbox(params: AddMailboxParams): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/add/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getMailboxes(domain: string): Promise<MailcowMailbox[]> {
    const { host, apiKey } = getEnv();
    return (await mailcowFetch(
      `${host}/api/v1/get/mailbox/all/${domain}`,
      apiKey,
      { method: 'GET' }
    )) as unknown as MailcowMailbox[];
  },

  async updateMailbox(email: string, attrs: Partial<MailcowMailbox>): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/edit/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ items: [email], attr: attrs }),
    });
  },

  async deleteMailbox(email: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/delete/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify([email]),
    });
  },

  async resetPassword(email: string, password: string): Promise<MailcowResponse> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(`${host}/api/v1/edit/mailbox`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ items: [email], attr: { password, password2: password } }),
    });
  },

  async getOverviewStats(): Promise<MailcowStats> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(
      `${host}/api/v1/get/status/containers`,
      apiKey,
      { method: 'GET' }
    );
  },

  async getMailboxStats(email: string): Promise<MailcowMailboxStats> {
    const { host, apiKey } = getEnv();
    return mailcowFetch(
      `${host}/api/v1/get/mailbox/${email}`,
      apiKey,
      { method: 'GET' }
    );
  },

  async getDkim(domain: string): Promise<{ dkim_txt: string; pubkey: string } | null> {
    const { host, apiKey } = getEnv();
    const data = (await mailcowFetch(
      `${host}/api/v1/get/dkim/${domain}`,
      apiKey,
      { method: 'GET' }
    )) as any;
    if (data && data.dkim_txt) {
      // Sometimes it returns the exact string like v=DKIM1;k=rsa;p=...
      return { dkim_txt: data.dkim_txt, pubkey: data.pubkey };
    }
    return null;
  },

  async getDomain(domain: string): Promise<any | null> {
    const { host, apiKey } = getEnv();
    try {
      const data = await mailcowFetch(`${host}/api/v1/get/domain/${domain}`, apiKey, {
        method: 'GET',
      });
      // Mailcow returns an object for the domain if it exists, or empty array/null if not
      if (data && (Array.isArray(data) ? data.length > 0 : data.domain === domain)) {
        return Array.isArray(data) ? data[0] : data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async getDomains(): Promise<any[]> {
    const { host, apiKey } = getEnv();
    const data = await mailcowFetch(`${host}/api/v1/get/domain/all`, apiKey, {
      method: 'GET',
    });
    const domains = Array.isArray(data) ? data : [];
    
    // Normalize fields for frontend
    return domains.map(d => ({
      domain: d.domain,
      description: d.description,
      max_quota: Number(d.quota), // Mailcow returns max quota in MiB
      quota_used: Math.round(Number(d.quota_used) / 1024 / 1024), // Mailcow returns used in Bytes, convert to MiB
      max_mailboxes: Number(d.max_mailboxes),
      mailboxes_count: Number(d.mboxes_in_domain || 0),
      active: d.active === "1" || d.active === 1 ? 1 : 0
    }));
  },
};
