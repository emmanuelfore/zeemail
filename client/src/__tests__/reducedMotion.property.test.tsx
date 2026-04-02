import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React, { createRef } from 'react';
import * as fc from 'fast-check';
import PageTransition, { type PageTransitionHandle } from '../components/shared/PageTransition';

/**
 * Property 10: Reduced motion disables animations
 * Validates: Requirements 4.6
 *
 * For any PageTransition component, when prefers-reduced-motion: reduce is active,
 * the Web Animations API should not be called (animation is skipped entirely).
 */
describe('reducedMotion property tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 10: Reduced motion disables animations on mount (fade-in)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (durationMs) => {
          // Stub matchMedia to report prefers-reduced-motion: reduce
          vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          const animateSpy = vi.fn().mockReturnValue({ finished: Promise.resolve() });

          const { container } = render(
            <PageTransition durationMs={durationMs}>
              <div>content</div>
            </PageTransition>
          );

          const div = container.firstChild as HTMLElement;
          div.animate = animateSpy;

          // animate should NOT have been called during mount when reduced motion is active
          expect(animateSpy).not.toHaveBeenCalled();

          vi.unstubAllGlobals();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 10: Reduced motion disables animations on fadeOut', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1000 }),
        async (durationMs) => {
          vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          const ref = createRef<PageTransitionHandle>();
          const animateSpy = vi.fn().mockReturnValue({ finished: Promise.resolve() });

          const { container } = render(
            <PageTransition ref={ref} durationMs={durationMs}>
              <div>content</div>
            </PageTransition>
          );

          const div = container.firstChild as HTMLElement;
          div.animate = animateSpy;

          // Call fadeOut — should resolve without calling animate
          await ref.current!.fadeOut();

          expect(animateSpy).not.toHaveBeenCalled();

          vi.unstubAllGlobals();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 10: Animations ARE applied when reduced motion is not active', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (durationMs) => {
          vi.stubGlobal('matchMedia', (query: string) => ({
            matches: false, // reduced motion NOT active
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          const animateSpy = vi.fn().mockReturnValue({ finished: Promise.resolve() });

          // Patch HTMLElement.prototype.animate before render
          const originalAnimate = HTMLElement.prototype.animate;
          HTMLElement.prototype.animate = animateSpy;

          render(
            <PageTransition durationMs={durationMs}>
              <div>content</div>
            </PageTransition>
          );

          // animate SHOULD have been called during mount
          expect(animateSpy).toHaveBeenCalledWith(
            [{ opacity: 0 }, { opacity: 1 }],
            expect.objectContaining({ duration: durationMs })
          );

          HTMLElement.prototype.animate = originalAnimate;
          vi.unstubAllGlobals();
        }
      ),
      { numRuns: 50 }
    );
  });
});
