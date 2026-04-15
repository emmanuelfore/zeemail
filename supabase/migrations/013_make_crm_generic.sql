-- Add generic fields to CRM contacts
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS phone_2 TEXT,
ADD COLUMN IF NOT EXISTS lead_quality TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure industry is still there (it is, but category might be used instead)
-- We can alias category to industry in the frontend or just have both.
