import { ImapFlow } from 'imapflow';
import { simpleParser, AddressObject } from 'mailparser';
import { supabaseAdmin } from '../lib/supabaseAdmin';

function extractAddressText(address: AddressObject | AddressObject[] | undefined): string {
  if (!address) return '';
  if (Array.isArray(address)) {
    return address.map(a => a.text).join(', ');
  }
  return address.text;
}

function extractAddressArray(address: AddressObject | AddressObject[] | undefined): string[] {
  if (!address) return [];
  if (Array.isArray(address)) {
    return address.map(a => a.text);
  }
  return [address.text];
}

export interface EmailMessage {
  id: string;
  uid: number;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  date: Date;
  flags: string[];
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
  mailbox: string;
}

export interface MailboxInfo {
  name: string;
  path: string;
  count: number;
  unseen: number;
}

interface MailcowCredentials {
  email: string;
  password: string;
}

async function getMailcowCredentials(email: string): Promise<MailcowCredentials> {
  // Get mailbox from Supabase
  const { data: mailbox, error } = await supabaseAdmin
    .from('mailboxes')
    .select('email, client_id')
    .eq('email', email)
    .single();

  if (error || !mailbox) {
    throw new Error('Mailbox not found');
  }

  // Get client to retrieve Mailcow domain
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('domain')
    .eq('id', mailbox.client_id)
    .single();

  if (!client) {
    throw new Error('Client not found');
  }

  // In production, you'd retrieve the actual password from a secure storage
  // For now, we'll use a placeholder - you'll need to implement secure password retrieval
  return {
    email,
    password: 'RETRIEVE_SECURE_PASSWORD', // TODO: Implement secure password retrieval
  };
}

function getImapConfig(): { host: string; port: number; tls: boolean } {
  const mailcowHost = process.env.MAILCOW_HOST?.replace(/^https?:\/\//, '') || 'mail.example.com';
  return {
    host: mailcowHost,
    port: 993,
    tls: true,
  };
}

export class EmailClientService {
  private async createImapConnection(email: string) {
    const credentials = await getMailcowCredentials(email);
    const config = getImapConfig();

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.tls,
      auth: {
        user: credentials.email,
        pass: credentials.password,
      },
      logger: false,
    });

    await client.connect();
    return client;
  }

  async listMailboxes(email: string): Promise<MailboxInfo[]> {
    const client = await this.createImapConnection(email);
    try {
      const mailboxes: MailboxInfo[] = [];
      const mailboxList = await client.list();
      
      for (const mailbox of mailboxList) {
        const status = await client.mailboxOpen(mailbox.path);
        mailboxes.push({
          name: mailbox.name,
          path: mailbox.path,
          count: status.exists,
          unseen: 0, // Will need to search for unseen messages separately
        });
      }
      
      return mailboxes;
    } finally {
      await client.logout();
    }
  }

  async listEmails(email: string, mailbox: string = 'INBOX', limit: number = 50): Promise<EmailMessage[]> {
    const client = await this.createImapConnection(email);
    try {
      await client.mailboxOpen(mailbox);
      
      const messages: EmailMessage[] = [];
      const range = `1:${limit}`;
      
      for await (const message of client.fetch(range, { source: true, envelope: true, flags: true })) {
        if (!message.source) continue;
        
        const parsed = await simpleParser(message.source);
        
        messages.push({
          id: message.uid.toString(),
          uid: message.uid,
          from: extractAddressText(parsed.from),
          to: extractAddressArray(parsed.to),
          cc: extractAddressArray(parsed.cc),
          subject: parsed.subject || '',
          text: parsed.text as string || '',
          html: parsed.html as string || '',
          date: parsed.date || new Date(),
          flags: Array.from(message.flags || []),
          attachments: parsed.attachments?.map((att: any) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
          })) || [],
          mailbox,
        });
      }
      
      return messages;
    } finally {
      await client.logout();
    }
  }

  async getEmail(email: string, uid: number, mailbox: string = 'INBOX'): Promise<EmailMessage | null> {
    const client = await this.createImapConnection(email);
    try {
      await client.mailboxOpen(mailbox);
      
      const message = await client.fetchOne(uid, { source: true, envelope: true, flags: true });
      if (!message || !message.source) return null;
      
      const parsed = await simpleParser(message.source);
      
      return {
        id: message.uid.toString(),
        uid: message.uid,
        from: extractAddressText(parsed.from),
        to: extractAddressArray(parsed.to),
        cc: extractAddressArray(parsed.cc),
        subject: parsed.subject || '',
        text: parsed.text as string || '',
        html: parsed.html as string || '',
        date: parsed.date || new Date(),
        flags: Array.from(message.flags || []),
        attachments: parsed.attachments?.map((att: any) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
        })) || [],
        mailbox,
      };
    } finally {
      await client.logout();
    }
  }

  async markAsRead(email: string, uid: number, mailbox: string = 'INBOX'): Promise<void> {
    const client = await this.createImapConnection(email);
    try {
      await client.mailboxOpen(mailbox);
      await client.messageFlagsAdd(uid, ['\\Seen']);
    } finally {
      await client.logout();
    }
  }

  async deleteEmail(email: string, uid: number, mailbox: string = 'INBOX'): Promise<void> {
    const client = await this.createImapConnection(email);
    try {
      await client.mailboxOpen(mailbox);
      await client.messageDelete(uid);
    } finally {
      await client.logout();
    }
  }

  async moveEmail(email: string, uid: number, fromMailbox: string, toMailbox: string): Promise<void> {
    const client = await this.createImapConnection(email);
    try {
      await client.mailboxOpen(fromMailbox);
      await client.messageMove(uid, toMailbox);
    } finally {
      await client.logout();
    }
  }
}

export const emailClientService = new EmailClientService();
