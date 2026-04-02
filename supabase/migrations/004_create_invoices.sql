CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'overdue')),
  due_date    TIMESTAMPTZ NOT NULL,
  paid_at     TIMESTAMPTZ,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
