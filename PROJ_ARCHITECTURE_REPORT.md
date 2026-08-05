# Servego Platform — Project Architecture Report

> Scope: This report documents the current repo's architecture at a functional level (Public / Customer / Provider / Admin / ServeGo business model) and traces the key flows to the implemented backend endpoints and Prisma models. It is derived from reading the source files present in this workspace and reflects the current production-ready state of the repository.

---

## Table of Contents
1. [High-level architecture](#1-high-level-architecture)
2. [Repository layout](#2-repository-layout)
3. [Backend API surface (routes → controllers)](#3-backend-api-surface-routes--controllers)
4. [Security, validation & middleware stack](#4-security-validation--middleware-stack)
5. [Auth & token model](#5-auth--token-model)
6. [Data model architecture (Prisma)](#6-data-model-architecture-prisma)
7. [ServeGo business model](#7-servego-business-model)
8. [Lead lifecycle & matching engine](#8-lead-lifecycle--matching-engine)
9. [Booking state machine & workflow rules](#9-booking-state-machine--workflow-rules)
10. [Reputation & badge/verification model](#10-reputation--badgeverification-model)
11. [Admin architecture & workflows](#11-admin-architecture--workflows)
12. [Provider architecture & workflows](#12-provider-architecture--workflows)
13. [Customer architecture & workflows](#13-customer-architecture--workflows)
14. [Frontend architecture & data orchestration](#14-frontend-architecture--data-orchestration)
15. [Background services (cron / lead timers / email / cloudinary / audit)](#15-background-services-cron--lead-timers--email--cloudinary--audit)
16. [Runtime behavior (server boot & realtime)](#16-runtime-behavior-server-boot--realtime)
17. [Testing](#17-testing)
18. [Known implementation caveats](#18-known-implementation-caveats)
19. [Files index (key architecture components)](#19-files-index-key-architecture-components)
20. [External integrations](#20-external-integrations)
21. [Environment variables](#21-environment-variables)
22. [Non-functional requirements](#22-non-functional-requirements)
23. [Project metrics](#23-project-metrics)

---

## 1) High-level architecture

### 1.1 Frontend (React 19 + Vite)
- Location: `frontend/`
- Tech stack: React 19, Vite 6, Tailwind CSS v4 (utility classes), Lucide icons, Motion, Socket.io client, `react-router-dom` 7 (installed; routing is custom `history.pushState`-based, see §14)
- Entry point: `frontend/src/index.jsx` → `frontend/src/App.jsx`
- Root component `App` wraps everything in `AppProvider` (from `frontend/src/context/AppContext.jsx`) and renders role-specific layouts.

**Main concepts:**
- SPA with browser-history-based routing: `App.jsx` holds `currentPage` state + `history.pushState`; pages are `home | about | services | service-details | partner | contact | faq | login | signup | forgot-password | reset-password | dashboard-customer | dashboard-provider | admin`.
- Central app state via `AppContext.jsx` (auth, providers, bookings, notifications, tickets, services, favorites/saved pros, admin approval state, socket + `socketRef`, connection status).
- API client: `frontend/src/utils/apiClient.js` — fetch wrapper with retry logic + exponential backoff, 401 token-refresh, 429 handling, `VITE_API_URL` fallback (deployed backend → localhost), FormData support.
- Normalisation layer: `frontend/src/utils/normalizeCustomerData.js`, `frontend/src/utils/normalizeAdminData.js`.
- Custom hook: `frontend/src/hooks/useAdminPanelController.js`.
- Route guard: unauthenticated users cannot reach `dashboard-customer`, `dashboard-provider`, `admin`; role mismatch redirects (`App.jsx`).

**Role pages (entry points):**
- Public: `Home`, `About`, `Services`, `ServiceDetails`, `BecomePartner`, `Contact`, `FAQ`, `Login`, `Signup`, `ForgotPassword`, `ResetPassword`
- Customer: `frontend/src/pages/CustomerDashboard.jsx`
- Provider: `frontend/src/pages/ProviderDashboard.jsx`
- Admin: `frontend/src/pages/AdminPanel.jsx` + tab router `frontend/src/pages/admin/AdminPanelTabsRouter.jsx`

### 1.2 Backend (Express + Socket.io)
- Location: `backend/`
- Entry point: `backend/server.js` (async `bootstrap()`)
- HTTP server: `createServer(app)` from Node's `http` module; ESM modules (`"type": "module"`)
- Socket.io server: websocket + polling transports, pingTimeout 60s, pingInterval 25s, per-message-deflate
- Routing: `backend/routes/api.js` (single Express router mounted at `/api`)
- Design style:
  - Every functional area is handled by a dedicated controller in `backend/controllers/*` (22 controllers)
  - Business logic lives in `backend/services/*` (12 services); controllers stay thin (auth → call service → respond)
  - Auth via JWT Bearer tokens (`requireAuth`, `requireRole`, `optionalAuth` in `backend/utils/auth.js`)
  - Unified response envelope: `sendApiSuccess` / `sendApiError` in `backend/utils/response.js`
  - Express-validator middleware in `backend/middleware/validation.js`
  - Security: Helmet (CSP), HPP, express-rate-limit (4 limiters), request timeout, structured request logging (see §4)
  - Socket.io stored on `app` as `socketio` and exposed to controllers via `req.app.get('socketio')`
  - Prisma singleton: `backend/prisma/client.js`; PostgreSQL via `DATABASE_URL`
  - Layered / service-oriented architecture, thin controllers, shared utility layer (see §1.6)

### 1.3 Database (Prisma + PostgreSQL)
- Location: `backend/prisma/`
- Prisma schema: `backend/prisma/schema.prisma` (30 models + 16 enums)
- Client singleton: `backend/prisma/client.js`
- Migrations: `backend/prisma/migrations/*` — 20 migrations from the initial schema through the business-model v2 upgrade (see §6.7)

### 1.4 Service catalog & business-model seeding
- `backend/seeders/servicesSeed.js` — 20 curated service categories (Electrician, Plumber, AC Repair, Home Cleaning, Deep Cleaning, Painting, Appliance Repair, Carpentry, Home Maintenance, Pest Control, Salon at Home, Sofa Cleaning, Water Tank Cleaning, Appliance Installation, Modular Kitchen, Interior Design, Packers & Movers, CCTV Installation, Geyser & Water Heater, Tile & Grouting)
- `backend/seeders/businessModelSeed.js` — provider level rules, subscription plans, admin config defaults, and one-time provider-subscription backfill
- Both run idempotently on server boot (`seedServicesIfEmpty()`, `seedBusinessModelIfEmpty()`)
- Full demo dataset available via `backend/prisma/seed.js` (1 admin, 6 providers, 2 customers, 6 bookings across statuses, 3 reviews, notifications, support ticket)

### 1.5 Architecture diagram

```
┌───────────────────────────────────────────────┐
│            React 19 + Vite SPA                 │
│  Public · Customer · Provider · Admin pages    │
│  AppContext (state) · apiClient (fetch)        │
│  socket.io-client (realtime)                   │
└───────────────────────┬───────────────────────┘
                        │  HTTPS / REST (fetch)  +  WebSocket (socket.io)
┌───────────────────────▼───────────────────────┐
│        Express API  (backend/server.js)        │
│  Helmet · CORS · rate-limit · logging · 404/500│
│  Router: backend/routes/api.js  (mounted /api) │
└───────────────────────┬───────────────────────┘
                        │  requireAuth / requireRole / optionalAuth + validation
┌───────────────────────▼───────────────────────┐
│            Controllers  (22, thin)             │
│  user · provider · booking · lead · subscription│
│  admin* · service · review · payment · ticket… │
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│      Business Services  (12) + Utils + timers  │
│  leadService · subscriptionService · levelService│
│  performanceService · notificationService · …  │
│  Cron (autoCancel) · lead-expiry timers        │
└───────────────────────┬───────────────────────┘
                        │  Prisma ORM (prisma/client.js)
┌───────────────────────▼───────────────────────┐
│              PostgreSQL (30 models)            │
└───────────────────────────────────────────────┘
```

### 1.6 Design patterns & dependency flow

| Pattern | Where used |
|---------|-----------|
| **Layered architecture** | Presentation (React) → API (Express router + middleware) → Service layer → Data (Prisma/PostgreSQL). Each layer depends only on the layer below it. |
| **Service-oriented backend** | 12 focused services (`leadService`, `subscriptionService`, `providerLevelService`, `providerPerformanceService`, `notificationService`, …) encapsulate business rules; reused by multiple controllers. |
| **Thin controllers** | Controllers validate input (via middleware), delegate to a service, and shape the HTTP response (`sendApiSuccess`/`sendApiError`). No business logic lives in controllers. |
| **Shared utility layer** | Cross-cutting helpers in `backend/utils/*` (auth, response envelope, workflow normalization, permissions, availability, validation, runtimeConfig) reused across controllers/services. |
| **Repository-style data access** | Prisma Client singleton (`backend/prisma/client.js`) is the single data-access path; transactional units run with `isolationLevel: 'Serializable'` (booking creation, lead accept, complete, redistribute, subscription purchase). |
| **Event-driven notifications** | Socket.io pushes realtime events after transactional commits (`newLead`, `booking:statusChanged`, `subscription:purchased`, `admin:notification`, …). |
| **Background processing** | In-process lead-expiry timers (`leadExpiryService`) + hourly cron (`autoCancelService`). |

**Dependency flow**

```
React components
   │  apiClient (fetch + retry + token refresh) / socket.io
   ▼
Express Router (routes/api.js)
   │  auth guards · express-validator · rate limiters
   ▼
Controllers (thin request/response adapters)
   │
   ▼
Business Services (business logic + domain rules)
   │                          │
   │                          └──► Utilities (auth, workflow, permissions,
   │                                   availability, response, runtimeConfig)
   ▼
Prisma ORM (transactional, Serializable)
   ▼
PostgreSQL (30 models / 16 enums)
```

### 1.7 End-to-end flows

**Provider flow**

```
Signup (provider role)
  → complete profile (profileComplete)
  → register service(s) + admin approval (ProviderServiceRequest)
  → verified by admin (isVerified) + account ACTIVE
  → free lead granted (ProviderSubscription level 0, GENERAL, 1 lead)
  → purchase subscription level 1–5 → PREMIUM sector + 3 leads
  → receive & accept leads → complete jobs (consume 1 lead/job)
  → lifetime level (BRONZE→DIAMOND by total completed jobs) → bigger plan discount
```

**Booking flow**

```
Customer books a temporary service (service + time + address + optional preferred provider)
  → Booking created (PENDING) + Lead broadcast to EVERY eligible provider at once
       (one open offer per provider in LeadAssignmentHistory, isCurrent=true)
  → first provider to accept wins → booking CONFIRMED (lead ACCEPTED,
       all other open offers auto-CANCELLED, losers notified)
  → CONFIRMED → ONGOING (sets startedAt; no code needed) → COMPLETED
       (requires customer's 4-digit verification code; sets completedAt)
       consumes 1 lead · credits earnings net of commission · refresh reputation
       · check promotion · notify customer/provider
  → CANCELLED at any point (reason recorded; provider-initiated adds penalty score)
```

**Lead flow**

```
NEW → VIEWED → ACCEPTED → COMPLETED
  \        └→ REJECTED (provider withdraws ONLY their own open offer)
       └→ other offers remain open; lead/booking re-pointed to a remaining provider
       └→ when the last open offer is withdrawn → settle (lead EXPIRED,
            open booking auto-CANCELLED so the customer can re-book)
  \        └→ (leadTimeoutSeconds) → all open offers EXPIRED
       └→ reassign to a genuinely new eligible provider, else settle (lead EXPIRED,
            open booking auto-CANCELLED so the customer can re-book)
```

### 1.8 Enterprise readiness

The platform implements production concerns across the stack:

- **Layered + service-oriented** backend with thin controllers and a shared utility layer (§1.6)
- **REST API** with JWT access/refresh tokens + RBAC (`requireRole`) (§5)
- **WebSocket realtime** for notifications, booking/lead events, admin alerts (§16.2)
- **Event-driven notifications** (per-user rooms + admin room) with DB-persisted `Notification` rows
- **Background processing** (lead timers + hourly auto-cancel cron) re-warmed from DB on boot (§15)
- **Configurable business rules** (16 admin-config keys, editable in Admin → ServeGo Business) (§7.4)
- **Audit logging** of admin/verify/approve/status-change operations (`AuditLog`, `writeAuditLog`) 
- **RBAC** via middleware chain (`requireAuth` + `requireRole('admin'|'provider'|'customer')`)
- **Transactional workflows** with `Serializable` isolation for money/lead-sensitive writes
- **Observability** basics: structured request logging with request IDs, health endpoint, database connectivity check (§4, §16.3)

---

## 2) Repository layout

```
servego-platform/
├── PROJ_ARCHITECTURE_REPORT.md     # this document
├── backend/
│   ├── server.js                   # bootstrap: express, socket.io, middleware, routes, cron, seeds
│   ├── routes/api.js               # single API router (all endpoints)
│   ├── controllers/                # 22 controllers (one per functional area)
│   ├── services/                   # 12 services (business logic, timers, integrations)
│   ├── middleware/                 # security.js, logging.js, upload.js, validation.js
│   ├── utils/                      # auth.js, response.js, workflow.js, permissions.js, availability.js, validation.js, runtimeConfig.js
│   ├── seeders/                    # servicesSeed.js, businessModelSeed.js
│   ├── prisma/                     # schema.prisma, client.js, seed.js, migrations/
│   ├── scripts/                    # cleanup-db.js, migrate-photos-to-cloudinary.js, fix-html-entity-descriptions.js, check-experience.js
│   └── tests/                      # node --test suite (auth, availability, integration, response, runtimeConfig, socketAuth, workflow)
└── frontend/
    ├── src/
    │   ├── App.jsx                 # routing + role layouts + admin sidebar
    │   ├── index.jsx               # ReactDOM entry
    │   ├── context/AppContext.jsx  # global state + socket
    │   ├── pages/                  # public, customer, provider, admin pages
    │   ├── pages/admin/Tabs/       # 13 admin tab panels
    │   ├── components/             # shared UI + provider components
    │   ├── components/admin/       # admin sub-panels
    │   ├── hooks/useAdminPanelController.js
    │   └── utils/                  # apiClient.js + normalizers
    └── package.json                # build / dev / preview
```

---

## 3) Backend API surface (routes → controllers)

Router file: `backend/routes/api.js`

### 3.0 API summary

> Counts reflect unique route registrations in `backend/routes/api.js` (110 total). Admin aliases (`/admin/...`) that mirror a primary module route are counted under their primary module; duplicates shown in a module's list are informational.

| Module | § | Endpoints |
|--------|---|-----------|
| Authentication & user management | 3.1 | 8 |
| Service providers (partners) | 3.2 | 11 |
| Provider-owned service registry | 3.3 | 8 |
| Bookings | 3.4 | 12 |
| Leads (ServeGo lead engine) | 3.5 | 5 |
| Subscriptions (provider) | 3.6 | 6 |
| Provider levels / performance | 3.7 | 5 |
| Notifications | 3.8 | 5 |
| Support tickets | 3.9 | 6 |
| Reviews | 3.10 | 4 |
| Payments | 3.11 | 4 |
| Referrals / ambassador | 3.12 | 4 |
| Services (global catalog) | 3.13 | 9 |
| Admin: dashboard & ops | 3.14 | 5 |
| Admin: ServeGo business model | 3.15 | 14 |
| Saved pros & images | 3.16 | 4 |
| **Total** | | **110** |

Each module below is documented as **Purpose / Endpoints / Permissions / Business rules**.

### 3.1 Authentication & user management
**Purpose:** Registration, login, password reset, token refresh and profile/identity management for all three roles.
**Endpoints:**
- `POST /api/auth/register` → `UserController.register` (customer/provider signup; creates linked `Customer`/`Provider`, referral code, 4-digit verification code, `AuthEvent`)
- `POST /api/auth/login` → `UserController.login` (rate-limited; IP failed-attempt lockout after 5; blocks non-ACTIVE accounts and blocked providers)
- `POST /api/auth/forgot-password` → `UserController.forgotPassword` (rate-limited; SHA-256 token hash, 15-min expiry, nodemailer reset email)
- `POST /api/auth/reset-password` → `UserController.resetPassword` (rate-limited; validates strength, updates password)
- `POST /api/auth/refresh` → `UserController.refreshToken` (returns new token pair)
- `GET /api/auth/me` → `UserController.getMe` (requireAuth; includes customerProfile + providerProfile)
- `GET /api/users` → `UserController.getUsers` (admin; paginated + role/status/search filters)
- `PATCH /api/users/:id/profile` → `UserController.updateProfile` (self or admin)
**Permissions:** auth endpoints public (rate-limited); `GET /users` admin-only; `PATCH /users/:id/profile` self or admin.
**Business rules:** non-ACTIVE accounts blocked at login; password reset token hashed (SHA-256) with 15-min TTL; 5-failed-attempt IP lockout in a 15-min window.

### 3.2 Service Providers (Partners)
**Purpose:** Public provider discovery, profile management, availability and verification.
**Endpoints:**
- `GET /api/providers` → `ProviderController.getAll` (optionalAuth; public = ACTIVE + verified; admin sees all; providers see own)
- `GET /api/providers/by-approved-service` → `ProviderServiceDiscoveryController.getApprovedProvidersByServiceName` (public; rating/experience sort, location filter)
- `GET /api/providers/:id` → `ProviderController.getById` (optionalAuth; hides contact details from non-owner/admin)
- `GET /api/providers/:id/services` → `ProviderController.getProviderServices` (optionalAuth; pending/denied private to owner/admin)
- `GET /api/providers/:id/analytics` → `ProviderAnalyticsController.getProviderAnalytics` (provider or admin; 7d/30d/90d)
- `PUT /api/providers/me/availability` → `ProviderController.updateMyAvailability` (provider)
- `POST /api/providers/:id/services/register` → `ProviderController.registerProviderService` (duplicate-guarded)
- `PATCH /api/providers/:id/profile` → `ProviderController.updateProfile` (recomputes `profileComplete`)
- `PATCH /api/providers/:id/availability` / `PUT /api/providers/:id/availability` → `ProviderController.updateAvailability` (validates non-overlapping slots, syncs `AvailabilitySlot`)
- `PATCH /api/providers/:id/verify` → `ProviderController.verify` (admin; triggers reputation refresh + audit log)
**Permissions:** public read; profile/availability writes = owner (provider) or admin; verify = admin.
**Business rules:** public listings only show ACTIVE + verified providers; availability slots must not overlap; profile edits recompute `profileComplete`; verification refreshes reputation and writes an audit log.

### 3.3 Provider-owned service registry
**Purpose:** Provider-offered service registration and the admin approval/denial workflow.
**Endpoints:**
- `POST /api/provider-services` → `ProviderController.registerOwnProviderService` (provider; requires complete + verified profile)
- `GET /api/provider-services/mine` → `ProviderController.getMyProviderServices` (provider)
- `GET /api/provider-services` → `AdminProviderServiceController.getPendingRequests` (admin; `?status=` filter)
- `GET /api/admin/provider-service-requests` → `AdminProviderServiceController.getPendingRequests` (admin)
- `PATCH /api/admin/provider-service-requests/:id/approve` → `AdminProviderServiceController.approveService`
- `PATCH /api/admin/provider-service-requests/:id/deny` → `AdminProviderServiceController.denyService`
- `GET /api/admin/provider-service-items` → `AdminProviderServiceItemsController.getAll` (combined PENDING/DENIED/APPROVED feed)
- `POST /api/admin/providers/reputation/refresh` → `AdminProviderServiceController.refreshReputation`
**Permissions:** provider can register + view own; admin approves/denies and refreshes reputation.
**Business rules:** service requests are duplicate-guarded; approval emits `serviceApproved` / `providerService:approved` socket events and updates the active-specialist count.

### 3.4 Bookings
**Purpose:** Core booking lifecycle: create, view, timeline audit, state-machine transitions and booking chat.
**Endpoints:**
- `GET /api/bookings` → `BookingController.getAll` (role-scoped: customer=own, provider=own providerId, admin=all; paginated)
- `GET /api/bookings/:id` → `BookingController.getById` (ownership enforced)
- `GET /api/bookings/:id/timeline` → `BookingController.getTimeline` (admin; statusHistory + `BookingEvent` audit trail)
- `POST /api/bookings` → `BookingController.create` (broadcast: creates booking + lead and opens an offer to every eligible provider; double-booking guards; `Serializable` transaction; socket events)
- `PATCH /api/bookings/:id/status` → `BookingController.updateStatus` (state machine + permissions + verification code for ONGOING→COMPLETED)
- `PATCH /api/bookings/:id/accept` → `BookingController.transition('CONFIRMED')` (provider)
- `PATCH /api/bookings/:id/decline` → `BookingController.transition('CANCELLED')` (provider, reason required; withdraws only that provider's open offer)
- `PATCH /api/bookings/:id/cancel` → `BookingController.transition('CANCELLED')` (customer/provider/admin, reason required)
- `PATCH /api/bookings/:id/complete` → `BookingController.transition('COMPLETED')` (provider; requires the customer's 4-digit verification code; consumes a lead, credits earnings, checks promotion)
- `POST /api/bookings/:id/messages` → `BookingController.addMessage` (booking chat, 2000-char limit, socket events)
- `GET /api/bookings/:id/messages` → `BookingController.getMessages`
- `GET /api/admin/bookings` → `BookingController.getAll` (admin alias of the bookings list)
**Permissions:** customers = own bookings; providers = own; admin = all; state transitions are role-gated (accept/decline/complete = provider, cancel = any party, status = owner).
**Business rules:** creation runs in a `Serializable` transaction with double-booking guards; the request is broadcast to every eligible provider and the first to accept wins (other open offers auto-cancelled); CONFIRMED→ONGOING stamps `startedAt` (no code); ONGOING→COMPLETED requires the customer's 4-digit verification code and stamps `completedAt`, consumes one lead, credits earnings net of commission, refreshes reputation and evaluates promotion; every transition writes statusHistory + `BookingEvent`.

### 3.5 Leads (ServeGo lead engine — provider-facing)
**Purpose:** Broadcast, view, accept, reject and track booking leads (paid marketplace interaction).
**Endpoints:**
- `GET /api/leads` → `LeadController.getMine` (provider → open offers + accepted history; customer → their leads; admin blocked)
- `GET /api/leads/:id` → `LeadController.getById` (full assignment/transfer ledger; role-aware ownership)
- `PATCH /api/leads/:id/view` → `LeadController.view` (provider; NEW → VIEWED, does not consume a lead)
- `PATCH /api/leads/:id/accept` → `LeadController.accept` (provider; first-accept-wins via `acceptLeadForBooking`)
- `PATCH /api/leads/:id/reject` → `LeadController.reject` (provider; withdraws ONLY their own open offer; if any remain the lead/booking stay PENDING and are re-pointed to another offered provider, otherwise the lead is settled and the booking auto-cancelled)
**Permissions:** provider = leads with an open offer (`LeadAssignmentHistory.isCurrent`) or accepted history; customer = their leads; admin blocked on the public lead routes (admin uses §3.15).
**Business rules:** `view` does not consume a lead; `accept` is first-accept-wins — the booking flips PENDING→CONFIRMED and every other provider's open offer is auto-cancelled (`LeadStatus.CANCELLED`, `isCurrent=false`, reason `ACCEPTED_BY_ANOTHER_PROVIDER`); `reject` withdraws only the rejecting provider's offer and never consumes a lead; the whole broadcast is recorded in `LeadAssignmentHistory` and runs in a `Serializable` transaction.

### 3.6 Subscriptions (provider)
**Purpose:** Plan catalog, current subscription state, remaining leads, purchase/upgrade and invoice history.
**Endpoints:**
- `GET /api/subscriptions/plans` → `SubscriptionController.getPlans` (active plans annotated with provider-level discount)
- `GET /api/subscriptions/me` → `SubscriptionController.getCurrent` (level, remaining leads, sector, plan)
- `GET /api/subscriptions/remaining` → `SubscriptionController.remaining` (remainingLeads, leadCount, level, status, paymentStatus, computed `active` via `subscriptionIsActive`)
- `POST /api/subscriptions/purchase` → `SubscriptionController.purchase` (purchase/upgrade; applies level discount; emits payment-success → invoice → `subscription:purchased` notifications)
- `GET /api/subscriptions/transactions` → `SubscriptionController.history` (invoice history)
- `GET /api/subscriptions/transactions/:id` → `SubscriptionController.getTransaction` (provider owner or admin)
**Permissions:** all provider-role routes; transaction detail also admin.
**Business rules:** the free lead is granted automatically and cannot be purchased; discounts come from the permanent provider level and never apply to the free plan; first purchase upgrades the provider sector GENERAL → PREMIUM (permanent); the subscription row mirrors the last purchase (price, discount, finalAmount, paymentStatus, paymentMethod/gateway, transactionId, invoiceNumber).

### 3.7 Provider levels / performance
**Purpose:** Live level, performance metrics, promotions and level history for the provider dashboard.
**Endpoints:**
- `GET /api/provider-performance/me` → `ProviderBusinessController.getMyPerformance` (level + live metrics + `levelOrder`)
- `GET /api/level-rules` → `ProviderBusinessController.getLevelRules` (active rules: thresholds + discounts)
- `GET /api/promotions/me` → `ProviderBusinessController.getMyPromotions`
- `POST /api/promotions/:id/acknowledge` → `ProviderBusinessController.acknowledgePromotion`
- `GET /api/provider-level-history/me` → `ProviderBusinessController.getMyLevelHistory`
**Permissions:** provider role.
**Business rules:** provider level is PERMANENT and based purely on lifetime completed jobs (BRONZE→DIAMOND); promotions are recorded once per level-up and can be acknowledged; level rules are cached 60s.

### 3.8 Notifications
**Purpose:** In-app notification inbox + realtime push.
**Endpoints:**
- `GET /api/notifications` → `NotificationController.getAll` (limit param; admin sees all)
- `POST /api/notifications` → `NotificationController.create` (self or admin only)
- `PATCH /api/notifications/:id/read` → `NotificationController.read`
- `PATCH /api/notifications/read-all` → `NotificationController.readAll`
- `DELETE /api/notifications` → `NotificationController.clearAll`
**Permissions:** self or admin (create); reads scoped to owner (admin sees all).
**Business rules:** notifications persist in `Notification` rows and are pushed to the owner's socket room (`notification:new`).

### 3.9 Support tickets
**Purpose:** Support ticket creation (authenticated + public contact form), resolution and status management.
**Endpoints:**
- `GET /api/tickets` → `TicketController.getAll` (role-scoped; matches own userId OR requesterEmail)
- `POST /api/tickets` → `TicketController.create` (authenticated; optional `relatedBookingId` ownership check)
- `PATCH /api/tickets/:id/resolve` → `TicketController.resolve` (admin; response text required)
- `PATCH /api/admin/tickets/:id/resolve` → `TicketController.resolve` (admin alias)
- `POST /api/support-tickets` → `TicketController.create` (public contact form, optionalAuth, rate-limited)
- `PATCH /api/support-tickets/:id/status` → `TicketController.setStatus` (admin; OPEN/RESOLVED/CLOSED)
**Permissions:** resolve/status admin-only; public form rate-limited (15-min window).
**Business rules:** new tickets raise `adminAlert:newSupportTicket` to the admin room; resolution requires a response.

### 3.10 Reviews
**Purpose:** Customer reviews after completed bookings + admin moderation.
**Endpoints:**
- `GET /api/reviews` → `ReviewController.getAll` (admin)
- `POST /api/reviews` → `ReviewController.create` (customer-only, 1 review per booking (`@@unique([bookingId])`), requires COMPLETED booking, refreshes provider reputation)
- `GET /api/providers/:id/reviews` → `ReviewController.getByProvider` (public)
- `DELETE /api/reviews/:id` → `ReviewController.deleteOne` (admin moderation, reason required)
**Permissions:** create = customer; delete = admin; provider reviews public.
**Business rules:** one review per booking (unique `bookingId`); review creation refreshes the provider's aggregated reputation.

### 3.11 Payments
**Purpose:** Payment ledger for bookings.
**Endpoints:**
- `GET /api/payments` → `PaymentController.getAll` (role-scoped; admin=all)
- `POST /api/payments` → `PaymentController.create` (cash-after-job only; UPI/card rejected until gateway configured)
- `POST /api/payments/initiate` → `PaymentController.create` (alias)
- `POST /api/payments/webhook` → `PaymentController.webhook` (501 — no gateway configured)
**Permissions:** role-scoped reads; creation authenticated.
**Business rules:** only `CASH` payment mode is accepted; online-gateway flows return `501 NOT_IMPLEMENTED` until a gateway is wired in.

### 3.12 Referrals / ambassador
**Purpose:** Customer referral program with a ₹250 bonus.
**Endpoints:**
- `POST /api/referrals/apply` → `ReferralsController.applyReferral` (₹250 bonus, transactional)
- `GET /api/referrals/me` → `ReferralsController.getMeReferral`
- `POST /api/referrals/generate` → `ReferralsController.generate`
- `POST /api/referrals/claim` → `ReferralsController.applyReferral` (alias)
**Permissions:** authenticated customers.
**Business rules:** referral bonus is bookkeeping only (no automatic wallet payout) — see §18.

### 3.13 Services (global catalog)
**Purpose:** Global service-category catalog, search, category pages and admin CRUD/hide.
**Endpoints:**
- `GET /api/services` → `ServiceController.getAll` (public, includes derived `activeSpecialistCount`)
- `GET /api/services/search` → `ServiceController.search` (query/location/category filters)
- `GET /api/categories/:slug` → `ServiceController.getCategoryBySlug` (includes providers + active specialist count)
- `GET /api/categories/:slug/providers` → `ProviderServiceDiscoveryController.getApprovedProvidersByCategory`
- `GET /api/categories/:id/active-count` → `ServiceController.getActiveCount`
- `POST /api/services` → `ServiceController.create` (admin)
- `DELETE /api/services/:id` → `ServiceController.deleteOne` (admin; `confirm=true` guard)
- `PATCH /api/services/:id` → `ServiceController.updateOne` (admin)
- `PATCH /api/services/:id/hide` → `ServiceController.hideOne` (admin)
**Permissions:** reads public; writes/hide admin.
**Business rules:** delete is blocked (409) when active providers or bookings reference the category; `activeSpecialistCount` is derived from approved `ProviderService` links.

### 3.14 Admin: dashboard & ops
**Purpose:** Admin dashboard aggregates, analytics, audit logs and provider account-status control.
**Endpoints:**
- `GET /api/admin/dashboard` → `AdminDashboardController.getSummary` (users/bookings/payments/tickets/services/quality aggregates + escrow volume)
- `GET /api/admin/analytics` → `AdminDashboardController.getAnalytics` (7d/30d/90d trends, top providers, top services, rating distribution)
- `GET /api/admin/audit-logs` → `AdminDashboardController.getAuditLogs` (paginated, enriched)
- `GET /api/admin/providers` → `AdminDashboardController.getPaginatedProviders`
- `PATCH /api/admin/providers/:id/status` → `AdminProviderStatusController.setStatus` (ACTIVE/ON_HOLD/BLOCKED, notification + audit + socket event)
**Permissions:** admin role on every route.
**Business rules:** provider status changes persist notification + audit log and push `accountStatusChanged` to the provider's socket room.

### 3.15 Admin: ServeGo business model
**Purpose:** Admin control of config keys, subscription plans, level rules, the lead ledger, provider performance and business analytics.
**Endpoints:**
- `GET /api/admin/configs` → `AdminBusinessController.getConfigs`
- `PUT/PATCH /api/admin/configs/:key` → `AdminBusinessController.updateConfig` (upsert + cache invalidation)
- `GET /api/admin/subscription-plans` → `AdminBusinessController.getPlans`
- `POST /api/admin/subscription-plans` → `AdminBusinessController.createPlan` (level must be unique)
- `PATCH /api/admin/subscription-plans/:id` → `AdminBusinessController.updatePlan`
- `GET /api/admin/level-rules` → `AdminBusinessController.getLevelRules`
- `PATCH /api/admin/level-rules/:id` → `AdminBusinessController.updateLevelRule` (also invalidates the level cache)
- `GET /api/admin/leads` → `AdminBusinessController.getLeads` (paginated + status filter)
- `GET /api/admin/leads/:id` → `AdminBusinessController.getLeadById` (full ledger)
- `GET /api/admin/providers/performance` → `AdminBusinessController.getProviderPerformance` (paginated + search)
- `GET /api/admin/analytics/cancellations` → `AdminBusinessController.getCancellationAnalytics` (byActor, byReason, recent 50)
- `GET /api/admin/analytics/subscriptions` → `AdminBusinessController.getSubscriptionAnalytics` (byPlan, revenue totals, recent 20)
- `GET /api/admin/analytics/promotions` → `AdminBusinessController.getPromotionAnalytics` (byLevel, recent 30)
**Permissions:** admin role on every route.
**Business rules:** config edits invalidate the 30s `AdminConfig` cache; level-rule edits invalidate the 60s level cache; plan level is unique.

### 3.16 Saved pros & images
**Purpose:** Customer-saved provider favorites and image uploads to Cloudinary.
**Endpoints:**
- `GET /api/saved-pros` → `SavedProController.getMine` (customer)
- `POST /api/saved-pros` → `SavedProController.save` (upsert; only verified ACTIVE providers)
- `DELETE /api/saved-pros/:providerId` → `SavedProController.unsave`
- `POST /api/images/upload` → `ImageController.upload` (optionalAuth; multer memory → Cloudinary; 5MB; JPEG/PNG/WebP/GIF)
**Permissions:** customer role for saved pros; optionalAuth for image upload.
**Business rules:** favorites only for verified ACTIVE providers; uploads capped at 5MB images.

---

## 4) Security, validation & middleware stack

### 4.1 Server-level middleware (in `server.js` order)
1. `helmetConfig` — secure headers with a tuned CSP (self + fonts + Tailwind CDN; `imgSrc` allows data/https/blob; CORP `cross-origin`)
2. `hppConfig` — HTTP Parameter Pollution protection (whitelist: `serviceIds`, `categoryIds`)
3. `cors(getCorsConfig())` — origins from `ALLOWED_ORIGINS` env (default `*`, credentials true, methods GET/POST/PATCH/DELETE/OPTIONS)
4. `generalRateLimiter` — 100 req / 15 min per IP; **skipped for GET/HEAD/OPTIONS and `/api/health`** so catalog reads/polling are not throttled
5. `express.json({ limit: '1mb' })` + `express.urlencoded({ extended: true, limit: '1mb' })`
6. `requestLogger` — `X-Request-ID` header, structured JSON logs, body sanitization (redacts `password`/`token`/`apiKey`/`secret`), health path skipped
7. `requestTimeout(30000)` — 504 if a request exceeds 30s
8. Trailing-slash 301 redirect normalizer
9. `/api/health` — DB connectivity check (200 `dbStatus: 'reachable'` or 503 `SERVICE_UNAVAILABLE`)
10. `apiRouter` mounted at `/api`
11. Socket.io connection handler (see §16)
12. 404 handler → `NOT_FOUND`
13. `errorHandler` — maps Prisma codes (`P2002`→409, `P2025`→404, `P2003`→409), JWT errors, `ValidationError`; strips internal details for status ≥ 500

### 4.2 Route-level security (`backend/middleware/security.js`)
| Limiter | Window | Max | Applied to |
|---------|--------|-----|-----------|
| `authRateLimiter` | 15 min | 10 | `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` |
| `bookingRateLimiter` | 1 min | 5 | `POST /bookings` (key = IP + userId) |
| `reviewRateLimiter` | 1 min | 3 | `POST /reviews` |
| `supportTicketRateLimiter` | 15 min | 5 | `POST /support-tickets` (public form) |

### 4.3 Validation (`backend/middleware/validation.js`)
- Central `validate(validations)` helper running `express-validator` chains
- Validators: `registerValidation`, `loginValidation`, `createBookingValidation`, `createReviewValidation`, `createTicketValidation`, `createAuthenticatedTicketValidation`, `createServiceValidation`, `updateServiceValidation`, `updateAvailabilityValidation`, `registerProviderServiceValidation`, `updateProviderProfileValidation`, `updateUserProfileValidation`, `forgotPasswordValidation`, `resetPasswordValidation`
- Failures return `400 VALIDATION_ERROR` with a field-level error array

---

## 5) Auth & token model

`backend/utils/auth.js`
- **Access token**: JWT HS256, 15-min expiry, claims `{ id, role, email, iat }`, secret `JWT_SECRET`
- **Refresh token**: JWT, 7-day expiry, claim `{ type: 'refresh' }`, secret `JWT_REFRESH_SECRET`
- `generateTokenPair` returns `{ accessToken, refreshToken, tokenType, expiresIn }`
- Middleware: `requireAuth` (sets `req.user`), `requireRole(...roles)`, `optionalAuth` (never blocks)
- **IP lockout**: in-memory map, 5 failed attempts within 15 min blocks further logins for that IP (`isAuthBlocked`, `recordFailedAuthAttempt`, decay via `unref`'d timers)
- `resetToken` is stored as a SHA-256 hash with a 15-minute expiry for password reset

---

## 6) Data model architecture (Prisma)

Schema: `backend/prisma/schema.prisma` — 30 models, 16 enums, 20 migrations.

### 6.1 User & identity
| Model | Purpose |
|-------|---------|
| `User` | Auth + identity (`role` UserRole, email, password hash, phone, `status` AccountStatus, `emailVerified`-style gates via status, avatar, referral fields `referralCode`/`referredBy`/`referralsCount`/`referralDiscountBalance`/`referralBonusEarned`, lat/lng for customers, `resetToken` hash) |
| `Customer` | Customer profile (1:1 with User; address, pincode, preferences) |
| `Provider` | Partner profile (1:1 with User; category, rating/reviewCount, `verificationLevel`, `accountStatus`, `profileComplete`, `experienceYears`, `jobsCompleted`, `serviceFee`, bio/specialties/serviceAreas, `isVerified`, `isFeatured`, **`providerLevel`** (permanent), `sector` GENERAL/PREMIUM, lat/lng, **`maxRadiusKm`**, **`isOnline`**, **`acceptingBookings`**, availableDays/timeSlots) |
| `ProviderBadge` | Badge unlocks (unique providerId + badgeType) |
| `SavedPro` | Customer favorites (customerId + providerId, unique pair) |
| `AuthEvent` | Audit trail of auth events (signup/login/logout) |

### 6.2 Catalog & registration
| Model | Purpose |
|-------|---------|
| `Service` | Global service catalog (name, unique `nameNormalized`, description, `popularIssues`, `isHidden`) |
| `ProviderService` | Provider-approved service link (`providerServiceRequestId`, unique per provider+service) |
| `ProviderServiceRequest` | Pending/denied registration request (requestedServiceName → `requestedServiceId`, `status` ApprovalStatus, `denialReason`, reviewedBy/reviewedAt) |
| `AvailabilitySlot` | Provider's weekly availability (dayOfWeek, startTime, endTime) |

### 6.3 Booking & money flow
| Model | Purpose |
|-------|---------|
| `Booking` | Core booking (customerId, providerId, serviceId?, `serviceCategory`, `status`, `paymentStatus`, location, city, instructions, **`startedAt`** (→ONGOING), **`completedAt`** (→COMPLETED), cancelledBy/cancelledReason, amount, `messages` JSON, `reviewed`, `statusHistory` JSON) |
| `BookingEvent` | Milestone event log (actorRole/actorId, action, note) — powers the timeline + verification-code lookups |
| `Payment` | Payment ledger (unique bookingId, userId, `paymentMethod`, `status`, transactionId, paidAt) |
| `Review` | Booking review (unique per bookingId, 1–5 stars, reviewer, serviceCategory; refreshes reputation) |

### 6.4 ServeGo business model (lead marketplace)
| Model | Purpose |
|-------|---------|
| `ProviderLevelRule` | Permanent level thresholds (unique `level`, `minJobs`, `discountPercent`, `description`, `active`) |
| `SubscriptionPlan` | Per-level sellable plans (unique `level`, name, price, `leadCount`, `sector`, `isFree`, `active`) |
| `ProviderSubscription` | One row per provider: `level`, lifecycle `status` ACTIVE/INACTIVE/FAILED/CANCELLED, `remainingLeads`, `leadCount`, `completedJobsCurrentSubscription`, `sector`, `freeLeadUsed`, full purchase snapshot (`price`, `discountAmount`, `finalAmount`, `paymentStatus`, `paymentMethod`, `paymentGateway`, `transactionId`, `invoiceNumber`, `lastPurchaseAt`, `activatedAt`) |
| `SubscriptionTransaction` | Purchase/invoice ledger (levelPurchased, planName, price, discountPercent/Amount, finalAmount, leadCount, `paymentStatus` SubscriptionPaymentStatus, paymentMethod/gateway, transactionId, invoiceNumber, `errorDetail`, purchasedAt) |
| `Lead` | Qualified customer request (bookingId unique, customerId, providerId, serviceId/serviceCategory, `status` LeadStatus, `distanceKm`, `expiryTime`, viewedAt/acceptedAt/completedAt/rejectedAt, `transferCount`, `lastRejectReason`) |
| `LeadAssignmentHistory` | Assignment ledger (leadId, providerId, `status`, `isCurrent`, assignedAt, actionAt, reason) |
| `LeadTransferHistory` | Rejection/reassignment trail (fromProviderId → toProviderId, reason, details) |
| `PromotionHistory` | One record per level-up (fromLevel → toLevel, completedJobsAtPromotion, acknowledged) |
| `ProviderLevelHistory` | Full level-change audit (level, previousLevel, reason, completedJobs) |
| `ProviderPerformance` | Live metrics (totalLeads, accepted/rejected/ignored/expiredLeads, completedJobs, cancelledJobs, `jobsStarted`, acceptance/response/cancellation/`lateArrival` rates, `averageResponseTimeMs`, `averageJobCompletionTimeMs`, `lateArrivalCount`, `penaltyScore`, totalEarnings, totalCommission, `cooldownUntil`, `cooldownCount`) |
| `RankingMetrics` | Precomputed rank snapshot (rankScore + breakdown fields, lastComputedAt) |
| `CancellationReason` | Structured cancellation records (bookingId/leadId, `actor` CancellationActor, actorId, reason, detail) |
| `AdminConfig` | Key/value runtime config (`key` unique, `value` JSON, description, updatedBy) |

### 6.5 Notifications & support
| Model | Purpose |
|-------|---------|
| `Notification` | In-app notifications (type, title, message, `isRead`, optional relatedBookingId) |
| `Ticket` | Support tickets (requesterName/email, subject, message, `status` OPEN/RESOLVED/CLOSED, `adminResponse`, relatedBookingId, resolvedAt) |
| `AuditLog` | Admin audit trail (actorId/role, action, targetType/targetId, old/new value, ip) |

### 6.6 Enums (16)
`UserRole, AccountStatus, AuthEventType, BookingStatus, TicketStatus, PaymentStatus, ApprovalStatus, VerificationLevel, ProviderAccountStatus, BadgeType, ProviderLevel, ProviderSector, LeadStatus, SubscriptionStatus, SubscriptionPaymentStatus, CancellationActor`

### 6.7 Migration history (27)
1. `init_schema` — core identity, booking, service, review, payment, availability
2. `approval_status` — provider service approval workflow
3. `functionality` — notifications, support tickets, referrals
4. `add_denial_reason` — denial reason on service requests
5. `provider_reputation` — aggregated rating/review counts
6. `provider_service_uniqueness` — unique provider+service links
7. `provider_review_system` — review model with reputation refresh
8. `prasad` — booking/chat + event infrastructure
9. `remove_pricing_transaction_fields` — transaction field cleanup
10. `noop`
11. `tie_provider_service_request_to_service` — link requests to global `Service`
12. `backfill_requested_service_id_and_normalize` — backfill `requestedServiceId`
13. `fix_nameNormalized_backfill_no_duplicates` — normalized-name backfill fix
14. `add_savedpro_provider_account_status` — SavedPro + provider account status
15. `review_per_booking` — unique review per booking
16. `part1_state_machine` — booking state machine + verification codes
17. `add_profile_completion_and_account_holds` — profile completion + account holds
18. `business_model_upgrade` — subscription plan active flag, provider.sector/level, serviceFee
19. `provider_service_fee` — provider.serviceFee + level discount
20. `business_model_v2` — subscription lifecycle status, payment status enum, provider radius/online/accepting, booking startedAt/completedAt, performance penalty/late metrics
21. `subscription_payments_and_platform_charges` — subscription payment snapshot + platform charges
22. `remove_booking_payments` — payment model removed from bookings
23. `permanent_service_requests` — permanent-service request workflow
24. `location_tracking` — live provider location tracking
25. `wallet` — provider wallet + withdrawal requests
26. `disputes` — dispute tickets + refunds
27. `lead_broadcast` — broadcast leads: `LeadStatus.CANCELLED`, first-accept-wins auto-cancel of other offers, verification code moved to completion

---

## 7) ServeGo business model

### 7.1 Provider levels (seeded defaults in `businessModelSeed.js`)

Provider levels are **permanent** and driven by **lifetime completed jobs** — the subscription level never influences them.

| Level | minJobs (lifetime completed) | Plan discount |
|-------|------------------------------|---------------|
| Bronze | 0 | 0% |
| Silver | 5 | 5% |
| Gold | 15 | 10% |
| Platinum | 45 | 15% |
| Diamond | 60 | 20% |

- Evaluated by `providerLevelService.getProviderLevelForJobs(jobsCompleted)` (highest rule whose `minJobs` is met).
- After each completed job `applyPromotion` persists a `PromotionHistory` record (one per level-up) + `ProviderLevelHistory` and emits `provider:levelChanged` / `promotion` via socket.
- Level rules are cached 60s (`LEVEL_CACHE_TTL_MS`) and invalidated on admin edit.

### 7.2 Subscription plans (seeded)

| Plan | Level | Price | Lead count | Sector |
|------|-------|-------|------------|--------|
| Free Lead | 0 | ₹0 | 1 (granted once) | GENERAL |
| Subscription Level 1 | 1 | ₹99 | 3 | PREMIUM |
| Subscription Level 2 | 2 | ₹189 | 3 | PREMIUM |
| Subscription Level 3 | 3 | ₹269 | 3 | PREMIUM |
| Subscription Level 4 | 4 | ₹339 | 3 | PREMIUM |
| Subscription Level 5 | 5 | ₹399 | 3 | PREMIUM |

Plans are the revenue engine of the lead marketplace. `purchaseSubscription(providerId, planLevel)`:

1. Looks up the plan (must exist, be `active`, and not the free plan).
2. Applies the provider-level discount (`discountAmount = price × discountPercent/100`; discounts never apply to the free lead).
3. Creates a `SubscriptionTransaction` (`paymentStatus: 'PAID'`, paymentMethod/gateway/transactionId, generated `invoiceNumber` like `INV-YYYYMMDD-######`).
4. Updates the `ProviderSubscription` row to mirror the purchase (level, status `ACTIVE`, `remainingLeads = plan.leadCount`, `leadCount`, `completedJobsCurrentSubscription = 0`, sector, snapshot fields, `activatedAt`).
5. First purchase upgrades the provider sector **GENERAL → PREMIUM permanently** (rule 17) — Premium providers keep their sector even after the subscription lapses.
6. Emits notifications in order: payment successful → invoice generated → subscription purchased.

### 7.3 Effective subscription state & lead consumption

The **effective Active state** used for lead eligibility is computed (`subscriptionService.subscriptionIsActive`) from **all five** of:

1. Provider approved — `accountStatus === 'ACTIVE'` and `isVerified === true`
2. Provider available — `isOnline !== false` and `acceptingBookings !== false`
3. `remainingLeads > 0`
4. Last payment successful — `paymentStatus === 'PAID'` and lifecycle status not `FAILED`/`CANCELLED`
5. Not in cooldown — `performance.cooldownUntil` null or in the past

Lead consumption happens **on booking COMPLETED** (`consumeLeadOnCompletion`): `remainingLeads` decrements by 1 and `completedJobsCurrentSubscription` increments; the subscription flips to `INACTIVE` the moment remaining leads reach 0 (`justExpired` is surfaced for notifications). Providers are told via `GET /api/subscriptions/remaining` (`remainingLeads`, `leadCount`, `level`, `status`, `paymentStatus`, computed `active`).

### 7.4 Admin configuration keys (16)

`AdminConfig` is a key/value JSON table; defaults live in `ADMIN_CONFIG_DEFAULTS` and are idempotently seeded/backfilled on boot (obsolete legacy keys are auto-removed).

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `leadTimeoutSeconds` | number | 120 | seconds a lead stays open before auto-expiry |
| `maxRedistributionAttempts` | number | 10 | how many ranked providers a lead is offered to before the customer is notified |
| `leadExpiryEnabled` | boolean | true | master switch for the provider response timer |
| `defaultProviderRadiusKm` | number | 50 | radius used when a provider has not set `maxRadiusKm` |
| `commissionPercent` | number | 10 | platform commission on completed booking amounts |
| `freeLeadCount` | number | 1 | free leads granted to a newly approved provider (once) |
| `leadCountPerSubscription` | number | 3 | leads granted per purchased subscription level |
| `cancellationPenaltyScore` | number | 30 | penalty score added per provider-initiated cancellation |
| `cancellationPenaltyThreshold` | number | 60 | accumulated penalty that triggers a cooldown pause |
| `cancellationWindowDays` | number | 30 | rolling window used to count repeated cancellations |
| `cooldownDurationHours` | number | 24 | hours a provider is paused after crossing the penalty threshold |
| `cooldownPenalty` | string | `TEMP_DISABLE` | penalty applied on repeated cancellations |
| `lateArrivalGraceMinutes` | number | 15 | grace period before a provider is marked late |
| `premiumCategories` | array | `[]` | categories reserved for Premium-sector providers |
| `generalCategories` | array | `[]` | categories open to General providers (default = all not in premium) |
| `rankingWeights` | object | see below | tie-breaker rank weights (live matching keeps fixed priority order, §8.4) |

`rankingWeights` default: `{ distanceKm: 0.25, rating: 0.2, providerLevel: 0.15, acceptanceRate: 0.1, cancellationRate: 0.08, responseRate: 0.08, experienceYears: 0.06, reviewCount: 0.05, serviceFee: 0.03 }`.

---

## 8) Lead lifecycle & matching engine

### 8.1 Lifecycle
```
NEW → VIEWED → ACCEPTED → COMPLETED
  (broadcast: one open offer per eligible provider, isCurrent=true)
  → first ACCEPTED wins → all other open offers auto-CANCELLED (losers notified)
 REJECTED → withdraws ONLY that provider's own open offer
  → other offers stay open (lead/booking re-pointed to a remaining provider)
  → last open offer withdrawn → settle: lead EXPIRED,
       open booking auto-CANCELLED so the customer can re-book
 NEW/VIEWED → (timeout) → EXPIRED
 (no eligible provider) → settle: lead EXPIRED,
      open booking auto-CANCELLED so the customer can re-book
```

### 8.2 Creation (broadcast)
- `createBookingWithLead` (in `leadService.js`) creates the booking + lead atomically inside a `Serializable` transaction: it finds eligible providers, ranks them, and **opens an offer to every eligible provider at once** via `LeadAssignmentHistory` (`isCurrent=true`); the booking/lead attach to the top-ranked provider (`Booking.providerId`) only as the default owner, not as an exclusive assignment. Stamps `expiryTime = now + leadTimeoutSeconds` and writes a `BookingEvent`.
- `providerId` is **optional** on `POST /api/bookings` — a pure broadcast needs no preferred provider; when a `preferredProviderId` is given it is ranked first (must be eligible, else a descriptive error is thrown).
- When no eligible provider exists the booking is rejected with `NO_ELIGIBLE_PROVIDERS`.
- Each lead is a **paid marketplace interaction**: the provider's lead is consumed only when the linked booking reaches **COMPLETED** (rule 4, §7.3).

### 8.3 View / accept / reject
- `view` — NEW→VIEWED (only by a provider holding the open offer), records `viewedAt`, **no lead consumed**.
- `accept` — first-accept-wins via `acceptLeadForBooking` (`Serializable` update on PENDING booking + NEW/VIEWED lead): the accepting provider must hold an open offer (else `NOT_ASSIGNED`); success confirms the booking (CONFIRMED, `providerId` re-pointed to the winner), marks the winning offer ACCEPTED, **auto-cancels every other provider's open offer** (`LeadStatus.CANCELLED`, `isCurrent=false`, reason `ACCEPTED_BY_ANOTHER_PROVIDER`), records a `BookingEvent`, and measures response time for performance. Losers are notified via the `leadCancelled` socket event.
- `reject` — a provider withdraws **only their own** open offer (`isCurrent=false`, status REJECTED); if other offers remain open the lead + booking `providerId` are re-pointed to a remaining offered provider and the booking stays PENDING; when the last open offer is withdrawn the lead is settled (EXPIRED + booking CANCELLED, customer notified with `notifyNoProviderFound`).

### 8.4 Eligibility & ranking (`findEligibleProviders`)
An eligible provider must satisfy **all** of (rule 11):

1. **Approved** — `isVerified` true, `accountStatus` ACTIVE, user ACTIVE
2. **Available** — `isOnline` true and `acceptingBookings` true
3. **Effective subscription ACTIVE** — `subscriptionIsActive` passes (5 criteria, §7.3) with `remainingLeads > 0`
4. **Service match** — approved `ProviderService` for the service, or category match
5. **Radius** — when customer coordinates are known, distance (haversine) ≤ `maxRadiusKm ?? defaultProviderRadiusKm`; providers without usable coordinates are **not** eligible for coordinate-based leads
6. **Sector** — Premium categories require `sector === 'PREMIUM'` (Premium providers serve General + Premium; General providers serve General only)
7. **Not in cooldown** — `performance.cooldownUntil` null or in the past
8. **Not busy** — no active booking in PENDING/CONFIRMED/ONGOING

Eligible providers are ranked (rule 7) by the fixed priority order:

```
Distance → Rating → Provider Level → Acceptance Rate → Cancellation Rate →
Response Rate → Experience → Reviews → Service Fee → Premium-before-General → createdAt
```

(`rankingWeights` in `AdminConfig` is exposed for admins as a tie-breaker model; the live matcher keeps the deterministic order above.)

### 8.5 Booking acceptance flow
- The first provider to accept a broadcast offer marks the linked booking `CONFIRMED`; every other open offer is auto-cancelled (§8.3). A provider declining the booking withdraws only their own offer; the request stays open for the remaining offered providers.
- `completeBooking` marks the booking `COMPLETED` (`completedAt`), consumes one lead, credits earnings net of `commissionPercent`, refreshes reputation, checks promotion, and returns everything needed to notify both parties.

---

## 9) Booking state machine & workflow rules

### 9.1 States
```
PENDING → CONFIRMED → ONGOING → COMPLETED
    │          │          │
    └──────────┴────► CANCELLED
```
Aliases normalized in `utils/workflow.js`: `accepted→CONFIRMED`, `declined→CANCELLED`, `rejected→CANCELLED`, `in-progress→ONGOING`, `completed→COMPLETED`.

### 9.2 Transition matrix (enforced in `BookingController.updateStatus` + explicit routes)
| From → To | Who | Guards |
|-----------|-----|--------|
| PENDING → CONFIRMED | provider (accept) / customer (auto via accept) | first-accept-wins; winner's offer `ACCEPTED`, all others auto-cancelled (`leadCancelled` to losers) |
| PENDING → CANCELLED | provider (decline, reason) / customer / admin | reason required; provider decline withdraws only their own offer (others stay open), customer/admin close all offers |
| CONFIRMED → ONGOING | provider | stamps `startedAt` and records `jobsStarted` (no code required) |
| ONGOING → COMPLETED | provider | **customer's 4-digit verification code required** (`MISSING_FIELDS` if absent, `INVALID_CODE` if wrong); stamps `completedAt`; consumes lead, credits earnings, reviews eligible, checks promotion |
| CONFIRMED/ONGOING → CANCELLED | customer / provider / admin | reason recorded in `CancellationReason`; provider-initiated adds a penalty score (§10.2) |

### 9.3 Double-booking & money guards
- Creation runs inside a `Serializable` transaction that locks provider slots, validates `AvailabilitySlot`, and rejects overlapping bookings (same provider, overlapping time).
- Payment modes: cash-after-job (allowed) or gateway (rejected until configured — `gateway: 'CASH'` only).
- Provider earnings are computed on completion (booking price minus `commissionPercent`), and the lead is consumed at the same moment (§8.5).

---

## 10) Reputation & badge/verification model

### 10.1 Reputation & badges
- `Provider.isVerified` + aggregated `avgRating`, `totalReviews`, `completedBookings` stored on the provider row.
- `refreshProviderReputation(providerId)` (in `providerReputationService.js`) recomputes all aggregates from `Review` rows and booking completion counts.
- Public listings only show `status: ACTIVE` + `isVerified: true` providers.
- Providers unlock **badges** (`ProviderBadge`, BadgeType) as they pass thresholds (experience years, review count, completion rate) — surfaced in the provider profile UI.
- `verificationLevel` (BRONZE/SILVER/GOLD/ELITE) is derived by `calculateVerificationLevel` from identity/completion evidence.
- Level system (§7.1) doubles as a business badge ladder: higher levels get visible Premium/Platinum/Diamond badges on their public profile.

### 10.2 Cancellation penalty & cooldown
- A provider-initiated cancellation calls `recordJobCancelled` (in `providerPerformanceService.js`): it persists a `CancellationReason` (actor `PROVIDER`), increments `cancelledJobs`, recomputes `cancellationRate`, and adds the admin-configured `cancellationPenaltyScore` (default 30) to `penaltyScore`.
- When the accumulated `penaltyScore` reaches `cancellationPenaltyThreshold` (default 60) the provider enters a **cooldown**: `cooldownUntil = now + cooldownDurationHours` (24h), `cooldownCount` increments, and `provider:cooldown` is emitted. While in cooldown the provider is excluded from lead matching (§8.4) and `subscriptionIsActive` returns false.
- `cancellationWindowDays` (30) counts repeated cancellations for analytics; `lateArrivalCount`/`lateArrivalRate` track late starts past `lateArrivalGraceMinutes` (15).

---

## 11) Admin architecture & workflows

- Frontend: `AdminPanel.jsx` + `AdminPanelTabsRouter.jsx` with 13 tabs (Dashboard, Bookings, Providers, Services, Reviews, Payments, Tickets, Notifications, Audit Logs, Analytics, Saved Pros, Users, **ServeGo Business**).
- `frontend/src/pages/admin/Tabs/AdminServeGoTab.jsx` renders 6 sub-tabs:
   1. **Config** — edit all 16 `AdminConfig` keys (number/string/boolean/JSON value types)
  2. **Subscription Plans** — create/update plans per level
  3. **Level Rules** — edit thresholds + discount rates
  4. **Leads** — full lead ledger with assignment/transfer history
  5. **Provider Performance** — searchable table of provider metrics
  6. **Analytics** — cancellations (by actor/reason), subscriptions (revenue by plan), promotions (by level)
- Backend: `AdminBusinessController` (§3.15) + `AdminDashboardController` (§3.14).
- Provider moderation: approve/deny `ProviderService` requests, verify providers, set user/provider status (`AdminProviderStatusController.setStatus`) with notification + socket event + audit log.

---

## 12) Provider architecture & workflows

- Frontend: `ProviderDashboard.jsx` tabs — Overview, Bookings, **Leads Inbox**, **Plans & Subscriptions**, **Level & Performance**, Services, Availability, Reviews, Earnings, Notifications, Settings.
- `ProviderLeadsInbox.jsx`: live lead cards (price, source, distance, time-to-accept countdown), accept/reject actions, cooldown indicator, acceptance timers.
- `ProviderPlans.jsx`: available plans per level with discount callouts, purchase/upgrade flow, invoice history; remaining-leads + effective-active state comes from `GET /api/subscriptions/remaining` (status badge shows `Status · Payment`).
- `ProviderLevelPerformance.jsx`: current level, level progress bars, `ProviderPerformance` metrics (rating, completion rate, response time, monthly leads/earnings), promotion history.
- Business loop: **register + complete profile → get verified → receive/accept leads → complete jobs (consume leads) → accumulate rating/bookings → level up permanently → bigger plan discount**.
- Booking chat (`/api/bookings/:id/messages`) and notifications (lead assigned, accepted, subscription purchased, level changed, remaining leads low, cooldown) arrive over socket.io.

---

## 13) Customer architecture & workflows

- `CustomerDashboard.jsx`: browse approved providers, save favorites (`SavedPro`), book services (creates lead), chat, review after completion.
- Booking creation is lead-aware — every customer booking for an eligible provider spawns a `Lead`; the provider accepts the lead (not just the booking).
- Referral program: customer share code; ₹250 credit on successful referral.

---

## 14) Frontend architecture & data orchestration

### 14.1 Global state (`context/AppContext.jsx`)
- Auth (`user`, `token`, `login/logout/refresh`)
- Providers, services, bookings, reviews, payments, tickets, notifications
- `socketRef` (Socket.io client; auto-connect on auth; room `user:{id}`), `connectionStatus`
- Admin approval state + actions
- `api` client imported from `utils/apiClient.js` for every server call

### 14.2 Routing (`App.jsx`)
- `currentPage` state; `navigate(page)` uses `history.pushState`; all page files are rendered in a switch.
- Sidebar entries: Customer (Dashboard), Provider (Overview, Bookings, Leads Inbox, Plans, Level & Performance, Services, Availability, Reviews, Earnings, Notifications, Settings), Admin (13 tabs + **ServeGo Business**).

### 14.3 Data normalisation
- `utils/normalizeCustomerData.js` — shapes customer-side data for render
- `utils/normalizeAdminData.js` — shapes admin tables/charts

### 14.4 Styling & UX conventions
- White cards, `rounded-2xl/3xl`, slate palette, Lucide icons, `font-black` uppercase labels, teal/amber status chips, skeleton loaders, optimistic UI on booking creation.

---

## 15) Background services (cron / lead timers / email / cloudinary / audit)

| Service | File | Role |
|---------|------|------|
| Lead timers | `leadExpiryService.js` | per-lead expiry timers (re-warmed from DB on boot via `scheduleAllLeadTimers`); on timeout all open offers expire together, every offered provider gets an expired/ignored performance record + notification, and the lead is reassigned to a genuinely new eligible provider or settled (booking auto-cancelled, customer notified) |
| PENDING timeout | `autoCancelService.js` | hourly cron: auto-cancel stale PENDING bookings, mark lead EXPIRED, notify both parties |
| Level rules | `providerLevelService.js` | permanent level lookup by lifetime jobs, level discount, promotion recording (`applyPromotion`); rules cached 60s, `invalidateLevelCache` |
| Admin config | `adminConfigService.js` | `getConfig`/`setConfig`/`getAllConfigs` (JSON values, 30s cache, `invalidateConfig`) |
| Subscription | `subscriptionService.js` | `subscriptionIsActive` (5-criteria), `purchaseSubscription`, `consumeLeadOnCompletion`, plan/history queries |
| Lead engine | `leadService.js` | `findEligibleProviders` (radius + ranking), `createBookingWithLead`, `acceptLeadForBooking`, `completeBooking`, `redistributeLead`, `rejectLead` |
| Performance | `providerPerformanceService.js` | lead/job counters, rates, `recordJobStarted`, `recordLateArrival`, `recordJobCompleted` (duration + earnings), `recordJobCancelled` (penalty score + cooldown) |
| Notifications | `notificationService.js` | user-room + admin-room notifications (`notification:new`, booking/lead/subscription/provider events; `notifyAdmin*` alerts) |
| Reputation | `providerReputationService.js` | `refreshProviderReputation` on review/verify/completion; `calculateVerificationLevel` |
| Cloudinary | `cloudinaryService.js` | upload/destroy via `upload.js` multer memory (5MB, images only) |
| Email | `emailService.js` | nodemailer (password reset, notifications), `emailView.js` templates |
| Audit | `auditLogService.js` | `writeAuditLog` writes `AuditLog` rows (admin ops) |

---

## 16) Runtime behavior (server boot & realtime)

### 16.1 Boot sequence (`server.js` `bootstrap()`)
1. Instantiate Express app + HTTP server; configure middleware stack (§4)
2. Configure Socket.io (CORS from `getCorsConfig()`, 60s ping timeout)
3. Register `/api` router + health + 404 + error handler
4. `await prisma.$connect()` (hard fail → `process.exit(1)` with red log)
5. `seedServicesIfEmpty()` → `seedBusinessModelIfEmpty()` (idempotent)
6. `await schedulePendingBookingAutoCancel()` + `scheduleMonthlyBusinessCycle()`
7. `warmLeadExpiryTimers()` (resume in-memory lead timers from DB)
8. Listen on `PORT` (default 4000); log `POSTGRES connected` / `Server listening`
9. Graceful shutdown on SIGINT/SIGTERM: `socketio.close()`, `server.close()`, `prisma.$disconnect()`

### 16.2 Realtime
- Client connects with `{ token }`; socket.io auth middleware verifies JWT and joins room `user:${userId}` (admins also join `room:admin`).
- Server pushes to user rooms: `notification:new` / `notification`, `newLead`, `leadAccepted`, `leadRejected`, `leadReassigned`, `leadExpired`, `leadAssignmentFailed`, `bookingUpdated`, `bookingStatusChanged`, `booking:created`, `booking:statusChanged`, `booking:cancelled`, `booking:messageCreated`, `booking:message`, `bookingMessage`, `chatMessageReceived` (booking room), `promotion` / `provider:levelChanged`, `subscription:purchased`, `subscription:paymentSuccess`, `subscription:invoiceGenerated`, `subscription:expired`, `subscription:lowLeads`, `providerAssigned`, `providerChanged`, `providerOnTheWay`, `bookingCompleted`, `provider:cooldown`, `accountStatusChanged`, `providerService:approved`, `providerService:rejected`, `serviceApproved`, `category:activeCountChanged`.
- Admin room (`room:admin`) receives: `newApprovalRequest`, `adminAlert:newSupportTicket`, `admin:notification` (payment failed, provider suspended, high cancellation, subscription purchased, provider promoted).
- Controllers reach the io instance via `req.app.get('socketio')`.

### 16.3 Health endpoint
`GET /api/health` → `{ status: 'healthy', db: 'reachable' | 'unreachable' }` (503 when DB down), skipped by rate limiter.

---

## 17) Testing

- Framework: Node built-in `node --test` (no Jest).
- Run: `node --test` inside `backend/tests/` — 7 suites, 43 tests, all passing.
- Coverage: `tests/auth.test.js` (JWT + refresh + lockout), `tests/availability.test.js` (slot validation), `tests/integration.test.js` (register→login→book→message→complete happy path against live DB), `tests/response.test.js`, `tests/runtimeConfig.test.js`, `tests/socketAuth.test.js`, `tests/workflow.test.js` (status normalization + transition matrix).
- Frontend verification: `npm run build` (Vite production build) passes — 1787 modules, ~702 kB bundle.

---

## 18) Known implementation caveats

- **ProviderAvailabilityController is not wired**: the `getAvailability`/`getAvailabilityForDate` actions exist in `backend/controllers/providerAvailabilityController.js` but no `GET /api/providers/:id/availability` route is registered in `api.js`; availability today is managed via the `PUT/PATCH /api/providers/.../availability` write routes.
- **Gateway payments are stubbed**: only `CASH` payments are accepted; UPI/card flow returns `501 NOT_IMPLEMENTED` until a gateway is configured. Subscription purchases likewise record `paymentStatus: 'PAID'` immediately (no real gateway integration yet).
- **Referral payout is bookkeeping only**: ₹250 credit is recorded; no automatic wallet payout.
- **In-memory rate-limit/lockout state**: resets on server restart (single-instance assumption).
- **Lead-timer state**: lead timers are re-warmed from DB on boot (`scheduleAllLeadTimers`) but in-flight elapsed time may drift across restarts.
- **Penalty/cooldown state persists** in `ProviderPerformance` (`penaltyScore`, `cooldownUntil`, `cooldownCount`), so cooldowns survive restarts.
- **Provider levels are permanent** (lifetime completed jobs) — there is no demotion; quality is instead policed by the cancellation penalty/cooldown model (§10.2).
- **AdminConfig cache (30s) and level-rules cache (60s)** mean config/rule edits propagate within ~1 minute.

---

## 19) Files index (key architecture components)

### Backend
- Entry: `backend/server.js`
- Router: `backend/routes/api.js`
- Controllers (22): `UserController, ProviderController, ProviderServiceDiscoveryController, ProviderAvailabilityController, ProviderAnalyticsController, BookingController, LeadController, SubscriptionController, ProviderBusinessController, ReviewController, PaymentController, ReferralsController, NotificationController, TicketController, ServiceController, SavedProController, ImageController, AdminDashboardController, AdminProviderServiceController, AdminProviderServiceItemsController, AdminProviderStatusController, AdminBusinessController` — in `backend/controllers/`
- Services (12): `leadService, leadExpiryService, subscriptionService, providerLevelService, providerPerformanceService, providerReputationService, adminConfigService, autoCancelService, notificationService, cloudinaryService, emailService, auditLogService` — in `backend/services/`
- Middleware: `backend/middleware/security.js` (rate limiters), `logging.js` (request logger), `upload.js` (multer→Cloudinary), `validation.js` (express-validator)
- Utils: `auth.js, response.js, workflow.js, permissions.js, availability.js, validation.js, runtimeConfig.js`
- Seeds: `seeders/servicesSeed.js`, `seeders/businessModelSeed.js`; demo: `prisma/seed.js`
- Schema: `prisma/schema.prisma` + `prisma/client.js` + `prisma/migrations/` (20)
- Scripts: `scripts/cleanup-db.js`, `scripts/migrate-photos-to-cloudinary.js`, `scripts/fix-html-entity-descriptions.js`, `scripts/check-experience.js`
- Tests: `backend/tests/*.test.js`

### Frontend
- Entry: `frontend/src/index.jsx`, `frontend/src/App.jsx`
- Context: `frontend/src/context/AppContext.jsx` (exports `socketRef`)
- API client: `frontend/src/utils/apiClient.js`
- Normalizers: `frontend/src/utils/normalizeCustomerData.js`, `frontend/src/utils/normalizeAdminData.js`
- Hook: `frontend/src/hooks/useAdminPanelController.js`
- Customer: `frontend/src/pages/CustomerDashboard.jsx`
- Provider: `frontend/src/pages/ProviderDashboard.jsx` + `frontend/src/components/ProviderLeadsInbox.jsx`, `frontend/src/components/ProviderPlans.jsx`, `frontend/src/components/ProviderLevelPerformance.jsx`
- Admin: `frontend/src/pages/AdminPanel.jsx`, `frontend/src/pages/admin/AdminPanelTabsRouter.jsx`, `frontend/src/pages/admin/Tabs/AdminServeGoTab.jsx` (6 sub-tabs)
- Public pages: `frontend/src/pages/public/*`

## 20) External integrations

| Integration | Tech | Used for | Config |
|-------------|------|----------|--------|
| **PostgreSQL** | `pg`/Prisma ORM | Primary datastore (30 models) | `DATABASE_URL` |
| **Cloudinary** | `cloudinary` SDK | Image upload/storage (multer memory → `cloudinaryService`), destroy on replace | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **SMTP** | `nodemailer` | Password-reset + transactional email (`emailService`, HTML via `emailView.js`) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` |
| **WebSocket** | `socket.io` | Realtime booking/lead/subscription/admin events (§16.2) | via `ALLOWED_ORIGINS` CORS |
| **Payment gateway** | — | **Not yet wired** — cash-only; UPI/card and webhook return `501` (§18) | future `paymentGateway` field on `SubscriptionTransaction` |

## 21) Environment variables

| Variable | Purpose | Where |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL connection string | `prisma/schema.prisma` / `prisma/client.js` |
| `JWT_SECRET` | HS256 signing secret for access tokens | `utils/auth.js` |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | `utils/auth.js` |
| `JWT_EXPIRY` | Access-token TTL (default 15m) | `utils/auth.js` |
| `JWT_REFRESH_EXPIRY` | Refresh-token TTL (default 7d) | `utils/auth.js` |
| `PORT` | HTTP listen port (default 4000) | `server.js` |
| `ALLOWED_ORIGINS` | CORS origin allow-list (default `*`) | `middleware/security.js` |
| `FRONTEND_URL` | Frontend origin used in email links | `emailService.js` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_EMAIL` / `SMTP_PASSWORD` | SMTP credentials for nodemailer | `emailService.js` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials | `cloudinaryService.js` |
| `NODE_ENV` | `production` vs `development` (controls internal-error detail leakage) | app-wide |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | General-rate-limiter tuning (defaults 100/15min) | `middleware/security.js` |
| `AUTH_RATE_LIMIT_MAX` / `BOOKING_RATE_LIMIT_MAX` / `SUPPORT_TICKET_RATE_LIMIT_MAX` | Per-endpoint limiter tuning | `middleware/security.js` |

## 22) Non-functional requirements

**Performance**
- Hot columns are indexed (`provider.status`, `booking.status/createdAt`, `lead.status/expiryTime`, `notification.userId`, etc. — see §6 tables).
- Derived counts (`activeSpecialistCount`, reputation aggregates) are precomputed/stored rather than recomputed per request.
- `AdminConfig` (30s) and level-rule (60s) caches avoid DB round-trips on hot paths.
- Admin list endpoints are paginated (bookings, providers, leads, audit logs, performance).

**Scalability**
- Stateless JWT auth enables horizontal scaling of API replicas.
- No in-memory session state except rate-limit/lockout maps (single-instance assumption today, §18).
- Realtime assumes a single Socket.io instance; multi-replica would require a shared adapter (e.g. `socket.io-redis`).

**Availability**
- `/api/health` performs a live DB connectivity check (200/503) and is exempt from rate limiting.
- Graceful shutdown on SIGINT/SIGTERM (socket.io → server → Prisma disconnect).
- 30s request timeout returns 504 instead of hanging.

**Reliability**
- Money/lead-sensitive writes run in `Serializable` transactions (booking creation, first-accept-wins, completion, redistribution, subscription purchase).
- Immutable audit trails: `BookingEvent` + `statusHistory`, `LeadAssignmentHistory`/`LeadTransferHistory`, `ProviderLevelHistory`, `PromotionHistory`, `AuditLog`.
- Seeds/backfills are idempotent (re-run safe on every boot); obsolete config keys auto-pruned.

**Security**
- Helmet CSP + HPP, JWT access/refresh, RBAC middleware, IP failed-login lockout, 4 rate limiters, body size limits (1mb), structured logs with secret redaction, Prisma error mapping (no 500 detail leakage in production).

**Logging & monitoring**
- Structured JSON request logs with `X-Request-ID`; health endpoint for uptime/DB checks. Future work: metrics export, alerting.

**Future hardening (roadmap)**
- Redis caching + job queue (notifications, lead redistribution), payment-gateway integration, Socket.io cluster adapter, DB read replicas, automated schema-backfill safety checks.

## 23) Project metrics

| Metric | Value |
|--------|-------|
| Frontend | React 19 + Vite 6 + Tailwind v4 + Socket.io client |
| Backend | Express (Node ESM) + Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Prisma models | 30 |
| Prisma enums | 16 |
| Migrations | 20 |
| Controllers | 22 |
| Services | 12 |
| Middleware files | 4 (`security`, `logging`, `upload`, `validation`) |
| Utils files | 7 (`auth`, `response`, `workflow`, `permissions`, `availability`, `validation`, `runtimeConfig`) |
| REST API endpoints | 110 across 16 modules (§3.0) |
| Socket events (server-pushed) | 38 (§16.2) |
| Background services | lead timers + hourly auto-cancel cron across 12 service modules (§15) |
| Test suites | 7 (`backend/tests/`) — 43 tests passing |
| Service categories (seed) | 20 |
| Subscription plans (seed) | 6 (1 free + 5 paid) |
| Provider level rules (seed) | 5 (Bronze→Diamond) |
| Admin config keys (seed) | 16 (§7.4) |
| Frontend production build | 1787 modules, ~702 kB bundle |

---

*End of report. Structure and endpoints are derived from the current source tree; treat this document as the source of truth for how the pieces connect.*

