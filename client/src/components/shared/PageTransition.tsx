import React, { useRef, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';

export interface PageTransitionHandle {
  fadeOut: () => Promise<void>;
}

interface PageTransitionProps {
  children: React.ReactNode;
  durationMs?: number;
}

const PageTransition = forwardRef<PageTransitionHandle, PageTransitionProps>(
  ({ children, durationMs = 200 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      fadeOut: async () => {
        if (!containerRef.current) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const animation = containerRef.current.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: durationMs, easing: 'ease-in', fill: 'forwards' }
        );

        await animation.finished;
      },
    }));

    useLayoutEffect(() => {
      if (!containerRef.current) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      containerRef.current.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: durationMs, easing: 'ease-out', fill: 'forwards' }
      );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        {children}
      </div>
    );
  }
);

PageTransition.displayName = 'PageTransition';

export default PageTransition;
