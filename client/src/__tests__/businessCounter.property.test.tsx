import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import * as fc from 'fast-check';
import BusinessCounter from '../components/landing/BusinessCounter';

/**
 * Property tests for BusinessCounter component.
 * Validates: Requirements 2.4, 2.5, 2.6
 */

// Helper: stub IntersectionObserver and immediately fire the callback
function stubIntersectionObserver(intersecting: boolean) {
  const disconnectSpy = vi.fn();
  let capturedCallback: IntersectionObserverCallback | null = null;
  let capturedElement: Element | null = null;

  vi.stubGlobal(
    'IntersectionObserver',
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        capturedCallback = cb;
      }
      observe(el: Element) {
        capturedElement = el;
      }
      disconnect = disconnectSpy;
      unobserve = vi.fn();
    }
  );

  return {
    disconnectSpy,
    fire: () => {
      if (capturedCallback && capturedElement) {
        capturedCallback(
          [{ isIntersecting: intersecting, target: capturedElement } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      }
    },
  };
}

// Helper: stub matchMedia
function stubMatchMedia(prefersReducedMotion: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersReducedMotion && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Helper: stub requestAnimationFrame to run synchronously to completion
function stubRaf() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    // Run with a timestamp far enough to complete the animation
    cb(99999);
    return 0;
  });
}

describe('BusinessCounter property tests', () => {
  beforeEach(() => {
    stubMatchMedia(true); // prefers-reduced-motion: reduce → jump to final value
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Property 1: BusinessCounter reaches target value
   * Validates: Requirements 2.4
   *
   * For any target count N, after the IntersectionObserver fires and the animation
   * completes, the displayed counter value should equal N.
   */
  it('Property 1: BusinessCounter reaches target value after animation completes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        (target) => {
          const { fire } = stubIntersectionObserver(true);

          const { container } = render(<BusinessCounter target={target} />);

          act(() => {
            fire();
          });

          // With reduced motion active, count jumps directly to target
          const text = container.textContent ?? '';
          expect(text).toContain(`${target}+`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: BusinessCounter format string
   * Validates: Requirements 2.5
   *
   * For any count N, the BusinessCounter should render text matching the pattern
   * "Trusted by N+ businesses in Zimbabwe".
   */
  it('Property 2: BusinessCounter format string matches "Trusted by N+ businesses in Zimbabwe"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        (target) => {
          const { fire } = stubIntersectionObserver(true);

          const { container } = render(<BusinessCounter target={target} />);

          act(() => {
            fire();
          });

          const text = container.textContent ?? '';
          expect(text).toMatch(new RegExp(`Trusted by\\s+${target}\\+\\s+businesses in Zimbabwe`));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2b: BusinessCounter format string with custom label
   * Validates: Requirements 2.5
   */
  it('Property 2b: BusinessCounter format string uses custom label when provided', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (target, label) => {
          const { fire } = stubIntersectionObserver(true);

          const { container } = render(<BusinessCounter target={target} label={label} />);

          act(() => {
            fire();
          });

          const text = container.textContent ?? '';
          expect(text).toContain(`${target}+`);
          expect(text).toContain(label);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: BusinessCounter does not replay
   * Validates: Requirements 2.6
   *
   * For any BusinessCounter that has already completed its animation, triggering
   * the IntersectionObserver callback again should not change the displayed value
   * or restart the animation.
   */
  it('Property 3: BusinessCounter does not replay after first animation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        (target) => {
          const disconnectSpy = vi.fn();
          let capturedCallback: IntersectionObserverCallback | null = null;
          let capturedElement: Element | null = null;

          vi.stubGlobal(
            'IntersectionObserver',
            class MockIntersectionObserver {
              constructor(cb: IntersectionObserverCallback) {
                capturedCallback = cb;
              }
              observe(el: Element) {
                capturedElement = el;
              }
              disconnect = disconnectSpy;
              unobserve = vi.fn();
            }
          );

          const { container } = render(<BusinessCounter target={target} />);

          const fireEntry = () => {
            if (capturedCallback && capturedElement) {
              capturedCallback(
                [{ isIntersecting: true, target: capturedElement } as IntersectionObserverEntry],
                {} as IntersectionObserver
              );
            }
          };

          // First intersection — triggers animation
          act(() => {
            fireEntry();
          });

          const textAfterFirst = container.textContent ?? '';

          // Second intersection — should be ignored (observer already disconnected)
          act(() => {
            fireEntry();
          });

          const textAfterSecond = container.textContent ?? '';

          // Value should not change after second trigger
          expect(textAfterSecond).toBe(textAfterFirst);

          // Observer should have been disconnected exactly once
          expect(disconnectSpy).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
