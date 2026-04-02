CREATE TABLE mailboxes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  quota_mb    INTEGER NOT NULL DEFAULT 500,
  status      TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
