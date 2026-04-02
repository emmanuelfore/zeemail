# Implementation Plan: Self-Service Onboarding

## Overview

Implement the full self-service onboarding system: database migration, backend services and routes, background MX poller, frontend multi-step registration flow, admin queue, and all associated tests. Each task builds incrementally toward a fully wired feature.

## Tasks

- [x] 1. Database migration and TypeScript types
  - [x] 1.1 Write migration 009 — alter clients table
    - Create `supabase/migrations/009_self_service_onboarding.sql`
    - Add columns: `domain_owned`, `mx_verified`, `mx_verified_at`, `previous_email_provider`, `paynow_reference`, `physical_address`
    - Drop and recreate `clients_status_check` constraint with all new statuses
    - _Requirements: 15.1–15.6_

  - [x] 1.2 Update TypeScript types in `client/src/types/index.ts`
    - Add `ClientStatus` union type with all new statuses
    - Extend `Client` interface with the six new columns
    - _Requirements: 15.1–15.5_

  - [x] 1.3 Write unit test for migration columns
    - Verify each new column exists with correct default in a test DB query
    - _Requirements: 15.1–15.6_

- [x] 2. Environment guard service
  - [x] 2.1 Implement `server/src/lib/envGuard.ts`
    - Check all required vars: `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `APP_URL`
    - Log descriptive error naming the missing variable and call `process.exit(1)`
    - _Requirements: 16.1–16.6_

  - [x] 2.2 Write property test for envGuard — Property 18
    - **Property 18: Missing required env var causes startup failure**
    - **Validates: Requirements 16.6**
    - File: `server/src/lib/__tests__/envGuard.property.test.ts`
    - Use `fc.subarray([...required vars])` to generate subsets of missing vars

  - [x] 2.3 Wire `envGuard` into `server/src/index.ts` before route registration
    - Import and call `envGuard()` at the top of the server entry point
    - _Requirements: 16.6_

- [x] 3. Backend service modules
  - [x] 3.1 Implement `server/src/services/paynow.ts` — PaynowService
    - Wrap `paynow` npm package; expose `initiatePayment(clientId, amount, email, phone)` returning `{ redirectUrl, pollUrl, reference }`
    - Read credentials from `PAYNOW_INTEGRATION_ID` / `PAYNOW_INTEGRATION_KEY`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 3.2 Write unit test for PaynowService payload construction
    - Verify correct payload fields are sent to the Paynow package
    - _Requirements: 7.2, 7.5_

  - [x] 3.3 Implement `server/src/services/cloudflare.ts` — CloudflareService
    - Wrap `cloudflare` npm package; expose `createZone(domain)`, `addMxRecord(zoneId, domain)`, `addSpfRecord(zoneId, domain)`
    - Read credentials from `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`
    - _Requirements: 11.1–11.3, 16.2_; 

  - [x] 3.4 Write unit test for CloudflareService zone and record creation
    - Mock the cloudflare package; verify correct API calls
    - _Requirements: 11.1–11.3_

  - [x] 3.5 Implement `server/src/services/resend.ts` — ResendService
    - Wrap `resend` npm package; expose `sendWelcomeEmail(client, mailboxes)` and `sendDnsInstructions(client)`
    - Read key from `RESEND_API_KEY`
    - _Requirements: 11.7, 12.4, 16.3_

  - [x] 3.6 Write unit test for ResendService email template rendering
    - Verify subject, recipient, and mailbox credentials appear in rendered output
    - _Requirements: 11.7, 12.4_

  - [x] 3.7 Implement `server/src/services/twilio.ts` — TwilioService
    - Call Twilio REST API; expose `sendWhatsApp(to, body)` for both admin and client notifications
    - Read credentials from `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
    - _Requirements: 11.8, 12.5, 14.5, 16.4_

  - [x] 3.8 Write unit test for TwilioService message dispatch
    - Mock fetch/axios; verify correct To/From/Body fields
    - _Requirements: 11.8, 12.5_

