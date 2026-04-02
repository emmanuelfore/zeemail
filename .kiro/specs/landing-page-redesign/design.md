# Design Document: Landing Page Redesign

## Overview

This document describes the technical design for the ZeeMail landing page redesign. The goal is to transform the existing functional-but-plain landing page into a premium, conversion-optimised experience that positions ZeeMail as the definitive email hosting choice for Zimbabwean businesses.

The redesign is purely a front-end concern. No new API endpoints are required — the existing `/api/domains/check` and `/api/domains/suggest` endpoints are reused. The tech stack remains React 18 + Vite + TypeScript with inline styles (no CSS framework). The existing colour palette is retained and extended with glassmorphism accents.

### Key Design Decisions

- **No animation libraries.** All motion uses CSS transitions and the Web Animations API to keep the bundle lean and respect `prefers-reduced-motion`.
- **No CSS-in-JS or stylesheet modules.** Inline styles remain the pattern; a `glass.ts` utility centralises the glassmorphism style objects.
- **Mobile-first via a `useMediaQuery` hook.** Because inline styles cannot use `@media` queries directly, a lightweight hook returns a boolean that components use to branch their style objects.
- **Font tokens in `tokens.css`.** `--font-heading` and `--font-body` are added so every component references the token, not a hard-coded font name.
- **Route transitions via a wrapper component.** A `PageTransition` wrapper uses the Web Animations API to fade pages in/out without a router library.

---

## Architecture

```
client/
├── index.html                          ← font preconnect + preload links added here
├── src/
│   ├── styles/
│   │   ├── tokens.css                  ← add --font-heading, --font-body tokens
│   │   └── glass.ts                    ← NEW: glassmorphism style objects
│   ├── hooks/
│   │   └── useMediaQuery.ts            ← NEW: SSR-safe media query hook
│   ├── components/
│   │   ├── shared/
│   │   │   └── PageTransition.tsx      ← NEW: route fade wrapper
│   │   └── landing/
│   │       ├── LandingNav.tsx          ← UPDATED: hamburger menu on mobile
│   │       ├── HeroSection.tsx         ← UPDATED: glassmorphism card, Business_Counter
│   │       ├── BusinessCounter.tsx     ← NEW: animated counter with IntersectionObserver
│   │       ├── DomainSearch.tsx        ← NEW: replaces DomainSearchBar, adds debounce + Availability_Indicator
│   │       ├── SocialProofSection.tsx  ← NEW: testimonials + counter
│   │       ├── TestimonialCard.tsx     ← NEW: individual testimonial card
│   │       ├── VideoSection.tsx        ← NEW: 16:9 placeholder / iframe
│   │       ├── ComparisonTable.tsx     ← NEW: competitor comparison
│   │       ├── PricingSection.tsx      ← UPDATED: BillingToggle + feature table
│   │       └── BillingToggle.tsx       ← NEW: monthly/annual switch
│   └── pages/
│       └── LandingPage.tsx             ← UPDATED: new section order, PageTransition
```

### Section Order on LandingPage

```
LandingNav (fixed)
└── PageTransition wrapper
    ├── HeroSection
    │   ├── DomainSearch (inside glassmorphism card)
    │   └── BusinessCounter
    ├── SocialProofSection
    │   └── TestimonialCard × N
    ├── VideoSection
    ├── PricingSection
    │   ├── BillingToggle
    │   ├── PlanCard × 3
    │   └── feature ComparisonTable (pricing variant)
    ├── ComparisonTable (competitor variant)
    └── LandingFooter
```

---

## Components and Interfaces

### `useMediaQuery` hook

```ts
// client/src/hooks/useMediaQuery.ts
function useMediaQuery(query: string): boolean
```

Uses `window.matchMedia` with a `change` event listener. Returns `false` during SSR / before hydration to avoid layout shift. Components call it as:

```ts
const isDesktop = useMediaQuery('(min-width: 768px)');
```

### `glass.ts` utility

```ts
// client/src/styles/glass.ts
export interface GlassOptions {
  blur?: number;           // default 12
  bg?: string;             // default 'rgba(13,1,0,0.6)'
  border?: string;         // default '1px solid rgba(140,16,7,0.3)'
  fallbackBg?: string;     // default '#1A0301'
  fallbackBorder?: string; // default '1px solid #3E0703'
}

export function glassStyle(opts?: GlassOptions): React.CSSProperties
```

