// Feature: self-service-onboarding, Property 1: Path switching resets domain fields
/**
 * Property 1: Path switching resets domain fields
 * For any non-empty domain input value, switching between Path A and Path B
 * should result in the domain field being cleared and the availability state
 * returning to `idle`.
 *
 * Validates: Requirements 1.4
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import PathToggle from '../components/register/PathToggle';

afterEach(() => {
  cleanup();
});

describe('Property 1: Path switching resets domain fields', () => {
  it('calls onReset whenever the path changes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.constantFrom<'A' | 'B'>('A', 'B'),
        (domainValue, startingPath) => {
          const onPathChange = vi.fn();
          const onReset = vi.fn();

          render(
            <PathToggle
              path={startingPath}
              onPathChange={onPathChange}
              onReset={onReset}
            />
          );

          // Click the OTHER path button to trigger a switch
          const targetPath: 'A' | 'B' = startingPath === 'A' ? 'B' : 'A';
          const targetTestId = targetPath === 'A' ? 'path-toggle-a' : 'path-toggle-b';

          fireEvent.click(screen.getByTestId(targetTestId));

          // onPathChange must be called with the new path
          expect(onPathChange).toHaveBeenCalledWith(targetPath);
          // onReset must be called to clear domain fields
          expect(onReset).toHaveBeenCalledTimes(1);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT call onReset when clicking the already-active path', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'A' | 'B'>('A', 'B'),
        (currentPath) => {
          const onPathChange = vi.fn();
          const onReset = vi.fn();

          render(
            <PathToggle
              path={currentPath}
              onPathChange={onPathChange}
              onReset={onReset}
            />
          );

          // Click the SAME path button — should be a no-op
          const sameTestId = currentPath === 'A' ? 'path-toggle-a' : 'path-toggle-b';
          fireEvent.click(screen.getByTestId(sameTestId));

          expect(onPathChange).not.toHaveBeenCalled();
          expect(onReset).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
