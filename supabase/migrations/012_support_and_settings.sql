-- Migration 012: Support Messages and System Settings

-- 1. Create support_messages table for threaded conversations
CREATE TABLE support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  message     TEXT NOT NULL,
  is_admin    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Create system_settings table for global config like pricing
CREATE TABLE system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Initialize pricing settings
INSERT INTO system_settings (key, value)
VALUES ('pricing', '{
  "starter": 5,
  "business": 12,
  "pro": 25
}'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- 3. RLS Policies
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- support_messages: clients can see messages for their own tickets, admins see all
CREATE POLICY "support_messages: clients view own" ON support_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    JOIN clients c ON t.client_id = c.id
    WHERE t.id = support_messages.ticket_id AND c.profile_id = auth.uid()
  )
);

CREATE POLICY "support_messages: admin view all" ON support_messages FOR SELECT USING (is_admin());

CREATE POLICY "support_messages: clients insert own" ON support_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets t
    JOIN clients c ON t.client_id = c.id
    WHERE t.id = support_messages.ticket_id AND c.profile_id = auth.uid()
  )
);

CREATE POLICY "support_messages: admin insert any" ON support_messages FOR INSERT WITH CHECK (is_admin());

-- system_settings: public read, admin write
CREATE POLICY "system_settings: anyone can read" ON system_settings FOR SELECT USING (true);
CREATE POLICY "system_settings: admin can update" ON system_settings FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
