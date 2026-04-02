# Requirements Document

## Introduction

This feature replaces the admin-invitation onboarding flow with a fully self-service signup system for the Mailcow email hosting platform targeting Zimbabwean businesses. Prospective clients visit `/register`, choose between registering a new `.co.zw` domain or hosting email on an existing domain, complete payment via Paynow Zimbabwe, and are automatically provisioned. The only manual admin step is registering a new domain on WebZim before triggering automated DNS and mailbox setup.

## Glossary

- **Registration_Form**: The multi-step signup UI at `/register`
- **Domain_Checker**: The service that queries WhoisJSON to verify domain availability or existence
- **MX_Poller**: The background cron job that polls Google DNS for MX record propagation
- **Provisioning_Engine**: The server-side service that orchestrates Cloudflare DNS, Mailcow mailbox creation, and notification dispatch
- **Paynow_Gateway**: The Paynow Zimbabwe payment integration (EcoCash, OneMoney, bank transfer)
- **Status_Tracker**: The real-time client dashboard widget powered by Supabase Realtime
- **Admin_Queue**: The admin clients page section showing clients awaiting manual action
- **ZISPA**: Zimbabwe Internet Service Providers Association — the body that requires documentation for `.co.zw` domain registration
- **WebZim**: The Zimbabwean domain registrar used by the admin to register `.co.zw` domains
- **Cloudflare_API**: The Cloudflare REST API used to create DNS zones and records
- **Mailcow_API**: The Mailcow REST API used to add domains and create mailboxes
- **Resend_API**: The transactional email service used to send welcome emails
- **Twilio_WhatsApp**: The Twilio API used to send WhatsApp notifications
- **Path_A**: The new domain registration flow (domain search → plan → account → payment → confirmation)
- **Path_B**: The existing domain hosting flow (domain verify → plan → account → payment → DNS instructions)
- **Client**: A paying customer record in the `clients` table
- **Pending_Domain_Client**: A client with status `pending_domain` awaiting admin WebZim registration

---

## Requirements

### Requirement 1: Registration Path Selection

**User Story:** As a prospective customer, I want to choose between registering a new domain or using my existing domain, so that I can start the correct onboarding flow for my situation.

#### Acceptance Criteria

1. THE Registration_Form SHALL display a toggle at the top of `/register` allowing selection between Path A (new domain) and Path B (existing domain).
2. WHEN a user selects Path A, THE Registration_Form SHALL present a 5-step flow: domain search, plan selection, account creation, payment, and confirmation.
3. WHEN a user selects Path B, THE Registration_Form SHALL present a 5-step flow: domain verification, plan selection, account creation, payment, and DNS instructions.
4. WHEN a user switches between Path A and Path B, THE Registration_Form SHALL reset domain input fields and clear any domain availability state.

---

### Requirement 2: Domain Search (Path A)

**User Story:** As a prospective customer registering a new domain, I want to search for domain availability in real time, so that I can find and claim an available `.co.zw` domain.

#### Acceptance Criteria

1. WHEN a user enters a domain name in the search field, THE Domain_Checker SHALL query the WhoisJSON API and return an availability result within 5 seconds.
2. WHEN the queried domain is available, THE Registration_Form SHALL display a green availability indicator and allow the user to proceed.
3. WHEN the queried domain is unavailable, THE Registration_Form SHALL display a red unavailability indicator and suggest at least 3 alternative domain names.
4. WHEN alternative domain suggestions are displayed, THE Registration_Form SHALL allow the user to select an alternative with a single click, auto-populating the domain field.
5. IF the WhoisJSON API returns an error, THEN THE Domain_Checker SHALL return a descriptive error message and THE Registration_Form SHALL display it to the user without crashing.
6. THE Domain_Checker SHALL only accept domains ending in `.co.zw` for Path A searches.

---

### Requirement 3: Domain Verification (Path B)

**User Story:** As a prospective customer with an existing domain, I want to verify my domain exists and see my current email provider, so that I can confirm I'm setting up hosting for the right domain.

#### Acceptance Criteria

1. WHEN a user enters an existing domain, THE Domain_Checker SHALL query WhoisJSON to confirm the domain is registered and active.
2. WHEN the domain is confirmed active, THE Domain_Checker SHALL query DNS MX records via the Google DNS API to detect the current email provider.
3. WHEN a current email provider is detected, THE Registration_Form SHALL display the detected provider name (e.g., "Currently using Google Workspace").
4. WHEN no MX records are found, THE Registration_Form SHALL display "No current email provider detected" and allow the user to proceed.
5. IF the domain does not exist or is not registered, THEN THE Registration_Form SHALL display an error and prevent the user from proceeding to the next step.
6. THE Domain_Checker SHALL store the detected `previous_email_provider` value on the client record upon account creation.

