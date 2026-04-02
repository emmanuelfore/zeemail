# Implementation Plan: Landing Page Redesign

## Overview

Incremental implementation of the ZeeMail landing page redesign in React 18 + TypeScript with inline styles. Tasks build from foundational utilities up through individual sections, then wire everything together in `LandingPage.tsx`.

## Tasks

- [x] 1. Add font tokens and Google Fonts links
  - Add `--font-heading` and `--font-body` CSS custom properties to `client/src/styles/tokens.css`
  - Add `<link rel="preconnect">` and `<link rel="stylesheet">` tags for Inter (400, 500, 600, 700) and Syne (700, 800) with `display=swap` to `client/index.html`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.5_

  - [ ]* 1.1 Write unit tests for font tokens and link tags
    - Verify `tokens.css` contains `--font-heading` and `--font-body`
    - Verify `index.html` contains correct `<link>` tags with `display=swap`
    - Test file: `client/src/__tests__/landingTypography.test.tsx`
    - _Requirements: 1.1, 1.5_

- [x] 2. Create `glass.ts` utility and `useMediaQuery` hook
  - Create `client/src/styles/glass.ts` exporting `glassStyle(opts?: GlassOptions): React.CSSProperties`
  - Implement `CSS.supports` check for `backdrop-filter` and return fallback values when unsupported
  - Create `client/src/hooks/useMediaQuery.ts` using `window.matchMedia` with a `change` listener; return `false` during SSR
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1_

  - [ ]* 2.1 Write property tests for `glassStyle`
    - **Property 11: glassStyle returns expected CSS properties**
    - **Validates: Requirements 5.3**
    - **Property 12: glassStyle fallback when backdrop-filter unsupported**
    - **Validates: Requirements 5.4**
    - Test file: `client/src/__tests__/glassStyle.property.test.ts`

- [x] 3. Implement `PageTransition` component
  - Create `client/src/components/shared/PageTransition.tsx`
  - On mount, play `opacity: [0, 1]` via Web Animations API (default 200ms)
  - Expose `fadeOut(): Promise<void>` via `useImperativeHandle` ref
  - Skip animation entirely when `prefers-reduced-motion: reduce` is active
  - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 3.1 Write property test for reduced motion
    - **Property 10: Reduced motion disables animations**
    - **Validates: Requirements 4.6**
    - Test file: `client/src/__tests__/reducedMotion.property.test.tsx`

- [ ] 4. Implement `BusinessCounter` component
  - Create `client/src/components/landing/BusinessCounter.tsx`
  - Use `IntersectionObserver` to trigger animation only when element enters viewport
  - Animate 0 → `target` with `requestAnimationFrame` and ease-out cubic; disconnect observer after completion
  - Render text in format "Trusted by [N]+ businesses in Zimbabwe"
  - Jump to final value immediately when `prefers-reduced-motion: reduce` is active
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.1 Write property tests for `BusinessCounter`
    - **Property 1: BusinessCounter reaches target value**
    - **Validates: Requirements 2.4**
    - **Property 2: BusinessCounter format string**
    - **Validates: Requirements 2.5**
    - **Property 3: BusinessCounter does not replay**
    - **Validates: Requirements 2.6**
    - Test file: `client/src/__tests__/businessCounter.property.test.tsx`

- [~] 5. Implement `DomainSearch` component
  - Create `client/src/components/landing/DomainSearch.tsx` replacing `DomainSearchBar`
  - Debounce API calls by 300ms using `useRef` + `setTimeout`; guard concurrent requests with an `inFlight` ref
  - Animate `AvailabilityIndicator` in (`opacity 0→1`, `translateY 8px→0` over 250ms) and out (`opacity 1→0` over 150ms) using Web Animations API; remove from DOM after fade-out
  - Show green checkmark + "[domain].co.zw is available" for available domains; red cross + "[domain].co.zw is taken" + up to 3 suggestions for taken domains
  - Show spinner while in-flight; show "Could not check availability — try again" with retry button on error
  - Set `minHeight: 48px` on the input element
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.3_

  - [ ]* 5.1 Write property tests for `DomainSearch`
    - **Property 4: DomainSearch debounce prevents excess API calls**
    - **Validates: Requirements 3.1**
    - **Property 5: Available domain indicator content**
    - **Validates: Requirements 3.3**
    - **Property 6: Taken domain indicator content and suggestions**
    - **Validates: Requirements 3.4**
    - **Property 7: Cleared input removes indicator**
    - **Validates: Requirements 3.5**
    - **Property 8: No concurrent requests for same query**
    - **Validates: Requirements 3.6**
    - **Property 9: API error shows retry message**
    - **Validates: Requirements 3.7**
    - Test file: `client/src/__tests__/domainSearch.property.test.tsx`

