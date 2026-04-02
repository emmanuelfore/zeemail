# Requirements Document

## Introduction

The Mailcow Hosting Dashboard is a full-stack web application for managing email hosting clients. It provides two distinct interfaces: an Admin Dashboard for internal staff to manage clients, mailboxes, invoices, and support tickets; and a Client Portal for hosted clients to view their account, mailboxes, invoices, and submit support requests. The backend proxies all Mailcow API interactions, keeping credentials server-side, and uses Supabase for authentication, role management, and persistent data storage.

## Glossary

- **System**: The Mailcow Hosting Dashboard application as a whole
- **Admin_Dashboard**: The admin-facing interface accessible at `/admin` and sub-routes
- **Client_Portal**: The client-facing interface accessible at `/portal` and sub-routes
- **Backend**: The Node.js/Express server handling API requests and Mailcow proxying
- **Auth_Middleware**: Server middleware that verifies Supabase JWTs on every request
- **Role_Middleware**: Server middleware that enforces role-based access control
- **Mailcow_Service**: The server-side service that communicates with the Mailcow API
- **Supabase**: The PostgreSQL-backed BaaS used for auth, profiles, clients, mailboxes, invoices, and support tickets
- **Client**: A hosted email customer record stored in the `clients` table
- **Mailbox**: An individual email account record stored in the `mailboxes` table
- **Invoice**: A billing record stored in the `invoices` table
- **Support_Ticket**: A help request record stored in the `support_tickets` table
- **Admin**: A user with `role = 'admin'` in the `profiles` table
- **Portal_User**: A user with `role = 'client'` in the `profiles` table
- **MRR**: Monthly Recurring Revenue, derived from active client plan pricing
- **Plan**: A subscription tier — one of `starter`, `business`, or `pro`
- **Slide_Over**: A side panel UI component that slides in from the right without blocking navigation
- **Toast**: A transient notification component displayed at the edge of the screen
- **Skeleton_Loader**: An animated placeholder shown while data is loading

---

## Requirements

### Requirement 1: Authentication and Role-Based Access

**User Story:** As a user, I want to log in with my credentials, so that I can access the interface appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE System SHALL authenticate the user via Supabase Auth and issue a JWT.
2. WHEN a user submits invalid credentials, THE System SHALL display an inline error message without redirecting.
3. WHEN an authenticated user has `role = 'admin'`, THE System SHALL redirect the user to `/admin`.
4. WHEN an authenticated user has `role = 'client'`, THE System SHALL redirect the user to `/portal`.
5. WHEN an unauthenticated user attempts to access `/admin` or `/portal`, THE System SHALL redirect the user to the login page.
6. WHEN a Portal_User attempts to access an admin-only route, THE System SHALL display an Unauthorised page.
7. WHEN a user logs out, THE System SHALL invalidate the session and redirect to the login page.

---

### Requirement 2: Backend JWT Verification

**User Story:** As a system operator, I want all API routes protected by JWT verification, so that only authenticated users can call the backend.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL verify the Supabase JWT on every request to `/api/*`.
2. WHEN a request arrives without a valid JWT, THE Auth_Middleware SHALL return HTTP 401 with `{ "error": "Unauthorised", "code": "AUTH_REQUIRED" }`.
3. WHEN a request arrives with an expired JWT, THE Auth_Middleware SHALL return HTTP 401 with `{ "error": "Token expired", "code": "TOKEN_EXPIRED" }`.
4. THE Role_Middleware SHALL return HTTP 403 with `{ "error": "Forbidden", "code": "INSUFFICIENT_ROLE" }` when a Portal_User calls an admin-only endpoint.
5. THE Backend SHALL log every request using Morgan with method, path, status code, and response time.
6. WHEN any unhandled error occurs, THE Backend SHALL return `{ "error": string, "code": string }` with an appropriate HTTP status code.

---

### Requirement 3: Mailcow API Proxy

**User Story:** As a system operator, I want all Mailcow API calls proxied through the backend, so that the Mailcow API key is never exposed to the client.

#### Acceptance Criteria

