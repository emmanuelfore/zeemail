import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

describe('glassStyle property tests', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Property 11: glassStyle returns expected CSS properties
   * Validates: Requirements 5.3
   *
   * For any options object passed to glassStyle(), when backdrop-filter is supported,
   * the returned object should always contain backdropFilter, WebkitBackdropFilter,
   * background, and border keys.
   */
  it('Property 11: glassStyle returns expected CSS properties when backdrop-filter is supported', async () => {
    vi.stubGlobal('CSS', { supports: () => true });

    const { glassStyle } = await import('../styles/glass');

    fc.assert(
      fc.property(
        fc.record({
          blur: fc.option(fc.integer({ min: 1, max: 40 }), { nil: undefined }),
          bg: fc.option(
            fc.constantFrom('rgba(13,1,0,0.6)', 'rgba(26,3,1,0.7)', 'rgba(0,0,0,0.5)'),
            { nil: undefined }
          ),
          border: fc.option(
            fc.constantFrom('1px solid rgba(140,16,7,0.3)', '2px solid red'),
            { nil: undefined }
          ),
          fallbackBg: fc.option(fc.constantFrom('var(--surface-container-low)', '#000'), { nil: undefined }),
          fallbackBorder: fc.option(
            fc.constantFrom('1px solid var(--border)', '1px solid #000'),
            { nil: undefined }
          ),
        }),
        (opts) => {
          const result = glassStyle(opts);
          expect(result).toHaveProperty('backdropFilter');
          expect(result).toHaveProperty('WebkitBackdropFilter');
          expect(result).toHaveProperty('background');
          expect(result).toHaveProperty('border');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: glassStyle fallback when backdrop-filter unsupported
   * Validates: Requirements 5.4
   *
   * For any call to glassStyle() where CSS.supports returns false, the returned object
   * should use the fallback background and border values (solid, no blur).
   */
  it('Property 12: glassStyle fallback when backdrop-filter unsupported', async () => {
    vi.stubGlobal('CSS', { supports: () => false });

    const { glassStyle } = await import('../styles/glass');

    fc.assert(
      fc.property(
        fc.record({
          fallbackBg: fc.constantFrom('var(--surface-container-low)', '#000', '#2a0000'),
          fallbackBorder: fc.constantFrom('1px solid var(--border)', '1px solid #000'),
          blur: fc.option(fc.integer({ min: 1, max: 40 }), { nil: undefined }),
          bg: fc.option(fc.constantFrom('rgba(13,1,0,0.6)'), { nil: undefined }),
          border: fc.option(fc.constantFrom('1px solid rgba(140,16,7,0.3)'), { nil: undefined }),
        }),
        (opts) => {
          const result = glassStyle(opts);
          // Should NOT have backdropFilter when unsupported
          expect(result).not.toHaveProperty('backdropFilter');
          expect(result).not.toHaveProperty('WebkitBackdropFilter');
          // Should use fallback values
          expect(result).toHaveProperty('background', opts.fallbackBg);
          expect(result).toHaveProperty('border', opts.fallbackBorder);
        }
      ),
      { numRuns: 100 }
    );
  });
});