- [ ] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 7. Update `HeroSection` with glassmorphism card and `BusinessCounter`
  - Update `client/src/components/landing/HeroSection.tsx`
  - Wrap `DomainSearch` in a container using `glassStyle({ blur: 12, bg: 'rgba(13,1,0,0.6)', border: '1px solid rgba(140,16,7,0.3)' })`
  - Apply `-webkit-backdropFilter` alongside `backdropFilter` for Safari
  - Render `BusinessCounter` below the search card with `target` prop
  - Set `h1` to use `var(--font-heading)`, minimum `3rem` on desktop and `2rem` on mobile via `useMediaQuery`
  - _Requirements: 2.1, 2.2, 2.3, 2.7, 5.1_

- [~] 8. Implement `SocialProofSection` and `TestimonialCard`
  - Create `client/src/components/landing/TestimonialCard.tsx` using `glassStyle({ blur: 8, bg: 'rgba(26,3,1,0.7)' })`
  - Create `client/src/components/landing/SocialProofSection.tsx` with static testimonial data (minimum 3 entries, all with `company`)
  - Filter out any testimonial missing a `company` field before rendering
  - Apply `overflowX: 'auto'`, `display: 'flex'`, `flexWrap: 'nowrap'` on mobile; `display: 'grid'`, `gridTemplateColumns: 'repeat(3, 1fr)'` on desktop via `useMediaQuery`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.1 Write property tests for `SocialProofSection`
    - **Property 13: Testimonials with missing company are filtered**
    - **Validates: Requirements 6.2, 6.5**
    - **Property 14: SocialProofSection layout by breakpoint**
    - **Validates: Requirements 6.4**
    - Test file: `client/src/__tests__/socialProof.property.test.tsx`

- [~] 9. Implement `VideoSection`
  - Create `client/src/components/landing/VideoSection.tsx`
  - Render placeholder `<div>` with centred play SVG, caption "See how ZeeMail works in 30 seconds", `background: '#1A0301'`, `border: '1px solid #3E0703'`, `borderRadius: 12px`, and 16:9 aspect ratio via `paddingTop: '56.25%'`
  - When `videoSrc` is provided, render `<iframe>` or `<video>` with `loading="lazy"` in place of placeholder
  - Add `aria-label="Product walkthrough video"` to the outer `<section>`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.4_

  - [ ]* 9.1 Write property test for `VideoSection`
    - **Property 17: VideoSection renders media element when videoSrc provided**
    - **Validates: Requirements 8.4**
    - Test file: `client/src/__tests__/videoSection.property.test.tsx`