- [x] 4. ProvisioningEngine
  - [x] 4.1 Implement `server/src/services/provisioning.ts` — ProvisioningEngine
    - Implement `runPathA(clientId)`: Cloudflare zone → MX record → SPF record → Mailcow domain → create mailboxes → set status `active` → send welcome email → send WhatsApp
    - Implement `runPathB(clientId)`: Mailcow domain → create mailboxes → set status `pending_mx` → send DNS instructions → send WhatsApp
    - Implement `sendActivationNotifications(client)` for MX poller reuse
    - Generate cryptographically random passwords (≥16 chars) per mailbox using `crypto.randomBytes`
    - On any step failure: set status `provisioning_error`, log error with clientId and step name
    - Use `PLAN_MAILBOXES` map for mailbox definitions per plan
    - _Requirements: 11.1–11.9, 12.1–12.6, 13.1–13.5_

  - [x] 4.2 Write property test for Path A provisioning end state — Property 13
    - **Property 13: Path A provisioning produces an active client with correct mailboxes**
    - **Validates: Requirements 11.1–11.6, 13.1–13.3, 13.5**
    - File: `server/src/services/__tests__/provisioning.property.test.ts`
    - Use `fc.constantFrom('starter', 'business', 'pro')`

  - [x] 4.3 Write property test for Path B provisioning end state — Property 14
    - **Property 14: Path B provisioning produces a pending_mx client with correct mailboxes**
    - **Validates: Requirements 12.1–12.3**
    - File: `server/src/services/__tests__/provisioning.property.test.ts`

  - [x] 4.4 Write property test for mailbox password uniqueness — Property 15
    - **Property 15: Generated mailbox passwords are unique and sufficiently long**
    - **Validates: Requirements 13.4**
    - File: `server/src/services/__tests__/provisioning.property.test.ts`
    - Use `fc.integer({ min: 1, max: 10 })` for mailbox count

  - [x] 4.5 Write unit test for ProvisioningEngine step ordering
    - Mock all services; verify each step is called in correct sequence
    - Verify `provisioning_error` status set on step failure
    - _Requirements: 11.1–11.9, 12.1–12.6_

- [x] 5. Checkpoint — backend services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Domain suggestion and MX detection endpoints
  - [x] 6.1 Add `GET /api/domains/suggest` to `server/src/routes/domains.ts`
    - Accept `?name=` query param; return at least 3 alternative `.co.zw` domain names
    - _Requirements: 2.3_

  - [x] 6.2 Write property test for domain suggestions — Property 2
    - **Property 2: Unavailable domain returns at least 3 alternatives**
    - **Validates: Requirements 2.3**
    - File: `server/src/routes/__tests__/domainSuggest.property.test.ts`
    - Use `fc.string()` for domain name input

  - [x] 6.3 Add `GET /api/domains/mx` to `server/src/routes/domains.ts`
    - Accept `?domain=` query param; query Google DNS API and return detected provider name
    - _Requirements: 3.2, 3.3_

  - [x] 6.4 Write property test for Path A domain TLD enforcement — Property 4
    - **Property 4: Path A domain checker rejects non-.co.zw domains**
    - **Validates: Requirements 2.6**
    - File: `server/src/services/__tests__/domainCheck.property.test.ts`
    - Use `fc.string()` filtered to non-`.co.zw` strings