The function returns a `CSSProperties` object with `backdropFilter`, `-webkit-backdropFilter`, `background`, and `border`. It uses `CSS.supports('backdrop-filter', 'blur(1px)')` to detect support and returns the fallback values when unsupported.

### `PageTransition`

```tsx
interface PageTransitionProps {
  children: ReactNode;
  durationMs?: number; // default 200
}
```

Wraps each page. On mount it plays a `opacity: [0, 1]` Web Animations API animation. The `LandingPage` triggers a fade-out before navigating away by calling a ref-exposed `fadeOut(): Promise<void>` method. Respects `prefers-reduced-motion` by skipping the animation entirely.

### `LandingNav`

```tsx
interface LandingNavProps {} // no props
```

New state: `menuOpen: boolean`. On mobile (`!isDesktop`) the nav links and CTA buttons are hidden and replaced by a hamburger `<button>` with `aria-expanded={menuOpen}` and `aria-controls="mobile-menu"`. The mobile menu slides down from the nav bar using a CSS `max-height` transition.

### `HeroSection`

```tsx
interface HeroSectionProps {
  children?: ReactNode; // slot for DomainSearch
}
```

The `DomainSearch` is wrapped in a `glassStyle({ blur: 12 })` container. The `BusinessCounter` is rendered below the search card.

### `BusinessCounter`

```tsx
interface BusinessCounterProps {
  target: number;       // e.g. 120
  durationMs?: number;  // default 1200
  label?: string;       // default 'businesses in Zimbabwe'
}
```

Uses `IntersectionObserver` to trigger the animation only when the element enters the viewport. Animates from 0 to `target` using `requestAnimationFrame` with an ease-out cubic function. Once complete, the observer is disconnected so the animation never replays. Respects `prefers-reduced-motion` by jumping directly to the final value.

### `DomainSearch`

Replaces the existing `DomainSearchBar`. Key changes:

```tsx
interface DomainSearchProps {
  onRegister?: (name: string, tld: string) => void;
}
```

- Debounces API calls by 300ms using `useRef` + `setTimeout`.
- Tracks an `inFlight` ref to prevent concurrent requests for the same query.
- The `AvailabilityIndicator` sub-component animates in/out using the Web Animations API (`opacity` + `translateY`).
- On error, displays "Could not check availability — try again" with a retry button.
- Input has `minHeight: 48px` for mobile touch targets.

### `SocialProofSection`

```tsx
interface SocialProofSectionProps {
  testimonials: Testimonial[];
  businessCount: number;
}
```

On mobile: `overflowX: 'auto'`, `display: 'flex'`, `flexWrap: 'nowrap'` for horizontal scroll.
On desktop: `display: 'grid'`, `gridTemplateColumns: 'repeat(3, 1fr)'`.

### `TestimonialCard`

```tsx
interface TestimonialCardProps {
  quote: string;
  name: string;
  company: string;       // required — cards without company are filtered out upstream
  logoUrl?: string;
}
```

Rendered as a glassmorphism card using `glassStyle({ blur: 8, bg: 'rgba(26,3,1,0.7)' })`.

### `VideoSection`

```tsx
interface VideoSectionProps {
  videoSrc?: string;
}
```

When `videoSrc` is undefined, renders a placeholder `<div>` with a centred play SVG icon and caption. When provided, renders an `<iframe>` (YouTube/Vimeo) or `<video>` element. The container uses `paddingTop: '56.25%'` (16:9 ratio) with `position: 'relative'` and the inner element `position: 'absolute', inset: 0`. The outer `<section>` has `aria-label="Product walkthrough video"`.

### `ComparisonTable`

```tsx
interface ComparisonRow {
  attribute: string;
  zeemail: string | boolean;
  gmail: string | boolean;
  outlook: string | boolean;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
}
```

Uses semantic `<table>` with `scope="col"` on `<th>` elements. The ZeeMail column header has a "Best for Zimbabwe" label above it and a `border: '2px solid #8C1007'` on all cells in that column. Boolean cells render `<CheckIcon>` (green) or `<CrossIcon>` (muted). On mobile: `overflowX: 'auto'` wrapper.

