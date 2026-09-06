# ServeGo Platform — Architecture Report

> Scope: functional architecture of the current repository, traced to the implemented
> backend routes, controllers, services, utilities and Prisma models. This report is
> generated from the source in the workspace and reflects reality, not intent.

## Table of contents

1. [High-level architecture](#1-high-level-architecture)
2. [Repository layout](#2-repository-layout)
3. [Backend stack & request lifecycle](#3-backend-stack--request-lifecycle)
4. [API surface (127 routes)](#4-api-surface-127-routes)
5. [Security, validation & middleware](#5-security-validation--middleware)
6. [Auth & token model](#6-auth--token-model)
7. [Data layer (Prisma)](#7-data-layer-prisma)
8. [Error conventions](#8-error-conventions)
9. [Booking lifecycle & state machine](#9-booking-lifecycle--state-machine)
10. [Lead generation & matching engine](#10-lead-generation--matching-engine)
11. [Wallet, billing & withdrawals](#11-wallet-billing--withdrawals)
12. [Async side-effect queue](#12-async-side-effect-queue)
13. [Realtime (Socket.IO)](#13-realtime-socketio)
14. [Search & caching](#14-search--caching)
15. [ServeGo business model](#15-servego-business-model)
16. [Provider lifecycle](#16-provider-lifecycle)
17. [Frontend architecture](#17-frontend-architecture)
18. [Config, feature flags & runtime](#18-config-feature-flags--runtime)
19. [Scripts, tests & operations](#19-scripts-tests--operations)
20. [Engineering rules conformance](#20-engineering-rules-conformance)
21. [Project metrics](#21-project-metrics)
22. [Known gaps & next steps](#22-known-gaps--next-steps)

---

## 1) High-level architecture

ServeGo is a two-role marketplace ("book a local expert") with an admin back office and
a ServeGo "lead marketplace" monetization layer. It is a single deployed backend
(Express + Socket.IO + PostgreSQL/Prisma) with a separate React 19 + Vite frontend.

- **Customers** browse a service catalog, book the first eligible specialist (no
  provider is hand-picked at booking time) or send permanent/contract requests.
- **Providers** sign up self-serve (role `provider`), get admin-verified, register
  services, receive leads whose visible data is gated until purchase/acceptance.
- **Admins** manage providers, service categories, the lead marketplace, wallet
  payouts, business config and the async job queue.

The backend is a single Node process hosting both the REST API and the Socket.IO
realtime layer. Background side effects run in-process on a Postgres-backed durable
queue; lead expiry and auto-cancel use timers/cron.

## 2) Repository layout

```
servego-platform/
├── package.json               # root orchestration (dev: all, build: frontend)
├── package-lock.json
├── AGENTS.md                  # permanent engineering rules (authored separately)
├── API_LIST_GET_POST_GROUPED.md  # generated API reference (127 routes)
├── PROJ_ARCHITECTURE_REPORT.md   # this document
├── backend/
│   ├── server.js              # bootstrap: express, socket.io, queue, timers
│   ├── routes/api.js          # all 127 REST routes
│   ├── controllers/           # 24 controllers (HTTP layer)
│   ├── middleware/            # 5 middleware modules
│   ├── services/              # 21 service modules (incl. queue/)
│   ├── utils/                 # 10 shared utilities
│   ├── prisma/
│   │   ├── schema.prisma      # 34 models + 21 enums
│   │   ├── migrations/        # 44 migrations
│   │   └── seed.js            # dev seed
│   ├── seeders/               # servicesSeed + businessModelSeed (idempotent)
│   ├── scripts/               # photo migration script
│   └── tests/                 # node --test suites
└── frontend/
    ├── src/
    │   ├── main.jsx, App.jsx  # router + role-based layout
    │   ├── context/           # Auth, Data, Realtime, UI, Toast, App
    │   ├── pages/             # 13 page components
    │   ├── components/        # shared + admin + provider components
    │   └── utils/             # apiClient, serializers, watermarks, etc.
    └── package.json           # Vite 6 + React 19 + Tailwind 4
```

## 3) Backend stack & request lifecycle

Stack: Node ESM, Express 4, Socket.IO 4, Prisma 5 + PostgreSQL, jsonwebtoken,
bcryptjs, express-validator, helmet, hpp, express-rate-limit, multer, cloudinary,
nodemailer. Prisma is the query layer; no ORM is layered on top of it.

Request lifecycle (`server.js`):

```
helmet → hpp → cors (getCorsConfig) → general rate limiter
→ express.json/urlencoded (1mb) → requestLogger → requestTimeout(60s)
→ trailing-slash 301 normalization
→ GET /api/health (DB liveness; 503 when DB unreachable)
→ GET /api/versions (uncached version registry)
→ /api/v1/* via maintenanceMode + apiRouter (127 routes)
→ 404 JSON { success:false, code:'NOT_FOUND', ... }
→ global errorHandler (last)
```

Boot (`bootstrap`): creates HTTP + Socket.IO servers, seeds the service catalog and
business model if empty, starts the auto-cancel cron, schedules lead-expiry timers,
recovers interruped queue jobs, then starts the queue workers. Graceful shutdown
drains the queue and disconnects Prisma.

## 4) API surface (127 routes)

100 % of routes live in `backend/routes/api.js` and are exposed under `/api/v1`. The
grouped reference (methods, paths, access roles, validation) is generated from that
file into `API_LIST_GET_POST_GROUPED.md`. Domain summary:

| Domain | Key routes |
|--------|-----------|
| Auth & users | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`, `PATCH /users/:id/profile`, `GET /users` (admin) |
| Providers | `GET /providers`, `GET /providers/:id`, `GET /providers/me/summary`, `PUT/PATCH /providers/me/availability`, `PATCH /providers/me/location`, `PATCH /providers/me/availability-status`, `GET /providers/me/route-plan`, `POST /provider-services` (own), `POST /providers/:id/services/register` |
| Bookings | `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/{accept,decline,cancel,complete,status}`, `POST /bookings/:id/{on-the-way,arrived}`, `PATCH /bookings/:id/location`, messages, tracking, timeline |
| Quotations | `POST /bookings/:id/quotation`, `GET/POST .../confirm`, `POST .../cancel` |
| Notifications | `GET/POST /notifications`, `PATCH .../read`, `PATCH /read-all`, `DELETE /notifications` |
| Tickets | `GET/POST /tickets`, `POST /support-tickets` (optional auth), admin resolve/status |
| Reviews | `POST /reviews`, `GET /providers/:id/reviews`, admin list/delete |
| Referrals | `POST /referrals/apply`, `GET /referrals/me`, `POST /referrals/generate` |
| Services | `GET /services` (catalog + active counts), `GET /services/search`, `GET /categories/:slug`, admin CRUD |
| Leads | `GET /leads`, `GET /leads/:id`, `PATCH /leads/:id/{view,accept,reject}` |
| Permanent requests | `POST /permanent-service-requests`, `GET .../mine`, admin list/update, `POST .../cancel` |
| Wallet | `GET /wallet`, `GET /wallet/ledger`, `POST /wallet/withdrawals`, `GET /wallet/withdrawals`, `GET /wallet/withdrawal/config`, admin wallet/withdrawals/credit/process |
| Provider business | `GET /level-rules`, `GET /provider-performance/me`, `GET /promotions/me`, `POST /promotions/:id/acknowledge`, `GET /provider-level-history/me` |
| Admin | dashboard, analytics, audit-logs, configs, level-rules, providers/status, provider-service-requests approve/deny, service items, reputation refresh, queue stats/requeue, feature flags, leads, wallet |
| Misc | `POST /images/upload` (optional auth, multer → Cloudinary) |

## 5) Security, validation & middleware

- `middleware/security.js` — helmet config, HPP, general + per-domain rate limiters
  (`authRateLimiter`, `bookingRateLimiter`, `reviewRateLimiter`, `supportTicketRateLimiter`).
- `middleware/logging.js` — request logger, global error handler, 60s request timeout (504).
- `middleware/maintenance.js` — whole-surface 503 toggle, except admin/login/public feature flags.
- `middleware/upload.js` — multer image upload (size/type checks).
- `middleware/validation.js` — express-validator rule bundles per endpoint
  (`registerValidation`, `loginValidation`, `createBookingValidation`, etc.) plus the
  `validate()` runner. Every controller enforcing business rules again (defence in depth).
- `utils/auth.js` — `requireAuth`, `requireRole`, `optionalAuth` middleware.
- `utils/permissions.js` — higher-level ownership checks (booking/scoped access).

Validation is explicit per route; `body(...).optional()` keeps customer-specific fields
(address, pincode) out of the provider signup path.

## 6) Auth & token model

- Passwords: bcrypt (cost 12). Access token: 15 min JWT (`JWT_SECRET`), refresh: 7 d
  (`JWT_REFRESH_SECRET`), refresh tokens are opaque JWT (no server-side session store).
- `register` accepts `role` customer or provider:
  - **Customer:** requires address + pincode, creates `Customer` profile + wallet-less
    user, issues a 4-digit email `verificationCode`.
  - **Provider:** creates `Provider` (sector `GENERAL`, `isOnline`, `acceptingBookings`,
    `maxRadiusKm: 50`, `profileComplete: false`, `isVerified: false`, `accountStatus: ACTIVE`),
    links `user.providerId`, creates a `Wallet`, writes `ProviderLevelHistory` (BRONZE/INITIAL)
    and auto-creates a PENDING `ProviderServiceRequest` for the chosen category so the
    admin approval flow starts immediately. Providers are never lead-eligible until an
    admin approves a service and the profile is verified/complete.
- `login` tracks failed attempts per IP (lockout after 5), records `AuthEvent`, and
  returns the same `user` shape as register. `GET /auth/me` rehydrates the session
  (customer profile / provider summary) after refresh.
- Frontend keeps tokens in localStorage via `utils/apiClient.js` (`setTokens`,
  `clearTokens`, `initializeTokens`, automatic 401 refresh retry) and restores session
  through `/auth/me`.

## 7) Data layer (Prisma)

34 models, 21 enums, 44 migrations, all indexes defined as `@@index` in
`schema.prisma` and mirrored by migration SQL (naming `Table_col1_col2_idx`).

Key models:

- `User` (role, verification, referral fields, avatar) → `Customer` / `Provider` (1:1).
- `Provider` — `category`, `sector` (`ProviderSector`, default `GENERAL`), `isOnline`,
  `acceptingBookings`, `maxRadiusKm`, `profileComplete`, `isVerified`, `accountStatus`,
  `serviceAreas`, `specialties`, `availableDays`, `timeSlots`, `rating`, `reviewCount`,
  `serviceFee`, `latitude`/`longitude` (matching/bounding-box source).
- `Service` (name, `nameNormalized`, `isHidden`, GIN/trigram search fields) →
  `ProviderService` (approved link, per-provider description) and `ProviderServiceRequest`
  (approval workflow).
- `Booking` (status machine in §9), `Quotation`, `BookingEvent`, `BookingLocationUpdate`,
  `Review`, `Ticket`, `Notification`, `AuthEvent`, `AuditLog`.
- `Lead`, `LeadAssignmentHistory`, `LeadTransferHistory`, `LeadStatus` (+`distanceKm`).
- `ProviderPerformance`, `RankingMetrics`, `ProviderLevelRule`, `ProviderLevelHistory`,
  `PromotionHistory`, `CancellationReason`.
- `Wallet`, `WalletTransaction`, `WalletWithdrawalRequest` (payout loop).
- `PermanentServiceRequest` (permanent/contract requests), `AvailabilitySlot`.
- `Job` + `JobStatus` (durable queue), `PlatformDailyStat`, `BookingInvoice`.
- `AdminConfig` (business config keys), `ProviderBadge`, `BadgeType`.

Index strategy (rule 13): composite indexes match leading columns of queries the app
actually runs — `Provider(accountStatus,isVerified)`, `ProviderService(serviceId,status)`,
`Booking(status,createdAt)`, `Booking(providerId,createdAt)`, `Lead(status,createdAt)`,
`Lead(status,expiryTime)`, `Job(type,status,availableAt)`, `Notification(userId,createdAt)`,
`WalletWithdrawalRequest(userId,createdAt)` / `(status,createdAt)`,
`PermanentServiceRequest(status,createdAt)`, `Review(createdAt)`. Migration
`perf_indexes_v2` was derived from real controller/service queries and verified with
`EXPLAIN`.

## 8) Error conventions

Every response is `{ success, code, message, details? }` via `utils/response.js`
(`sendApiError` / `sendApiSuccess`). Codes are stable and domain-prefixed
(`LEAD_*`, `BOOKING_*`, `PAYMENT_*`, `WALLET_*`, `VALIDATION_ERROR`, `UNAUTHORIZED`,
`FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`). Server errors never
leak ORM details (500 responses strip `details`). The frontend maps `code` → friendly,
actionable copy per domain (`utils/errorMessages.js`) and offers recovery actions.

## 9) Booking lifecycle & state machine

Authoritative transitions (`utils/workflow.js`), enforced by controllers and the
service layer (`leadService.acceptLeadForBooking`, `completeBooking`, etc., compare
-and-swap on current DB state):

```
PENDING → CONFIRMED → ONGOING → COMPLETED
              ↘ CANCELLED
```

- Controllers never write `booking.status` directly; transitions run through
  `BookingController.transition(nextStatus)` which normalizes aliases and validates the
  legal transition, or through the guarded service functions.
- Idempotency (rule 18): a transition only succeeds from the expected current state; a
  second identical call is a no-op/409, never a duplicate write. Derived rows
  (invoice, performance, notification) are queue-side with `dedupeKey` or unique-key
  upserts.
- `BookingEvent` records who/what/why for auditability. Messages, quotations, live
  tracking and `BookingLocationUpdate` are attached to the booking. Auto-cancel cron
  (`autoCancelService`) closes stale PENDING bookings. `BookingInvoice` is generated
  through the queue with `INV-BKG-YYYYMMDD-######`.
- Accepted-quotation billing uses `debitWalletAllowNegative` (tab-style); completion
  emits analytics + invoice via the queue.

## 10) Lead generation & matching engine

The ServeGo model: **one customer request = one lead = one assigned provider.** Center
of logic is `services/leadService.js` which is also used for the booking-created leads.

Eligibility (`findEligibleProviders`) — all three must hold:

1. **Registered/approved service:** the provider has a `ProviderService` link whose
   `serviceId` matches the service, or whose `service.name` equals the requested
   `serviceCategory` (case-insensitive). The historical `provider.category`-fallback
   match was removed — a provider without an approved link for the requested service
   is not eligible, even if their free-text `category` matches.
2. **Distance:** customer coordinates are required; providers without `latitude`/
   `longitude`, or outside their `maxRadiusKm` (default 50 km) of the customer, are
   excluded. A bounding-box pre-filter on the provider table shrinks the haversine set.
3. **Wallet ≥ 0:** provider wallet must be null (new provider) or `balance >= 0` —
   providers in wallet debt never receive leads.

Also excluded: not `isVerified`, `profileComplete: false`, `acceptingBookings: false`,
`isOnline: false`, `accountStatus !== ACTIVE`, user not ACTIVE, provider in performance
cooldown. Ranking prefers provider level, then rating, then distance, then `createdAt`
determinism (no PREMIUM/GENERAL sector tie-break — all providers are GENERAL).

`diagnoseProvider` explains WHY a provider isn't eligible for a customer
(`NO_SERVICE_MATCH`, `OUT_OF_RADIUS`/`NO_COORDS`, `WALLET_BELOW_ZERO`,
`NOT_VERIFIED`, `OFFLINE`, `NOT_ACCEPTING`, `COOLDOWN`...).

Lead lifecycle: `NEW → VIEWED → ACCEPTED/REJECTED`, transfers (`transferCount`) re-match
the next eligible provider; `LeadAssignmentHistory`/`LeadTransferHistory` record each
hop. `distanceKm` is persisted on the lead at creation and each transfer so the inbox
can sort by proximity. Expiry timers (`leadExpiryService`) re-dispatch on timeout. Lead
providers only see customer contact data once accepted.

## 11) Wallet, billing & withdrawals

`services/walletService.js`: every mutation runs in a serializable transaction with
retry on serialization failure (retries bump the balance exactly once). `creditWallet` /
`debitWallet` enforce non-negative balance; `debitWalletAllowNegative` bills without a
check (tab-style debts, e.g. declined-quotation fee or accepted quotation at completion).
Every mutation writes a `WalletTransaction` row with `balanceAfter` — the ledger is
append-only and the balance is derived state.

- Earnings: `BOOKING_EARNING` credits on completion; service fees debit at lead start.
- Withdrawals: `withdrawal/config` exposes thresholds (minimum/maximum, admin-configurable);
  `requestWithdrawal` creates a `WalletWithdrawalRequest` (PENDING); admin
  `processWithdrawal` transitions with idempotent guards and only releases funds after
  the payout is final.
- Admin can credit wallets (`/admin/wallet/credit`) with reference + category.

## 12) Async side-effect queue

Postgres-backed durable queue (`services/queue/*`): `Job` rows, poll-based workers
(1.5 s), attempts/backoff, priority, `dedupeKey`, dead-lettering for admin
review/requeue. Handlers (`jobHandlers.js`):

- `notification` — persists the socket-emitted notification row (idempotent).
- `email` — the ONLY place `sendEmail` runs (rule 20).
- `analytics` — `PlatformDailyStat` day counter.
- `invoice` — idempotent `BookingInvoice` upsert (`INV-BKG-YYYYMMDD-######`).
- `performance` — job started / late arrival / lead ignored–expired / completed.

Controllers enqueue via `fireAndForget`/`enqueueJob` with `dedupeKey`, never awaiting
email or invoice generation. Workers start on boot after `recoverInterruptedJobs`;
graceful shutdown drains first.

## 13) Realtime (Socket.IO)

Socket.IO sits beside the REST API (same `httpServer`). Middleware verifies the
connection token (`socket.userId`, `socket.userRole`); anonymous sockets stay connected.
Events: `join`/`leave` user rooms, `authenticate`, `location:update` (live tracking),
`provider:onTheWay`, `provider:arrived` — all ack-answered so the client can fall back
to REST. The socket is a fast path, not the source of truth (rule 23): the frontend
keeps `lastSeen` watermarks (ids/timestamps from the server), shows a "Reconnecting…"
indicator, and on reconnect refetches `GET /notifications?after=...` and
`GET /bookings?updatedAfter=...` and merges/replaces stale rows.

## 14) Search & caching

- Search: `services/searchService.js` over a GIN/trigram index (`search_trgm`
  migration); service category + location filtering pushed into SQL; results ranked,
  not arbitrary.
- Caching is selective (rule 14): short-TTL in-memory caches only — services catalog
  30 s (`serviceController`), admin config 30 s (`adminConfigService`), provider level
  rules 60 s (`providerLevelService`) — each with an invalidation hook on write.
  Booking status, lead acceptance, payment state and live location are never cached.

## 15) ServeGo business model

Admin-configurable marketplace (`AdminConfig`, `ProviderLevelRule`):

- Level rules drive provider thresholds/completed-job counts; `providerLevelService`
  recomputes levels; `PromotionHistory` records level-based promotions; analytics
  surfaces cancellation (byActor/byReason) and promotion stats.
- Lead pricing/fees and withdrawal limits are config keys, not code.
- The business-model seed (`seeders/businessModelSeed.js`) creates config + level-row
  defaults if absent. There is no subscription or premium-SECTOR plan anymore — every
  provider is `GENERAL` and all approved services are treated equally.

## 16) Provider lifecycle

```
signup (self-serve) → PENDING service request → admin approve/deny
→ profileComplete + isVerified → eligible for leads/matching
→ accept/quit bookings → reputation (rating, performance, cooldowns, badges)
```

- Admin verification (`PATCH /providers/:id/verify`) + `AdminProviderStatusController`
  for account status; `adminProviderServiceController` approves/denies
  `ProviderServiceRequest` rows and writes the `ProviderService` link.
- Provider dispatches its dashboard via `GET /providers/me/summary`; location/range
  updates via `PATCH /providers/me/location`; availability incl. `AvailabilitySlot`.
- Reputation refresh (`POST /admin/providers/reputation/refresh`) recomputes ranking
  metrics (`RankingMetrics`).

## 17) Frontend architecture

React 19 + Vite 6 + Tailwind 4, `Capacitor`-aware (Android wrapper dep), lucide icons,
React Router 7, socket.io-client, MapLibre GL (OSM tiles, keyless) for maps.

- `App.jsx` — router + role-based shell; `RESTRICTED_ROUTES` = dashboard-customer,
  dashboard-provider, admin; role-aware landing (`getDefaultDashboardForRole`) and
  lazy-loaded admin tabs.
- Contexts (`context/AppContext.jsx` re-exports): `AuthContext` (session, tokens,
  `registerUser`/`loginUser` → `/auth/*`), `DataContext` (services, providers, bookings,
  leads, wallet, admin data; optimistic-but-reconciled mutations for safe ops only),
  `RealtimeContext` (socket lifecycle + watermarked resync per rule 23), `UIContext`,
  `ToastContext`.
- Pages: Home, Services, ServiceDetails (booking flow), CustomerDashboard,
  ProviderDashboard, AdminPanel, Signup (role toggle customer/provider with service
  category + LocationPicker), Login, Forgot/ResetPassword, About, Contact, FAQ.
- `utils/apiClient.js` — base URL, token storage, 401 refresh retry; `errorMessages.js`
  maps backend codes → friendly copy; `reconnectWatermark.js` (reconnect resync);
  `normalizeAdminData.js`/`normalizeCustomerData.js`/`requestCache.js`/`exportExcel.js`.
- Loading UX (rule 15): `SkeletonLoader`, skeleton/empty states per screen, inline
  "Processing…" for long-running flows; optimistic UI only for trivial reversible
  toggles (favourites) — payments, cancellations and withdrawals wait for the server.

## 18) Config, feature flags & runtime

- `utils/runtimeConfig.js` — port, CORS origins (dev allows localhost, env override),
  env-driven.
- `services/featureFlagsService.js` — runtime toggles + announcement banner, exposed
  publicly (`/feature-flags/public`) and editable by admin.
- `AdminConfig` keys — business config (withdrawal limits, lead fees, radius default,
  timers). Read caches are invalidated on write.
- `.env` variables used: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`, `PORT`, `NODE_ENV`, `FRONTEND_URL`/CORS list,
  `EMAIL_*` (nodemailer), `CLOUDINARY_*`, `GOOGLE_MAPS_API_KEY` (optional, haversine
  fallback), `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (payouts/credits where wired),
  `GEMINI_API_KEY` (`@google/genai` dependency, optional).

## 19) Scripts, tests & operations

Backend (`backend/package.json`): `npm start` (node), `npm run dev` (nodemon),
`npm test` (`node --test --test-concurrency=1`); standalone worker
`npm run worker`; `prisma:migrate`, `prisma:generate`, `prisma:seed`,
`migrate:photos`.

Root `package.json`: `npm run dev` (concurrently backend+frontend), `npm run build`
(frontend), `install:all`.

Tests live in `backend/tests/*.test.js` (auth, availability, feature flags, integration,
maps, pagination, queue, response, runtime config, search, serializers, socket-auth,
tracking, workflow). Integration tests spin the Express app and hit Postgres via the
normal middleware path.

Health check: `GET /api/health` returns 200 + DB probe or 503 `SERVICE_UNAVAILABLE`.
Graceful shutdown drains queue workers and disconnects Prisma on SIGTERM/SIGINT.

## 20) Engineering rules conformance

The permanent rules in `AGENTS.md` (12–23) are reflected in code:

- **12 (queries):** list endpoints paginated (`offsetMeta`/cursor); `select`-trimmed
  lists; no child-row `include` where scalars suffice; aggregations via `groupBy`/
  `aggregate`; `Promise.all` for independent queries; lead matching pushes counts and
  bounding boxes into SQL.
- **13 (indexes):** all composite indexes trace back to real queries (`perf_indexes_v2`)
  and match Prisma conventions.
- **14 (caching):** selective TTL caches (catalog 30 s, config 30 s, levels 60 s) with
  invalidation hooks; freshness-critical data never cached.
- **15 (loading UX):** skeleton → partial → remaining; inline progress + empty states.
- **16 (optimistic UI):** only trivial, reversible toggles; dangerous ops wait for the server.
- **17 (state consistency):** single workflow layer (`utils/workflow.js`) + guarded
  CAS transitions; never direct `booking.status` writes from controllers.
- **18 (idempotency):** CAS transitions, `dedupeKey` jobs, natural-key/upsert guards on
  derived rows, webhook-style handlers re-check state.
- **19 (error UX):** stable codes + human messages + recovery actions, frontend
  `code → copy` maps; 500s never leak internals.
- **20 (async side effects):** email/invoice/analytics/performance enqueued only.
- **23 (realtime recovery):** socket is fast-path; watermarked resync + stale
  indicators on reconnect.

## 21) Project metrics

- 24 controllers, 21 service modules (incl. queue), 10 utils, 5 middleware modules.
- 34 Prisma models, 21 enums, 44 migrations.
- 127 REST routes, all under `/api/v1`, documented in `API_LIST_GET_POST_GROUPED.md`.

## 22) Known gaps & next steps

- Refresh tokens have no server-side revocation list (opaque JWT) — revoking on logout
  is client-only.
- Location-based discovery/showroom still keys off provider `latitude`/`longitude`
  entered at signup/profile; no Google Maps fallback UI if the Maps key is absent
  (haversine + OSM tiles cover it).
- Queue workers are in-process; for horizontal scale they can be split via
  `npm run worker` + separate DB-backed claim.
- Withdrawal payments are admin-processed (no automated Razorpay payout wiring beyond
  the requests ledger).
- `@google/genai`, `razorpay` and capacitor deps are present but only partially used —
  verify before enabling features that depend on them.