1. THE Mailcow_Service SHALL read `MAILCOW_HOST` and `MAILCOW_API_KEY` exclusively from server-side environment variables.
2. WHEN `POST /api/domains/add` is called, THE Mailcow_Service SHALL create the domain on the Mailcow server and return the Mailcow response.
3. WHEN `DELETE /api/domains/:domain` is called, THE Mailcow_Service SHALL delete the domain from the Mailcow server.
4. WHEN `POST /api/mailboxes/add` is called, THE Mailcow_Service SHALL create the mailbox on the Mailcow server.
5. WHEN `GET /api/mailboxes/:domain` is called, THE Mailcow_Service SHALL return all mailboxes for the given domain from the Mailcow server.
6. WHEN `PUT /api/mailboxes/:email` is called, THE Mailcow_Service SHALL update the mailbox attributes on the Mailcow server.
7. WHEN `DELETE /api/mailboxes/:email` is called, THE Mailcow_Service SHALL delete the mailbox from the Mailcow server.
8. WHEN `POST /api/mailboxes/:email/password` is called, THE Mailcow_Service SHALL reset the mailbox password on the Mailcow server.
9. WHEN `GET /api/stats/overview` is called, THE Mailcow_Service SHALL return aggregate statistics from the Mailcow server.
10. WHEN `GET /api/stats/mailbox/:email` is called, THE Mailcow_Service SHALL return per-mailbox statistics from the Mailcow server.
11. IF the Mailcow server is unreachable, THEN THE Mailcow_Service SHALL return HTTP 502 with `{ "error": "Mailcow unreachable", "code": "MAILCOW_UNAVAILABLE" }`.

---

### Requirement 4: Admin Overview Dashboard

**User Story:** As an Admin, I want an overview page with key metrics and charts, so that I can monitor the health of the hosting business at a glance.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display four metric cards in a 4-column grid: total clients, total active mailboxes, MRR, and unpaid invoice count.
2. THE Admin_Dashboard SHALL display a line chart showing client growth over the last 6 months.
3. THE Admin_Dashboard SHALL display a bar chart showing revenue by month.
4. THE Admin_Dashboard SHALL display a recent activity feed showing the last 10 actions.
5. THE Admin_Dashboard SHALL provide quick-action buttons for "Add client" and "Add mailbox".
6. WHEN data is loading, THE Admin_Dashboard SHALL display Skeleton_Loaders in place of metric cards and charts.
7. IF a Mailcow API call fails, THEN THE Admin_Dashboard SHALL display a persistent banner indicating the Mailcow server is unreachable.

---

### Requirement 5: Client Management (Admin)

**User Story:** As an Admin, I want to create, view, search, filter, and manage clients, so that I can maintain accurate records for all hosted customers.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a clients table with columns: company name, domain, plan badge, mailbox count/limit, status badge, next renewal date, and actions.
2. WHEN an Admin enters text in the search field, THE Admin_Dashboard SHALL filter the clients table by company name or domain in real time.
3. WHEN an Admin selects a plan filter, THE Admin_Dashboard SHALL display only clients matching the selected plan.
4. WHEN an Admin selects a status filter, THE Admin_Dashboard SHALL display only clients matching the selected status.
5. WHEN an Admin clicks "Add client", THE Admin_Dashboard SHALL open a Slide_Over panel containing fields for company name, domain, plan, contact name, contact email, contact phone, and notes.
6. WHEN an Admin submits the "Add client" form with valid data, THE System SHALL create a Supabase client record and call `POST /api/domains/add`.
7. IF the "Add client" form is submitted with missing required fields, THEN THE Admin_Dashboard SHALL display inline validation errors without submitting.
8. WHEN the clients table is empty, THE Admin_Dashboard SHALL display an empty state with an SVG illustration, heading, subtext, and an "Add client" button.

---

### Requirement 6: Client Detail Page (Admin)

