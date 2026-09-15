# Database Production-Readiness Guide

Audit of the ServeGo24 PostgreSQL schema (via `backend/prisma/schema.prisma`)
against actual application usage — backend controllers/services + frontend.
Every table and column was cross-referenced with code. This document records
what was removed, why others were kept, and how to ship schema changes safely.

Audit date: 2026-09-14. Each statement below is a hard rule for future review.

---

## 1) What was removed (dead columns — no readers anywhere)

All six columns shipped in one migration:
`backend/prisma/migrations/20260914000000_cleanup_dead_columns/migration.sql`.

| Table.Column | Why it was dead |
|---|---|
| `User.verificationCode` | Random 4-digit value minted at signup and returned exactly once (`userController.js`). No endpoint ever reads or verifies it; the only client reference sends it as a request-body field the backend ignores. |
| `Customer.preferences` | Always written as `[]` at signup, never read by backend or frontend. |
| `Provider.serviceInterested` | Written only by the seed script. Service approval is tracked by `ProviderServiceRequest` → `ProviderService`; the frontend `serviceInterestedOption` state in `ProviderServicesPanel.jsx` is a local form variable, not this column. |
| `Provider.availableDays` | JSON list written but never rendered. The functional equivalent is the normalized `AvailabilitySlot` table, which the availability endpoint (`providerController.updateAvailability`) actually persists and the serializer emits. |
| `Provider.timeSlots` | Same as above. |
| `Review.date` | Exact duplicate of `createdAt` — both default to `now()` and `date` was never written with a distinct value. The review serializer now exposes `createdAt`; `ProviderReviews.jsx` reads `rev.createdAt`. |

Code changes that shipped alongside: `schema.prisma`, `userController.js`,
`providerController.js`, `middleware/validation.js`, `prisma/seed.js`,
`utils/serializers.js`, `tests/serializers.test.js`, `frontend/.../ProviderReviews.jsx`,
`frontend/.../DataContext.jsx`, `bookingController.js` (comment).

## 2) What was inspected and KEPT (with the reason)

| Table.Column | Why kept |
|---|---|
| `Provider.category` | Read by the customer card grid (`ServiceCard.jsx`), admin provider table + reports, provider header, and admin search (`adminDashboardController.getPaginatedProviders`). It is NOT the discovery source (that is `providerServices`), but it has live readers, so it stays. |
| `Provider.rating` / `reviewCount` / `jobsCompleted` | Denormalized aggregates actively consumed by badges, level promotion and verification (`providerReputationService.js`). Fine — they are caches kept in sync on write, not recomputed at read time. |
| `Provider.isVerified` / `verificationLevel` / `isFeatured` | `isVerified` gates lead eligibility, discovery and manual assignment (`permanentServiceRequestController`); `verificationLevel` drives badges; `isFeatured` renders in admin panels and analytics counts. |
| User `referralCode` / `referredBy` / `referralsCount` / `referralBonusEarned` / `referralDiscountBalance` | Live referral system (`referralsController.js`, serializers, provider profile). |
| `User.address` / `pincode` / `latitude` / `longitude` | Written at signup; used as fallbacks by profile view, admin customer panel and `userController.updateProfile`. Technically redundant with `Customer.address/pincode` + `CustomerAddress(HOME)` — see §3. |
| `Wallet.currency` ("INR") | Serialized to the client (`walletService.js`); single-currency today, kept as the explicit model of intent. |
| Booking tracking set (`providerLatitude`, `providerLongitude`, `providerLocationUpdatedAt`, `providerPhase`, `arrivedSource`, `startLocation`, `endLocation`) | Consumed end-to-end by `trackingService.js`, `providerRouteService.js` and the tracking tests. |
| `Lead.viewedAt` / `acceptedAt` / `completedAt` / `rejectedAt` | Audit timestamps rendered in the admin lead export; harmless alongside `status`. |
| Every table (Alert, AuthEvent, AuditLog, BookingInvoice, PlatformDailyStat, BusinessSequenceCounter, AvailabilitySlot, ProviderBadge, RankingMetrics, PromotionHistory, ...) | All have live readers/writers in services, queue handlers or admin UI — no orphan tables found. |

## 3) Redundancies deliberately left (flagged, not removed)