---

### Requirement 4: Plan Selection

**User Story:** As a prospective customer, I want to choose a hosting plan with clear pricing, so that I can select the right mailbox tier for my business.

#### Acceptance Criteria

1. THE Registration_Form SHALL display three plans: Starter ($3/month), Business ($10/month), and Pro ($18/month).
2. WHEN a user is on Path A, THE Registration_Form SHALL display a $5 domain registration fee added to the first month's charge for all plans.
3. WHEN a user is on Path B, THE Registration_Form SHALL display plan prices without the $5 domain fee.
4. THE Registration_Form SHALL display the number of mailboxes included per plan: Starter (1), Business (5), Pro (10).
5. WHEN a user selects a plan, THE Registration_Form SHALL highlight the selected plan and enable the "Continue" button.
6. WHERE a plan was pre-selected via a URL query parameter, THE Registration_Form SHALL auto-select that plan on load.

---

### Requirement 5: Account Creation (Path A)

**User Story:** As a prospective customer registering a new domain, I want to create my account with all required ZISPA documentation details, so that the admin can complete the WebZim registration on my behalf.

#### Acceptance Criteria

1. THE Registration_Form SHALL collect: full name, company name, phone number, email address, password, and physical address.
2. THE Registration_Form SHALL display a ZISPA document checklist with the following items: company letterhead ready, signed authorisation letter ready, director ID ready, and terms & conditions confirmed.
3. WHEN a user submits the account creation step, THE Registration_Form SHALL validate that all required fields are non-empty and that all ZISPA checklist items are checked.
4. IF any required field is empty or any ZISPA checklist item is unchecked, THEN THE Registration_Form SHALL display inline validation errors and prevent progression to the payment step.
5. WHEN a valid email address is entered, THE Registration_Form SHALL check for duplicate email addresses and display an error if the email is already registered.
6. THE Registration_Form SHALL enforce a minimum password length of 8 characters.

---

### Requirement 6: Account Creation (Path B)

**User Story:** As a prospective customer with an existing domain, I want to create my account without ZISPA documentation requirements, so that I can proceed to payment quickly.

#### Acceptance Criteria

1. THE Registration_Form SHALL collect: full name, company name, phone number, email address, password, and physical address.
2. THE Registration_Form SHALL NOT display the ZISPA document checklist for Path B.
3. WHEN a user submits the account creation step, THE Registration_Form SHALL validate that all required fields are non-empty.
4. IF any required field is empty, THEN THE Registration_Form SHALL display inline validation errors and prevent progression to the payment step.
5. WHEN a valid email address is entered, THE Registration_Form SHALL check for duplicate email addresses and display an error if the email is already registered.
6. THE Registration_Form SHALL enforce a minimum password length of 8 characters.

---

### Requirement 7: Payment via Paynow Zimbabwe

**User Story:** As a prospective customer, I want to pay for my plan using local Zimbabwean payment methods, so that I can complete signup without needing a foreign payment card.

#### Acceptance Criteria

1. THE Paynow_Gateway SHALL support EcoCash, OneMoney, and bank transfer payment methods.
2. WHEN a user initiates payment, THE Paynow_Gateway SHALL create a Paynow payment request using the `paynow` npm package and redirect the user to the Paynow payment page.
3. WHEN Paynow confirms a successful payment via webhook or polling, THE Paynow_Gateway SHALL update the client status from `pending_payment` to `pending_domain` (Path A) or `pending_mailboxes` (Path B).
4. IF a payment fails or times out, THEN THE Paynow_Gateway SHALL retain the client status as `pending_payment` and display a retry option to the user.
5. THE Paynow_Gateway SHALL use `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` environment variables for authentication.
6. WHEN payment is initiated, THE Registration_Form SHALL display the total amount including the $5 domain fee for Path A clients.

---

### Requirement 8: Confirmation Page and Status Tracker

**User Story:** As a newly registered customer, I want to see a real-time status tracker after signup, so that I know exactly where my account is in the provisioning process.

#### Acceptance Criteria

