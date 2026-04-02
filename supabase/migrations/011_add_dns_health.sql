ALTER TABLE clients
  ADD COLUMN dns_status TEXT DEFAULT 'unchecked',
  ADD COLUMN dns_check_results JSONB,
  ADD COLUMN dns_last_checked TIMESTAMP WITH TIME ZONE,
  ADD COLUMN cloudflare_zone_id TEXT;