**User Story:** As an Admin, I want a detailed view of each client with tabs for overview, mailboxes, invoices, and support tickets, so that I can manage all aspects of a client from one place.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display the client detail page at `/admin/clients/:id` with four tabs: Overview, Mailboxes, Invoices, and Support Tickets.
2. WHEN the Overview tab is active, THE Admin_Dashboard SHALL display the client info card with inline editing, a suspend/reactivate toggle, and MRR contribution.
3. WHEN an Admin saves inline edits, THE System SHALL update the corresponding Supabase client record.
4. WHEN the Mailboxes tab is active, THE Admin_Dashboard SHALL display a mailbox table and an "Add mailbox" form with email prefix, quota slider (100 MB–2 GB), and password fields.
5. WHEN an Admin submits the "Add mailbox" form with valid data, THE System SHALL call `POST /api/mailboxes/add` and create a Supabase mailbox record.
6. WHEN an Admin clicks "Reset password" on a mailbox row, THE System SHALL call `POST /api/mailboxes/:email/password`.
7. WHEN an Admin clicks "Suspend" on a mailbox row, THE System SHALL call `PUT /api/mailboxes/:email` to suspend the mailbox and update the Supabase record.
8. WHEN an Admin clicks "Delete" on a mailbox row, THE System SHALL call `DELETE /api/mailboxes/:email` and remove the Supabase mailbox record.
9. WHEN the Invoices tab is active, THE Admin_Dashboard SHALL display an invoice table and a "Create invoice" form.
10. WHEN an Admin marks an invoice as paid, THE System SHALL update the invoice status and `paid_at` timestamp in Supabase.
11. WHEN an Admin clicks "Download PDF" on an invoice, THE System SHALL generate and download a PDF of the invoice.
12. WHEN the Support Tickets tab is active, THE Admin_Dashboard SHALL display tickets with status badges, expandable message view, and a status update dropdown.
13. WHEN an Admin updates a ticket status, THE System SHALL update the `status` field in the Supabase support_tickets record.

---

### Requirement 7: Global Mailboxes View (Admin)

**User Story:** As an Admin, I want a global view of all mailboxes across all clients, so that I can search and perform bulk operations efficiently.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all mailboxes in a searchable table at `/admin/mailboxes`.
2. WHEN an Admin enters text in the search field, THE Admin_Dashboard SHALL filter mailboxes by email address or domain in real time.
3. WHEN an Admin selects multiple mailboxes and clicks "Suspend selected", THE System SHALL suspend each selected mailbox via `PUT /api/mailboxes/:email`.
4. WHEN an Admin selects multiple mailboxes and clicks "Delete selected", THE System SHALL delete each selected mailbox via `DELETE /api/mailboxes/:email` and remove the corresponding Supabase records.
5. WHEN the mailboxes table is empty, THE Admin_Dashboard SHALL display an empty state with an SVG illustration, heading, subtext, and a primary action button.

---

### Requirement 8: Invoices Management (Admin)

**User Story:** As an Admin, I want a global invoices view with filtering and summary cards, so that I can track revenue and outstanding payments.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all invoices at `/admin/invoices` with columns: client, amount, status, due date, and actions.
2. WHEN an Admin selects a status filter, THE Admin_Dashboard SHALL display only invoices matching the selected status.
3. THE Admin_Dashboard SHALL highlight overdue invoices with the danger color (`#F87171`).
4. THE Admin_Dashboard SHALL display summary cards showing total collected this month and total outstanding amount.
5. WHEN the invoices table is empty, THE Admin_Dashboard SHALL display an empty state with an SVG illustration, heading, subtext, and a primary action button.

---

### Requirement 9: Admin Settings Page

**User Story:** As an Admin, I want a settings page to configure plans, verify Mailcow connectivity, and update business information, so that I can maintain the platform configuration.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a settings page at `/admin/settings` with sections for plan pricing, Mailcow connection status, admin profile, and business info.
2. WHEN an Admin saves plan pricing, THE System SHALL persist the updated pricing to Supabase.
3. THE Admin_Dashboard SHALL display the live Mailcow server connection status by calling `GET /api/stats/overview`.
4. WHEN an Admin updates the admin profile name, email, or password, THE System SHALL update the corresponding Supabase Auth and profile records.
5. WHEN an Admin uploads a business logo, THE System SHALL store the logo in Supabase Storage and display it in the dashboard.