- [x] 7. Registration and payment routes
  - [x] 7.1 Implement `POST /api/register` in a new `server/src/routes/register.ts`
    - Validate request body against `RegisterRequest` interface
    - Check for duplicate email (return 409 with `EMAIL_EXISTS` code if found)
    - Create Supabase auth user and client record; set `domain_owned` per path
    - Store `previous_email_provider` if provided (Path B)
    - Return `{ clientId, userId }`
    - _Requirements: 5.1–5.6, 6.1–6.6, 17.1–17.4_

  - [x] 7.2 Write property test for registration round-trip — Property 19
    - **Property 19: Registration round-trip data integrity**
    - **Validates: Requirements 17.1–17.4**
    - File: `server/src/routes/__tests__/register.property.test.ts`
    - Use `fc.record(...)` for full registration payload

  - [x] 7.3 Write property test for duplicate email check — Property 9
    - **Property 9: Duplicate email check prevents re-registration**
    - **Validates: Requirements 5.5, 6.5**
    - File: `server/src/routes/__tests__/register.property.test.ts`
    - Use `fc.emailAddress()`

  - [x] 7.4 Write property test for detected provider stored on client — Property 5
    - **Property 5: Detected email provider stored on client record**
    - **Validates: Requirements 3.6**
    - File: `server/src/routes/__tests__/register.property.test.ts`
    - Use `fc.string()` for provider name

  - [x] 7.5 Implement `POST /api/payments/initiate` in `server/src/routes/payments.ts`
    - Call `PaynowService.initiatePayment`; return `{ redirectUrl, pollUrl, reference }`
    - Return 502 if Paynow is unavailable
    - _Requirements: 7.2, 7.4_

  - [x] 7.6 Implement `POST /api/payments/webhook` in `server/src/routes/payments.ts`
    - Parse Paynow URL-encoded form post
    - On success: transition client status per path (`pending_domain` or `pending_mailboxes`)
    - On failure: retain `pending_payment` status
    - _Requirements: 7.3, 7.4_

  - [x] 7.7 Implement `GET /api/payments/poll/:clientId` in `server/src/routes/payments.ts`
    - Return current payment status for client-side polling fallback
    - _Requirements: 7.3_

  - [x] 7.8 Write property test for payment status transition — Property 11
    - **Property 11: Payment confirmation triggers correct status transition**
    - **Validates: Requirements 7.3**
    - File: `server/src/routes/__tests__/payments.property.test.ts`
    - Use `fc.constantFrom('A', 'B')` for path

  - [x] 7.9 Implement `POST /api/clients/:id/provision` in `server/src/routes/clients.ts`
    - Admin-only middleware; call `ProvisioningEngine.runPathA` or `runPathB` based on `domain_owned`
    - Return `{ success, mailboxesCreated }`
    - _Requirements: 10.3, 10.5, 11.1, 12.1_

  - [x] 7.10 Implement `GET /api/clients/:id/verify-mx` in `server/src/routes/clients.ts`
    - Admin-only; manually trigger MX check for a single client
    - _Requirements: 14.2_

  - [x] 7.11 Register all new routes in `server/src/index.ts`
    - Mount `register`, `payments` routers; add provision and verify-mx handlers to clients router
    - _Requirements: all route requirements_

- [x] 8. MXPoller background job
  - [x] 8.1 Implement `server/src/jobs/mxPoller.ts`
    - Use `node-cron` to schedule every 15 minutes (`*/15 * * * *`)
    - Query all clients with status `pending_mx`; call `queryGoogleDns` per client
    - On MX match: set `mx_verified = true`, `mx_verified_at = now()`, status `active`; call `sendActivationNotifications`
    - On DNS error: log and continue without status change
    - _Requirements: 14.1–14.6_

  - [x] 8.2 Write property test for MX verification state transition — Property 16
    - **Property 16: MX verification triggers active transition**
    - **Validates: Requirements 14.3, 14.4**
    - File: `server/src/jobs/__tests__/mxPoller.property.test.ts`
    - Use `fc.string()` for domain

  - [x] 8.3 Write property test for active transition notifications — Property 17
    - **Property 17: Active transition via MX_Poller triggers notifications**
    - **Validates: Requirements 14.5**
    - File: `server/src/jobs/__tests__/mxPoller.property.test.ts`

  - [x] 8.4 Write unit test for MXPoller filtering
    - Verify clients not in `pending_mx` are skipped
    - Verify DNS errors do not change client status
    - _Requirements: 14.1, 14.6_

  - [x] 8.5 Wire MXPoller into `server/src/index.ts`
    - Import and start the poller after server starts listening
    - _Requirements: 14.1_

- [x] 9. Checkpoint — backend routes and poller
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend — useRegistration hook and RegisterPage shell
  - [x] 10.1 Implement `client/src/hooks/useRegistration.ts`
    - Hold all accumulated form state: `path`, `domain`, `plan`, `account fields`, `clientId`
    - Expose typed setters and a `resetDomain()` helper
    - Read `?plan=` URL param on init to pre-select plan
    - _Requirements: 1.1–1.4, 4.6_

  - [x] 10.2 Write property test for URL plan param pre-selection — Property 7
    - **Property 7: URL plan parameter pre-selects plan on load**
    - **Validates: Requirements 4.6**
    - File: `client/src/__tests__/planPreSelection.property.test.tsx`
    - Use `fc.constantFrom('starter', 'business', 'pro')`

  - [x] 10.3 Implement `client/src/pages/RegisterPage.tsx`
    - Own `step` state; render correct step component based on `path` and `step`
    - Pass `useRegistration` state and setters as props to each step
    - Add route `/register` in `client/src/App.tsx`
    - _Requirements: 1.2, 1.3_

