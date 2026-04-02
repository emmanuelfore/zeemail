# Implementation Plan: Mailcow Hosting Dashboard

## Overview

Full-stack implementation of the Mailcow Hosting Dashboard — a React/Vite SPA frontend with a Node.js/Express backend, Supabase for auth and data, and a Mailcow API proxy. Tasks are ordered to build incrementally: scaffolding → shared foundations → backend → frontend pages → tests.

## Tasks

- [x] 1. Project scaffolding and monorepo setup
  - Initialise monorepo with `client/` (Vite + React + TypeScript) and `server/` (Node.js + TypeScript) directories
  - Add root `package.json` with workspaces, shared scripts (`dev`, `build`, `test`)
  - Configure `tsconfig.json` for both `client/` and `server/` with strict mode
  - Create `.env.example` with all required variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAILCOW_HOST`, `MAILCOW_API_KEY`, `WHOISJSON_API_KEY`, `PORT`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
  - Create `.env` (gitignored) from `.env.example`
  - Write `README.md` with project overview, setup instructions, and a dedicated section explaining how to obtain and configure the WhoisJSON API key
  - _Requirements: 27.26, 27.27_


- [x] 2. Design system foundation
  - Create `client/src/styles/tokens.css` with all CSS custom properties: `--bg-page: #0D0100`, `--bg-card: #1A0301`, `--border: #3E0703`, `--border-focus: #8C1007`, `--primary: #8C1007`, `--primary-hover: #660B05`, `--primary-dark: #3E0703`, `--text-cream: #FFF0C4`, `--text-muted: #C4917A`, `--danger: #F87171`, `--whatsapp: #25D366`
  - Create `client/src/styles/global.css` importing Plus Jakarta Sans and JetBrains Mono from Google Fonts, applying base resets, body background, font defaults, card styles, button styles, input styles, progress bar styles, and chart color variables
  - Add scrollbar styles: `--scrollbar-track: #3E0703`, `--scrollbar-thumb: #660B05`
  - Add `@keyframes skeleton-pulse` animating between `#1A0301` and `#2A0502`
  - Import `global.css` in `client/src/main.tsx`
  - _Requirements: 18.1–18.13_

- [x] 3. Shared TypeScript types
  - Create `client/src/types/index.ts` with all exported types and interfaces from the design document: `Role`, `Plan`, `ClientStatus`, `MailboxStatus`, `InvoiceStatus`, `TicketStatus`, `LeadStatus`, `RegistrationType`, `Profile`, `Client`, `Mailbox`, `Invoice`, `SupportTicket`, `Lead`, `ApiError`
  - Mirror the same types in `server/src/types/index.ts` for backend use
  - _Requirements: 1.1, 5.1, 6.1, 10.1, 24.1–24.5_