---

### Requirement 10: Client Portal Dashboard

**User Story:** As a Portal_User, I want a dashboard showing my account summary, so that I can quickly understand my current service status.

#### Acceptance Criteria

1. THE Client_Portal SHALL display a welcome banner with the client's company name at `/portal`.
2. THE Client_Portal SHALL display metric cards for: active mailbox count, total storage used, next renewal date with a countdown, and open support ticket count.
3. THE Client_Portal SHALL provide quick-action buttons: "View mailboxes", "Open webmail", and "Submit support ticket".
4. WHEN data is loading, THE Client_Portal SHALL display Skeleton_Loaders in place of metric cards.

---

### Requirement 11: Client Portal Mailboxes

**User Story:** As a Portal_User, I want to view my mailboxes and reset passwords, so that I can manage my email accounts within my plan limits.

#### Acceptance Criteria

1. THE Client_Portal SHALL display a mailboxes table at `/portal/mailboxes` with columns: email, storage used (progress bar), status, and actions.
2. WHEN a Portal_User clicks "Reset password" on a mailbox row, THE System SHALL call `POST /api/mailboxes/:email/password`.
3. WHEN a Portal_User clicks "Open webmail" on a mailbox row, THE System SHALL open `https://mail.[clientdomain]` in a new browser tab.
4. THE Client_Portal SHALL not display "Add mailbox" or "Delete mailbox" controls to Portal_Users.
5. WHEN a Portal_User clicks "Request additional mailbox", THE System SHALL create a Support_Ticket in Supabase with a pre-filled subject indicating a mailbox request.
6. WHEN the mailboxes table is empty, THE Client_Portal SHALL display an empty state with an SVG illustration, heading, subtext, and a "Request additional mailbox" button.

---

### Requirement 12: Client Portal Account Page

**User Story:** As a Portal_User, I want to view my account details and plan information, so that I can understand my current subscription.

#### Acceptance Criteria

1. THE Client_Portal SHALL display company details in read-only format at `/portal/account`.
2. THE Client_Portal SHALL display a plan card showing the current plan name, mailbox limit, and price.
3. WHEN a Portal_User clicks "Upgrade plan", THE System SHALL create a Support_Ticket in Supabase with a pre-filled subject indicating an upgrade request.
4. WHEN a Portal_User updates the phone number field and saves, THE System SHALL update the `phone` field in the Supabase profiles record.
5. THE Client_Portal SHALL not allow Portal_Users to edit company name, domain, or plan directly.

---

### Requirement 13: Client Portal Invoices

**User Story:** As a Portal_User, I want to view my invoices and initiate payment, so that I can keep my account in good standing.

#### Acceptance Criteria

1. THE Client_Portal SHALL display an invoices table at `/portal/invoices` with columns: description, amount, status, due date, and actions.
2. WHEN a Portal_User clicks "Pay now" on an unpaid invoice, THE System SHALL open a WhatsApp link pre-filled with the invoice amount and reference in a new browser tab.
3. WHEN a Portal_User clicks "Download PDF" on an invoice, THE System SHALL generate and download a PDF of the invoice.

---

### Requirement 14: Client Portal Support

**User Story:** As a Portal_User, I want to submit and track support tickets, so that I can get help with issues related to my email hosting.

#### Acceptance Criteria

1. THE Client_Portal SHALL display a list of support tickets at `/portal/support` with status badges.
2. WHEN a Portal_User submits the "New ticket" form with a subject and message, THE System SHALL create a Support_Ticket record in Supabase.
3. IF the "New ticket" form is submitted with a missing subject or message, THEN THE Client_Portal SHALL display inline validation errors without submitting.
4. WHEN the support tickets list is empty, THE Client_Portal SHALL display an empty state with an SVG illustration, heading, subtext, and a "New ticket" button.

---

### Requirement 15: Navigation

