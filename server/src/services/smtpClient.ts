import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SentEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
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

function getSmtpConfig(): { host: string; port: number; secure: boolean } {
  const mailcowHost = process.env.MAILCOW_HOST?.replace(/^https?:\/\//, '') || 'mail.example.com';
  return {
    host: mailcowHost,
    port: 587,
    secure: false, // STARTTLS
  };
}

export class SmtpClientService {
  private async createTransporter(email: string) {
    const credentials = await getMailcowCredentials(email);
    const config = getSmtpConfig();

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: credentials.email,
        pass: credentials.password,
      },
      tls: {
        rejectUnauthorized: false, // For self-signed certificates in development
      },
    });
  }

  async sendEmail(params: SendEmailParams): Promise<SentEmailResult> {
    const transporter = await this.createTransporter(params.from);

    const mailOptions = {
      from: params.from,
      to: params.to.join(', '),
      cc: params.cc?.join(', '),
      bcc: params.bcc?.join(', '),
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
    };
  }

  async testConnection(email: string): Promise<boolean> {
    try {
      const transporter = await this.createTransporter(email);
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const smtpClientService = new SmtpClientService();