- [x] 11. Frontend — PathToggle and domain step components
  - [x] 11.1 Implement `client/src/components/register/PathToggle.tsx`
    - Toggle between Path A and Path B; call `resetDomain()` on switch
    - _Requirements: 1.1, 1.4_

  - [x] 11.2 Write property test for path switching reset — Property 1
    - **Property 1: Path switching resets domain fields**
    - **Validates: Requirements 1.4**
    - File: `client/src/__tests__/pathSwitchReset.property.test.tsx`
    - Use `fc.string()` for domain value

  - [x] 11.3 Implement `client/src/components/register/StepDomainSearch.tsx`
    - 800ms debounce on input; call `GET /api/domains/check?name=&tld=.co.zw`
    - On `taken`: call `GET /api/domains/suggest?name=` and render alternative chips
    - Chip click calls `setDomain(alt)`
    - Display availability states: idle, loading, available, taken, error
    - _Requirements: 2.1–2.6_

  - [x] 11.4 Write property test for alternative chip auto-populates field — Property 3
    - **Property 3: Alternative chip selection auto-populates domain field**
    - **Validates: Requirements 2.4**
    - File: `client/src/__tests__/alternativeChipAutoCheck.property.test.tsx`
    - Use `fc.array(fc.string(), { minLength: 3 })`

  - [x] 11.5 Write unit test for StepDomainSearch availability states
    - Render each state (idle, loading, available, taken, degraded, error) and assert correct UI
    - _Requirements: 2.1–2.5_

  - [x] 11.6 Implement `client/src/components/register/StepDomainVerify.tsx`
    - Call `GET /api/domains/check?name=&tld=` (any TLD)
    - On confirmed: call `GET /api/domains/mx?domain=` and display detected provider
    - Display "No current email provider detected" when no MX found
    - _Requirements: 3.1–3.5_

- [x] 12. Frontend — plan, account, and payment steps
  - [x] 12.1 Implement `client/src/components/register/StepPlanSelect.tsx`
    - Render Starter ($3), Business ($10), Pro ($18) plan cards with mailbox counts
    - Add `+$5` domain fee line when `path === 'A'`
    - Highlight selected plan with `--primary` border token
    - _Requirements: 4.1–4.5_

  - [x] 12.2 Write property test for fee calculation — Property 6
    - **Property 6: Fee calculation is path-dependent**
    - **Validates: Requirements 4.2, 4.3, 7.6**
    - File: `client/src/__tests__/feeCalculation.property.test.tsx`
    - Use `fc.constantFrom('starter', 'business', 'pro')` and `fc.constantFrom('A', 'B')`

  - [x] 12.3 Write unit test for StepPlanSelect rendering
    - Verify correct prices and mailbox counts per plan
    - Verify $5 fee shown for Path A, absent for Path B
    - _Requirements: 4.1–4.4_

  - [x] 12.4 Implement `client/src/components/register/StepAccount.tsx`
    - Render common fields: full name, company name, phone, email, password, physical address
    - Conditionally render ZISPA checklist when `path === 'A'`
    - On email blur: call `GET /api/register/check-email?email=` for duplicate check
    - Client-side validation on "Continue": all fields non-empty, password ≥8 chars, ZISPA items checked (Path A)
    - _Requirements: 5.1–5.6, 6.1–6.6_

  - [x] 12.5 Write property test for Path A validation rejects incomplete — Property 8
    - **Property 8: Path A validation rejects incomplete submissions**
    - **Validates: Requirements 5.3, 5.4**
    - File: `client/src/__tests__/registrationFormValidation.property.test.tsx`
    - Use `fc.record(...)` with missing fields

  - [x] 12.6 Write property test for password minimum length — Property 10
    - **Property 10: Password minimum length enforced**
    - **Validates: Requirements 5.6, 6.6**
    - File: `client/src/__tests__/registrationFormValidation.property.test.tsx`
    - Use `fc.string({ maxLength: 7 })`

  - [x] 12.7 Write unit test for StepAccount ZISPA checklist visibility
    - Verify checklist present for Path A, absent for Path B
    - _Requirements: 5.2, 6.2_

  - [x] 12.8 Implement `client/src/components/register/StepPayment.tsx`
    - Call `POST /api/payments/initiate`; open Paynow redirect in new tab
    - Poll `GET /api/payments/poll/:clientId` every 5 seconds
    - On confirmed payment: navigate to `/register/confirm?id=:clientId`
    - On failure: show retry button
    - _Requirements: 7.2–7.4, 7.6_

  - [x] 12.9 Implement `client/src/components/register/StepDnsInstructions.tsx`
    - Display provider-specific MX record instructions (Cloudflare, WebZim, generic)
    - Show exact MX record value (hostname + priority) and SPF record value
    - "Someone else manages my DNS" option with forwarding-friendly format
    - _Requirements: 9.1–9.5_

