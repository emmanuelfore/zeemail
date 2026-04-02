import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../errorHandler';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('errorHandler middleware', () => {
  it('thrown Error produces { error, code } JSON with 500', () => {
    const err = new Error('Something went wrong');
    const res = makeRes();

    errorHandler(err, {} as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong', code: 'INTERNAL_ERROR' });
  });

  it('thrown object with custom code preserves the code', () => {
    const err = Object.assign(new Error('Not found'), { status: 404, code: 'NOT_FOUND' });
    const res = makeRes();

    errorHandler(err, {} as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', code: 'NOT_FOUND' });
  });
});