**User Story:** As a user, I want clear and consistent navigation, so that I can move between sections of the application efficiently.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a collapsible left sidebar with links to: Overview, Clients, Mailboxes, Invoices, Settings, and Logout.
2. WHEN the active sidebar item is selected, THE Admin_Dashboard SHALL apply a left border in `#8C1007` and a background of `#1A0301` to that item.
3. THE Client_Portal SHALL display a top navigation bar with links to: Dashboard, Mailboxes, Invoices, Support, and an "Open Webmail" accent button.
4. THE Client_Portal SHALL display an Account dropdown in the top bar containing a Logout option.
5. WHEN a Portal_User clicks "Open Webmail" in the navigation, THE System SHALL open `https://mail.[clientdomain]` in a new browser tab.

---

### Requirement 16: Empty States

**User Story:** As a user, I want informative empty states on all tables and lists, so that I understand what to do when no data is present.

#### Acceptance Criteria

1. THE System SHALL display an empty state on every table and list when no records exist.
2. THE System SHALL render each empty state with a centered SVG illustration, a heading, descriptive subtext, and a primary action button.

---

### Requirement 17: Error Handling and Notifications

**User Story:** As a user, I want clear error feedback throughout the application, so that I can understand and recover from failures.

#### Acceptance Criteria

1. WHEN an API call returns an error, THE System SHALL display a Toast notification with the error message.
2. WHEN a form field fails validation, THE System SHALL display an inline error message below the relevant field without submitting the form.
3. IF the Mailcow server is unreachable, THEN THE System SHALL display a persistent banner at the top of the page indicating the connectivity issue.
4. WHEN a user navigates to a route that does not exist, THE System SHALL display a 404 page.
5. WHEN a user navigates to a route they are not authorised to access, THE System SHALL display an Unauthorised page.

---

### Requirement 18: Design System Compliance

**User Story:** As a developer, I want all UI components to follow the defined design system, so that the application has a consistent visual identity.

#### Acceptance Criteria

1. THE System SHALL apply the dark theme exclusively, using `#0D0100` as the page background.
2. THE System SHALL use Plus Jakarta Sans for all body and heading text, loaded from Google Fonts.
3. THE System SHALL use JetBrains Mono for all email addresses and domain names displayed in the UI.
4. THE System SHALL render all cards with background `#1A0301`, a 1px border of `#3E0703`, and a border radius of 10px.
5. THE System SHALL render all primary buttons with background `#8C1007`, text `#FFF0C4`, and hover background `#660B05`.
6. THE System SHALL render all input fields with background `#0D0100`, a 1px border of `#3E0703`, focus border `#8C1007`, and cream text.
7. THE System SHALL render status badges as pills with 6px padding.
8. THE System SHALL render plan badges with: Starter using `#3E0703` background, Business using `#660B05` background, Pro using `#8C1007` background, all with cream text.
9. THE System SHALL render storage progress bars with `#3E0703` track and `#8C1007` fill.
10. THE System SHALL render charts using `#8C1007` as the primary series color, `#FFF0C4` as secondary, and `#660B05` as tertiary, with grid lines at 10% cream opacity and axis labels in `#C4917A`.
11. THE System SHALL render Toast notifications with `#1A0301` background, a `#8C1007` left border, and cream text.
12. THE System SHALL animate Skeleton_Loaders between `#1A0301` and `#2A0502`.
13. THE System SHALL style scrollbars with `#3E0703` track and `#660B05` thumb.

---

### Requirement 19: Public Landing Page Navigation

**User Story:** As a visitor, I want a clear navigation bar on the landing page, so that I can find key sections and sign in or get started quickly.

#### Acceptance Criteria

1. THE System SHALL render a sticky navigation bar at the top of the landing page (`/`) containing the brand logo in cream bold text on the left and links to Features, Pricing, and Contact on the right.
2. THE System SHALL render a ghost "Sign in" button and a filled "Get started" button with background `#8C1007` in the navigation bar.
3. WHEN a visitor scrolls down the page, THE System SHALL change the navigation bar background to `#0D0100` and add a bottom border of `#3E0703`.
4. WHEN a visitor clicks "Sign in", THE System SHALL navigate to the login page.
5. WHEN a visitor clicks "Get started" in the navigation bar, THE System SHALL scroll to the domain registration form section (`#register`).