### `PricingSection` (updated)

```tsx
interface PricingSectionProps {
  onSelectPlan?: (plan: Plan, billing: 'monthly' | 'annual') => void;
}
```

New state: `billing: 'monthly' | 'annual'`. Annual price = `monthly × 10`. Passes `billing` as a query param to `/register`.

### `BillingToggle`

```tsx
interface BillingToggleProps {
  value: 'monthly' | 'annual';
  onChange: (v: 'monthly' | 'annual') => void;
}
```

Rendered as a `<div role="group" aria-label="Billing period">` containing two `<button>` elements. The active button has `background: '#8C1007'`. Keyboard-navigable via natural tab order.

---

## Data Models

### Testimonial

```ts
interface Testimonial {
  id: string;
  quote: string;
  name: string;
  company: string;   // required
  logoUrl?: string;
}
```

Static data defined in `SocialProofSection.tsx`. Minimum 3 entries, all with `company` populated.

### ComparisonRow

```ts
interface ComparisonRow {
  attribute: string;
  zeemail: string | boolean;
  gmail: string | boolean;
  outlook: string | boolean;
}
```

Static data defined in `ComparisonTable.tsx`. Attributes: monthly price, local payment methods, local Zimbabwe support, .co.zw domain included, setup time.

### PlanFeatureRow (pricing comparison table)

```ts
interface PlanFeatureRow {
  feature: string;
  starter: boolean | string;
  business: boolean | string;
  pro: boolean | string;
}
```

Static data defined in `PricingSection.tsx`. Features: mailboxes, storage, email aliases, priority support, .co.zw domain.

### PlanConfig (extended)

```ts
interface PlanConfig {
  id: Plan;
  name: string;
  monthlyPrice: number;
  mailboxes: number;
  storage: string;
  popular: boolean;
  extras: string[];
}
```

Annual price is derived: `monthlyPrice * 10`.

### Font Tokens (tokens.css additions)

