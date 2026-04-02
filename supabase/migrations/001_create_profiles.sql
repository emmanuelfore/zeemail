CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  role        TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
