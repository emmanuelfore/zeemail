CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID REFERENCES profiles(id),
  company_name          TEXT NOT NULL,
  domain                TEXT NOT NULL UNIQUE,
  plan                  TEXT NOT NULL CHECK (plan IN ('starter', 'business', 'pro')),
  mailbox_limit         INTEGER NOT NULL DEFAULT 5,
  status                TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'pending')),
  domain_registered_at  TIMESTAMPTZ,
  next_renewal_date     TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);