- [~] 10. Implement `ComparisonTable` (competitor variant)
  - Create `client/src/components/landing/ComparisonTable.tsx`
  - Use semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<td>` elements
  - Render `<CheckIcon>` SVG (green) for `true` values and `<CrossIcon>` SVG (muted) for `false` values; never render literal "true"/"false" text
  - Highlight ZeeMail column with `border: '2px solid #8C1007'` and "Best for Zimbabwe" label above the column header
  - Wrap table in `overflowX: 'auto'` container for mobile
  - Define static `ComparisonRow` data: monthly price, local payment methods, local Zimbabwe support, .co.zw domain included, setup time
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 10.1 Write property tests for `ComparisonTable`
    - **Property 15: ComparisonTable boolean cells render SVG icons**
    - **Validates: Requirements 7.3**
    - **Property 16: ComparisonTable th elements have scope attributes**
    - **Validates: Requirements 7.5**
    - Test file: `client/src/__tests__/comparisonTable.property.test.tsx`

- [~] 11. Implement `BillingToggle` and update `PricingSection`
  - Create `client/src/components/landing/BillingToggle.tsx` as `<div role="group" aria-label="Billing period">` with two `<button>` elements; active button has `background: '#8C1007'`
  - Update `client/src/components/landing/PricingSection.tsx` with `billing: 'monthly' | 'annual'` state
  - Compute annual price as `monthlyPrice * 10`; show "2 months free" badge on each `Plan_Card` when annual is selected; hide badge when monthly
  - Apply `glassStyle({ blur: 8, bg: 'rgba(140,16,7,0.15)', border: '1px solid rgba(140,16,7,0.4)' })` to the "most popular" `Plan_Card`
  - Add feature comparison table below plan cards with rows: mailboxes, storage, email aliases, priority support, .co.zw domain
  - Pass `plan` and `billing` as query params to `/register` on "Get started" click
  - Stack `Plan_Cards` vertically on mobile, in a row on desktop via `useMediaQuery`
  - Apply `Plan_Card` hover: `translateY(-4px)` + deeper `boxShadow` via CSS transition `200ms ease-out`
  - _Requirements: 4.1, 5.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.4_

  - [ ]* 11.1 Write property tests for pricing and billing
    - **Property 18: Annual pricing equals monthly × 10**
    - **Validates: Requirements 9.2**
    - **Property 19: Monthly billing shows no discount badge**
    - **Validates: Requirements 9.3**
    - **Property 20: Get started passes plan and billing as query params**
    - **Validates: Requirements 9.6**
    - Test file: `client/src/__tests__/pricingBilling.property.test.tsx`

- [~] 12. Update `LandingNav` with hamburger menu
  - Update `client/src/components/landing/LandingNav.tsx`
  - Add `menuOpen: boolean` state; on mobile (`!isDesktop`) hide nav links and show hamburger `<button>` with `aria-expanded={menuOpen}` and `aria-controls="mobile-menu"`
  - Slide mobile menu open/closed using CSS `maxHeight` transition
  - Apply `fontFamily: 'var(--font-body)'` to nav controls
  - _Requirements: 10.5, 10.6_

  - [ ]* 12.1 Write property test for hamburger visibility
    - **Property 23: LandingNav hamburger visibility by breakpoint**
    - **Validates: Requirements 10.5**
    - Test file: `client/src/__tests__/landingResponsive.property.test.tsx`

- [ ] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 14. Wire all sections into `LandingPage.tsx` with `PageTransition`
  - Update `client/src/pages/LandingPage.tsx` to render sections in order: `LandingNav`, `HeroSection`, `SocialProofSection`, `VideoSection`, `PricingSection`, `ComparisonTable`, `LandingFooter`
  - Wrap page content in `PageTransition`; call `fadeOut()` before navigating away
  - Ensure no horizontal overflow on viewports ≥ 320px (except intentional scroll areas)
  - Apply `fontFamily: 'var(--font-heading)'` to all `h1`/`h2` elements and `fontFamily: 'var(--font-body)'` to body text across all landing components
  - Add `loading="lazy"` to all `<img>` and `<iframe>` elements on the page
  - _Requirements: 1.2, 1.3, 4.3, 4.4, 6.1, 8.1, 10.2, 10.7, 11.4_

  - [ ]* 14.1 Write property tests for responsive layout and lazy loading
    - **Property 21: DomainSearch input touch target on mobile**
    - **Validates: Requirements 10.3**
    - **Property 22: Plan_Cards layout by breakpoint**
    - **Validates: Requirements 10.4**
    - **Property 24: Images and iframes have loading="lazy"**
    - **Validates: Requirements 11.4**
    - Test file: `client/src/__tests__/landingResponsive.property.test.tsx` and `client/src/__tests__/lazyLoading.property.test.tsx`

- [ ] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design uses TypeScript/React with inline styles — no CSS framework or animation library
- Property tests use fast-check with a minimum of 100 iterations each
- Performance targets (LCP, CLS, INP) are validated via Lighthouse CI against the production build, not Vitest