```css
:root {
  --font-heading: 'Syne', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: BusinessCounter reaches target value

*For any* target count N, after the IntersectionObserver fires and the animation completes, the displayed counter value should equal N.

**Validates: Requirements 2.4**

### Property 2: BusinessCounter format

*For any* count N, the BusinessCounter should render text matching the pattern "Trusted by N+ businesses in Zimbabwe".

**Validates: Requirements 2.5**

### Property 3: BusinessCounter does not replay

*For any* BusinessCounter that has already completed its animation, triggering the IntersectionObserver callback again should not change the displayed value or restart the animation.

**Validates: Requirements 2.6**

### Property 4: DomainSearch debounce prevents excess API calls

*For any* sequence of keystrokes where all keystrokes occur within a 300ms window, exactly one API call should be made (not one per keystroke).

**Validates: Requirements 3.1**

### Property 5: Available domain indicator content

*For any* domain name that the API reports as available, the AvailabilityIndicator should display text containing "[domain].co.zw is available" and a green colour indicator.

**Validates: Requirements 3.3**

### Property 6: Taken domain indicator content and suggestions

*For any* domain name that the API reports as taken, the AvailabilityIndicator should display text containing "[domain].co.zw is taken" and between 1 and 3 alternative domain suggestions.

**Validates: Requirements 3.4**

### Property 7: Cleared input removes indicator

*For any* DomainSearch state where an AvailabilityIndicator is visible, clearing the input should result in the indicator being absent from the DOM.

**Validates: Requirements 3.5**

### Property 8: No concurrent requests for same query

*For any* domain query while a request is already in flight, submitting the same query again should not trigger a second fetch call.

**Validates: Requirements 3.6**

### Property 9: API error shows retry message

*For any* domain query where the API returns an error response, the component should display the "Could not check availability — try again" message.

**Validates: Requirements 3.7**

### Property 10: Reduced motion disables animations

*For any* component that uses CSS transitions or Web Animations API, when `prefers-reduced-motion: reduce` is active, the animation should be skipped (duration 0 or animation not applied).

**Validates: Requirements 4.6**

### Property 11: glassStyle returns expected CSS properties

*For any* options object passed to `glassStyle()`, the returned object should always contain `backdropFilter`, `WebkitBackdropFilter`, `background`, and `border` keys.

**Validates: Requirements 5.3**

### Property 12: glassStyle fallback when backdrop-filter unsupported

*For any* call to `glassStyle()` in an environment where `CSS.supports('backdrop-filter', 'blur(1px)')` returns false, the returned object should use the fallback `background` and `border` values (solid, no blur).

**Validates: Requirements 5.4**

### Property 13: Testimonials with missing company are filtered

*For any* testimonials array, only entries that have a non-empty `company` field should be rendered by SocialProofSection.

**Validates: Requirements 6.2, 6.5**

### Property 14: SocialProofSection layout by breakpoint

*For any* viewport width, SocialProofSection should apply `overflowX: 'auto'` + `flexWrap: 'nowrap'` on mobile (< 768px) and `display: 'grid'` with 3 columns on desktop (≥ 768px).

**Validates: Requirements 6.4**

### Property 15: ComparisonTable boolean cells render SVG icons

*For any* ComparisonRow where a cell value is a boolean, the rendered cell should contain an SVG element and not a text node with "true" or "false".

**Validates: Requirements 7.3**

### Property 16: ComparisonTable th elements have scope attributes

*For any* `<th>` element rendered by ComparisonTable, it should have a `scope` attribute set to either "col" or "row".

**Validates: Requirements 7.5**

### Property 17: VideoSection renders media element when videoSrc provided

*For any* non-empty `videoSrc` string, VideoSection should render an `<iframe>` or `<video>` element with that source, and the placeholder should not be present.

**Validates: Requirements 8.4**

### Property 18: Annual pricing equals monthly × 10

*For any* plan with a monthly price P, when the BillingToggle is set to "Annual", the displayed price should equal P × 10 and a "2 months free" badge should be present on the card.

**Validates: Requirements 9.2**

### Property 19: Monthly billing shows no discount badge

*For any* plan, when the BillingToggle is set to "Monthly", no "2 months free" badge should be present on any Plan_Card.

**Validates: Requirements 9.3**

### Property 20: Get started passes plan and billing as query params

*For any* plan ID and billing period combination, clicking the "Get started" button should navigate to `/register` with both `plan` and `billing` query parameters set correctly.

**Validates: Requirements 9.6**

### Property 21: DomainSearch input touch target on mobile

*For any* mobile viewport (< 768px), the DomainSearch input element should have a computed `minHeight` of at least 48px.

**Validates: Requirements 10.3**

### Property 22: Plan_Cards layout by breakpoint

*For any* viewport width, Plan_Cards should stack in a single column on mobile (< 768px) and display in a row on desktop (≥ 768px).

**Validates: Requirements 10.4**

### Property 23: LandingNav hamburger visibility by breakpoint

*For any* mobile viewport (< 768px), the hamburger button should be visible and the nav link list should be hidden; on desktop (≥ 768px) the inverse should hold.

**Validates: Requirements 10.5**

### Property 24: Images and iframes have loading="lazy"

*For any* `<img>` or `<iframe>` element rendered on the Landing_Page, it should have `loading="lazy"` attribute set.

**Validates: Requirements 11.4**

---

## Error Handling

### Domain Search Errors

- **Network error**: Display "Connection error. Please check your internet and try again." with a retry button. The retry button re-runs the last query.
- **503 / WHOIS unavailable**: Display "Domain check temporarily unavailable. Submit your details and we'll verify availability for you." — this matches the existing `DomainSearchBar` behaviour.
- **Validation error** (client-side): Displayed inline below the input before any API call is made.
- **Concurrent request guard**: An `inFlight` ref prevents a second request while one is pending. The search button is disabled while loading.

### Font Loading Failure

The `--font-heading` and `--font-body` tokens include system font fallbacks (`system-ui, sans-serif` and `Georgia, serif`). If Google Fonts fails to load, the page remains fully readable with system fonts. `font-display: swap` ensures text is visible immediately.

### Glassmorphism Fallback

`glassStyle()` calls `CSS.supports('backdrop-filter', 'blur(1px)')` at call time. If unsupported (older Safari, Firefox < 103), it returns a solid `#1A0301` background with the standard border. All text remains fully readable.

