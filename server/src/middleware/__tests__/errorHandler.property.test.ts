/**
 * Property 7: Error handler response shape
 * Validates: Requirements 2.6
 *
 * For any arbitrary error object, errorHandler always responds with
 * { error: string, code: string } and a numeric status.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { errorHandler } from '../errorHandler';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('Property 7 – errorHandler response shape', () => {
  it('always returns { error: string, code: string } with a numeric status', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string(),
          status: fc.option(fc.integer({ min: 400, max: 599 }), { nil: undefined }),
          statusCode: fc.option(fc.integer({ min: 400, max: 599 }), { nil: undefined }),
          code: fc.option(fc.string(), { nil: undefined }),
        }),
        (errFields) => {
          const err = Object.assign(new Error(errFields.message), errFields);
          const res = makeRes();

          errorHandler(err, {} as any, res as any, vi.fn());

          // status call arg must be a number
          const statusArg = (res.status as ReturnType<typeof vi.fn>).mock.calls[0][0];
          expect(typeof statusArg).toBe('number');

          // json body must have { error: string, code: string }
          const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
          expect(typeof body.error).toBe('string');
          expect(typeof body.code).toBe('string');
        }
      )
    );
  });
});
