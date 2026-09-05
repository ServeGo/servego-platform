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
    - [15.5 Durable job queue (Postgres-backed)](#155-durable-job-queue-postgres-backed)
    - [15.6 Maps & live location tracking](#156-maps--live-location-tracking)
    - [15.7 Search & discovery (ranked Postgres)](#157-search--discovery-ranked-postgres)
16. [Runtime behavior (server boot & realtime)](#16-runtime-behavior-server-boot--realtime)
17. [Testing](#17-testing)
18. [Known implementation caveats](#18-known-implementation-caveats)
19. [Files index (key architecture components)](#19-files-index-key-architecture-components)
20. [External integrations](#20-external-integrations)
21. [Environment variables](#21-environment-variables)
22. [Non-functional requirements](#22-non-functional-requirements)
23. [Project metrics](#23-project-metrics)
24. [Sparse-Plus additions](#24-sparse-plus-additions)

---

## 1) High-level architecture

### 1.1 Frontend (React 19 + Vite)
- Location: `frontend/`
- Tech stack: React 19, Vite 6, Tailwind CSS v4 (utility classes), Lucide icons, Motion, Socket.io client, `react-router-dom` 7 (installed; routing is custom `history.pushState`-based, see §14)
- Entry point: `frontend/src/index.jsx` → `frontend/src/App.jsx`
- Root component `App` wraps everything in `AppProvider` (from `frontend/src/context/AppContext.jsx`) and renders role-specific layouts.

**Main concepts:**
- SPA with browser-history-based routing: `App.jsx` holds `currentPage` state + `history.pushState`; pages are `home | about | services | service-details | contact | faq | login | signup | forgot-password | reset-password | dashboard-customer | dashboard-provider | admin`.
- Central app state via `AppContext.jsx` (auth, providers, bookings, notifications, tickets, services, favorites/saved pros, admin approval state, socket + `socketRef`, connection status).
- API client: `frontend/src/utils/apiClient.js` — fetch wrapper with retry logic + exponential backoff, 401 token-refresh, 429 handling, `VITE_API_URL` fallback (deployed backend → localhost), FormData support.
- Normalisation layer: `frontend/src/utils/normalizeCustomerData.js`, `frontend/src/utils/normalizeAdminData.js`.
- Custom hook: `frontend/src/hooks/useAdminPanelController.js`.
- Route guard: unauthenticated users cannot reach `dashboard-customer`, `dashboard-provider`, `admin`; role mismatch redirects (`App.jsx`).

**Role pages (entry points):**
- Public: `Home`, `About`, `Services`, `ServiceDetails`, `Contact`, `FAQ`, `Login`, `Signup`, `ForgotPassword`, `ResetPassword`
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
  - Every functional area is handled by a dedicated controller in `backend/controllers/*` (26 controllers)
  - Business logic lives in `backend/services/*` (22 services); controllers stay thin (auth → call service → respond)
  - Auth via JWT Bearer tokens (`requireAuth`, `requireRole`, `optionalAuth` in `backend/utils/auth.js`)
  - Unified response envelope: `sendApiSuccess` / `sendApiError` in `backend/utils/response.js`
  - Express-validator middleware in `backend/middleware/validation.js`
  - Security: Helmet (CSP), HPP, express-rate-limit (4 limiters), request timeout, structured request logging (see §4)
  - Socket.io stored on `app` as `socketio` and exposed to controllers via `req.app.get('socketio')`
  - Prisma singleton: `backend/prisma/client.js`; PostgreSQL via `DATABASE_URL`
  - Layered / service-oriented architecture, thin controllers, shared utility layer (see §1.6)

### 1.3 Database (Prisma + PostgreSQL)
- Location: `backend/prisma/`
- Prisma schema: `backend/prisma/schema.prisma` (37 models + 22 enums)
- Client singleton: `backend/prisma/client.js`
- Migrations: `backend/prisma/migrations/*` — migrations from the initial schema through the durable job queue, ranked search, and performance indexes (§6.7, §15.7, §24)

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
│            Controllers  (26, thin)             │
│  user · provider · booking · lead · subscription│
│  admin* · service · review · payment · ticket… │
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│      Business Services  (22) + Utils + timers  │
│  leadService · subscriptionService · levelService│
│  performanceService · notificationService · …  │
│  Cron (autoCancel) · lead timers · fee billing │
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
| **Service-oriented backend** | 22 focused services (`leadService`, `subscriptionService`, `providerLevelService`, `providerPerformanceService`, `notificationService`, `platformFeeService`, …) encapsulate business rules; reused by multiple controllers. |
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
  \        └→ (fixed 24h response window) → all open offers EXPIRED
       └→ lead EXPIRED (no auto-cancel) + the admin is alerted to follow up
            manually; the lead is never silently reassigned after timeout
```

### 1.8 Enterprise readiness

The platform implements production concerns across the stack:

- **Layered + service-oriented** backend with thin controllers and a shared utility layer (§1.6)
- **REST API** with JWT access/refresh tokens + RBAC (`requireRole`) (§5)
- **WebSocket realtime** for notifications, booking/lead events, admin alerts (§16.2)
- **Event-driven notifications** (per-user rooms + admin room) with DB-persisted `Notification` rows
- **Background processing** (lead timers + hourly auto-cancel cron) re-warmed from DB on boot (§15)
- **Configurable business rules** (20 admin-config keys, editable in Admin → ServeGo Business) (§7.4)
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
│   ├── controllers/                # 26 controllers (one per functional area)
│   ├── services/                   # 22 services (business logic, timers, integrations)
│   ├── middleware/                 # security.js, logging.js, upload.js, validation.js
│   ├── utils/                      # auth.js, response.js, workflow.js, permissions.js, availability.js, validation.js, runtimeConfig.js
│   ├── seeders/                    # servicesSeed.js, businessModelSeed.js
│   ├── prisma/                     # schema.prisma, client.js, seed.js, migrations/
│   ├── scripts/                    # cleanup-db.js, migrate-photos-to-cloudinary.js, fix-html-entity-descriptions.js, check-experience.js
│   └── tests/                      # node --test suite (auth, availability, integration, response, runtimeConfig, socketAuth, workflow, queue, maps, tracking, search, payment, featureFlags, pagination)
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
| Platform fee (monthly) | 3.17 | 6 |
| **Total** | | **116** |

Each module below is documented as **Purpose / Endpoints / Permissions / Business rules**.

### 3.1 Authentication & user management
**Purpose:** Registration, login, password reset, token refresh and profile/identity management for all three roles.
**Endpoints:**
- `POST /api/v1/auth/register` → `UserController.register` (customer/provider signup; creates linked `Customer`/`Provider`, referral code, 4-digit verification code, `AuthEvent`)
- `POST /api/v1/auth/login` → `UserController.login` (rate-limited; IP failed-attempt lockout after 5; blocks non-ACTIVE accounts and blocked providers)
- `POST /api/v1/auth/forgot-password` → `UserController.forgotPassword` (rate-limited; SHA-256 token hash, 15-min expiry, nodemailer reset email)
- `POST /api/v1/auth/reset-password` → `UserController.resetPassword` (rate-limited; validates strength, updates password)
- `POST /api/v1/auth/refresh` → `UserController.refreshToken` (returns new token pair)
- `GET /api/v1/auth/me` → `UserController.getMe` (requireAuth; includes customerProfile + providerProfile)
- `GET /api/v1/users` → `UserController.getUsers` (admin; paginated + role/status/search filters)
- `PATCH /api/v1/users/:id/profile` → `UserController.updateProfile` (self or admin)
**Permissions:** auth endpoints public (rate-limited); `GET /users` admin-only; `PATCH /users/:id/profile` self or admin.
**Business rules:** non-ACTIVE accounts blocked at login; password reset token hashed (SHA-256) with 15-min TTL; 5-failed-attempt IP lockout in a 15-min window.

### 3.2 Service Providers (Partners)
**Purpose:** Public provider discovery, profile management, availability and verification.
**Endpoints:**
- `GET /api/v1/providers` → `ProviderController.getAll` (optionalAuth; public = ACTIVE + verified; admin sees all; providers see own)
- `GET /api/v1/providers/by-approved-service` → `ProviderServiceDiscoveryController.getApprovedProvidersByServiceName` (public; rating/experience sort, location filter)
- `GET /api/v1/providers/:id` → `ProviderController.getById` (optionalAuth; hides contact details from non-owner/admin)
- `GET /api/v1/providers/:id/services` → `ProviderController.getProviderServices` (optionalAuth; pending/denied private to owner/admin)
- `GET /api/v1/providers/:id/analytics` → `ProviderAnalyticsController.getProviderAnalytics` (provider or admin; 7d/30d/90d)
- `PUT /api/v1/providers/me/availability` → `ProviderController.updateMyAvailability` (provider)
- `PATCH /api/v1/providers/me/location` → `ProviderController.updateMyLocation` (provider; base GPS + `maxRadiusKm`)
- `PATCH /api/v1/providers/me/availability-status` → `ProviderController.updateMyAvailabilityStatus` (provider; `isOnline` / `acceptingBookings` toggles)
- `GET /api/v1/providers/me/route-plan` → `ProviderController.getMyRoutePlan` (provider; optimized visit order for upcoming jobs, §15.6)
- `POST /api/v1/providers/:id/services/register` → `ProviderController.registerProviderService` (duplicate-guarded)
- `PATCH /api/v1/providers/:id/profile` → `ProviderController.updateProfile` (recomputes `profileComplete`)
- `PATCH /api/v1/providers/:id/availability` / `PUT /api/v1/providers/:id/availability` → `ProviderController.updateAvailability` (validates non-overlapping slots, syncs `AvailabilitySlot`)
- `PATCH /api/v1/providers/:id/verify` → `ProviderController.verify` (admin; triggers reputation refresh + audit log)
**Permissions:** public read; profile/availability writes = owner (provider) or admin; verify = admin.
**Business rules:** public listings only show ACTIVE + verified providers; availability slots must not overlap; profile edits recompute `profileComplete`; verification refreshes reputation and writes an audit log.

### 3.3 Provider-owned service registry
**Purpose:** Provider-offered service registration and the admin approval/denial workflow.
**Endpoints:**
- `POST /api/v1/provider-services` → `ProviderController.registerOwnProviderService` (provider; requires complete + verified profile)
- `GET /api/v1/provider-services/mine` → `ProviderController.getMyProviderServices` (provider)
- `GET /api/v1/provider-services` → `AdminProviderServiceController.getPendingRequests` (admin; `?status=` filter)
- `GET /api/v1/admin/provider-service-requests` → `AdminProviderServiceController.getPendingRequests` (admin)
- `PATCH /api/v1/admin/provider-service-requests/:id/approve` → `AdminProviderServiceController.approveService`
- `PATCH /api/v1/admin/provider-service-requests/:id/deny` → `AdminProviderServiceController.denyService`
- `GET /api/v1/admin/provider-service-items` → `AdminProviderServiceItemsController.getAll` (combined PENDING/DENIED/APPROVED feed)
- `POST /api/v1/admin/providers/reputation/refresh` → `AdminProviderServiceController.refreshReputation`
**Permissions:** provider can register + view own; admin approves/denies and refreshes reputation.
**Business rules:** service requests are duplicate-guarded; approval emits `serviceApproved` / `providerService:approved` socket events and updates the active-specialist count.

### 3.4 Bookings
**Purpose:** Core booking lifecycle: create, view, timeline audit, state-machine transitions and booking chat.
**Endpoints:**
- `GET /api/v1/bookings` → `BookingController.getAll` (role-scoped: customer=own, provider=own providerId, admin=all; paginated; optional `?updatedAfter=<ISO timestamp>` returns only rows whose `updatedAt` is newer — reconnect resync, §14.6/§24.5)
- `GET /api/v1/bookings/:id` → `BookingController.getById` (ownership enforced)
- `GET /api/v1/bookings/:id/timeline` → `BookingController.getTimeline` (admin; statusHistory + `BookingEvent` audit trail)
- `POST /api/v1/bookings` → `BookingController.create` (broadcast: creates booking + lead and opens an offer to every eligible provider; double-booking guards; `Serializable` transaction; socket events)
- `PATCH /api/v1/bookings/:id/status` → `BookingController.updateStatus` (state machine + permissions + verification code for ONGOING→COMPLETED)
- `PATCH /api/v1/bookings/:id/accept` → `BookingController.transition('CONFIRMED')` (provider)
- `PATCH /api/v1/bookings/:id/decline` → `BookingController.transition('CANCELLED')` (provider, reason required; withdraws only that provider's open offer)
- `PATCH /api/v1/bookings/:id/cancel` → `BookingController.transition('CANCELLED')` (customer/provider/admin, reason required)
- `PATCH /api/v1/bookings/:id/complete` → `BookingController.transition('COMPLETED')` (provider; requires the customer's 4-digit verification code; consumes a lead, credits earnings, checks promotion)
- `POST /api/v1/bookings/:id/messages` → `BookingController.addMessage` (booking chat, 2000-char limit, socket events)
- `GET /api/v1/bookings/:id/messages` → `BookingController.getMessages`
- `GET /api/v1/bookings/:id/tracking` → `BookingController.getTracking` (customer/provider/admin snapshot with live ETA, distance, route polyline, dispatch phase)
- `GET /api/v1/bookings/:id/track-history` → `BookingController.getTrackHistory` (bounded `BookingLocationUpdate` telemetry)
- `PATCH /api/v1/bookings/:id/location` → `BookingController.updateLocation` (provider; REST fallback for live GPS pings)
- `POST /api/v1/bookings/:id/on-the-way` → `BookingController.onTheWay` (provider; dispatch phase → `ON_THE_WAY`, notifies customer)
- `POST /api/v1/bookings/:id/arrived` → `BookingController.arrived` (provider; dispatch phase → `ARRIVED`, notifies customer)
- `GET /api/v1/admin/bookings` → `BookingController.getAll` (admin alias of the bookings list)
**Permissions:** customers = own bookings; providers = own; admin = all; state transitions are role-gated (accept/decline/complete = provider, cancel = any party, status = owner).
**Business rules:** creation runs in a `Serializable` transaction with double-booking guards; the request is broadcast to every eligible provider and the first to accept wins (other open offers auto-cancelled); CONFIRMED→ONGOING stamps `startedAt` (no code); ONGOING→COMPLETED requires the customer's 4-digit verification code and stamps `completedAt`, consumes one lead, credits earnings net of commission, refreshes reputation and evaluates promotion; every transition writes statusHistory + `BookingEvent`.

### 3.5 Leads (ServeGo lead engine — provider-facing)
**Purpose:** Broadcast, view, accept, reject and track booking leads (paid marketplace interaction).
**Endpoints:**
- `GET /api/v1/leads` → `LeadController.getMine` (provider → open offers + accepted history; customer → their leads; admin blocked)
- `GET /api/v1/leads/:id` → `LeadController.getById` (full assignment/transfer ledger; role-aware ownership)
- `PATCH /api/v1/leads/:id/view` → `LeadController.view` (provider; NEW → VIEWED, does not consume a lead)
- `PATCH /api/v1/leads/:id/accept` → `LeadController.accept` (provider; first-accept-wins via `acceptLeadForBooking`)
- `PATCH /api/v1/leads/:id/reject` → `LeadController.reject` (provider; withdraws ONLY their own open offer; if any remain the lead/booking stay PENDING and are re-pointed to another offered provider, otherwise the lead is settled and the booking auto-cancelled)
**Permissions:** provider = leads with an open offer (`LeadAssignmentHistory.isCurrent`) or accepted history; customer = their leads; admin blocked on the public lead routes (admin uses §3.15).
**Business rules:** `view` does not consume a lead; `accept` is first-accept-wins — the booking flips PENDING→CONFIRMED and every other provider's open offer is auto-cancelled (`LeadStatus.CANCELLED`, `isCurrent=false`, reason `ACCEPTED_BY_ANOTHER_PROVIDER`); `reject` withdraws only the rejecting provider's offer and never consumes a lead; the whole broadcast is recorded in `LeadAssignmentHistory` and runs in a `Serializable` transaction.

### 3.6 Subscriptions (provider)
**Purpose:** Plan catalog, current subscription state, remaining leads, purchase/upgrade and invoice history.
**Endpoints:**
- `GET /api/v1/subscriptions/plans` → `SubscriptionController.getPlans` (active plans annotated with provider-level discount)
- `GET /api/v1/subscriptions/me` → `SubscriptionController.getCurrent` (level, remaining leads, sector, plan)
- `GET /api/v1/subscriptions/remaining` → `SubscriptionController.remaining` (remainingLeads, leadCount, level, status, paymentStatus, computed `active` via `subscriptionIsActive`)
- `POST /api/v1/subscriptions/purchase` → `SubscriptionController.purchase` (purchase/upgrade; applies level discount; emits payment-success → invoice → `subscription:purchased` notifications)
- `GET /api/v1/subscriptions/transactions` → `SubscriptionController.history` (invoice history)
- `GET /api/v1/subscriptions/transactions/:id` → `SubscriptionController.getTransaction` (provider owner or admin)
**Permissions:** all provider-role routes; transaction detail also admin.
**Business rules:** the free lead is granted automatically and cannot be purchased; discounts come from the permanent provider level and never apply to the free plan; first purchase upgrades the provider sector GENERAL → PREMIUM (permanent); the subscription row mirrors the last purchase (price, discount, finalAmount, paymentStatus, paymentMethod/gateway, transactionId, invoiceNumber).

### 3.7 Provider levels / performance
**Purpose:** Live level, performance metrics, promotions and level history for the provider dashboard.
**Endpoints:**
- `GET /api/v1/provider-performance/me` → `ProviderBusinessController.getMyPerformance` (level + live metrics + `levelOrder`)
- `GET /api/v1/level-rules` → `ProviderBusinessController.getLevelRules` (active rules: thresholds + discounts)
- `GET /api/v1/promotions/me` → `ProviderBusinessController.getMyPromotions`
- `POST /api/v1/promotions/:id/acknowledge` → `ProviderBusinessController.acknowledgePromotion`
- `GET /api/v1/provider-level-history/me` → `ProviderBusinessController.getMyLevelHistory`
**Permissions:** provider role.
**Business rules:** provider level is PERMANENT and based purely on lifetime completed jobs (BRONZE→DIAMOND); promotions are recorded once per level-up and can be acknowledged; level rules are cached 60s.

### 3.8 Notifications
**Purpose:** In-app notification inbox + realtime push.
**Endpoints:**
- `GET /api/v1/notifications` → `NotificationController.getAll` (limit param; admin sees all; optional `?after=<notificationId|ISO timestamp>` returns only rows newer than the client's lastSeen watermark — reconnect resync, §14.6/§24.5)
- `POST /api/v1/notifications` → `NotificationController.create` (self or admin only)
- `PATCH /api/v1/notifications/:id/read` → `NotificationController.read`
- `PATCH /api/v1/notifications/read-all` → `NotificationController.readAll`
- `DELETE /api/v1/notifications` → `NotificationController.clearAll`
**Permissions:** self or admin (create); reads scoped to owner (admin sees all).
**Business rules:** notifications persist in `Notification` rows and are pushed to the owner's socket room (`notification:new`).

### 3.9 Support tickets
**Purpose:** Support ticket creation (authenticated + public contact form), resolution and status management.
**Endpoints:**
- `GET /api/v1/tickets` → `TicketController.getAll` (role-scoped; matches own userId OR requesterEmail)
- `POST /api/v1/tickets` → `TicketController.create` (authenticated; optional `relatedBookingId` ownership check)
- `PATCH /api/v1/tickets/:id/resolve` → `TicketController.resolve` (admin; response text required)
- `PATCH /api/v1/admin/tickets/:id/resolve` → `TicketController.resolve` (admin alias)
- `POST /api/v1/support-tickets` → `TicketController.create` (public contact form, optionalAuth, rate-limited)
- `PATCH /api/v1/support-tickets/:id/status` → `TicketController.setStatus` (admin; OPEN/RESOLVED/CLOSED)
**Permissions:** resolve/status admin-only; public form rate-limited (15-min window).
**Business rules:** new tickets raise `adminAlert:newSupportTicket` to the admin room; resolution requires a response.

### 3.10 Reviews
**Purpose:** Customer reviews after completed bookings + admin moderation.
**Endpoints:**
- `GET /api/v1/reviews` → `ReviewController.getAll` (admin)
- `POST /api/v1/reviews` → `ReviewController.create` (customer-only, 1 review per booking (`@@unique([bookingId])`), requires COMPLETED booking, refreshes provider reputation)
- `GET /api/v1/providers/:id/reviews` → `ReviewController.getByProvider` (public)
- `DELETE /api/v1/reviews/:id` → `ReviewController.deleteOne` (admin moderation, reason required)
**Permissions:** create = customer; delete = admin; provider reviews public.
**Business rules:** one review per booking (unique `bookingId`); review creation refreshes the provider's aggregated reputation.

### 3.11 Payments
**Purpose:** Payment ledger for bookings.
**Endpoints:**
- `GET /api/v1/payments` → `PaymentController.getAll` (role-scoped; admin=all)
- `POST /api/v1/payments` → `PaymentController.create` (cash-after-job only; UPI/card rejected until gateway configured)
- `POST /api/v1/payments/initiate` → `PaymentController.create` (alias)
- `POST /api/v1/payments/webhook` → `PaymentController.webhook` (501 — no gateway configured)
**Permissions:** role-scoped reads; creation authenticated.
**Business rules:** only `CASH` payment mode is accepted; online-gateway flows return `501 NOT_IMPLEMENTED` until a gateway is wired in.

### 3.12 Referrals / ambassador
**Purpose:** Customer referral program with a ₹250 bonus.
**Endpoints:**
- `POST /api/v1/referrals/apply` → `ReferralsController.applyReferral` (₹250 bonus, transactional)
- `GET /api/v1/referrals/me` → `ReferralsController.getMeReferral`
- `POST /api/v1/referrals/generate` → `ReferralsController.generate`
- `POST /api/v1/referrals/claim` → `ReferralsController.applyReferral` (alias)
**Permissions:** authenticated customers.
**Business rules:** referral bonus is bookkeeping only (no automatic wallet payout) — see §18.

### 3.13 Services (global catalog)
**Purpose:** Global service-category catalog, search, category pages and admin CRUD/hide.
**Endpoints:**
- `GET /api/v1/services` → `ServiceController.getAll` (public, includes derived `activeSpecialistCount`)
- `GET /api/v1/services/search` → `ServiceController.search` (query/location/category filters)
- `GET /api/v1/categories/:slug` → `ServiceController.getCategoryBySlug` (includes providers + active specialist count)
- `GET /api/v1/categories/:slug/providers` → `ProviderServiceDiscoveryController.getApprovedProvidersByCategory`
- `GET /api/v1/categories/:id/active-count` → `ServiceController.getActiveCount`
- `POST /api/v1/services` → `ServiceController.create` (admin)
- `DELETE /api/v1/services/:id` → `ServiceController.deleteOne` (admin; `confirm=true` guard)
- `PATCH /api/v1/services/:id` → `ServiceController.updateOne` (admin)
- `PATCH /api/v1/services/:id/hide` → `ServiceController.hideOne` (admin)
**Permissions:** reads public; writes/hide admin.
**Business rules:** delete is blocked (409) when active providers or bookings reference the category; `activeSpecialistCount` is derived from approved `ProviderService` links.

### 3.14 Admin: dashboard & ops
**Purpose:** Admin dashboard aggregates, analytics, audit logs and provider account-status control.
**Endpoints:**
- `GET /api/v1/admin/dashboard` → `AdminDashboardController.getSummary` (users/bookings/payments/tickets/services/quality aggregates + escrow volume)
- `GET /api/v1/admin/analytics` → `AdminDashboardController.getAnalytics` (7d/30d/90d trends, top providers, top services, rating distribution)
- `GET /api/v1/admin/audit-logs` → `AdminDashboardController.getAuditLogs` (paginated, enriched)
- `GET /api/v1/admin/providers` → `AdminDashboardController.getPaginatedProviders`
- `PATCH /api/v1/admin/providers/:id/status` → `AdminProviderStatusController.setStatus` (ACTIVE/ON_HOLD/BLOCKED, notification + audit + socket event)
- `GET /api/v1/admin/queue/stats` → `QueueController.getStats` (job counts per type/status + worker state, §15.5)
- `POST /api/v1/admin/queue/requeue` → `QueueController.requeueDead` (all DEAD jobs → PENDING)
**Permissions:** admin role on every route.
**Business rules:** provider status changes persist notification + audit log and push `accountStatusChanged` to the provider's socket room.

### 3.15 Admin: ServeGo business model
**Purpose:** Admin control of config keys, subscription plans, level rules, the lead ledger, provider performance and business analytics.
**Endpoints:**
- `GET /api/v1/admin/configs` → `AdminBusinessController.getConfigs`
- `PUT/PATCH /api/v1/admin/configs/:key` → `AdminBusinessController.updateConfig` (upsert + cache invalidation)
- `GET /api/v1/admin/subscription-plans` → `AdminBusinessController.getPlans`
- `POST /api/v1/admin/subscription-plans` → `AdminBusinessController.createPlan` (level must be unique)
- `PATCH /api/v1/admin/subscription-plans/:id` → `AdminBusinessController.updatePlan`
- `GET /api/v1/admin/level-rules` → `AdminBusinessController.getLevelRules`
- `PATCH /api/v1/admin/level-rules/:id` → `AdminBusinessController.updateLevelRule` (also invalidates the level cache)
- `GET /api/v1/admin/leads` → `AdminBusinessController.getLeads` (paginated + status filter)
- `GET /api/v1/admin/leads/:id` → `AdminBusinessController.getLeadById` (full ledger)
- `GET /api/v1/admin/providers/performance` → `AdminBusinessController.getProviderPerformance` (paginated + search)
- `GET /api/v1/admin/analytics/cancellations` → `AdminBusinessController.getCancellationAnalytics` (byActor, byReason, recent 50)
- `GET /api/v1/admin/analytics/subscriptions` → `AdminBusinessController.getSubscriptionAnalytics` (byPlan, revenue totals, recent 20)
- `GET /api/v1/admin/analytics/promotions` → `AdminBusinessController.getPromotionAnalytics` (byLevel, recent 30)
**Permissions:** admin role on every route.
**Business rules:** config edits invalidate the 30s `AdminConfig` cache; level-rule edits invalidate the 60s level cache; plan level is unique.

### 3.16 Saved pros & images
**Purpose:** Customer-saved provider favorites and image uploads to Cloudinary.
**Endpoints:**
- `GET /api/v1/saved-pros` → `SavedProController.getMine` (customer)
- `POST /api/v1/saved-pros` → `SavedProController.save` (upsert; only verified ACTIVE providers)
- `DELETE /api/v1/saved-pros/:providerId` → `SavedProController.unsave`
- `POST /api/v1/images/upload` → `ImageController.upload` (optionalAuth; multer memory → Cloudinary; 5MB; JPEG/PNG/WebP/GIF)
**Permissions:** customer role for saved pros; optionalAuth for image upload.
**Business rules:** favorites only for verified ACTIVE providers; uploads capped at 5MB images.

### 3.17 Platform fee (monthly ServeGo subscription)
**Purpose:** Recurring monthly platform fee that replaces per-booking commission. Providers must keep it paid to keep receiving leads; customers are reminded but never blocked.
**Endpoints:**
- `GET /api/v1/platform-fee/status` → `PlatformFeeController.status` (any auth; own account: enabled, amount, billing dueAt, overdue, unpaidBalance)
- `GET /api/v1/platform-fee/history` → `PlatformFeeController.history` (any auth; own `PlatformFeePayment` rows, newest first)
- `POST /api/v1/platform-fee/order` → `PlatformFeeController.order` (any auth; Razorpay order for the amount due — default fee amount, or the accrued balance when overdue)
- `POST /api/v1/platform-fee/verify` → `PlatformFeeController.verify` (any auth; verifies the Razorpay signature, records the payment, advances the billing window, emits `platformFee:paid` + notification)
- `POST /api/v1/platform-fee/webhook` → `PlatformFeeController.webhook` (public; Razorpay payment-authorization webhook — reconciles paid orders that were never verified client-side)
- `GET /api/v1/admin/platform-fees` → `PlatformFeeController.adminList` (admin; paginated list of `PlatformFeeAccount` rows + `PENDING`/`OVERDUE`/`PAID` filters + summary counts)
**Permissions:** status/history/order/verify require any authenticated role; admin list is admin-only; webhook is public.
**Business rules:** a `PlatformFeeAccount` row is auto-created for every user on first status check; billing is monthly, first due = `accountCreatedAt + platformFeeGraceDays` (default 30); payments verified via Razorpay signature or the webhook; an overdue provider (`dueAt` passed, `overdue`) is **excluded from lead matching** (`findEligibleProviders`/`diagnoseProvider` gate on `platformFeeEnabled`); a daily cron (`advanceFeeBilling`) marks accounts overdue, and an initial sweep on boot creates accounts for all users (§15.8).

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

Schema: `backend/prisma/schema.prisma` — 40 models, 26 enums, 33 migrations.

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
| `PlatformFeeAccount` | One row per user's monthly platform fee: `enabled`, `amount`, `billingWindowStart`/`end`, `dueAt`, `status` `CURRENT`/`OVERDUE`/`PAUSED`, `overdue` flag, `lastPaymentAt` |
| `PlatformFeePayment` | Monthly fee payment ledger (`accountId`, amount, paymentStatus `PAID`/`FAILED`/`PENDING`, paymentMethod/gateway, `transactionId`, `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `paidAt`) |

### 6.5 Notifications & support
| Model | Purpose |
|-------|---------|
| `Notification` | In-app notifications (type, title, message, `isRead`, optional relatedBookingId) |
| `Ticket` | Support tickets (requesterName/email, subject, message, `status` OPEN/RESOLVED/CLOSED, `adminResponse`, relatedBookingId, resolvedAt) |
| `AuditLog` | Admin audit trail (actorId/role, action, targetType/targetId, old/new value, ip) |

### 6.6 Enums (17)
`UserRole, AccountStatus, AuthEventType, BookingStatus, JobStatus, TicketStatus, PaymentStatus, ApprovalStatus, VerificationLevel, ProviderAccountStatus, BadgeType, ProviderLevel, ProviderSector, LeadStatus, SubscriptionStatus, SubscriptionPaymentStatus, CancellationActor`

### 6.7 Migration history (33)
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
28. `job_queue` — durable queue: `JobStatus` enum + `Job` model (attempts, backoff, priority, dedupeKey, status indexes), `PlatformDailyStat` daily analytics, `BookingInvoice` per booking
29. `job_result` — add `Job.result` JSONB column so handler return values persist alongside job status
30. `provider_phase` — provider phase/lifecycle tracking
31. `search_trgm` — trigram indexes for ranked service search (§15.7)
32. `backup_manifest` — `Backup` model + manifest (added in feature-plan work; the feature was later removed entirely and the table dropped in migration 35)
33. `perf_indexes` — hot-path composite indexes: `Notification(userId,isRead)`, `Review(providerId,createdAt)`, `Review(reviewerId)`, `Provider(accountStatus)`, `ProviderService(providerId)`, `ProviderService(serviceId)`, `ProviderServiceRequest(status,createdAt)`, `WalletTransaction(userId,createdAt)` (§24.3)
34. `remove_disputes` — dispute feature dropped: dispute tables removed
35. `remove_backup_manifest` — `Backup` table dropped (feature 22 removed, §24.2)
36. `platform_fee` — `PlatformFeeAccount` + `PlatformFeePayment` models; monthly platform fee replaces per-booking commission (§3.17, §15.8)
37. `service_location_coords` — customer's exact service location picked on the map at booking time (`Booking` + `PermanentServiceRequest` `serviceLatitude`/`serviceLongitude`/`locationAddress`); authoritative for radius matching and tracking
38. `perf_indexes_v2` — 14 composite indexes derived from real queries (worker claim poll, notification feed, auto-cancel cron, provider analytics, lead expiry sweep, payout queues, discovery) — rule 13 (§24.3)

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

Lead consumption happens **on booking COMPLETED** (`consumeLeadOnCompletion`): `remainingLeads` decrements by 1 and `completedJobsCurrentSubscription` increments; the subscription flips to `INACTIVE` the moment remaining leads reach 0 (`justExpired` is surfaced for notifications). Providers are told via `GET /api/v1/subscriptions/remaining` (`remainingLeads`, `leadCount`, `level`, `status`, `paymentStatus`, computed `active`).

### 7.4 Admin configuration keys (20)

`AdminConfig` is a key/value JSON table; defaults live in `ADMIN_CONFIG_DEFAULTS` and are idempotently seeded/backfilled on boot (obsolete legacy keys are auto-removed).

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `platformFeeEnabled` | boolean | true | master switch for the monthly provider platform fee |
| `platformFeeAmount` | number | 99 | monthly platform fee (₹) charged to providers; overdue providers stop receiving leads |
| `platformFeeGraceDays` | number | 30 | days a provider gets after joining before the first platform fee payment is due |
| `customerPlatformFeeEnabled` | boolean | true | master switch for the customer platform fee (reminders only, never blocks access) |
| `customerPlatformFeeAmount` | number | 49 | monthly platform fee (₹) charged to customers (reminders only) |
| `cancellationPenaltyScore` | number | 30 | penalty score added per provider-initiated cancellation (accept-then-cancel only) |
| `locationTrackingEnabled` | boolean | true | master switch for live provider location sharing on active bookings |
| `etaBaseSpeedKph` | number | 30 | average provider travel speed used for ETA from straight-line distance |
| `locationUpdateMinIntervalSeconds` | number | 3 | minimum interval between persisted location pings per booking |
| `locationHistoryClearanceHours` | number | 24 | location ping history retention window (older pings pruned after a booking closes) |
| `walletEnabled` | boolean | true | master switch for the credits wallet (provider earnings, referral bonuses, refunds) |
| `walletMinimumWithdrawal` | number | 100 | minimum amount (₹) a provider can request in a single payout |
| `walletMaximumWithdrawal` | number | 0 | maximum amount (₹) per payout request; 0 = unlimited |
| `walletWithdrawalNote` | string | … | info note shown on the provider withdrawal form |
| `referralBonusAmount` | number | 250 | referral bonus (₹) credited to a new user when a referral code is applied |
| `maintenanceMode` | boolean | false | when on, the public API returns 503 (admin routes, login and feature-flag reads stay up) |
| `newFeatureEnabled` | boolean | false | show the "what's new" announcement banner to the selected audience |
| `newFeatureAudience` | string | `customer` | who sees the announcement: customer or provider |
| `newFeatureText` | string | `` | the announcement banner message |
| `newFeatureValidUntil` | string | `` | announcement expiry (ISO); managed by the feature-flag service (24h window) |

`rankingWeights` default: `{ distanceKm: 0.25, rating: 0.2, providerLevel: 0.15, acceptanceRate: 0.1, cancellationRate: 0.08, responseRate: 0.08, experienceYears: 0.06, reviewCount: 0.05, serviceFee: 0.03 }`.

Feature-flag keys are registered programmatically by `featureFlagsService.js` (§24.1) rather than listed in `ADMIN_CONFIG_DEFAULTS`.

> Note: per-booking commission (`commissionPercent`, `platformCharge*`) was replaced by the monthly platform fee (§3.17). The following previously-admin-configurable keys were removed (values are fixed in code — lead timeout 24h, default radius 50 km, penalty threshold 60, cancellation window 30 days, cooldown 24h — and premium/general category lists + ranking weights are no longer configured): `leadTimeoutSeconds`, `defaultProviderRadiusKm`, `cancellationPenaltyThreshold`, `cancellationWindowDays`, `cooldownDurationHours`, `premiumCategories`, `generalCategories`, `rankingWeights` (+ other legacy keys). All are auto-pruned on boot.

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
 NEW/VIEWED → (fixed 24h response window) → all open offers EXPIRED
       → lead EXPIRED (booking left PENDING) + admin alerted for follow-up
 (no eligible provider) → settle: lead EXPIRED,
      open booking auto-CANCELLED so the customer can re-book
```

### 8.2 Creation (broadcast)
- `createBookingWithLead` (in `leadService.js`) creates the booking + lead atomically inside a `Serializable` transaction: it finds eligible providers, ranks them, and **opens an offer to every eligible provider at once** via `LeadAssignmentHistory` (`isCurrent=true`); the booking/lead attach to the top-ranked provider (`Booking.providerId`) only as the default owner, not as an exclusive assignment. Stamps `expiryTime = now + 24h` (fixed response window, 86400s) and writes a `BookingEvent`.
- `providerId` is **optional** on `POST /api/v1/bookings` — a pure broadcast needs no preferred provider; when a `preferredProviderId` is given it is ranked first (must be eligible, else a descriptive error is thrown).
- When no eligible provider exists the booking is rejected with `NO_ELIGIBLE_PROVIDERS`.
- Each lead is a **paid marketplace interaction**: the provider's lead is consumed only when the linked booking reaches **COMPLETED** (rule 4, §7.3).
- Eligibility additionally requires the monthly **platform fee** to be current — an overdue provider (`PlatformFeeAccount.overdue`, `platformFeeEnabled`) is excluded at `findEligibleProviders`/`diagnoseProvider` (rule 11, §3.17).

### 8.3 View / accept / reject
- `view` — NEW→VIEWED (only by a provider holding the open offer), records `viewedAt`, **no lead consumed**.
- `accept` — first-accept-wins via `acceptLeadForBooking` (`Serializable` update on PENDING booking + NEW/VIEWED lead): the accepting provider must hold an open offer (else `NOT_ASSIGNED`); success confirms the booking (CONFIRMED, `providerId` re-pointed to the winner), marks the winning offer ACCEPTED, **auto-cancels every other provider's open offer** (`LeadStatus.CANCELLED`, `isCurrent=false`, reason `ACCEPTED_BY_ANOTHER_PROVIDER`), records a `BookingEvent`, and measures response time for performance. Losers are notified via the `leadCancelled` socket event.
- `reject` — a provider withdraws **only their own** open offer (`isCurrent=false`, status REJECTED); if other offers remain open the lead + booking `providerId` are re-pointed to a remaining offered provider and the booking stays PENDING; when the last open offer is withdrawn the lead is settled (EXPIRED + booking CANCELLED, customer notified with `notifyNoProviderFound`).

### 8.4 Eligibility & ranking (`findEligibleProviders`)
An eligible provider must satisfy **all** of (rule 11):

1. **Approved** — `isVerified` true, `accountStatus` ACTIVE, user ACTIVE
2. **Available** — `isOnline` true and `acceptingBookings` true
3. **Effective subscription ACTIVE** — `subscriptionIsActive` passes (5 criteria, §7.3) with `remainingLeads > 0`
4. **Platform fee current** — no overdue `PlatformFeeAccount` when `platformFeeEnabled` (§3.17)
5. **Service match** — approved `ProviderService` for the service, or category match
6. **Radius** — when customer coordinates are known, distance (haversine) ≤ `maxRadiusKm ?? 50 km` fallback; providers without usable coordinates are **not** eligible for coordinate-based leads
7. **Not in cooldown** — `performance.cooldownUntil` null or in the past
8. **Not busy** — no active booking in PENDING/CONFIRMED/ONGOING

Eligible providers are ranked (rule 7) by the fixed priority order:

```
Distance → Rating → Provider Level → Acceptance Rate → Cancellation Rate →
Response Rate → Experience → Reviews → Service Fee → createdAt
```

(The ordering is hard-coded; the `rankingWeights` config key and premium-category sector gating were removed.)

### 8.5 Booking acceptance flow
- The first provider to accept a broadcast offer marks the linked booking `CONFIRMED`; every other open offer is auto-cancelled (§8.3). A provider declining the booking withdraws only their own offer; the request stays open for the remaining offered providers.
- `completeBooking` marks the booking `COMPLETED` (`completedAt`), consumes one lead, credits the full booking amount to the provider's wallet (per-booking commission was replaced by the monthly platform fee, §3.17), refreshes reputation, checks promotion, and returns everything needed to notify both parties.

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
- Provider earnings are computed on completion (full booking price credited to the wallet; per-booking commission removed in favour of the monthly platform fee), and the lead is consumed at the same moment (§8.5).

### 9.4 State-transition guards & idempotency (rules 17–18)
- **One authoritative transition layer** — `utils/workflow.js` (`normalizeBookingStatus`, `isValidBookingTransition`, `buildStatusHistory`) + CAS-guarded service functions are the only writers of `booking.status`; controllers never touch the column directly and the explicit routes (`accept` / `decline` / `cancel` / `complete` / `updateStatus`) all funnel through them.
- **Compare-and-swap on current DB state** — every transition is an `updateMany` filtered on the expected source status, so a stale client, double-click, retry or worker race matches zero rows and aborts **before** any side effect runs:
  - `acceptLeadForBooking` — PENDING booking + NEW/VIEWED lead; a second accept hits the CAS and throws `ACCEPT_RACE` (§8.3).
  - `startBookingWork` — CONFIRMED→ONGOING; a repeat call returns `NO_CHANGE` (§8.3).
  - `completeBooking` — ONGOING→COMPLETED; a racing duplicate can never double-credit the wallet, double-increment performance or double-consume the lead; otherwise `INVALID_TRANSITION`.
  - cancel routes — role + source-state guarded; an already-cancelled booking is an idempotent no-op (no duplicate event/analytics).
  - `autoCancelService` — hourly cron CAS on `{ id, status: 'PENDING' }`; if a provider accepted (or another worker cancelled) between the read and write, zero rows match and the cron moves on.
- **Derived-row idempotency (rule 18)** — `recordJobCancelled` guards on one `CancellationReason` per booking+provider (`findFirst` → `alreadyRecorded`, never a double penalty); queue jobs carry `dedupeKey` so retries don't fan out duplicate notifications (§15.5); the `invoice` handler upserts per booking; `redistributeLead` returns `alreadyHandled` when the lead has already moved on. A repeat transition is always a no-op or a typed error (e.g. `NO_CHANGE`, `INVALID_TRANSITION`, `ACCEPT_RACE`), never a duplicate write.
- **Auditability** — every transition writes a `BookingEvent` + statusHistory entry recording who/what/why.

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
- When the accumulated `penaltyScore` reaches the fixed threshold (60) the provider enters a **cooldown**: `cooldownUntil = now + 24h` (fixed), `cooldownCount` increments, and `provider:cooldown` is emitted. While in cooldown the provider is excluded from lead matching (§8.4) and `subscriptionIsActive` returns false.
- A fixed 30-day window counts cancellations for the analytics view; `lateArrivalCount`/`lateArrivalRate` track late provider starts. (Penalty threshold, cancellation window, cooldown duration and late-arrival grace were removed from admin config — §7.4.)

---

## 11) Admin architecture & workflows

- Frontend: `AdminPanel.jsx` + `AdminPanelTabsRouter.jsx` with 13 tabs (Dashboard, Bookings, Providers, Services, Reviews, Payments, Tickets, Notifications, Audit Logs, Analytics, Saved Pros, Users, **ServeGo Business**).
- `frontend/src/pages/admin/Tabs/AdminServeGoTab.jsx` renders 7 sub-tabs:
   1. **Config** — edit the business `AdminConfig` keys (platform fee for providers/customers, cancellation penalty score, location-tracking, wallet, referral, maintenance + announcement flags) with number/string/boolean value types
   2. **Subscription Plans** — create/update plans per level
   3. **Level Rules** — edit thresholds + discount rates
   4. **Leads** — full lead ledger with assignment/transfer history
   5. **Provider Performance** — searchable table of provider metrics
   6. **Analytics** — cancellations (by actor/reason), subscriptions (revenue by plan), promotions (by level)
   7. **Platform Fees** — monthly fee accounts with status filter + summary counts + Excel export
- Excel export: every admin report sub-tab (Leads, Performance, Cancellations, Subscriptions, Promotions, Platform Fees) has an **Export to Excel** button via `frontend/src/utils/exportExcel.js` (xlsx); admin list endpoints accept `?page=1&limit=100` to page through the full dataset before export.
- Backend: `AdminBusinessController` (§3.15) + `AdminDashboardController` (§3.14) + `PlatformFeeController.adminList` (§3.17).
- Provider moderation: approve/deny `ProviderService` requests, verify providers, set user/provider status (`AdminProviderStatusController.setStatus`) with notification + socket event + audit log.

---

## 12) Provider architecture & workflows

- Frontend: `ProviderDashboard.jsx` tabs — Overview, Bookings, **Leads Inbox**, **Plans & Subscriptions**, **Level & Performance**, Services, Availability, Reviews, Earnings, Notifications, Settings.
- `ProviderLeadsInbox.jsx`: live lead cards (price, source, distance, time-to-accept countdown), accept/reject actions, cooldown indicator, acceptance timers.
- `ProviderPlans.jsx`: available plans per level with discount callouts, purchase/upgrade flow, invoice history, and a **Monthly Platform Fee** card (amount, next due date, overdue badge, recent payments, Razorpay pay button); remaining-leads + effective-active state comes from `GET /api/v1/subscriptions/remaining` (status badge shows `Status · Payment`).
- `ProviderLevelPerformance.jsx`: current level, level progress bars, `ProviderPerformance` metrics (rating, completion rate, response time, monthly leads/earnings), promotion history.
- Business loop: **register + complete profile → get verified → receive/accept leads → complete jobs (consume leads) → accumulate rating/bookings → level up permanently → bigger plan discount**.
- Booking chat (`/api/v1/bookings/:id/messages`) and notifications (lead assigned, accepted, subscription purchased, level changed, remaining leads low, cooldown) arrive over socket.io.

---

## 13) Customer architecture & workflows

- `CustomerDashboard.jsx`: browse approved providers, save favorites (`SavedPro`), book services (creates lead), chat, review after completion.
- Booking creation is lead-aware — every customer booking for an eligible provider spawns a `Lead`; the provider accepts the lead (not just the booking).
- Referral program: customer share code; ₹250 credit on successful referral.
- `WalletView.jsx` shows the customer wallet and a **Monthly Platform Fee** card (reminder + Razorpay pay button; overdue customers are never blocked from booking).

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
- **Loading UX (rule 15)** — every data-fetching screen renders `SkeletonLoader` (`card`/`list`/`text` variants) while loading and an empty state when done: wired into `Home`, `Services`, `ProviderLeadsInbox`, `ProviderPlans`, `PermanentRequestsView`, `ProviderWallet`, `ProviderWalletAmbassador` and `WalletView` via the `servicesLoading` flag exposed by `DataContext`.
- **Optimistic UI is selective (rule 16)** — reserved for harmless reversible actions (saving a provider as favourite); payment, cancellation, completion and status-changing actions disable the button + show "Processing…" until the server confirms, then reconcile from the server response (reverting + surfacing the error on failure).

### 14.5 Error UX (machine-readable codes → friendly copy)
- `utils/errorMessages.js` is the single source of truth for what the UI shows on failure. Backend failures always carry `{ code, message }` (rule 19), so `getErrorMessage(payload, fallback)` resolves an exact code from `CODE_COPY` (~50 `LEAD_*`/`BOOKING_*`/`PAYMENT_*`/`AUTH_*`/… entries) or the longest matching domain prefix (`PREFIX_FALLBACK`), detects network-shaped messages via `NETWORK_PATTERNS` (`NETWORK_ERROR_MESSAGE`), and only then falls back to the caller's fallback — never a bare "Something went wrong". `getRecoveryAction(payload)` / `getErrorInfo` expose the optional action ("Refresh leads", "View booking", "Try again") that callers render as a button.
- Wired into `utils/apiClient.js` (typed errors carrying the backend payload), `ErrorBoundary`, `AuthContext` (login/register/forgot/reset), `DataContext` (createBooking, updateBookingStatus, availability), `ProviderLeadsInbox` (accept/reject errors + "Refresh leads" action), `ProviderPlans`, `WalletView`, `ProviderWallet`, `ProviderWalletAmbassador` and `BookingCard` (cancel errors via toast).

### 14.6 Realtime connection recovery (rule 23)
- `utils/reconnectWatermark.js` keeps a per-user `lastSeen` watermark in localStorage (`servego_reconnect_watermark_<userId>`, server timestamps only) with `read`/`save`/`advance`/`clear`; `advance` never moves the marker backwards.
- `RealtimeContext` emits `authenticate` on every (re)connect (re-joins `user:{id}` / `room:admin`), sets `connectionStatus` to `'reconnecting'` on `disconnect` and `'online'` on `connect`, and on a **reconnect** (skipped on the very first connect, `hasConnectedOnceRef`) calls `DataContext.resyncAfterReconnect()`.
- `resyncAfterReconnect()` reads the watermark and pulls `GET /notifications?after=<watermark>` + `GET /bookings?updatedAfter=<watermark>` (merge mode upserts by id), advancing the watermark from server timestamps; without a watermark it falls back to a full refetch. The 30s poll remains as the eventual-consistency net, and failed poll fetches keep the last-known rows instead of clearing them.
- `App.jsx` renders an amber banner while `connectionStatus !== 'online'` — "Connection lost. You may be seeing outdated info — retrying in the background." when offline, "Reconnecting to live updates…" while reconnecting.

---

## 15) Background services (cron / lead timers / email / cloudinary / audit)

| Service | File | Role |
|---------|------|------|
| Lead timers | `leadExpiryService.js` | per-lead expiry timers (re-warmed from DB on boot via `scheduleAllLeadTimers`); on timeout all open offers expire together, every offered provider gets an expired/ignored performance record + notification, and the lead is **flagged for admin follow-up** (booking is left PENDING, no silent reassignment, no auto-cancel) |
| Platform fee | `platformFeeService.js` | monthly platform-fee accounts, billing-window advancement, overdue detection, payment recording/verification (§15.8) |
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
| Queue | `queueService.js` / `jobHandlers.js` / `worker.js` | durable Postgres job queue (§15.5): booking side-effects (email, notification persistence, analytics, invoice, provider performance) run async, retried with backoff, dead-lettered for admin review |

### 15.5 Durable job queue (Postgres-backed)

Booking and subscription side-effects that used to run **inline in the request path** now run **asynchronously in a durable queue** stored in the same PostgreSQL the app already uses (no Redis/broker dependency).

**Motivation:** email SMTP I/O, analytics aggregation, invoice generation and performance bookkeeping could block a request for seconds and were lost entirely if the process crashed mid-operation. The queue gives at-least-once delivery, retries with exponential backoff, dead-lettering and zero data loss on restart.

**Queue mechanics** (`backend/services/queue/queueService.js`):
- `enqueueJob({ type, payload, maxAttempts, delayMs, runAt, priority, dedupeKey })` inserts a `Job` row (dedupeKey skips an already-queued logical job).
- `claimJobs(type)` claims due jobs **atomically** (`updateMany ... WHERE status='PENDING'`), so the API process and any number of worker processes can never process the same job twice.
- `processClaimedJob` runs the handler; success → `SUCCEEDED` (result JSON persisted); failure → `PENDING` with exponential backoff (`2^(attempt-1)`s + jitter, capped 30s) or `DEAD` once `maxAttempts` is exhausted.
- `recoverInterruptedJobs()` (called on boot) re-queues stale `PROCESSING` rows older than 5 min (crash/deploy/scale-in safety); `requeueDeadJobs()` resets `DEAD` jobs for a fresh attempt.
- `startQueueWorkers` / `stopQueueWorkers` / `drainQueueWorkers` manage the in-process worker loops (poll every `QUEUE_POLL_INTERVAL_MS`, batch `QUEUE_CLAIM_BATCH_SIZE`).

**Deployment modes:** workers start inside the API process by default (`QUEUE_WORKERS_ENABLED !== 'false'`); set `QUEUE_WORKERS_ENABLED=false` and run `npm run worker` (standalone `services/queue/worker.js`) for a dedicated worker instance. Both modes share the same table safely.

**Handlers** (`backend/services/queue/jobHandlers.js`): `notification` (persists the already-socket-emitted notification row), `email` (`sendEmail`), `analytics` (atomic `PlatformDailyStat` day upsert/increment), `invoice` (idempotent `BookingInvoice` upsert per booking, `INV-BKG-YYYYMMDD-######`), `performance` (`recordJobStarted` / `recordLateArrival` / `recordLeadIgnored` / `recordLeadExpired` / `recordJobCompleted`).

**Enqueued from request paths:** `notificationService.createNotification` (DB insert), `bookingController` (booking-request/completed emails, analytics counters, invoice on create/complete, `performance.jobStarted` on ONGOING), `cancelBookingPlain` (analytics cancellation counter).

**Admin API:** `GET /api/v1/admin/queue/stats` (per-type/per-status counts + worker state) and `POST /api/v1/admin/queue/requeue` (all DEAD → PENDING), both admin-only.

### 15.6 Maps & live location tracking

**Maps service** (`backend/services/mapsService.js`) is Google-Maps-first with a transparent haversine fallback: every call is key-gated on `GOOGLE_MAPS_API_KEY`. Without the key (dev / no billing) all routing degrades to great-circle math; adding a billing-enabled key with the Geocoding, Directions and Distance Matrix APIs turns the same call sites into real road routing with zero code changes.
- `haversineKm` / `decodePolyline` — pure math (no deps).
- `getDrivingInfo(origin, destination)` — Distance Matrix → road `distanceKm` + `durationMin`; haversine + `durationMin: null` without a key.
- `getRouteGeoJson(origin, destination)` — Directions overview polyline decoded to a GeoJSON `[lng, lat]` LineString; straight line without a key.
- `reverseGeocode(point)` — Geocoding `formatted_address`; `null` without a key.
- `sortByRoadDistance(origin, stops, { top })` — batched Distance Matrix ranking; haversine fallback.
- `optimizeRoute(origin, stops)` — nearest-neighbour visit ordering over one batched Distance Matrix call (origins `[origin, ...stops]`); haversine matrix fallback. Powers the provider **route planner** (single-provider day optimization, not a multi-vehicle VRP).
- All network calls fail closed (5s AbortController timeout, `fetch`) and never throw into the request path.

**Live tracking** (`backend/services/trackingService.js`, DB-backed telemetry since migration `20260804000001_location_tracking`):
- `Booking.startLocation` / `endLocation` (JSONB), `providerLatitude` / `providerLongitude` / `providerLocationUpdatedAt`, and a `BookingLocationUpdate` history table (bounded telemetry, retained `locationHistoryClearanceHours`).
- `updateProviderLocation` — provider pushes a fix for a CONFIRMED/ONGOING booking (socket primary, REST fallback); server-side throttle (`locationUpdateMinIntervalSeconds`, default 3s); captures `startLocation` on the first fix; broadcasts `location:update` to `user:{customerId}` and `user:{providerUserId}` with live `distanceKm`, road `etaMinutes` (falls back to `computeEtaMinutes` at `etaBaseSpeedKph`), `routePolyline`, `providerPhase` and destination.
- `getBookingTracking` / `getBookingLocationHistory` / `clearLocationHistory` — customer/provider/admin snapshots with ownership checks, staleness (`locationSharingActive`), bounded history (max 200 rows).
- **Dispatch lifecycle** — `Booking.providerPhase` (null → `ON_THE_WAY` → `ARRIVED`), decoupled from the booking state machine so tracking UX stays independent of CONFIRMED/ONGOING/COMPLETED. `markProviderOnTheWay` / `markProviderArrived` (ownership + active-status guards) update the phase, emit `provider:onTheWay` / `provider:arrived`, and notify the customer (`notifyProviderOnTheWay` / `notifyProviderArrived` in `notificationService.js`). `resetProviderPhase` clears the phase on completion/cancellation.
- **Routes:** `GET /bookings/:id/tracking`, `GET /bookings/:id/track-history`, `PATCH /bookings/:id/location`, `POST /bookings/:id/on-the-way`, `POST /bookings/:id/arrived` (provider-only); provider ops `PATCH /providers/me/location` (base GPS + `maxRadiusKm`), `PATCH /providers/me/availability-status` (`isOnline` / `acceptingBookings` — now actually written, powers Nearby-Provider matching), `GET /providers/me/route-plan` (`providerRouteService.getRoutePlan` orders upcoming CONFIRMED/ONGOING jobs).
- **Frontend:** `LiveTrackingMap.jsx` renders MapLibre GL + OpenStreetMap tiles (markers, route line, phase banner); `AppContext` subscribes to `location:update`, `provider:onTheWay`, `provider:arrived` and exposes `shareProviderLocation` / `setProviderDispatchPhase` (socket first, REST fallback); `ProviderLeadsInbox` gets dispatch buttons + GPS share; `BookingCard` shows the Uber-style dispatch stepper; `ProviderProfileView` has base-location/radius/online toggles + route planner.

### 15.7 Search & discovery (ranked Postgres)

**Search service** (`backend/services/searchService.js`) replaces plain `ILIKE '%term%'` matches with **ranked, typo-tolerant** queries backed by `pg_trgm` (enabled + GIN-indexed in migration `20260808000003_search_trgm` on `Service.name` / `description` / `nameNormalized`, `User.name`, `Provider.category` / `bio`). Postgres-only by design — no external search cluster at this scale; if catalog volume and traffic ever outgrow the platform, reindex these same queries into MeiliSearch behind identical function signatures (a queue job hook already exists, §15.5).

- **`rankedServiceMatches(query, { limit })`** (`GET /services?q=…`, `ServiceController.search`) — each catalog row scores as: exact `nameNormalized` (12) > name prefix (8) > name trigram/`word_similarity` (6) > description trigram/`word_similarity` (3); results ordered score desc, then active-specialist count desc (popularity tiebreak), then name. `word_similarity(query, text)` keeps 2–3 char queries usable, where the bare `%` trigram operator needs three characters.
- **`resolveServiceForQuery(query)`** (`GET /providers/by-approved-service?serviceName=…`, `ProviderServiceDiscoveryController`) — resolves a customer's free-text need ("ac repair servic") to the single closest canonical `Service` (exact > prefix > name trigram), requiring a minimum score so garbage queries `404` instead of silently redirecting to a lookalike. Provider discovery then filters on the resolved `serviceId` (location filter + ACTIVE/verified guards intact) and returns the canonical name as `category`.
- **Ranking principle:** service-name relevance first, then provider trust (rating / experience / verification); popularity surfaces in the catalog via active-specialist count.
- **Tests:** `tests/search.test.js` — corpus seeding, empty-query handling, exact>prefix>fuzzy ordering, typo tolerance, description text search, canonical resolution, discovery end-to-end + 404 (DB-backed, auto-skip offline).

### 15.8 Platform fee billing (monthly)

`backend/services/platformFeeService.js` implements the recurring monthly fee that replaced per-booking commission (§3.17):

- **Accounts** — `ensurePlatformFeeAccount(userId, client)` lazily creates a `PlatformFeeAccount` on first status check; the initial billing window starts at account creation with `dueAt = createdAt + platformFeeGraceDays` (default 30). An initial sweep on boot (`sweepCreateMissingAccounts`) creates accounts for every existing user.
- **Billing window** — each successful payment advances the window by one month (`billingWindowStart`/`end`, `dueAt = end`). `advanceFeeBilling()` (daily cron) flips accounts whose `dueAt` has passed to `OVERDUE` (`overdue = true`) and emits `platformFee:overdue` notifications to overdue providers.
- **Payments** — `createPlatformFeeOrder(userId)` returns a Razorpay order (amount = configured `platformFeeAmount`, or the accrued unpaid balance when overdue); `recordPlatformFeePayment` is called from the client `verify` route (signature check) and from the public Razorpay webhook (reconciles unverified paid orders). Payment records a `PlatformFeePayment` row, advances the window, clears `overdue`, and emits `platformFee:paid`.
- **Gating** — provider lead eligibility (§8.4) requires no overdue account when `platformFeeEnabled`; customers receive reminders (`platformFee:reminder`/`platformFee:overdue`) but are never blocked.
- **Routes:** §3.17. **Notifications:** `platformFee:due`, `platformFee:reminder`, `platformFee:overdue`, `platformFee:paid` (+ `notifyAdminPlatformFeeOverdue` to the admin room).

---

## 16) Runtime behavior (server boot & realtime)

### 16.1 Boot sequence (`server.js` `bootstrap()`)
1. Instantiate Express app + HTTP server; configure middleware stack (§4)
2. Configure Socket.io (CORS from `getCorsConfig()`, 60s ping timeout)
3. Register `/api` router + health + 404 + error handler
4. `await prisma.$connect()` (hard fail → `process.exit(1)` with red log)
5. `seedServicesIfEmpty()` → `seedBusinessModelIfEmpty()` (idempotent)
6. `await schedulePendingBookingAutoCancel()` + `scheduleMonthlyBusinessCycle()` + `scheduleDailyPlatformFeeBilling()` (hourly auto-cancel cron, monthly business cycle, daily platform-fee overdue sweep)
7. `warmLeadExpiryTimers()` (resume in-memory lead timers from DB) + `sweepCreateMissingAccounts()` (create missing platform-fee accounts)
8. Listen on `PORT` (default 4000); log `POSTGRES connected` / `Server listening`
9. `recoverInterruptedJobs()` (re-queue stale PROCESSING jobs) then `startQueueWorkers()` (in-process queue workers, §15.5)
10. Graceful shutdown on SIGINT/SIGTERM: `stopQueueWorkers()` + `drainQueueWorkers()` (in-flight jobs finish), `socketio.close()`, `server.close()`, `prisma.$disconnect()`

### 16.2 Realtime
- Client connects with `{ token }`; socket.io auth middleware verifies JWT and joins room `user:${userId}` (admins also join `room:admin`).
- Server pushes to user rooms: `notification:new` / `notification`, `newLead`, `leadAccepted`, `leadRejected`, `leadReassigned`, `leadExpired`, `leadAssignmentFailed`, `bookingUpdated`, `bookingStatusChanged`, `booking:created`, `booking:statusChanged`, `booking:cancelled`, `booking:messageCreated`, `booking:message`, `bookingMessage`, `chatMessageReceived` (booking room), `promotion` / `provider:levelChanged`, `subscription:purchased`, `subscription:paymentSuccess`, `subscription:invoiceGenerated`, `subscription:expired`, `subscription:lowLeads`, `providerAssigned`, `providerChanged`, `providerOnTheWay`, `bookingCompleted`, `provider:cooldown`, `accountStatusChanged`, `providerService:approved`, `providerService:rejected`, `serviceApproved`, `category:activeCountChanged`, `location:update` (live GPS fix + ETA + route polyline), `provider:onTheWay` / `provider:arrived` (dispatch lifecycle), `platformFee:due` / `platformFee:reminder` / `platformFee:overdue` / `platformFee:paid`.
- Admin room (`room:admin`) receives: `newApprovalRequest`, `adminAlert:newSupportTicket`, `admin:notification` (payment failed, provider suspended, high cancellation, subscription purchased, provider promoted), `adminAlert:platformFeeOverdue`.
- Reconnect recovery: the client re-emits `authenticate` on every (re)connect (re-joining `user:{id}` / `room:admin`), then resyncs missed state from a per-user watermark via `GET /notifications?after=` and `GET /bookings?updatedAfter=` (merged locally); `connectionStatus` drives the "Reconnecting…" banner (§14.6).
- Controllers reach the io instance via `req.app.get('socketio')`.

### 16.3 Health endpoint
`GET /api/health` → `{ status: 'healthy', db: 'reachable' | 'unreachable' }` (503 when DB down), skipped by rate limiter.

---

## 17) Testing

- Framework: Node built-in `node --test` (no Jest).
- Run: `node --test --test-concurrency=1` inside `backend/tests/` — 14 suites, all passing.
- Coverage: `tests/auth.test.js` (JWT + refresh + lockout), `tests/availability.test.js` (slot validation), `tests/integration.test.js` (register→login→book→message→complete happy path against live DB), `tests/response.test.js`, `tests/runtimeConfig.test.js`, `tests/socketAuth.test.js`, `tests/workflow.test.js` (status normalization + transition matrix), `tests/queue.test.js` (backoff, unknown-type rejection, claim/process+result persistence, fail→backoff→DEAD, dedupeKey, requeueDeadJobs), `tests/maps.test.js` (haversine + polyline decoding + distance/route/optimizer keyless fallbacks), `tests/tracking.test.js` (dispatch lifecycle guards with mock client + DB-backed phase persistence and customer notification), `tests/search.test.js` (ranked trigram matching, typo tolerance, canonical service resolution, discovery end-to-end + 404), `tests/payment.test.js` (subscription invoice snapshot; platform-fee order/verify/record flows updated after per-booking platform charges were removed), `tests/featureFlags.test.js` (register/list/get/update/delete + gating), `tests/pagination.test.js` (limit clamp, offsetMeta, per-endpoint pagination, booking/notification cursor paging + invalid-cursor 400, encodeCursor round-trip).
- Frontend verification: `npm run build` (Vite production build) passes — main chunk ~1,630 kB (421 kB gzip) with 16 admin tabs split into per-tab lazy chunks (§24.3).

---

## 18) Known implementation caveats

- **ProviderAvailabilityController is not wired**: the `getAvailability`/`getAvailabilityForDate` actions exist in `backend/controllers/providerAvailabilityController.js` but no `GET /api/v1/providers/:id/availability` route is registered in `api.js`; availability today is managed via the `PUT/PATCH /api/v1/providers/.../availability` write routes.
- **Gateway payments are stubbed**: only `CASH` payments are accepted; UPI/card flow returns `501 NOT_IMPLEMENTED` until a gateway is configured. Subscription purchases likewise record `paymentStatus: 'PAID'` immediately (no real gateway integration yet).
- **Referral payout is bookkeeping only**: ₹250 credit is recorded; no automatic wallet payout.
- **In-memory rate-limit/lockout state**: resets on server restart (single-instance assumption).
- **Lead-timer state**: lead timers are re-warmed from DB on boot (`scheduleAllLeadTimers`) but in-flight elapsed time may drift across restarts; on timeout the lead expires to `EXPIRED` and the admin is alerted for manual follow-up (no automatic reassignment).
- **Penalty/cooldown state persists** in `ProviderPerformance` (`penaltyScore`, `cooldownUntil`, `cooldownCount`), so cooldowns survive restarts.
- **Provider levels are permanent** (lifetime completed jobs) — there is no demotion; quality is instead policed by the cancellation penalty/cooldown model (§10.2).
- **AdminConfig cache (30s) and level-rules cache (60s)** mean config/rule edits propagate within ~1 minute.
- **Queue analytics are increment-based**: a retried `analytics` job increments `PlatformDailyStat` again, so counters are best-effort (derived analytics, not money-critical); `notification`/`invoice` handlers are idempotent (upsert by unique key).

---

## 19) Files index (key architecture components)

### Backend
- Entry: `backend/server.js`
- Router: `backend/routes/api.js`
- Controllers (24): `UserController, ProviderController, ProviderServiceDiscoveryController, ProviderAvailabilityController, ProviderAnalyticsController, BookingController, LeadController, SubscriptionController, ProviderBusinessController, ReviewController, PaymentController, ReferralsController, NotificationController, TicketController, ServiceController, SavedProController, ImageController, AdminDashboardController, AdminProviderServiceController, AdminProviderServiceItemsController, AdminProviderStatusController, AdminBusinessController, QueueController, PlatformFeeController` — in `backend/controllers/`
- Services (19): `leadService, leadExpiryService, subscriptionService, providerLevelService, providerPerformanceService, providerReputationService, adminConfigService, autoCancelService, notificationService, cloudinaryService, emailService, auditLogService, queueService, jobHandlers, mapsService, trackingService, providerRouteService, searchService, platformFeeService` — in `backend/services/` (+ `backend/services/queue/worker.js` standalone worker)
- Middleware: `backend/middleware/security.js` (rate limiters + CSP incl. OSM/Google connect-src for the live map), `logging.js` (request logger), `upload.js` (multer→Cloudinary), `validation.js` (express-validator)
- Utils: `auth.js, response.js, workflow.js, permissions.js, availability.js, validation.js, runtimeConfig.js`
- Seeds: `seeders/servicesSeed.js`, `seeders/businessModelSeed.js`; demo: `prisma/seed.js`
- Schema: `prisma/schema.prisma` + `prisma/client.js` + `prisma/migrations/` (38)
- Scripts: `scripts/cleanup-db.js`, `scripts/migrate-photos-to-cloudinary.js`, `scripts/fix-html-entity-descriptions.js`, `scripts/check-experience.js`
- Tests: `backend/tests/*.test.js`

### Frontend
- Entry: `frontend/src/index.jsx`, `frontend/src/App.jsx`
- Context: `frontend/src/context/AppContext.jsx` (exports `socketRef`)
- API client: `frontend/src/utils/apiClient.js`
- Normalizers: `frontend/src/utils/normalizeCustomerData.js`, `frontend/src/utils/normalizeAdminData.js`
- Error & reconnect utils: `frontend/src/utils/errorMessages.js` (§14.5), `frontend/src/utils/reconnectWatermark.js` (§14.6)
- Hook: `frontend/src/hooks/useAdminPanelController.js`
- Customer: `frontend/src/pages/CustomerDashboard.jsx`
- Provider: `frontend/src/pages/ProviderDashboard.jsx` + `frontend/src/components/ProviderLeadsInbox.jsx`, `frontend/src/components/ProviderPlans.jsx`, `frontend/src/components/ProviderLevelPerformance.jsx`
- Shared components: `frontend/src/components/SkeletonLoader.jsx` (loading/empty states, rule 15), `frontend/src/components/ErrorBoundary.jsx` (render-error fallback, rule 19)
- Admin: `frontend/src/pages/AdminPanel.jsx`, `frontend/src/pages/admin/AdminPanelTabsRouter.jsx`, `frontend/src/pages/admin/Tabs/AdminServeGoTab.jsx` (6 sub-tabs)
- Public pages: `frontend/src/pages/public/*`

## 20) External integrations

| Integration | Tech | Used for | Config |
|-------------|------|----------|--------|
| **PostgreSQL** | `pg`/Prisma ORM | Primary datastore (40 models) | `DATABASE_URL` |
| **Cloudinary** | `cloudinary` SDK | Image upload/storage (multer memory → `cloudinaryService`), destroy on replace | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **SMTP** | `nodemailer` | Password-reset + transactional email (`emailService`, HTML via `emailView.js`) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` |
| **WebSocket** | `socket.io` | Realtime booking/lead/subscription/admin events (§16.2) | via `ALLOWED_ORIGINS` CORS |
| **Payment gateway** | — | **Not yet wired** — cash-only; UPI/card and webhook return `501` (§18) | future `paymentGateway` field on `SubscriptionTransaction` |
| **Maps & routing** | `maplibre-gl` (frontend) + optional Google Maps APIs (backend) | Live tracking map (OSM tiles), road ETA / Distance Matrix / route polyline / reverse geocoding / provider route planner — Google-upgradable via `mapsService.js` (§15.6) | `GOOGLE_MAPS_API_KEY` (optional; haversine fallback without it) |

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
| `QUEUE_WORKERS_ENABLED` | Set `false` to disable in-process queue workers (run `npm run worker` instead) | `services/queue/queueService.js` |
| `QUEUE_POLL_INTERVAL_MS` | Worker poll cadence in ms (default `1500`) | `services/queue/queueService.js` |
| `QUEUE_CLAIM_BATCH_SIZE` | Jobs claimed per poll (default `10`) | `services/queue/queueService.js` |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | General-rate-limiter tuning (defaults 100/15min) | `middleware/security.js` |
| `AUTH_RATE_LIMIT_MAX` / `BOOKING_RATE_LIMIT_MAX` / `SUPPORT_TICKET_RATE_LIMIT_MAX` | Per-endpoint limiter tuning | `middleware/security.js` |
| `GOOGLE_MAPS_API_KEY` | Optional — enables road ETA, route polyline, reverse geocoding and road-distance route planning (haversine fallback without it) | `services/mapsService.js` |
| `locationTrackingEnabled` / `locationUpdateMinIntervalSeconds` / `etaBaseSpeedKph` / `locationHistoryClearanceHours` | Live-tracking toggles & tuning (admin-configurable, defaults true/3s/30/24) | `services/trackingService.js` |

## 22) Non-functional requirements

**Performance**
- Hot columns are indexed (`provider.status`, `booking.status/createdAt`, `lead.status/expiryTime`, `notification.userId`, etc. — see §6 tables); composite hot-path indexes added in migrations 33 and 38 (§24.3).
- Derived counts (`activeSpecialistCount`, reputation aggregates) are precomputed/stored rather than recomputed per request.
- `AdminConfig` (30s) and level-rule (60s) caches avoid DB round-trips on hot paths.
- Admin list endpoints are paginated (bookings, providers, leads, audit logs, performance).
- All high-volume customer/admin list endpoints return `{ <entity>, pagination: { total, page, limit, pages } }` (offset, default 20/max 100); bookings and notifications additionally support an opt-in cursor mode (`?mode=cursor`, then `?cursor=<token>`) for stable deep paging (§24.3).
- `providerServiceDiscoveryController` reads precomputed `reviewCount`/`rating` scalars instead of a nested `reviews` include (§24.3).
- Admin panel tabs are code-split via `React.lazy` so only the active tab's chunk loads (§24.3).

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
- Durable Postgres-backed job queue (§15.5): at-least-once delivery, exponential-backoff retries, dead-lettering, interrupted-job recovery on boot, graceful drain on shutdown.
- Feature-flag service (§24.1): runtime-gated behavior without redeploys, backed by the AdminConfig table.
- Seeds/backfills are idempotent (re-run safe on every boot); obsolete config keys auto-pruned.

**Security**
- Helmet CSP + HPP, JWT access/refresh, RBAC middleware, IP failed-login lockout, 4 rate limiters, body size limits (1mb), structured logs with secret redaction, Prisma error mapping (no 500 detail leakage in production).

**Logging & monitoring**
- Structured JSON request logs with `X-Request-ID`; health endpoint for uptime/DB checks. Future work: metrics export, alerting.

**Future hardening (roadmap)**
- Redis caching, payment-gateway integration, Socket.io cluster adapter, DB read replicas, automated schema-backfill safety checks.

## 23) Project metrics

| Metric | Value |
|--------|-------|
| Frontend | React 19 + Vite 6 + Tailwind v4 + Socket.io client + MapLibre GL |
| Backend | Express (Node ESM) + Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Prisma models | 37 |
| Prisma enums | 22 |
| Migrations | 38 |
| Controllers | 26 |
| Services | 22 |
| Middleware files | 4 (`security`, `logging`, `upload`, `validation`) |
| Utils files | 7 (`auth`, `response`, `workflow`, `permissions`, `availability`, `validation`, `runtimeConfig`) |
| REST API endpoints | ~116 across 17 modules (§3.0) |
| Socket events (server-pushed) | 45 (§16.2) |
| Background services | lead timers + hourly auto-cancel cron + daily platform-fee sweep across 22 service modules (§15) |
| Test suites | 14 (`backend/tests/`) — all passing |
| Service categories (seed) | 20 |
| Subscription plans (seed) | 6 (1 free + 5 paid) |
| Provider level rules (seed) | 5 (Bronze→Diamond) |
| Admin config keys (seed) | 20 (§7.4) |
| Frontend production build | main chunk ~1,630 kB (~421 kB gzip) + 16 per-tab lazy chunks (2.5–11 kB) |

---

## 24) Sparse-Plus additions

Feature work delivered on top of the base platform. All additions are covered by tests (§17).

### 24.1 Feature flags (Feature 21)

- `backend/services/featureFlagsService.js` — flags are stored as `featureFlags.<name>` keys in the `AdminConfig` table (JSONB), read through the 30s-cached `getConfig` path, and registered with typed defaults. `registerFeatureFlags()` idempotently seeds defaults on boot; unused flags can be deregistered.
- `backend/controllers/featureFlagController.js` + routes — `GET/POST /admin/feature-flags`, `GET /admin/feature-flags/:key`, `PUT/PATCH/DELETE /admin/feature-flags/:key` (admin RBAC). Frontend: `AdminFeatureFlagsTab.jsx` (register/edit/enable/toggle, registered as a lazy admin chunk).
- Usage: services gate behavior at runtime, e.g. `featureFlagsService.isFlagEnabled('featureFlags.<name>')`, so features can be toggled without redeploys. Tests: `tests/featureFlags.test.js` (register/list/get/update/delete + gating).

### 24.2 Database backup & restore (Feature 22) — REMOVED

Feature 22 was implemented (feature-flag work) and later removed entirely: `backend/services/backupService.js`, `backend/controllers/backupController.js`, the backup routes, the `Backup` model (added in migration 32) and its admin config keys were deleted. The `Backup` table was dropped in migration 35 (`20260810000001_remove_backup_manifest`), and `AdminBackupsTab.jsx` was removed from the admin router. No code references backups anymore.

### 24.3 Performance (Feature 25)

- **Offset pagination** — high-volume list endpoints return `{ <entity>, pagination: { total, page, limit, pages } }` via shared `backend/utils/pagination.js` (`parsePagination` clamps limit to 1–100, default per-endpoint; `offsetMeta` computes total/page/limit/pages). Count and page queries run in parallel. Converted: `ticketController.getAll` (admin=all, user=own), `reviewController.getAll` + `getByProvider`, `savedProController.getMine`, `adminProviderServiceController.getPendingRequests`, `adminProviderServiceItemsController.getAll` (three status groups merged, counted, then sliced per page; default 50), `serviceController.getCategoryBySlug` (count via `providerService.count`, exposes `activeSpecialistCount`).
- **Cursor mode (opt-in)** — `bookingController.getAll` and `notificationController.getAll` support `?mode=cursor&limit=N` for the first page then `?cursor=<base64(id|date)>` via `parseCursor`/`encodeCursor`/`sliceCursorPage` (keyset on `createdAt,id`, `maxLimit+1` take). Cursor responses return `pagination: { total, nextCursor, hasMore }`; invalid cursors return `400 INVALID_CURSOR`. Without cursor params both endpoints keep their legacy shapes (bookings offset pagination; notifications plain array).
- **Payload/N+1 reduction** — `providerServiceDiscoveryController` drops the nested `reviews: true` include and serves precomputed `reviewCount`/`rating` scalars.
- **Indexes (migration 33)** — composite hot-path indexes listed in §6.7, covering notification filtering, provider review/timeline queries, account-status scans, provider↔service joins, request-queue filtering and wallet-transaction listing.
- **Indexes v2 (migration 38)** — rule 13: 14 composite indexes derived from the queries the app actually runs — `Job(type,status,availableAt)` (worker claim poll), `Notification(userId,createdAt)` (feed), `Booking(status,createdAt)` (auto-cancel cron + admin aggregates), `Booking(providerId,createdAt)` (provider analytics), `Lead(status,createdAt)` + `Lead(customerId,createdAt)` + `Lead(status,expiryTime)` (admin list, customer feed, expiry sweep), `Review(createdAt)` (admin list/analytics), `ProviderServiceRequest(providerId,status)` (provider's own requests), `WalletWithdrawalRequest(userId,createdAt)` + `WalletWithdrawalRequest(status,createdAt)` (payout queue), `SubscriptionTransaction(providerId,purchasedAt)` (history), `PermanentServiceRequest(status,createdAt)` (admin list), `Provider(accountStatus,isVerified)` (discovery/lead matching). All exist in `prisma/schema.prisma` `@@index` directives and match the `Table_col1_col2_idx` naming convention.
- **Frontend compatibility + code-splitting** — normalizers (`normalizeCustomerData.js`) and `AppContext.jsx` accept both wrapper and raw-array shapes; admin panels request `?limit=100` to keep full-ish lists. `AdminPanelTabsRouter.jsx` now `React.lazy`s each tab under a `Suspense` fallback, so the main bundle stays ~1,630 kB and each admin tab loads on demand.
- Tests: `tests/pagination.test.js` (limit clamp, offsetMeta, per-endpoint pagination, cursor paging with no overlap + final-page null cursor + invalid-cursor 400, plain-array backward compat, cursor token round-trip).

### 24.4 Monthly platform fee (replaces per-booking commission)

- **Models** (migration `20260810000002_platform_fee`): `PlatformFeeAccount` (per-user billing window + `overdue` flag) and `PlatformFeePayment` (Razorpay payment ledger).
- **Service** `backend/services/platformFeeService.js`: `ensurePlatformFeeAccount` (lazy create + boot sweep `sweepCreateMissingAccounts`), `advanceFeeBilling` (daily cron marks accounts overdue, notifies), `createPlatformFeeOrder` (Razorpay order for amount due / accrued balance), `recordPlatformFeePayment` (client verify + webhook reconciliation), `getAccountStatus`, `getUserPaymentHistory`, `listAdminAccounts` (paginated, status-filtered).
- **Controller** `backend/controllers/platformFeeController.js` + routes §3.17 (`/platform-fee/{status,history,order,verify,webhook}`, `/admin/platform-fees`); notifications via `notificationService` (`platformFee:due/reminder/overdue/paid` + admin alert).
- **Gating** — providers with an overdue fee are excluded from lead matching (`leadService.findEligibleProviders`/`diagnoseProvider` gate on `platformFeeEnabled`), so unpaid providers stop receiving leads.
- **Frontend** — `ProviderPlans.jsx` and `WalletView.jsx` show a fee card with Razorpay checkout (`POST /platform-fee/order` → verify); `AdminServeGoTab.jsx` gains a **Platform Fees** sub-tab (accounts table, status filter, summary counts, Excel export).
- **Cleanup** — per-booking `platformChargeService.js` deleted; `commissionPercent`/`platformCharge*`/`leadExpiryEnabled`/`maxRedistributionAttempts`/`freeLeadCount`/`leadCountPerSubscription` and the config-only knobs (`leadTimeoutSeconds`, `defaultProviderRadiusKm`, `cancellationPenaltyThreshold`, `cancellationWindowDays`, `cooldownDurationHours`, `premiumCategories`, `generalCategories`, `rankingWeights`) removed and auto-pruned from the seed (values fixed in code); `payment.test.js` updated; all 14 backend test suites pass.
- **Admin export** — `frontend/src/utils/exportExcel.js` (xlsx) powers Export buttons on every ServeGo report sub-tab; endpoints page with `?page=1&limit=100` so exports capture the full dataset, not just the first page.

### 24.5 Production hardening (rules 15–20, 23)

- **Loading & optimistic UX (rules 15–16)** — `SkeletonLoader` wired into all data-fetching screens with empty states; optimistic updates limited to reversible actions, dangerous ops use disabled-button + "Processing…" until server confirmation (§14.4).
- **Booking state consistency (rule 17)** — single workflow layer (`utils/workflow.js`) + CAS-guarded transitions; a stale/duplicate request can never double-transition (§9.4).
- **Idempotent operations (rule 18)** — CAS transitions, `CancellationReason` natural-key guard, queue `dedupeKey`, invoice upsert; repeats are no-ops or typed errors, never duplicate writes (§9.4, §15.5).
- **Error UX (rule 19)** — centralized code → friendly copy in `frontend/src/utils/errorMessages.js` (§14.5): exact-code map + domain-prefix fallback + network detection, with optional recovery actions; no screen renders a bare "Something went wrong" or a raw stack trace.
- **Non-blocking emails (rule 20)** — confirmed: `sendMail` runs only inside queue workers (`jobHandlers.js`); booking-request/completed emails, analytics, invoice generation and performance bookkeeping are enqueued via `fireAndForget`/`enqueueJob` with `dedupeKey` (§15.5) — no controller awaits an email/side-effect send.
- **Realtime reconnect recovery (rule 23)** — per-user localStorage watermark (`reconnectWatermark.js`), `authenticate` re-emit + re-join on every (re)connect, `resyncAfterReconnect()` merging `GET /notifications?after=` and `GET /bookings?updatedAfter=` results, and a visible "Reconnecting…/Connection lost" banner (§14.6, §16.2). Backend `after`/`updatedAfter` params are opt-in and backward-compatible (§3.4, §3.8).

---

*End of report. Structure and endpoints are derived from the current source tree; treat this document as the source of truth for how the pieces connect.*

