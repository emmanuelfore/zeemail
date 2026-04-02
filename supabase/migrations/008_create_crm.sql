-- CRM tables

CREATE TABLE crm_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name       TEXT,
  owner_name          TEXT,
  phone               TEXT,
  email               TEXT,
  email_type          TEXT CHECK (email_type IN ('professional', 'unprofessional', 'unknown')),
  email_provider      TEXT,
  website             TEXT,
  industry            TEXT,
  city                TEXT,
  address             TEXT,
  google_place_id     TEXT,
  source              TEXT CHECK (source IN ('google_maps', 'manual', 'import')),
  pipeline_stage      TEXT NOT NULL DEFAULT 'new' CHECK (pipeline_stage IN ('new', 'contacted', 'negotiating', 'won', 'lost')),
  pipeline_notes      TEXT,
  last_contacted_at   TIMESTAMPTZ,
  follow_up_date      TIMESTAMPTZ,
  assigned_to         UUID REFERENCES profiles(id),
  converted_client_id UUID REFERENCES clients(id),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('whatsapp', 'call', 'email', 'meeting', 'note')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whatsapp_blasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  message     TEXT NOT NULL,
  recipients  JSONB,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_blasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contacts: admin all" ON crm_contacts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "crm_interactions: admin all" ON crm_interactions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "whatsapp_blasts: admin all" ON whatsapp_blasts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
