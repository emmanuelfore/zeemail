# Requirements Document

## Introduction

ZeeMail is a Zimbabwean .co.zw email hosting platform built on Mailcow. The current landing page requires a complete visual and UX overhaul to establish ZeeMail as the premium, disruptive choice in the Zimbabwean market. This redesign covers the full public-facing landing page: hero section, typography, micro-animations, glassmorphism card accents, social proof, competitor comparison, video walkthrough, pricing, mobile responsiveness, and performance. The tech stack is React/Vite + TypeScript with inline styles (no CSS framework). The existing colour palette (#0D0100 background, #8C1007 primary, #FFF0C4 text) is retained and extended.

---

## Glossary

- **Landing_Page**: The public-facing root route (`/`) rendered by `LandingPage.tsx`
- **Hero_Section**: The top section of the Landing_Page containing the headline, domain search, and animated counter
- **Domain_Search**: The animated input component that checks .co.zw domain availability in real time
- **Availability_Indicator**: The UI element that animates in to show whether a searched domain is available or taken
- **Business_Counter**: The animated numeric counter displaying the number of businesses served
- **Typography_System**: The font pairing of Inter (body) and Syne (headings) loaded via Google Fonts
- **Plan_Card**: A pricing card component representing a single subscription plan
- **Pricing_Section**: The section containing Plan_Cards, the billing toggle, and the feature comparison table
- **Billing_Toggle**: The UI control that switches displayed prices between monthly and annual billing
- **Comparison_Table**: The table comparing ZeeMail against Gmail Business and Outlook 365
- **Social_Proof_Section**: The section containing the Business_Counter and customer testimonials
- **Testimonial**: A customer quote with company name and optional logo
- **Video_Section**: The section containing the 30-second explainer video placeholder
- **Status_Tracker**: The existing multi-step registration progress component
- **Page_Transition**: A CSS-based fade or slide animation applied when navigating between routes
- **Glassmorphism_Card**: A card with a frosted-glass visual effect using backdrop-filter and semi-transparent background
- **Animation**: A CSS or JS-driven visual motion effect
- **Viewport**: The visible area of the browser window
- **LCP**: Largest Contentful Paint — a Core Web Vitals metric measuring perceived load speed
- **CLS**: Cumulative Layout Shift — a Core Web Vitals metric measuring visual stability
- **INP**: Interaction to Next Paint — a Core Web Vitals metric measuring responsiveness

---

## Requirements

### Requirement 1: Typography System Upgrade

**User Story:** As a visitor, I want the landing page to use premium typography, so that ZeeMail feels like a credible, modern brand.

#### Acceptance Criteria

1. THE Landing_Page SHALL load Inter (weights 400, 500, 600, 700) and Syne (weights 700, 800) from Google Fonts via a `<link rel="preconnect">` and `<link rel="stylesheet">` in `index.html`.
2. THE Typography_System SHALL apply Syne to all `h1` and `h2` elements on the Landing_Page.
3. THE Typography_System SHALL apply Inter to all body text, labels, and UI controls on the Landing_Page.
4. WHEN the Google Fonts stylesheet fails to load, THE Landing_Page SHALL fall back to `system-ui, sans-serif` for body text and `Georgia, serif` for headings.
5. THE Typography_System SHALL define font tokens in `tokens.css` as `--font-heading` and `--font-body` so all Landing_Page components reference the tokens rather than hard-coded font names.

---

### Requirement 2: Hero Section Redesign

**User Story:** As a visitor, I want an impactful hero section with a clear value proposition and instant domain search, so that I understand ZeeMail's offer and can act immediately.

#### Acceptance Criteria

1. THE Hero_Section SHALL display the headline "Get your business online in 5 minutes" as an `h1` using the Syne font at a minimum of 3rem on desktop and 2rem on mobile.
2. THE Hero_Section SHALL display the Domain_Search component as the primary call-to-action, positioned directly below the headline.
3. THE Hero_Section SHALL display the Business_Counter below the Domain_Search.
4. WHEN the Landing_Page first renders, THE Business_Counter SHALL animate from 0 to its target value over 1200ms using an easing function, triggering only when the counter enters the Viewport.
5. THE Business_Counter SHALL display the count in the format "Trusted by [N]+ businesses in Zimbabwe".
6. WHEN the Business_Counter animation completes, THE Business_Counter SHALL remain at its final value and SHALL NOT replay unless the page is reloaded.
7. THE Hero_Section SHALL include a Glassmorphism_Card wrapping the Domain_Search, with `backdrop-filter: blur(12px)`, a semi-transparent background of `rgba(13, 1, 0, 0.6)`, and a `1px solid rgba(140, 16, 7, 0.3)` border.

---

### Requirement 3: Animated Domain Search

**User Story:** As a visitor, I want the domain availability check to feel instant and magical, so that I am motivated to complete registration.

#### Acceptance Criteria

1. WHEN a visitor types in the Domain_Search input, THE Domain_Search SHALL debounce API calls by 300ms before sending a domain availability request.
2. WHEN a domain availability result is received, THE Availability_Indicator SHALL animate into view using a CSS transition of `opacity 0 → 1` and `translateY(8px) → translateY(0)` over 250ms.
3. WHEN a domain is available, THE Availability_Indicator SHALL display a green checkmark icon and the text "[domain].co.zw is available" in `#22C55E`.
4. WHEN a domain is taken, THE Availability_Indicator SHALL display a red cross icon and the text "[domain].co.zw is taken" in `#F87171`, and SHALL suggest up to 3 alternative domains below.
5. WHEN the Domain_Search input is cleared, THE Availability_Indicator SHALL animate out using `opacity 1 → 0` over 150ms and then be removed from the DOM.
6. WHILE a domain availability request is in flight, THE Domain_Search SHALL display a spinner inside the input field and SHALL NOT send a second concurrent request for the same query.
7. IF the domain availability API returns an error, THEN THE Domain_Search SHALL display "Could not check availability — try again" and SHALL allow the visitor to retry.

---

### Requirement 4: Micro-Animations

**User Story:** As a visitor, I want subtle, purposeful animations throughout the page, so that the experience feels polished and premium.

#### Acceptance Criteria

1. WHEN a visitor hovers over a Plan_Card, THE Plan_Card SHALL translate upward by 4px and increase `box-shadow` depth over a CSS transition of 200ms ease-out.
2. WHEN a Status_Tracker step transitions to the "complete" state, THE Status_Tracker step icon SHALL animate with a scale pulse (`scale(1) → scale(1.2) → scale(1)`) over 300ms.
3. WHEN the visitor navigates from the Landing_Page to another route, THE Landing_Page SHALL apply a fade-out Page_Transition of `opacity 1 → 0` over 200ms before the route change completes.
4. WHEN a new route renders after navigation, THE incoming page SHALL apply a fade-in Page_Transition of `opacity 0 → 1` over 200ms.
5. THE Landing_Page SHALL implement all Animations using CSS transitions or the Web Animations API, and SHALL NOT introduce any third-party animation library dependency.
6. WHILE the visitor has `prefers-reduced-motion: reduce` set in their OS, THE Landing_Page SHALL disable all non-essential Animations and SHALL NOT apply Page_Transitions.

---

### Requirement 5: Glassmorphism Card Accents

**User Story:** As a visitor, I want pricing and hero cards to have a premium frosted-glass look, so that the page feels visually distinctive.

#### Acceptance Criteria

1. THE Hero_Section Glassmorphism_Card SHALL apply `backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)` for Safari compatibility.
2. WHEN a Plan_Card is marked as "most popular", THE Plan_Card SHALL apply the Glassmorphism_Card style with `backdrop-filter: blur(8px)`, a background of `rgba(140, 16, 7, 0.15)`, and a `1px solid rgba(140, 16, 7, 0.4)` border.
3. THE Glassmorphism_Card style SHALL be defined as a reusable inline-style object exported from a `client/src/styles/glass.ts` utility module so all components reference the same values.
4. IF the visitor's browser does not support `backdrop-filter`, THEN THE Glassmorphism_Card SHALL fall back to a solid `#1A0301` background with the standard `1px solid #3E0703` border, maintaining full readability.

---

### Requirement 6: Social Proof Section

**User Story:** As a visitor, I want to see evidence that real Zimbabwean businesses trust ZeeMail, so that I feel confident signing up.

#### Acceptance Criteria

1. THE Social_Proof_Section SHALL be positioned between the Hero_Section and the Pricing_Section on the Landing_Page.
2. THE Social_Proof_Section SHALL display a minimum of 3 Testimonials, each containing a customer quote, the customer's full name, and the company name.
3. WHEN the Social_Proof_Section enters the Viewport, THE Business_Counter in the Social_Proof_Section SHALL animate from 0 to its target value over 1200ms (same animation as Requirement 2, Criterion 4).
4. THE Social_Proof_Section SHALL display Testimonials in a horizontally scrollable row on mobile viewports (width < 768px) and in a 3-column grid on desktop viewports (width ≥ 768px).
5. THE Social_Proof_Section SHALL NOT display any Testimonial without a company name.

---

### Requirement 7: Competitor Comparison Table

**User Story:** As a visitor evaluating email providers, I want to see how ZeeMail compares to Gmail Business and Outlook 365, so that I can make an informed decision.

#### Acceptance Criteria

1. THE Comparison_Table SHALL compare ZeeMail, Gmail Business, and Outlook 365 across the following attributes: monthly price (USD), local payment methods accepted, local Zimbabwe support, .co.zw domain included, and setup time.
2. THE Comparison_Table SHALL visually highlight the ZeeMail column with the `#8C1007` primary colour border and a "Best for Zimbabwe" label above the column header.
3. WHEN a Comparison_Table cell value is a boolean (yes/no), THE Comparison_Table SHALL render a green checkmark SVG for true and a muted cross SVG for false instead of text.
4. THE Comparison_Table SHALL be horizontally scrollable on mobile viewports (width < 768px) so no data is hidden or truncated.
5. THE Comparison_Table SHALL use `<table>`, `<thead>`, `<tbody>`, `<th>`, and `<td>` semantic HTML elements with appropriate `scope` attributes for accessibility.

---

### Requirement 8: Video Walkthrough Section

**User Story:** As a visitor who prefers visual learning, I want to watch a short explainer video, so that I can understand how ZeeMail works without reading.

#### Acceptance Criteria

1. THE Video_Section SHALL be positioned between the Social_Proof_Section and the Pricing_Section on the Landing_Page.
2. THE Video_Section SHALL display a 16:9 aspect-ratio placeholder container with a play button icon centred inside it.
3. THE Video_Section placeholder SHALL display the text "See how ZeeMail works in 30 seconds" as a caption below the container.
4. WHEN a video URL is provided via a `videoSrc` prop, THE Video_Section SHALL render an `<iframe>` or `<video>` element in place of the placeholder.
5. THE Video_Section placeholder container SHALL have a `background: #1A0301` fill, a `1px solid #3E0703` border, and a border-radius of 12px.
6. THE Video_Section SHALL include an `aria-label` of "Product walkthrough video" on the container element.

---

### Requirement 9: Improved Pricing Section

**User Story:** As a visitor comparing plans, I want to see monthly and annual pricing with a clear feature breakdown, so that I can choose the right plan confidently.

#### Acceptance Criteria

1. THE Pricing_Section SHALL display a Billing_Toggle above the Plan_Cards that switches between "Monthly" and "Annual" billing modes.
2. WHEN the Billing_Toggle is set to "Annual", THE Pricing_Section SHALL display annual prices calculated as `monthly_price × 10` (representing 2 months free) and SHALL display a "2 months free" badge on each Plan_Card.
3. WHEN the Billing_Toggle is set to "Monthly", THE Pricing_Section SHALL display the standard monthly price with no discount badge.
4. THE Pricing_Section SHALL display a feature comparison table below the Plan_Cards listing all features per plan, using checkmarks for included features and dashes for excluded features.
5. THE Pricing_Section feature comparison table SHALL include at minimum: number of mailboxes, storage per mailbox, email aliases, priority support, and .co.zw domain included.
6. WHEN a visitor clicks "Get started" on a Plan_Card, THE Pricing_Section SHALL pass the selected plan ID and the selected billing period (monthly or annual) as query parameters to the `/register` route.
7. THE Billing_Toggle SHALL be keyboard-navigable and SHALL have `role="group"` with an `aria-label` of "Billing period".

---

### Requirement 10: Mobile-First Responsive Design

**User Story:** As a visitor on a mobile device, I want the entire landing page to be fully usable and visually polished, so that I can sign up from my phone.

#### Acceptance Criteria

1. THE Landing_Page SHALL use a mobile-first layout where the base CSS targets viewports of width < 768px and desktop styles are applied via `@media (min-width: 768px)` overrides.
2. THE Hero_Section SHALL stack all elements vertically on mobile viewports and SHALL NOT overflow the horizontal Viewport.
3. THE Domain_Search input SHALL have a minimum touch target height of 48px on mobile viewports.
4. THE Pricing_Section Plan_Cards SHALL stack vertically in a single column on mobile viewports (width < 768px) and display in a row on desktop viewports (width ≥ 768px).
5. THE LandingNav SHALL collapse navigation links into a hamburger menu on mobile viewports (width < 768px).
6. THE LandingNav hamburger menu SHALL be toggled by a button with `aria-expanded` and `aria-controls` attributes set correctly.
7. THE Landing_Page SHALL NOT display any horizontal scrollbar on viewports of width ≥ 320px, except within the Comparison_Table and Social_Proof_Section testimonial row where horizontal scroll is intentional.

---

### Requirement 11: Performance

**User Story:** As a visitor on a slow Zimbabwean mobile connection, I want the landing page to load and respond quickly, so that I am not frustrated before I even sign up.

#### Acceptance Criteria

1. THE Landing_Page SHALL achieve an LCP of under 2.5 seconds on a simulated 4G connection (10 Mbps down, 40ms RTT) as measured by Lighthouse in production build mode.
2. THE Landing_Page SHALL achieve a CLS score of under 0.1 as measured by Lighthouse in production build mode.
3. THE Landing_Page SHALL achieve an INP of under 200ms for all interactive elements (Domain_Search input, Billing_Toggle, Plan_Card hover, navigation links).
4. THE Landing_Page SHALL lazy-load all images and the Video_Section iframe using the `loading="lazy"` attribute or `IntersectionObserver`.
5. THE Typography_System Google Fonts SHALL be loaded with `font-display: swap` to prevent invisible text during font load.
6. THE Landing_Page SHALL NOT block the main thread for more than 50ms during any Animation, measured by the Long Tasks API.
7. WHEN an Animation is running, THE Landing_Page SHALL restrict animated CSS properties to `transform` and `opacity` to avoid layout recalculation and maintain 60fps rendering.