- **Address stored three times**: `User(address,pincode,lat,lng)`, `Customer(address,pincode)`,
  `CustomerAddress(HOME | OFFICE | OTHER)`. All three have code readers, so removal is a
  refactor, not a drop. If consolidated later, make `Customer` the canonical profile
  address and delete the `User` geo columns — do it only with the fallback expressions
  (`customerProfile?.address || user.address` in `ProfileView.jsx`,
  `AdminCustomersPanel.jsx`) removed at the same time.
- **`Review.rating` is `Float`** for a 1–5 star scale. Safe as-is; tightening to `Int`
  would require a data migration and touches every aggregate — not worth it unless a
  fractional-rating feature is added.

## 4) Deploying schema changes in production (2-phase, zero-downtime)

`DROP COLUMN` is destructive and irreversible. Never deploy schema changes at the same
time as code that still reads them.

1. **Phase 1 — code first.** Deploy the application change that stops READING and
   WRITING the removed columns (this change set already does: nothing in the repo
   references the columns anymore). Verify:
   - Backend tests pass (`npm test` in `backend/`).
   - Frontend builds (`npm run build` in `frontend/`).
   - Watch error logs for any Prisma `Unknown argument` / `column does not exist`
     errors for a day of traffic.
2. **Phase 2 — migrate.** With the new code fully live and confirmed stable:
   ```
   npx prisma migrate deploy       # applies 20260914000000_cleanup_dead_columns
   ```
   (In this repo migrations are written SQL in `backend/prisma/migrations/` —
   `migrate deploy` replays them in order against `DATABASE_URL`.)
3. **Verify AFTER the drop** on prod:
   - `EXPLAIN` on two or three hot queries still hits the intended index (rules 13).
   - No new `column does not exist` errors in 24h of logs.

### Rollback plan
`DROP COLUMN` cannot be reversed without restoring from backup. Therefore:
- Take a `pg_dump` / platform snapshot BEFORE running `migrate deploy`.
- If anything regresses post-drop, the recovery path is: restore the affected tables
  from the backup, and re-deploy the previous application version — NOT a schema patch
  that tries to re-add columns. These columns are all `null`/`[]`-style defaults with no
  business value, so the backup restore is cheap and safe.

## 5) Rules for future reviewers (map to AGENTS.md)

- **Rule 12** — before adding a cache/queue/ORM for a slow endpoint, `EXPLAIN` the query
  and eliminate N+1 first.
- **Rule 13** — new schema columns must ship an index only when a real query needs it,
  with `@@index` + migration SQL kept in sync.
- **New-column policy** — a column is only added when a concrete endpoint or job will
  write AND read it within the same change set. Any column that is written-then-never
  read is a bug (this is exactly what the six dropped columns were).
- **Enum/policy changes** — prefer additive enum values (`ProviderLevel`, `LeadStatus`,
  `WalletTransactionCategory`) over renaming; they are stored as PostgreSQL enum types
  and renames require a migration with a `USING` clause.
- Every migration here starts from `PRISMA naming` (`Table_col1_col2_idx`) and is a
  plain SQL file that `prisma migrate deploy` replays idempotently — keep new ones in
  that same shape.

## 6) Current schema inventory

- **Models:** 37 (`User`, `Customer`, `CustomerAddress`, `Notification`, `Alert`,
  `Ticket`, `AuthEvent`, `Provider`, `ProviderBadge`, `Service`, `ProviderService`,
  `ProviderServiceRequest`, `Booking`, `Quotation`, `BookingLocationUpdate`,
  `BookingEvent`, `Review`, `AvailabilitySlot`, `AuditLog`, `ProviderLevelRule`, `Lead`,
  `LeadAssignmentHistory`, `LeadTransferHistory`, `PromotionHistory`,
  `ProviderLevelHistory`, `PermanentServiceRequest`, `ProviderPerformance`,
  `RankingMetrics`, `CancellationReason`, `Wallet`, `WalletTransaction`,
  `WalletWithdrawalRequest`, `AdminConfig`, `Job`, `PlatformDailyStat`,
  `BookingInvoice`, `BusinessSequenceCounter`).
- **Enums:** 22. **Migrations:** 56.
- All hot-path index guidance from AGENTS.md rule 13 is reflected: keyset pagination
  indexes, `status + expiryTime` lead sweep, `type + status + availableAt` job claim,
  `userId/status + createdAt`, GIN/trigram search.