---

### Requirement 20: Hero Section and Domain Search

**User Story:** As a visitor, I want a hero section with a domain search bar, so that I can immediately check if my desired domain is available.

#### Acceptance Criteria

1. THE System SHALL render a hero section with a large bold cream heading "Professional email for your Zimbabwean business" and a muted subheading.
2. THE System SHALL render a domain search bar containing a text input for the domain name (without extension), a dropdown to select `.co.zw` or `.com`, and a search button with background `#8C1007`.
3. WHEN a visitor submits a domain search, THE System SHALL display an inline result below the search bar indicating availability.
4. WHEN a domain is available, THE System SHALL display a green pill indicator and a "Register this domain" button.
5. WHEN a domain is taken, THE System SHALL display a red pill indicator.
6. WHEN a visitor clicks "Register this domain", THE System SHALL scroll to the domain registration form (`#register`) and pre-fill the domain name and TLD fields.
7. THE System SHALL render a trust indicators row below the search bar containing: "ZISPA accredited registrar", "Connects to Outlook & Gmail", "Setup in 24 hours", and "Local Zimbabwe support".

---

### Requirement 21: How It Works and Pricing Sections

**User Story:** As a visitor, I want to understand the process and pricing, so that I can decide whether to register a domain and choose a plan.

#### Acceptance Criteria

1. THE System SHALL render a "How it works" section with three steps displayed in a horizontal flow: "Search domain", "Submit details", and "We set everything up".
2. THE System SHALL render each step with a step number inside a circle with background `#8C1007`, a bold cream title, a muted description, and a dashed connecting line between steps.
3. THE System SHALL render a pricing section with three plan cards: Starter ($3/mo, 1 mailbox, 500 MB), Business ($10/mo, 5 mailboxes, 1 GB), and Pro ($18/mo, 10 mailboxes, 2 GB).
4. THE System SHALL render the Business plan card with a "Most popular" badge and a 2px border in `#8C1007`.
5. THE System SHALL render each plan card with a "Get started" button that scrolls to the domain registration form (`#register`) and pre-selects that plan.
6. THE System SHALL render all plan cards with the following included features: $5 domain, webmail access, and Outlook/Gmail compatibility.
7. THE System SHALL render the Business and Pro plan cards with email aliases as an additional included feature.
8. THE System SHALL render the Pro plan card with priority support as an additional included feature.

---

### Requirement 22: Features Section

**User Story:** As a visitor, I want to see the key features of the service, so that I can understand what I am getting before registering.

#### Acceptance Criteria

1. THE System SHALL render a features section as a 2-column grid containing four feature blocks: "Works with Outlook & Gmail", ".co.zw domains (ZISPA)", "Fast setup (24 hours)", and "Local support (WhatsApp)".
2. THE System SHALL render a footer containing the brand name and tagline on the left, links to Privacy Policy, Terms, and Contact on the right, and the text "© 2025 [Brand]. ZISPA accredited registrar." at the bottom.

---

### Requirement 23: Domain Registration Form (ZISPA-Compliant)

**User Story:** As a visitor, I want to complete a ZISPA-compliant domain registration form, so that I can submit my details and have my domain and email hosting set up.

#### Acceptance Criteria

