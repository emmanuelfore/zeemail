ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS dkim_tokens JSONB,
  ADD COLUMN IF NOT EXISTS relay_verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS relay_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS relay_line TEXT,
  ADD COLUMN IF NOT EXISTS dns_managed_by_us BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS relay_error_message TEXT;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_relay_verification_status_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_relay_verification_status_check CHECK (
    relay_verification_status IN ('pending', 'verified', 'failed')
  );
