-- Migration 009: Self-service onboarding schema changes
-- Adds new columns and expands status constraint on the clients table
-- Uses IF NOT EXISTS / IF EXISTS guards so it is safe to re-run

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS domain_owned              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mx_verified               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mx_verified_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_email_provider   TEXT,
  ADD COLUMN IF NOT EXISTS paynow_reference          TEXT,
  ADD COLUMN IF NOT EXISTS physical_address          TEXT;

-- Drop and recreate the status check constraint with all new statuses
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check CHECK (
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