- [x] 13. Frontend — StatusTracker and ConfirmPage
  - [x] 13.1 Implement `client/src/components/register/StatusTracker.tsx`
    - Subscribe to Supabase Realtime `postgres_changes` on `clients` table filtered by `clientId`
    - Render ordered step list; highlight current step
    - Step definitions differ by path (Path A includes `pending_domain`)
    - On `provisioning_error`: render error card with support contact
    - Cleanup channel on unmount
    - _Requirements: 8.1–8.5_

  - [x] 13.2 Write property test for StatusTracker labels — Property 12
    - **Property 12: Status_Tracker reflects every valid status with a non-empty label**
    - **Validates: Requirements 8.3, 8.4**
    - File: `client/src/__tests__/statusTrackerLabels.property.test.tsx`
    - Use `fc.constantFrom(...ClientStatus values)`

  - [x] 13.3 Write unit test for StatusTracker step sequences
    - Verify correct step order for Path A vs Path B
    - Verify error state renders support contact
    - _Requirements: 8.2, 8.5_

  - [x] 13.4 Implement `client/src/pages/ConfirmPage.tsx`
    - Display domain, plan, and current status
    - Render `StatusTracker` component
    - Add route `/register/confirm` in `client/src/App.tsx`
    - _Requirements: 8.1_

- [x] 14. Admin — AdminQueue component
  - [x] 14.1 Implement `client/src/components/admin/AdminQueue.tsx`
    - Query clients with status in `['pending_domain', 'pending_mailboxes']`
    - Render each row: domain, company name, plan, time since registration, status badge
    - "Run setup" button calls `POST /api/clients/:id/provision` with optimistic spinner
    - Show "Urgent" badge for `pending_domain` clients
    - _Requirements: 10.1–10.6_

  - [x] 14.2 Write unit test for AdminQueue rendering and button states
    - Verify rows render correct fields; verify spinner during in-flight request
    - _Requirements: 10.1, 10.6_

  - [x] 14.3 Integrate `AdminQueue` into `client/src/pages/admin/ClientsPage.tsx`
    - Render `AdminQueue` at the top of the page when pending clients exist
    - _Requirements: 10.1_

- [x] 15. Checkpoint — frontend components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Wiring and integration
  - [x] 16.1 Add `paynow`, `cloudflare`, `resend`, `twilio`, `node-cron` to `server/package.json` dependencies
    - Run `npm install` in server directory
    - _Requirements: 7.5, 11.1, 11.7, 11.8, 14.1_

  - [x] 16.2 Add `fast-check` to both `server` and `client` devDependencies if not already present
    - _Requirements: design testing strategy_

  - [x] 16.3 Verify all new server routes are protected with correct auth middleware
    - `/api/clients/:id/provision` and `/api/clients/:id/verify-mx` require admin role
    - `/api/register`, `/api/payments/*` are public
    - _Requirements: 10.3, 10.5_

  - [x] 16.4 Verify `RegisterPage` and `ConfirmPage` are accessible without authentication
    - Ensure `ProtectedRoute` is not wrapping `/register` or `/register/confirm` in `App.tsx`
    - _Requirements: 1.1_

- [x] 17. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `{ numRuns: 100 }` and include the comment tag `// Feature: self-service-onboarding, Property N: <text>`
- The 19 correctness properties map directly to sub-tasks 2.2, 4.2–4.4, 6.2, 6.4, 7.2–7.4, 7.8, 8.2–8.3, 10.2, 11.2, 11.4, 12.2, 12.5–12.6, 13.2