1. WHEN payment is confirmed, THE Registration_Form SHALL redirect the user to a confirmation page showing their domain, plan, and current status.
2. THE Status_Tracker SHALL display the following statuses as ordered steps: pending_payment → pending_domain (Path A only) → pending_dns → pending_mailboxes → active.
3. WHEN the client's status changes in the database, THE Status_Tracker SHALL update the displayed step in real time using a Supabase Realtime subscription without requiring a page refresh.
4. THE Status_Tracker SHALL display a human-readable label and description for each status step.
5. WHEN status is `provisioning_error`, THE Status_Tracker SHALL display an error state with a support contact prompt.

---

### Requirement 9: DNS Instructions Page (Path B)

**User Story:** As a Path B customer, I want clear DNS setup instructions after payment, so that I can update my MX records to point to the Mailcow server.

#### Acceptance Criteria

1. WHEN a Path B client completes payment, THE Registration_Form SHALL display a DNS instructions page after the payment step.
2. THE Registration_Form SHALL display provider-specific MX record instructions for: Cloudflare, WebZim, and a generic "other provider" option.
3. WHEN a client selects "someone else manages my DNS", THE Registration_Form SHALL display instructions formatted for forwarding to a third party.
4. THE Registration_Form SHALL display the exact MX record value (hostname and priority) the client must add.
5. THE Registration_Form SHALL display the exact SPF record value the client must add.

---

### Requirement 10: Admin Provisioning Queue

**User Story:** As an admin, I want to see clients awaiting action at the top of the clients page, so that I can quickly identify and process new signups that need manual steps.

#### Acceptance Criteria

1. WHEN a client has status `pending_domain`, THE Admin_Queue SHALL display that client at the top of the clients page with an "Urgent" badge.
2. THE Admin_Queue SHALL display a "Domain registered — run setup" button for each `pending_domain` client.
3. WHEN the admin clicks "Domain registered — run setup", THE Provisioning_Engine SHALL execute the full Path A provisioning sequence.
4. WHEN a client has status `pending_mailboxes` (Path B), THE Admin_Queue SHALL display a "Run setup now" button.
5. WHEN the admin clicks "Run setup now" for a Path B client, THE Provisioning_Engine SHALL execute the Path B provisioning sequence.
6. THE Admin_Queue SHALL display the client's domain, plan, company name, and time since registration for each queued client.

---

### Requirement 11: Path A Provisioning Sequence

**User Story:** As an admin, I want the system to automatically provision DNS and mailboxes after I confirm WebZim registration, so that I don't have to manually configure each service.

#### Acceptance Criteria

1. WHEN the admin triggers Path A provisioning, THE Provisioning_Engine SHALL create a Cloudflare DNS zone for the client's domain using the Cloudflare API.
2. WHEN the DNS zone is created, THE Provisioning_Engine SHALL add an MX record pointing to the Mailcow server.
3. WHEN the MX record is added, THE Provisioning_Engine SHALL add an SPF record for the domain.
4. WHEN DNS records are configured, THE Provisioning_Engine SHALL add the domain to Mailcow via the Mailcow API.
5. WHEN the domain is added to Mailcow, THE Provisioning_Engine SHALL create all mailboxes defined for the client's plan with auto-generated secure passwords.
6. WHEN mailboxes are created, THE Provisioning_Engine SHALL update the client status to `active`.
7. WHEN status is set to `active`, THE Provisioning_Engine SHALL send a welcome email via the Resend API containing all mailbox credentials.
8. WHEN the welcome email is sent, THE Provisioning_Engine SHALL send a WhatsApp notification to both the admin and the client via Twilio WhatsApp.
9. IF any step in the provisioning sequence fails, THEN THE Provisioning_Engine SHALL set the client status to `provisioning_error` and log the failure details.

---

### Requirement 12: Path B Provisioning Sequence

**User Story:** As an admin, I want the system to create mailboxes for existing-domain clients and notify them of DNS changes needed, so that they can complete setup independently.

#### Acceptance Criteria

1. WHEN the admin triggers Path B provisioning, THE Provisioning_Engine SHALL add the domain to Mailcow via the Mailcow API.
2. WHEN the domain is added to Mailcow, THE Provisioning_Engine SHALL create all mailboxes defined for the client's plan with auto-generated secure passwords.
3. WHEN mailboxes are created, THE Provisioning_Engine SHALL update the client status to `pending_mx`.
4. WHEN status is set to `pending_mx`, THE Provisioning_Engine SHALL send DNS setup instructions to the client via the Resend API.
5. WHEN DNS instructions are sent, THE Provisioning_Engine SHALL send a WhatsApp notification to the client via Twilio WhatsApp.
6. IF any step in the Path B provisioning sequence fails, THEN THE Provisioning_Engine SHALL set the client status to `provisioning_error` and log the failure details.

---