1. THE System SHALL render a domain registration form at the anchor `#register` divided into five sections: domain selection, organisation details, contact details, document checklist, and terms acceptance.
2. THE System SHALL render Section 1 with a domain name input, a TLD dropdown (`.co.zw` or `.com`), a live availability indicator, and a plan selector.
3. THE System SHALL render Section 2 with fields for company or organisation name, registration type (Company, Individual, or NGO), business registration number (shown only when registration type is Company), and organisation description (required by ZISPA).
4. THE System SHALL render Section 3 with fields for full name, position or title, email address, WhatsApp or phone number, and physical address with a note that P.O. Box addresses are not accepted (required by ZISPA).
5. THE System SHALL render Section 4 as a document checklist with checkboxes for: letterhead ready, TC confirmation, signed letter ready, and ID copy ready (for individuals).
6. THE System SHALL render Section 5 with a ZISPA terms and conditions checkbox, a service terms and conditions checkbox, and a full-width submit button.
7. WHEN a visitor submits the form with all required fields valid, THE System SHALL save the submission as a record in the Supabase `leads` table and display a success state with a checkmark and the message "Thank you! We'll WhatsApp you within 24 hours".
8. IF the form is submitted with any required field missing or invalid, THEN THE System SHALL display inline validation errors below each invalid field without submitting.

---

### Requirement 24: Leads Table and Data Persistence

**User Story:** As a system operator, I want all domain registration form submissions stored in a structured leads table, so that the admin team can follow up with prospective clients.

#### Acceptance Criteria

1. THE System SHALL persist each form submission to a Supabase `leads` table containing the fields: `id`, `domain`, `tld`, `plan`, `company_name`, `registration_type`, `business_reg_number`, `org_description`, `contact_name`, `contact_position`, `contact_email`, `contact_phone`, `physical_address`, `letterhead_ready`, `tc_confirmed`, `signed_letter_ready`, `id_ready`, `status`, `notes`, and `created_at`.
2. THE System SHALL set the default value of the `status` field to `'new'` on record creation.
3. THE System SHALL accept the values `'new'`, `'contacted'`, `'converted'`, and `'rejected'` as valid values for the `status` field.
4. THE System SHALL accept the values `'company'`, `'individual'`, and `'ngo'` as valid values for the `registration_type` field.
5. THE System SHALL accept the values `'.co.zw'` and `'.com'` as valid values for the `tld` field.

---

### Requirement 25: Admin Leads Management

**User Story:** As an Admin, I want a leads management page in the admin dashboard, so that I can view, qualify, and convert domain registration enquiries into active clients.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a Leads page at `/admin/leads` accessible via a "Leads" item in the admin sidebar.
2. THE Admin_Dashboard SHALL display a leads table with columns: domain, company name, plan, phone, status badge, and submitted date.
3. WHEN an Admin clicks a row in the leads table, THE Admin_Dashboard SHALL expand the row to display the full lead details.
4. WHEN an Admin changes the status dropdown on a lead row, THE System SHALL update the `status` field of the corresponding record in the Supabase `leads` table.
5. WHEN an Admin clicks the "Convert to client" button on a lead with status `'contacted'`, THE Admin_Dashboard SHALL open the "Add client" Slide_Over pre-filled with the lead's domain, company name, plan, contact name, contact email, and contact phone.
6. WHEN an Admin clicks the WhatsApp button on a lead row, THE System SHALL open `https://wa.me/[contact_phone]?text=Hi [contact_name], we received your domain registration request for [domain]...` in a new browser tab.

---

### Requirement 26: Floating WhatsApp Button

**User Story:** As a visitor or portal user, I want a floating WhatsApp button on public and portal pages, so that I can quickly contact support without navigating away.

#### Acceptance Criteria

1. THE System SHALL render a floating button fixed to the bottom-right corner of the viewport on all landing page and client portal pages.
2. THE System SHALL render the floating button with a `#25D366` green background, a white WhatsApp icon, and a subtle pulse animation.
3. WHEN a visitor or Portal_User clicks the floating button, THE System SHALL open `https://wa.me/[support_number]?text=Hi, I'm interested in registering a domain` in a new browser tab.
4. THE System SHALL not render the floating WhatsApp button on any page under the `/admin` route.

---

### Requirement 27: Domain Availability Checking (WhoisJSON API)

**User Story:** As a visitor, I want to check domain availability in real time, so that I can immediately know whether my desired domain is free before submitting a registration request.

#### Acceptance Criteria

**Backend Endpoint**

