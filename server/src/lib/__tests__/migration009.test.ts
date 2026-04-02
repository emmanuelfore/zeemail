import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const sqlPath = path.resolve(__dirname, '../../../../supabase/migrations/009_self_service_onboarding.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

describe('Migration 009 - self-service onboarding schema', () => {
  // Requirements 15.1
  it('adds domain_owned column with DEFAULT false', () => {
    expect(sql).toContain('domain_owned');
    expect(sql).toMatch(/domain_owned\s+BOOLEAN\s+NOT NULL\s+DEFAULT false/);
  });

  // Requirements 15.2
  it('adds mx_verified column with DEFAULT false', () => {
    expect(sql).toContain('mx_verified');
    expect(sql).toMatch(/mx_verified\s+BOOLEAN\s+NOT NULL\s+DEFAULT false/);
  });

  // Requirements 15.3
  it('adds mx_verified_at as TIMESTAMPTZ (nullable, no default)', () => {
    expect(sql).toContain('mx_verified_at');
    expect(sql).toMatch(/mx_verified_at\s+TIMESTAMPTZ/);
    // nullable: no NOT NULL constraint
    expect(sql).not.toMatch(/mx_verified_at\s+TIMESTAMPTZ\s+NOT NULL/);
    // no default value
    expect(sql).not.toMatch(/mx_verified_at\s+TIMESTAMPTZ.*DEFAULT/);
  });

  // Requirements 15.4
  it('adds previous_email_provider as TEXT', () => {
    expect(sql).toMatch(/previous_email_provider\s+TEXT/);
  });

  // Requirements 15.5
  it('adds paynow_reference as TEXT', () => {
    expect(sql).toMatch(/paynow_reference\s+TEXT/);
  });

  // Requirements 15.6
  it('adds physical_address as TEXT', () => {
    expect(sql).toMatch(/physical_address\s+TEXT/);
  });

  it('includes all new status values in the constraint', () => {
    expect(sql).toContain("'pending_payment'");
    expect(sql).toContain("'pending_domain'");
    expect(sql).toContain("'pending_dns'");
    expect(sql).toContain("'pending_mailboxes'");
    expect(sql).toContain("'pending_mx'");
    expect(sql).toContain("'provisioning_error'");
  });
});
