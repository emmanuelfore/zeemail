export type Role = 'admin' | 'client';
export type Plan = 'starter' | 'business' | 'pro';
export type ClientStatus =
  | 'active' | 'suspended' | 'pending'
  | 'pending_payment' | 'pending_domain' | 'pending_dns'
  | 'pending_mailboxes' | 'pending_mx' | 'provisioning_error';
export type MailboxStatus = 'active' | 'suspended';
export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected';
export type RegistrationType = 'company' | 'individual' | 'ngo';

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  profile_id: string | null;
  company_name: string;
  domain: string;
  plan: Plan;
  mailbox_limit: number;
  status: ClientStatus;
  domain_registered_at: string | null;
  next_renewal_date: string | null;
  notes: string | null;
  created_at: string;
  domain_owned: boolean;
  mx_verified: boolean;
  mx_verified_at: string | null;
  previous_email_provider: string | null;
  paynow_reference: string | null;
  physical_address: string | null;
  name_servers?: string[];
  dns_status: string | null;
  dns_check_results: any;
  dns_last_checked: string | null;
  cloudflare_zone_id: string | null;
}

export interface Mailbox {
  id: string;
  client_id: string;
  email: string;
  quota_mb: number;
  quota_used_mb?: number;
  status: MailboxStatus;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  description: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  client_id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_name?: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  updated_at: string;
}

export interface ApiError {
  error: string;
  code: string;
}

export interface Lead {
  id: string;
  domain: string | null;
  tld: '.co.zw' | '.com' | null;
  plan: Plan | null;
  company_name: string | null;
  registration_type: RegistrationType | null;
  business_reg_number: string | null;
  org_description: string | null;
  contact_name: string | null;
  contact_position: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  physical_address: string | null;
  letterhead_ready: boolean | null;
  tc_confirmed: boolean | null;
  signed_letter_ready: boolean | null;
  id_ready: boolean | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
}
