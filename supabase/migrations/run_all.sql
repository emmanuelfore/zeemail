-- Run this entire file in the Supabase SQL Editor to set up all tables and RLS policies
-- Go to: https://supabase.com/dashboard → your project → SQL Editor

-- 001: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  role        TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 002: clients
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID REFERENCES profiles(id),
  company_name          TEXT NOT NULL,
  domain                TEXT NOT NULL UNIQUE,
  plan                  TEXT NOT NULL CHECK (plan IN ('starter', 'business', 'pro')),
  mailbox_limit         INTEGER NOT NULL DEFAULT 5,
  status                TEXT NOT NULL,
  domain_owned          BOOLEAN NOT NULL DEFAULT false,
  mx_verified           BOOLEAN NOT NULL DEFAULT false,
  mx_verified_at        TIMESTAMPTZ,
  previous_email_provider TEXT,
  paynow_reference      TEXT,
  physical_address      TEXT,
  full_name             TEXT,
  email                 TEXT,
  phone                 TEXT,
  name_servers          TEXT[] DEFAULT '{}',
  dns_status            TEXT DEFAULT 'unchecked',
  dns_check_results     JSONB,
  dns_last_checked      TIMESTAMPTZ,
  cloudflare_zone_id    TEXT,
  domain_registered_at  TIMESTAMPTZ,
  next_renewal_date     TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (
  status IN (
    'active',
    'suspended',
    'pending',
    'pending_payment',
    'pending_domain',
    'pending_dns',
    'pending_mailboxes',
    'pending_mx',
    'provisioning_error'
  )
);

-- 003: mailboxes
CREATE TABLE IF NOT EXISTS mailboxes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  quota_mb    INTEGER NOT NULL DEFAULT 500,
  status      TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 004: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'overdue')),
  due_date    TIMESTAMPTZ NOT NULL,
  paid_at     TIMESTAMPTZ,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 005: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 006: leads
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain              TEXT,
  tld                 TEXT CHECK (tld IN ('.co.zw', '.com')),
  plan                TEXT,
  company_name        TEXT,
  registration_type   TEXT CHECK (registration_type IN ('company', 'individual', 'ngo')),
  business_reg_number TEXT,
  org_description     TEXT,
  contact_name        TEXT,
  contact_position    TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  physical_address    TEXT,
  letterhead_ready    BOOLEAN,
  tc_confirmed        BOOLEAN,
  signed_letter_ready BOOLEAN,
  id_ready            BOOLEAN,
  status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 007: RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles policies
CREATE POLICY "profiles: own row read" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: own row update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles: admin read all" ON profiles FOR SELECT USING (is_admin());

-- clients policies
CREATE POLICY "clients: admin all" ON clients FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "clients: portal user own row" ON clients FOR SELECT USING (profile_id = auth.uid());

-- mailboxes policies
CREATE POLICY "mailboxes: admin all" ON mailboxes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "mailboxes: portal user own client" ON mailboxes FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid()));

-- invoices policies
CREATE POLICY "invoices: admin all" ON invoices FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "invoices: portal user own" ON invoices FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid()));

-- support_tickets policies
CREATE POLICY "support_tickets: admin all" ON support_tickets FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "support_tickets: portal user read own" ON support_tickets FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid()));
CREATE POLICY "support_tickets: portal user insert own" ON support_tickets FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid()));

-- leads policies
CREATE POLICY "leads: public insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads: admin read all" ON leads FOR SELECT USING (is_admin());
CREATE POLICY "leads: admin update" ON leads FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