- [x] 4. Supabase setup and database migrations
  - Create `client/src/lib/supabase.ts` initialising the Supabase JS client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Write SQL migration files in `supabase/migrations/` for all 6 tables: `profiles`, `clients`, `mailboxes`, `invoices`, `support_tickets`, `leads` — using the exact schemas from the design document
  - Write RLS policy SQL for each table: profiles (own row read/update, admin read-all), clients (admin all, portal user own row), mailboxes (admin all, portal user own client's mailboxes), invoices (admin all, portal user own), support_tickets (admin all, portal user own read/write)
  - Add public INSERT policy on `leads` table (no auth required)
  - _Requirements: 1.1, 2.1, 24.1–24.5_


- [x] 5. Auth store and useAuth hook
  - Create `client/src/store/authStore.ts` as a Zustand store with `session`, `profile`, `setSession`, `setProfile`, and `signOut` — `signOut` calls `supabase.auth.signOut()` and clears both fields
  - Initialise the store by subscribing to `supabase.auth.onAuthStateChange` in `main.tsx` to persist session across page reloads
  - Create `client/src/hooks/useAuth.ts` exposing `session`, `profile`, `signOut`, and a `loading` boolean
  - _Requirements: 1.1, 1.7_

- [x] 6. API client (frontend)
  - Create `client/src/lib/api.ts` implementing `apiRequest<T>(method, path, body?)` that reads the JWT from the Zustand auth store, sets `Authorization: Bearer <token>` and `Content-Type: application/json`, calls `VITE_API_BASE_URL + path`, and throws a typed `ApiError` for any non-2xx response
  - _Requirements: 2.1, 17.1_

- [x] 7. Backend foundation — Express app and middleware
  - Create `server/src/index.ts` bootstrapping Express: register Morgan logging, `express.json()`, all route modules, and the global error handler
  - Create `server/src/middleware/errorHandler.ts` catching all unhandled errors and returning `{ error: string, code: string }` with an appropriate HTTP status
  - Create `server/src/middleware/auth.ts` verifying the Supabase JWT via the Admin SDK, attaching `req.user` and `req.profile` to the request, and returning 401 with `AUTH_REQUIRED` or `TOKEN_EXPIRED` codes on failure
  - Create `server/src/middleware/requireRole.ts` returning 403 with `INSUFFICIENT_ROLE` when the caller's role does not match the required role
  - Create `server/src/middleware/rateLimiter.ts` exporting a `domainCheckRateLimiter` using `express-rate-limit` at 10 req/IP/min
  - _Requirements: 2.1–2.6_

  - [x] 7.1 Write unit tests for auth middleware
    - Test: valid JWT attaches user and calls next
    - Test: missing JWT returns 401 with `AUTH_REQUIRED`
    - Test: expired JWT returns 401 with `TOKEN_EXPIRED`
    - _Requirements: 2.2, 2.3_

  - [x] 7.2 Write unit tests for role middleware
    - Test: admin role on admin route calls next
    - Test: client role on admin route returns 403 with `INSUFFICIENT_ROLE`
    - _Requirements: 2.4_

  - [x] 7.3 Write unit tests for error handler
    - Test: thrown Error produces `{ error, code }` JSON with 500
    - Test: thrown object with custom code preserves the code
    - _Requirements: 2.6_

  - [x] 7.4 Write property test for error handler response shape (Property 7)
    - **Property 7: Error handler response shape**
    - **Validates: Requirements 2.6**
    - Use fast-check to generate arbitrary error objects; assert every response matches `{ error: string, code: string }` shape

  - [x] 7.5 Write property test for invalid JWT returns 401 (Property 5)
    - **Property 5: Invalid JWT returns 401**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Use fast-check to generate arbitrary malformed token strings; assert all return 401 with correct code

  - [x] 7.6 Write property test for insufficient role returns 403 (Property 6)
    - **Property 6: Insufficient role returns 403**
    - **Validates: Requirements 2.4**
    - Use fast-check to generate valid client JWTs against admin endpoints; assert all return 403


- [x] 8. Backend: Mailcow service
  - Create `server/src/services/mailcow.ts` implementing the full `MailcowService` interface: `addDomain`, `deleteDomain`, `addMailbox`, `getMailboxes`, `updateMailbox`, `deleteMailbox`, `resetPassword`, `getOverviewStats`, `getMailboxStats`
  - Read `MAILCOW_HOST` and `MAILCOW_API_KEY` exclusively from `process.env`; never forward these to any response
  - Wrap all HTTP calls in try/catch; throw `MailcowUnavailableError` (with `code = 'MAILCOW_UNAVAILABLE'`) on network errors (ECONNREFUSED, ETIMEDOUT)
  - _Requirements: 3.1–3.11_

  - [x] 8.1 Write unit tests for Mailcow service
    - Test: correct endpoint construction for each method
    - Test: network error maps to `MailcowUnavailableError`
    - Test: non-2xx Mailcow response maps to `MAILCOW_ERROR`
    - _Requirements: 3.1–3.11_

- [x] 9. Backend: Domain check service and route
  - Create `server/src/services/domainCheck.ts` implementing `DomainCheckService.checkAvailability(name, tld)` using the WhoisJSON API; maintain an in-memory `Map<string, CacheEntry>` with 60s TTL; throw a typed `WhoisUnavailableError` on network/rate-limit failures
  - Create `GET /api/domains/check` route in `server/src/routes/domains.ts` (no JWT required): validate `name` and `tld` query params (422 on missing/invalid), apply `domainCheckRateLimiter`, delegate to `domainCheckService`, return `{ domain, available }` or 503 on `WHOIS_UNAVAILABLE`
  - _Requirements: 27.1–27.9_

  - [x] 9.1 Write unit tests for domain check service
    - Test: cache hit within 60s does not call WhoisJSON again
    - Test: cache miss after 60s calls WhoisJSON
    - Test: WhoisJSON error maps to `WhoisUnavailableError`
    - _Requirements: 27.7, 27.9_

  - [x] 9.2 Write property test for domain check cache hit (Property 28)
    - **Property 28: Domain check cache hit**
    - **Validates: Requirements 27.7**
    - Use fast-check to generate domain+TLD pairs; assert WhoisJSON called exactly once for two checks within TTL

  - [x] 9.3 Write property test for rate limit enforcement (Property 29)
    - **Property 29: Rate limit enforcement**
    - **Validates: Requirements 27.8**
    - Use fast-check to simulate >10 requests from same IP; assert requests 11+ receive 429

  - [x] 9.4 Write property test for domain name validation (Property 30)
    - **Property 30: Domain name validation**
    - **Validates: Requirements 27.3, 27.4**
    - Use fast-check to generate strings with invalid chars or out-of-range lengths; assert backend returns 422


- [x] 10. Backend: All remaining routes
  - Create `server/src/routes/domains.ts` (additions): `POST /api/domains/add` (auth + admin role) calling `mailcowService.addDomain` and creating a Supabase client record; `DELETE /api/domains/:domain` (auth + admin role) calling `mailcowService.deleteDomain`
  - Create `server/src/routes/mailboxes.ts`: `POST /api/mailboxes/add`, `GET /api/mailboxes/:domain`, `PUT /api/mailboxes/:email`, `DELETE /api/mailboxes/:email`, `POST /api/mailboxes/:email/password` — all auth-protected; admin routes also require admin role; portal users may only call password reset on their own mailboxes
  - Create `server/src/routes/stats.ts`: `GET /api/stats/overview` and `GET /api/stats/mailbox/:email` (auth + admin role) delegating to `mailcowService`
  - Create `server/src/routes/leads.ts`: `POST /api/leads` (no JWT) validating required fields and inserting into Supabase `leads` table with `status = 'new'`; return 201 `{ id }` on success, 422 on validation failure
  - Register all routes in `server/src/index.ts`
  - _Requirements: 3.2–3.10, 24.1–24.5_

  - [x] 10.1 Write unit tests for leads route
    - Test: valid body inserts record and returns 201 with id
    - Test: missing required field returns 422
    - _Requirements: 24.1, 24.2_

- [x] 11. Checkpoint — backend foundation complete
  - Ensure all backend unit and property tests pass
  - Verify all routes respond correctly with a REST client (curl or Postman)
  - Ask the user if any questions arise before proceeding to frontend

- [x] 12. Shared UI components
  - Create `client/src/components/shared/Toast.tsx`: fixed bottom-right notification with `#1A0301` background, `#8C1007` left border, cream text, auto-dismiss after 4s; expose a `useToast` hook in `client/src/hooks/useToast.ts`
  - Create `client/src/components/shared/SkeletonLoader.tsx`: animated placeholder div using the `skeleton-pulse` keyframe
  - Create `client/src/components/shared/EmptyState.tsx`: centered SVG illustration, heading, subtext, and optional primary action button
  - Create `client/src/components/shared/StatusBadge.tsx`: pill badge with 6px padding, color-coded by status value
  - Create `client/src/components/shared/PlanBadge.tsx`: pill badge with plan-specific backgrounds (Starter `#3E0703`, Business `#660B05`, Pro `#8C1007`) and cream text
  - Create `client/src/components/shared/SlideOver.tsx`: right-side panel that slides in, with overlay backdrop and close button
  - Create `client/src/components/shared/MailcowBanner.tsx`: persistent top-of-page banner shown when `MAILCOW_UNAVAILABLE` error is present
  - Create `client/src/components/shared/ProtectedRoute.tsx`: checks auth session and role; redirects to `/login` if unauthenticated; renders `<UnauthorisedPage />` if role mismatch
  - Create `client/src/components/shared/FloatingWhatsApp.tsx`: fixed bottom-right button, `#25D366` background, white WhatsApp icon, pulse animation; hidden on any `/admin/*` route; opens `https://wa.me/[support_number]?text=...` in new tab
  - _Requirements: 1.5, 1.6, 15.1–15.5, 16.1–16.2, 17.1, 17.3, 18.7–18.12, 26.1–26.4_


- [x] 13. Auth pages and routing setup
  - Set up React Router in `client/src/main.tsx` with routes: `/` (LandingPage), `/login` (LoginPage), `/admin/*` (wrapped in `<ProtectedRoute requiredRole="admin">`), `/portal/*` (wrapped in `<ProtectedRoute requiredRole="client">`), `*` (NotFoundPage)
  - Create `client/src/pages/auth/LoginPage.tsx`: email/password form using `supabase.auth.signInWithPassword`; on success fetch profile and redirect to `/admin` or `/portal` based on role; display inline error on failure (no redirect)
  - Create `client/src/pages/NotFoundPage.tsx`: 404 page with message and link back to `/`
  - Create `client/src/pages/UnauthorisedPage.tsx`: 403 page with message and logout button
  - _Requirements: 1.1–1.7, 17.4, 17.5_

  - [x] 13.1 Write unit tests for route guards
    - Test: unauthenticated user on `/admin` redirects to `/login`
    - Test: client role on `/admin` renders UnauthorisedPage
    - Test: admin role on `/admin` renders admin content
    - _Requirements: 1.5, 1.6_

  - [x] 13.2 Write property test for unauthenticated route guard (Property 2)
    - **Property 2: Unauthenticated route guard**
    - **Validates: Requirements 1.5**
    - Use fast-check to generate arbitrary `/admin/*` and `/portal/*` paths; assert all redirect to `/login` when session is null

  - [x] 13.3 Write property test for role-based route guard (Property 3)
    - **Property 3: Role-based route guard**
    - **Validates: Requirements 1.6**
    - Use fast-check to generate arbitrary `/admin/*` paths with client role; assert all render UnauthorisedPage

  - [x] 13.4 Write property test for role-based redirect correctness (Property 1)
    - **Property 1: Role-based redirect correctness**
    - **Validates: Requirements 1.3, 1.4**
    - Use fast-check to generate role values; assert admin → `/admin`, client → `/portal`, no other target valid

  - [x] 13.5 Write property test for logout clears session (Property 4)
    - **Property 4: Logout clears session**
    - **Validates: Requirements 1.7**
    - Use fast-check to generate session objects; assert after signOut session is null and redirect is `/login`

- [x] 14. Landing page — navigation and hero
  - Create `client/src/components/landing/LandingNav.tsx`: sticky nav with brand logo (cream bold), Features/Pricing/Contact links, ghost "Sign in" button, filled "Get started" button (`#8C1007`); on scroll add `#0D0100` background and `#3E0703` bottom border; "Sign in" navigates to `/login`; "Get started" scrolls to `#register`
  - Create `client/src/components/landing/HeroSection.tsx`: large bold cream heading "Professional email for your Zimbabwean business", muted subheading, trust indicators row ("ZISPA accredited registrar", "Connects to Outlook & Gmail", "Setup in 24 hours", "Local Zimbabwe support")
  - _Requirements: 19.1–19.5, 20.1, 20.7_


- [x] 15. Landing page — DomainSearchBar
  - Create `client/src/components/landing/DomainSearchBar.tsx`: text input (domain name without extension) + TLD dropdown (`.co.zw`, `.com`) + search button (`#8C1007`); trigger check only on button click (no debounce); show spinner inside button during check; fade-in result pill on response
  - When domain is available: green pill "Available" + cream "Register this domain" button that scrolls to `#register` and pre-fills domain+TLD in registration form state
  - When domain is taken: red pill "Already taken" + "Try these instead:" row with chips `[name].com`, `get[name].co.zw`, `my[name].co.zw`; clicking a chip auto-triggers a new availability check for that chip's domain
  - When `.co.zw` is searched: run parallel check for `.com` equivalent and display both results side by side
  - Inline validation: show "Domain names can only contain letters, numbers and hyphens" for invalid chars; "Domain name must be at least 3 characters" for length < 3; "Domain name must be under 63 characters" for length > 63; "Connection error. Please check your internet and try again." on network error
  - On `WHOIS_UNAVAILABLE` (503): display "Domain check temporarily unavailable. Submit your details and we'll verify availability for you."
  - _Requirements: 20.2–20.6, 27.10–27.17, 27.20, 27.22–27.25_

  - [x] 15.1 Write unit tests for domain search component
    - Test: available domain shows green pill and register button
    - Test: taken domain shows red pill and alternative chips
    - Test: chip click triggers new availability check
    - Test: `.co.zw` search triggers parallel `.com` check
    - Test: invalid chars show inline error without calling API
    - _Requirements: 20.3–20.5, 27.10–27.17_

  - [x] 15.2 Write property test for domain search availability result (Property 19)
    - **Property 19: Domain search availability result**
    - **Validates: Requirements 20.3, 20.4, 20.5**
    - Use fast-check to generate domain+TLD pairs and mock availability responses; assert indicator matches response

  - [x] 15.3 Write property test for parallel .com check (Property 31)
    - **Property 31: Parallel .com check for .co.zw searches**
    - **Validates: Requirements 27.17**
    - Use fast-check to generate `.co.zw` domain names; assert both `.co.zw` and `.com` results present in DOM

  - [x] 15.4 Write property test for alternative chip auto-check (Property 32)
    - **Property 32: Alternative chip auto-check**
    - **Validates: Requirements 27.15, 27.16**
    - Use fast-check to generate taken domain names; assert chips are exactly `[name].com`, `get[name].co.zw`, `my[name].co.zw` and clicking triggers new check


- [x] 16. Landing page — HowItWorks, PricingSection, FeaturesSection, LandingFooter
  - Create `client/src/components/landing/HowItWorks.tsx`: 3-step horizontal flow with step number circles (`#8C1007` background), bold cream titles, muted descriptions, dashed connecting lines between steps
  - Create `client/src/components/landing/PricingSection.tsx`: 3 plan cards — Starter ($3/mo, 1 mailbox, 500 MB), Business ($10/mo, 5 mailboxes, 1 GB, "Most popular" badge + 2px `#8C1007` border), Pro ($18/mo, 10 mailboxes, 2 GB); each card lists included features per requirements 21.6–21.8; each "Get started" button scrolls to `#register` and pre-selects that plan in registration form state
  - Create `client/src/components/landing/FeaturesSection.tsx`: 2-column grid with 4 feature blocks: "Works with Outlook & Gmail", ".co.zw domains (ZISPA)", "Fast setup (24 hours)", "Local support (WhatsApp)"
  - Create `client/src/components/landing/LandingFooter.tsx`: brand name + tagline left, Privacy Policy/Terms/Contact links right, copyright line at bottom
  - Assemble all sections into `client/src/pages/LandingPage.tsx`
  - _Requirements: 21.1–21.8, 22.1–22.2_

  - [x] 16.1 Write property test for plan pre-selection (Property 21)
    - **Property 21: Plan pre-selection from pricing cards**
    - **Validates: Requirements 21.5**
    - Use fast-check to generate plan values; assert clicking that plan's "Get started" pre-selects exactly that plan in the form

- [x] 17. Landing page — RegistrationForm
  - Create `client/src/components/landing/RegistrationForm.tsx` at anchor `#register` with 5 sections:
    - Section 1: domain name input + TLD dropdown + live availability indicator (800ms debounced check on field edit) + plan selector; pre-fill domain+TLD from hero search state; show green/red pill inline
    - Section 2: company/org name, registration type (Company/Individual/NGO), business reg number (shown only when type = Company), org description
    - Section 3: full name, position/title, email, WhatsApp/phone, physical address (with P.O. Box note)
    - Section 4: document checklist checkboxes (letterhead ready, TC confirmation, signed letter ready, ID copy ready)
    - Section 5: ZISPA T&C checkbox, service T&C checkbox, full-width submit button
  - On valid submit: POST to `/api/leads`, show success state with checkmark and "Thank you! We'll WhatsApp you within 24 hours"
  - On validation failure: show inline errors below each invalid field without submitting
  - On `WHOIS_UNAVAILABLE` during debounced check: show degradation message and keep form submittable
  - _Requirements: 23.1–23.8, 27.18–27.21_

  - [x] 17.1 Write unit tests for registration form validation
    - Test: missing required fields show inline errors without submitting
    - Test: business reg number field hidden when type ≠ Company
    - Test: domain field triggers debounced check after 800ms idle
    - Test: WHOIS_UNAVAILABLE shows degradation message and form remains submittable
    - _Requirements: 23.8, 27.19, 27.21_

  - [x] 17.2 Write property test for ZISPA form validation (Property 22)
    - **Property 22: ZISPA form validation prevents submission**
    - **Validates: Requirements 23.8**
    - Use fast-check to generate form states with one or more empty required fields; assert form never submits and inline errors appear

  - [x] 17.3 Write property test for registration form debounce (Property 33)
    - **Property 33: Registration form debounce**
    - **Validates: Requirements 27.19**
    - Use fast-check to generate keystroke sequences; assert API called at most once per 800ms idle window

  - [x] 17.4 Write property test for registration form pre-fill (Property 20)
    - **Property 20: Registration form pre-fill from domain search**
    - **Validates: Requirements 20.6**
    - Use fast-check to generate domain+TLD pairs; assert form fields pre-filled with exactly those values after "Register this domain" click

  - [x] 17.5 Write property test for WhoisJSON unavailable degradation (Property 34)
    - **Property 34: WhoisJSON unavailable graceful degradation**
    - **Validates: Requirements 27.21**
    - Use fast-check to simulate WHOIS_UNAVAILABLE responses; assert form remains submittable and degradation message shown


- [x] 18. Checkpoint — landing page complete
  - Ensure all landing page unit and property tests pass
  - Visually verify design system tokens applied correctly (dark theme, fonts, colors)
  - Ask the user if any questions arise before proceeding to admin dashboard

- [x] 19. Admin layout and sidebar
  - Create `client/src/components/admin/AdminSidebar.tsx`: collapsible left sidebar with links to Overview, Clients, Mailboxes, Invoices, Leads, Settings, and Logout; active item styled with `#8C1007` left border and `#1A0301` background; collapse toggle button
  - Create an `AdminLayout` wrapper component that renders `<AdminSidebar />` alongside `<Outlet />` from React Router
  - Wire admin routes: `/admin` → OverviewPage, `/admin/clients` → ClientsPage, `/admin/clients/:id` → ClientDetailPage, `/admin/mailboxes` → MailboxesPage, `/admin/invoices` → InvoicesPage, `/admin/leads` → LeadsPage, `/admin/settings` → SettingsPage
  - _Requirements: 15.1, 15.2_

- [x] 20. Admin: Overview page
  - Create `client/src/pages/admin/OverviewPage.tsx` with:
    - 4 metric cards in a 4-column grid (total clients, total active mailboxes, MRR, unpaid invoice count) using `<MetricCard />` component
    - Line chart (client growth over last 6 months) and bar chart (revenue by month) using Recharts; primary series `#8C1007`, secondary `#FFF0C4`, tertiary `#660B05`, grid lines at 10% cream opacity, axis labels `#C4917A`
    - Recent activity feed showing last 10 actions
    - Quick-action buttons: "Add client" (opens Add Client slide-over) and "Add mailbox"
    - Skeleton loaders while data is loading
    - `<MailcowBanner />` when Mailcow API call fails
  - Create `client/src/components/admin/MetricCard.tsx`
  - Create `client/src/hooks/useClients.ts`, `useMailboxes.ts`, `useInvoices.ts` fetching from Supabase; call `useToast` in catch blocks
  - _Requirements: 4.1–4.7, 17.1, 18.10_

  - [x] 20.1 Write property test for skeleton loaders during loading state (Property 11)
    - **Property 11: Skeleton loaders during loading state**
    - **Validates: Requirements 4.6, 10.4**
    - Use fast-check to generate loading=true states; assert skeleton elements render and data elements do not

  - [x] 20.2 Write property test for Mailcow unreachable banner (Property 12)
    - **Property 12: Mailcow unreachable banner**
    - **Validates: Requirements 4.7, 17.3**
    - Use fast-check to generate MAILCOW_UNAVAILABLE error states; assert banner is present in DOM

  - [x] 20.3 Write property test for toast on API error (Property 17)
    - **Property 17: Toast on API error**
    - **Validates: Requirements 17.1**
    - Use fast-check to generate API error responses (4xx/5xx); assert toast displayed with error message


- [x] 21. Admin: Clients page
  - Create `client/src/pages/admin/ClientsPage.tsx` with:
    - Clients table (`<ClientsTable />`) with columns: company name, domain (JetBrains Mono), plan badge, mailbox count/limit, status badge, next renewal date, actions
    - Real-time search filter by company name or domain
    - Plan filter dropdown and status filter dropdown
    - "Add client" button opening `<SlideOver>` containing `<AddClientForm />`
    - `<EmptyState />` when table is empty
  - Create `client/src/components/admin/ClientsTable.tsx`
  - Create `client/src/components/admin/AddClientForm.tsx`: fields for company name, domain, plan, contact name, contact email, contact phone, notes; on valid submit call `POST /api/domains/add` and insert Supabase client record; inline validation errors on missing required fields
  - _Requirements: 5.1–5.8_

  - [x] 21.1 Write property test for filter correctness (Property 8)
    - **Property 8: Filter correctness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 7.2, 8.2**
    - Use fast-check to generate client arrays and filter strings; assert every displayed item satisfies the filter predicate

  - [x] 21.2 Write property test for form validation prevents submission (Property 9)
    - **Property 9: Form validation prevents submission**
    - **Validates: Requirements 5.7, 14.3**
    - Use fast-check to generate form states with empty/whitespace required fields; assert form never submits and inline errors shown

- [x] 22. Admin: Client detail page
  - Create `client/src/pages/admin/ClientDetailPage.tsx` at `/admin/clients/:id` with 4-tab layout:
    - Overview tab: client info card with inline editing (save updates Supabase client record), suspend/reactivate toggle (updates status), MRR contribution display
    - Mailboxes tab: mailbox table with per-row actions (Reset password → `POST /api/mailboxes/:email/password`, Suspend → `PUT /api/mailboxes/:email`, Delete → `DELETE /api/mailboxes/:email` + remove Supabase record); "Add mailbox" form with email prefix input, quota slider (100 MB–2 GB), password field; on submit call `POST /api/mailboxes/add` and insert Supabase mailbox record
    - Invoices tab: invoice table + "Create invoice" form; "Mark paid" updates status and `paid_at` in Supabase; "Download PDF" generates and downloads invoice PDF
    - Support Tickets tab: tickets with status badges, expandable message view, status update dropdown (updates Supabase `support_tickets` record)
  - _Requirements: 6.1–6.13_

  - [x] 22.1 Write property test for invoice paid status round-trip (Property 10)
    - **Property 10: Invoice paid status round-trip**
    - **Validates: Requirements 6.10**
    - Use fast-check to generate invoice records; assert marking paid results in status='paid' and non-null paid_at on read

  - [x] 22.2 Write unit tests for PDF download (optional feature)
    - Test: clicking "Download PDF" triggers file download with correct filename
    - _Requirements: 6.11_


- [x] 23. Admin: Global mailboxes page
  - Create `client/src/pages/admin/MailboxesPage.tsx` at `/admin/mailboxes`:
    - Searchable table of all mailboxes (email in JetBrains Mono, domain, status badge, client name, actions)
    - Real-time search filter by email or domain
    - Checkbox selection per row; "Suspend selected" calls `PUT /api/mailboxes/:email` for each; "Delete selected" calls `DELETE /api/mailboxes/:email` and removes Supabase records for each
    - `<EmptyState />` when table is empty
  - Create `client/src/components/admin/MailboxesTable.tsx`
  - _Requirements: 7.1–7.5_

- [x] 24. Admin: Invoices page
  - Create `client/src/pages/admin/InvoicesPage.tsx` at `/admin/invoices`:
    - Invoices table with columns: client, amount, status badge, due date, actions
    - Status filter dropdown
    - Overdue rows highlighted with `#F87171`
    - Summary cards: total collected this month, total outstanding
    - `<EmptyState />` when table is empty
  - Create `client/src/components/admin/InvoicesTable.tsx`
  - _Requirements: 8.1–8.5_

  - [x] 24.1 Write property test for overdue invoice danger color (Property 18)
    - **Property 18: Overdue invoice danger color**
    - **Validates: Requirements 8.3**
    - Use fast-check to generate invoice arrays with mixed statuses; assert every overdue row applies `#F87171`

- [x] 25. Admin: Leads page
  - Create `client/src/pages/admin/LeadsPage.tsx` at `/admin/leads`:
    - Leads table with columns: domain (JetBrains Mono), company name, plan badge, phone, status badge, submitted date
    - Expandable rows showing full lead details on click
    - Status dropdown per row updating Supabase `leads` record on change
    - "Convert to client" button (visible when status = 'contacted'): opens Add Client slide-over pre-filled with lead's domain, company_name, plan, contact_name, contact_email, contact_phone
    - WhatsApp button per row: opens `https://wa.me/[contact_phone]?text=Hi [contact_name], we received your domain registration request for [domain]...` in new tab
  - Create `client/src/components/admin/LeadsTable.tsx`
  - Create `client/src/hooks/useLeads.ts` for CRUD on leads table
  - _Requirements: 25.1–25.6_

  - [x] 25.1 Write property test for lead status update round-trip (Property 24)
    - **Property 24: Lead status update round-trip**
    - **Validates: Requirements 25.4**
    - Use fast-check to generate lead records and new status values; assert updated status returned on read

  - [x] 25.2 Write property test for convert to client pre-fill (Property 25)
    - **Property 25: Convert to client pre-fill**
    - **Validates: Requirements 25.5**
    - Use fast-check to generate lead records; assert slide-over fields pre-filled with exactly that lead's data

  - [x] 25.3 Write property test for WhatsApp lead message (Property 27)
    - **Property 27: WhatsApp lead message contains lead data**
    - **Validates: Requirements 25.6**
    - Use fast-check to generate lead records; assert generated URL contains contact_phone, contact_name, and domain

  - [x] 25.4 Write unit tests for WhatsApp link generation
    - Test: URL contains correct phone number in base URL
    - Test: pre-filled message contains contact_name and domain
    - _Requirements: 25.6_


- [x] 26. Admin: Settings page
  - Create `client/src/pages/admin/SettingsPage.tsx` at `/admin/settings` with sections:
    - Plan pricing config: editable price fields for Starter/Business/Pro; save persists to Supabase
    - Mailcow connection status: calls `GET /api/stats/overview` and displays live status indicator
    - Admin profile: editable name, email, password fields; save updates Supabase Auth and profiles record
    - Business info / logo upload: file input storing logo in Supabase Storage; display uploaded logo in dashboard
  - _Requirements: 9.1–9.5_

- [x] 27. Checkpoint — admin dashboard complete
  - Ensure all admin page unit and property tests pass
  - Verify role-based access: client session cannot access any `/admin/*` route
  - Ask the user if any questions arise before proceeding to client portal

- [x] 28. Client portal layout and navbar
  - Create `client/src/components/portal/PortalNavbar.tsx`: top navigation bar with links to Dashboard, Mailboxes, Invoices, Support; "Open Webmail" accent button (`#8C1007`) opening `https://mail.[clientdomain]` in new tab; Account dropdown with Logout option
  - Create a `PortalLayout` wrapper rendering `<PortalNavbar />` alongside `<Outlet />`
  - Wire portal routes: `/portal` → PortalDashboardPage, `/portal/mailboxes` → PortalMailboxesPage, `/portal/account` → PortalAccountPage, `/portal/invoices` → PortalInvoicesPage, `/portal/support` → PortalSupportPage
  - _Requirements: 15.3–15.5_

- [x] 29. Portal: Dashboard page
  - Create `client/src/pages/portal/PortalDashboardPage.tsx`:
    - Welcome banner with client's company name
    - 4 metric cards: active mailbox count, total storage used, next renewal date with countdown, open support ticket count
    - Quick-action buttons: "View mailboxes", "Open webmail", "Submit support ticket"
    - Skeleton loaders while data is loading
  - _Requirements: 10.1–10.4_

- [x] 30. Portal: Mailboxes page
  - Create `client/src/pages/portal/PortalMailboxesPage.tsx`:
    - Mailboxes table with columns: email (JetBrains Mono), storage used (progress bar with `#3E0703` track and `#8C1007` fill), status badge, actions
    - Per-row "Reset password" button calling `POST /api/mailboxes/:email/password`
    - Per-row "Open webmail" button opening `https://mail.[clientdomain]` in new tab
    - No add-mailbox or delete-mailbox controls rendered
    - "Request additional mailbox" button creating a Support_Ticket in Supabase with pre-filled subject
    - `<EmptyState />` with "Request additional mailbox" button when table is empty
  - Create `client/src/components/portal/MailboxRow.tsx`
  - _Requirements: 11.1–11.6_

  - [x] 30.1 Write property test for role-based UI restrictions (Property 13)
    - **Property 13: Role-based UI restrictions**
    - **Validates: Requirements 11.4, 12.5**
    - Use fast-check to generate portal user sessions; assert add-mailbox, delete-mailbox controls and company/domain/plan edit fields absent from DOM


- [x] 31. Portal: Account page
  - Create `client/src/pages/portal/PortalAccountPage.tsx`:
    - Company details in read-only format (company name, domain in JetBrains Mono, registration type)
    - Plan card showing current plan name, mailbox limit, price; "Upgrade plan" button creates Support_Ticket with pre-filled upgrade subject
    - Editable phone number field; save updates `phone` in Supabase profiles record
    - No editable fields for company name, domain, or plan
  - _Requirements: 12.1–12.5_

  - [x] 31.1 Write property test for phone number update round-trip (Property 14)
    - **Property 14: Phone number update round-trip**
    - **Validates: Requirements 12.4**
    - Use fast-check to generate valid phone number strings; assert saved value returned on subsequent profile read

- [x] 32. Portal: Invoices page
  - Create `client/src/pages/portal/PortalInvoicesPage.tsx`:
    - Invoices table with columns: description, amount, status badge, due date, actions
    - "Pay now" button on unpaid invoices: opens `https://wa.me/[support_number]?text=...` pre-filled with invoice amount and reference in new tab
    - "Download PDF" button generating and downloading invoice PDF
  - _Requirements: 13.1–13.3_

  - [x] 32.1 Write property test for WhatsApp payment link (Property 15)
    - **Property 15: WhatsApp payment link contains invoice data**
    - **Validates: Requirements 13.2**
    - Use fast-check to generate invoice records; assert generated URL contains invoice amount and id

  - [x] 32.2 Write unit tests for WhatsApp payment link generation
    - Test: URL base is `https://wa.me/`
    - Test: pre-filled message contains invoice amount and invoice id
    - _Requirements: 13.2_

- [x] 33. Portal: Support page
  - Create `client/src/pages/portal/PortalSupportPage.tsx`:
    - Ticket list with status badges
    - "New ticket" form (`<SupportTicketForm />`) with subject and message fields; on valid submit insert Support_Ticket in Supabase with `status = 'open'`; inline validation errors on missing subject or message
    - `<EmptyState />` with "New ticket" button when list is empty
  - Create `client/src/components/portal/SupportTicketForm.tsx`
  - Create `client/src/hooks/useTickets.ts`
  - _Requirements: 14.1–14.4_

  - [x] 33.1 Write property test for support ticket creation round-trip (Property 16)
    - **Property 16: Support ticket creation round-trip**
    - **Validates: Requirements 14.2**
    - Use fast-check to generate subject+message pairs; assert created ticket readable from Supabase with matching fields, status='open', correct client_id

  - [x] 33.2 Write property test for lead creation round-trip (Property 23)
    - **Property 23: Lead creation round-trip**
    - **Validates: Requirements 23.7, 24.2**
    - Use fast-check to generate valid registration form submissions; assert lead readable from Supabase with matching domain, tld, plan, contact_email, status='new'

- [ ] 34. Property test for floating WhatsApp button visibility (Property 26)
  - [x] 34.1 Write property test for floating WhatsApp button visibility (Property 26)
    - **Property 26: Floating WhatsApp button visibility**
    - **Validates: Requirements 26.4**
    - Use fast-check to generate route paths; assert button absent from DOM on `/admin/*` routes and present on all other routes


- [x] 35. Final checkpoint — full integration
  - Ensure all unit tests and property tests pass across both `client/` and `server/`
  - Verify end-to-end flows via automated tests: login → admin redirect, login → portal redirect, lead submission, domain check with cache, rate limiting
  - Ask the user if any questions arise before considering the implementation complete

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
 - Checkpoints (tasks 11, 18, 27, 35) ensure incremental validation before moving to the next phase
- Property tests validate universal correctness invariants; unit tests validate specific examples and edge cases
- All 34 correctness properties from the design document are covered by property-based test sub-tasks
- PDF generation (tasks 22.2, 32.2) is covered by unit tests; the implementation itself is not optional
- The `WHOISJSON_API_KEY` must never appear in any frontend bundle or API response

