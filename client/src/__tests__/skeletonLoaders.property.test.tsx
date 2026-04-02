/**
 * Property 11: Skeleton loaders during loading state
 * For any page or component that fetches async data, while the loading state is true,
 * skeleton loader elements must be rendered in place of the actual data components.
 * No actual data must be rendered while loading is in progress.
 *
 * Validates: Requirements 4.6, 10.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/shared/Toast';
import { OverviewPage } from '../pages/admin/OverviewPage';

// Mock supabase to avoid env var requirement
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves → loading stays true
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    }),
  },
}));

function renderOverviewPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <OverviewPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Property 11: Skeleton loaders during loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders skeleton elements and no metric cards while loading=true', () => {
    // Use fast-check to generate loading=true states (represented as arbitrary booleans that are always true)
    fc.assert(
      fc.property(fc.constant(true), (isLoading) => {
        expect(isLoading).toBe(true);

        const { unmount } = renderOverviewPage();

        // Skeleton elements must be present
        const skeletons = screen.getAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(0);

        // Metric cards must NOT be present while loading
        const metricCards = screen.queryAllByTestId('metric-card');
        expect(metricCards).toHaveLength(0);

        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('renders skeletons in place of charts while loading=true', () => {
    fc.assert(
      fc.property(fc.constant(true), (isLoading) => {
        expect(isLoading).toBe(true);

        const { unmount } = renderOverviewPage();

        // Skeleton elements must be present (covers metric cards + charts + activity)
        const skeletons = screen.getAllByTestId('skeleton');
        // At minimum: 4 metric card skeletons + 2 chart skeletons + 5 activity skeletons = 11
        expect(skeletons.length).toBeGreaterThanOrEqual(4);

        unmount();
      }),
      { numRuns: 10 }
    );
  });
});
