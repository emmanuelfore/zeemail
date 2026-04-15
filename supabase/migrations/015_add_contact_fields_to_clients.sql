-- Migration 015: Add contact info columns to clients table
-- These are needed for the ProvisioningEngine to send notifications

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email     TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT;