1. THE Backend SHALL expose a public endpoint `GET /api/domains/check?name=<name>&tld=<tld>` that requires no JWT.
2. THE Backend SHALL read the WhoisJSON API key exclusively from the server-side environment variable `WHOISJSON_API_KEY` and never expose it to the frontend.
3. WHEN `name` or `tld` query parameters are missing, THE Backend SHALL return HTTP 422 with `{ "error": "name and tld are required", "code": "VALIDATION_ERROR" }`.
4. WHEN `name` does not match `/^[a-zA-Z0-9-]+$/`, THE Backend SHALL return HTTP 422 with `{ "error": "Invalid domain name format", "code": "VALIDATION_ERROR" }`.
5. WHEN `tld` is not one of `.co.zw`, `.com`, `.africa`, `.org`, or `.net`, THE Backend SHALL return HTTP 422 with `{ "error": "Unsupported TLD", "code": "VALIDATION_ERROR" }`.
6. WHEN a valid request is received, THE Backend SHALL call the WhoisJSON API and return `{ "domain": string, "available": boolean }` with HTTP 200.
7. THE Backend SHALL maintain a server-side in-memory cache with a 60-second TTL so that repeated checks for the same domain within the TTL window do not trigger additional WhoisJSON API calls.
8. THE Backend SHALL apply rate limiting of 10 requests per IP address per minute using express-rate-limit; requests exceeding this limit SHALL receive HTTP 429.
9. IF the WhoisJSON API is unreachable or returns a rate-limit error, THEN THE Backend SHALL return HTTP 503 with `{ "error": "Domain check temporarily unavailable", "code": "WHOIS_UNAVAILABLE" }`.

**Hero Search Bar**

10. THE System SHALL trigger a domain availability check only on search button click, not on keypress.
11. WHILE a domain availability check is in progress, THE System SHALL display a spinner inside the search button.
12. WHEN an availability result is received, THE System SHALL display a result pill below the search bar using a fade-in animation.
13. WHEN a domain is available, THE System SHALL display a green result pill labelled "Available" and a cream "Register this domain" button.
14. WHEN a domain is taken, THE System SHALL display a red result pill labelled "Already taken" and a "Try these instead:" row of alternative domain chips.
15. WHEN a domain is taken, THE System SHALL suggest the following alternative chips: `[name].com`, `get[name].co.zw`, and `my[name].co.zw`, where `[name]` is the searched domain name.
16. WHEN a visitor clicks an alternative domain chip, THE System SHALL automatically run a new availability check for that chip's domain.
17. WHEN a `.co.zw` domain is searched, THE System SHALL run a parallel availability check on the `.com` equivalent and display both results side by side.

**Registration Form Domain Field**

18. WHEN a visitor arrives at the registration form via the "Register this domain" button, THE System SHALL pre-fill the domain name input and TLD dropdown with the values from the hero search, and SHALL display a green availability pill inline within the form.
19. WHEN a visitor edits the domain name field inside the registration form, THE System SHALL trigger a fresh availability check after an 800ms debounce.
20. THE System SHALL apply the 800ms debounce only to the registration form domain field; the hero search bar SHALL NOT use debounce.

**Error States and Graceful Degradation**

21. IF the WhoisJSON API is unavailable, THEN THE System SHALL display the message "Domain check temporarily unavailable. Submit your details and we'll verify availability for you." and SHALL allow the visitor to submit the registration form without a confirmed availability result.
22. IF the domain name contains invalid characters, THEN THE System SHALL display the message "Domain names can only contain letters, numbers and hyphens" inline below the input.
23. IF the domain name is fewer than 3 characters, THEN THE System SHALL display the message "Domain name must be at least 3 characters" inline below the input.
24. IF the domain name is more than 63 characters, THEN THE System SHALL display the message "Domain name must be under 63 characters" inline below the input.
25. IF a network error occurs during a domain availability check, THEN THE System SHALL display the message "Connection error. Please check your internet and try again."

**Environment and Documentation**

26. THE System SHALL include `WHOISJSON_API_KEY` as a required variable in both `.env` and `.env.example`.
27. THE System SHALL include documentation in `README.md` describing how to obtain and configure the WhoisJSON API key.