### Video Section

When `videoSrc` is not provided, the placeholder is shown. If an iframe fails to load (network error), the browser's native iframe error handling applies — the placeholder border and caption remain visible.

### Animation Errors

All Web Animations API calls are wrapped in a `try/catch`. If the API is unavailable (very old browsers), the component renders in its final state without animation. The `prefers-reduced-motion` check is done via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before any animation is started.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- **Unit tests** cover specific examples, structural requirements, accessibility attributes, and integration points.
- **Property tests** verify universal behaviours across randomly generated inputs.

### Unit Tests (Vitest + React Testing Library)

Focus areas:
- `glassStyle()` returns correct structure for default and custom options (examples)
- `index.html` contains correct `<link>` tags for Google Fonts with `display=swap`
- `tokens.css` contains `--font-heading` and `--font-body` custom properties
- `VideoSection` renders placeholder when no `videoSrc`, renders iframe when provided
- `BillingToggle` has `role="group"` and `aria-label="Billing period"`
- `LandingNav` hamburger button has `aria-expanded` and `aria-controls`
- `ComparisonTable` ZeeMail column has "Best for Zimbabwe" label
- `PageTransition` triggers Web Animations API on mount
- `PricingSection` feature table contains all 5 required features

### Property-Based Tests (fast-check, minimum 100 iterations each)

Each property test maps to a design property above. Tag format: `Feature: landing-page-redesign, Property N: <property_text>`

| Test | Design Property | Library |
|------|----------------|---------|
| BusinessCounter reaches target | Property 1 | fast-check |
| BusinessCounter format string | Property 2 | fast-check |
| BusinessCounter no replay | Property 3 | fast-check |
| Debounce prevents excess calls | Property 4 | fast-check |
| Available domain indicator | Property 5 | fast-check |
| Taken domain indicator + suggestions | Property 6 | fast-check |
| Cleared input removes indicator | Property 7 | fast-check |
| No concurrent requests | Property 8 | fast-check |
| API error shows retry | Property 9 | fast-check |
| Reduced motion disables animations | Property 10 | fast-check |
| glassStyle returns expected keys | Property 11 | fast-check |
| glassStyle fallback | Property 12 | fast-check |
| Testimonials company filter | Property 13 | fast-check |
| SocialProofSection layout | Property 14 | fast-check |
| Boolean cells render SVG | Property 15 | fast-check |
| th scope attributes | Property 16 | fast-check |
| VideoSection with videoSrc | Property 17 | fast-check |
| Annual price = monthly × 10 | Property 18 | fast-check |
| Monthly billing no badge | Property 19 | fast-check |
| Get started query params | Property 20 | fast-check |
| Input touch target 48px | Property 21 | fast-check |
| Plan_Cards layout | Property 22 | fast-check |
| Hamburger visibility | Property 23 | fast-check |
| lazy loading attributes | Property 24 | fast-check |

### Performance Testing

Lighthouse CI is run against the production build (`vite build`) in the CI pipeline:
- LCP target: < 2.5s (simulated 4G)
- CLS target: < 0.1
- INP target: < 200ms

These are not unit tests and are not part of the Vitest suite.

### Test File Locations

```
client/src/__tests__/
├── landingTypography.test.tsx          ← unit: font tokens, link tags
├── glassStyle.property.test.ts         ← PBT: Properties 11, 12
├── businessCounter.property.test.tsx   ← PBT: Properties 1, 2, 3
├── domainSearch.property.test.tsx      ← PBT: Properties 4, 5, 6, 7, 8, 9
├── reducedMotion.property.test.tsx     ← PBT: Property 10
├── socialProof.property.test.tsx       ← PBT: Properties 13, 14
├── comparisonTable.property.test.tsx   ← PBT: Properties 15, 16
├── videoSection.property.test.tsx      ← PBT: Property 17
├── pricingBilling.property.test.tsx    ← PBT: Properties 18, 19, 20
├── landingResponsive.property.test.tsx ← PBT: Properties 21, 22, 23
└── lazyLoading.property.test.tsx       ← PBT: Property 24
```