### Requirement 13: Mailbox Generation Per Plan

**User Story:** As a system, I want to automatically create the correct set of mailboxes for each plan, so that clients receive the right mailboxes without manual configuration.

#### Acceptance Criteria

1. WHEN provisioning a Starter plan client, THE Provisioning_Engine SHALL create one mailbox: `info@` with a 500 MB quota.
2. WHEN provisioning a Business plan client, THE Provisioning_Engine SHALL create five mailboxes: `info@`, `admin@`, `sales@`, `support@`, `accounts@`, each with a 1024 MB quota.
3. WHEN provisioning a Pro plan client, THE Provisioning_Engine SHALL create ten mailboxes: `info@`, `admin@`, `sales@`, `support@`, `accounts@`, `hr@`, `ceo@`, `finance@`, `marketing@`, `ops@`, each with a 2048 MB quota.
4. THE Provisioning_Engine SHALL generate a unique, cryptographically random password of at least 16 characters for each mailbox.
5. FOR ALL plans, THE Provisioning_Engine SHALL store each generated mailbox in the `mailboxes` table with status `active`.

---

### Requirement 14: MX Record Polling (Path B)

**User Story:** As a Path B client, I want my account to activate automatically once my MX records propagate, so that I don't have to contact support to go live.

#### Acceptance Criteria

1. THE MX_Poller SHALL run every 15 minutes for all clients with status `pending_mx`.
2. WHEN the MX_Poller runs, THE MX_Poller SHALL query the Google DNS API (`dns.google`) for the MX records of each `pending_mx` client's domain.
3. WHEN the MX records for a domain point to the Mailcow server, THE MX_Poller SHALL update the client's `mx_verified` field to `true` and `mx_verified_at` to the current timestamp.
4. WHEN `mx_verified` is set to `true`, THE MX_Poller SHALL update the client status to `active`.
5. WHEN status is set to `active` by the MX_Poller, THE Provisioning_Engine SHALL send a welcome email via the Resend API and a WhatsApp notification via Twilio WhatsApp.
6. IF the Google DNS API returns an error during polling, THEN THE MX_Poller SHALL log the error and retry on the next scheduled interval without changing the client status.

---

### Requirement 15: Database Schema Changes

**User Story:** As a developer, I want the database schema to support the new onboarding statuses and domain ownership fields, so that all client states are accurately tracked.

#### Acceptance Criteria

1. THE System SHALL add a `domain_owned` boolean column (default `false`) to the `clients` table to indicate whether the domain was registered through Path A.
2. THE System SHALL add an `mx_verified` boolean column (default `false`) to the `clients` table.
3. THE System SHALL add an `mx_verified_at` timestamptz column (nullable) to the `clients` table.
4. THE System SHALL add a `previous_email_provider` text column (nullable) to the `clients` table.
5. THE System SHALL expand the `clients.status` CHECK constraint to include: `pending_payment`, `pending_domain`, `pending_dns`, `pending_mailboxes`, `pending_mx`, `provisioning_error` in addition to the existing `active` and `suspended` values.
6. THE System SHALL provide a migration file that applies all schema changes without dropping existing data.

---

### Requirement 16: Environment Configuration

**User Story:** As a developer, I want all integration credentials managed via environment variables, so that secrets are never hardcoded in the codebase.

#### Acceptance Criteria

1. THE System SHALL read Paynow credentials from `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` environment variables.
2. THE System SHALL read Cloudflare credentials from `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables.
3. THE System SHALL read the Resend API key from the `RESEND_API_KEY` environment variable.
4. THE System SHALL read Twilio credentials from `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` environment variables.
5. THE System SHALL read the application base URL from the `APP_URL` environment variable for constructing Paynow return URLs and email links.
6. IF any required environment variable is missing at server startup, THEN THE System SHALL log a descriptive error identifying the missing variable and exit with a non-zero status code.

---

### Requirement 17: Round-Trip Data Integrity

**User Story:** As a developer, I want registration form data to be faithfully persisted and retrievable, so that no client information is lost between signup and provisioning.

#### Acceptance Criteria

1. FOR ALL valid registration form submissions, THE System SHALL persist all collected fields to the `clients` table and the associated `profiles` table such that reading the record back returns equivalent data (round-trip property).
2. THE System SHALL store the selected plan, domain, company name, contact details, physical address, and `domain_owned` flag on the client record.
3. WHEN a client record is created during Path A signup, THE System SHALL set `domain_owned` to `true`.
4. WHEN a client record is created during Path B signup, THE System SHALL set `domain_owned` to `false`.
