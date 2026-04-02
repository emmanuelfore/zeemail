/**
 * Unit tests for POST /api/leads
 * Validates: Requirements 24.1, 24.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import leadsRouter from '../leads';
import { errorHandler } from '../../middleware/errorHandler';

// Mock supabaseAdmin
vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '../../lib/supabaseAdmin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadsRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with id when valid body is provided', async () => {
    const mockId = 'abc-123';

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: mockId }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: mockInsert } as ReturnType<typeof supabaseAdmin.from>);

    const res = await request(buildApp())
      .post('/api/leads')
      .send({
        contact_name: 'Jane Doe',
        contact_email: 'jane@example.com',
        contact_phone: '+263771234567',
        company_name: 'Acme Corp',
        plan: 'starter',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: mockId });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_name: 'Jane Doe',
        contact_email: 'jane@example.com',
        contact_phone: '+263771234567',
        status: 'new',
      })
    );
  });

  it('returns 422 when contact_name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/leads')
      .send({
        contact_email: 'jane@example.com',
        contact_phone: '+263771234567',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when contact_email is missing', async () => {
    const res = await request(buildApp())
      .post('/api/leads')
      .send({
        contact_name: 'Jane Doe',
        contact_phone: '+263771234567',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when contact_phone is missing', async () => {
    const res = await request(buildApp())
      .post('/api/leads')
      .send({
        contact_name: 'Jane Doe',
        contact_email: 'jane@example.com',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('inserts with status=new regardless of body status field', async () => {
    const mockId = 'xyz-456';

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: mockId }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: mockInsert } as ReturnType<typeof supabaseAdmin.from>);

    await request(buildApp())
      .post('/api/leads')
      .send({
        contact_name: 'Bob',
        contact_email: 'bob@example.com',
        contact_phone: '+1234567890',
        status: 'converted', // should be overridden
      });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'new' })
    );
  });
});
