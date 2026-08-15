# ServeGo Project Rules

These are permanent engineering rules for this project. They override ad-hoc
shortcuts. Audit new work against them before merging.

## 12. Improve database queries before adding infrastructure

Before introducing a new technology (Redis, queues, ORM layers, caching
servers) to fix slowness, find out WHY the existing query is slow.

For every important endpoint trace the full path:

```
API → Controller → Service → Prisma → PostgreSQL
```

and measure:

- API latency
- DB query time
- number of queries
- rows returned

Look for N+1 patterns first. Example anti-pattern — "Get 100 bookings":

```
100 bookings  →  100 provider queries  →  100 user queries  →  100 review queries
```

Replace with one optimized query or carefully batched queries
(`findMany` with `where: { id: { in: [...] } }`, `Promise.all` over independent
aggregations, `groupBy`/`aggregate` pushed into SQL, `select`-trimmed lists).

Rules of thumb:

- List endpoints must be paginated and must NOT load full child rows
  (`include: { reviews: true }`) when the serializer only needs scalars.
- Never run a DB query inside a loop that could be a single `in` query.
- Independent DB queries in the same code path go through `Promise.all`.
- Aggregations (counts, series, rates) belong in SQL (`groupBy`, `aggregate`,
  `$queryRaw`), not in JS after loading every row.
- Cursor (keyset) pagination for high-volume feeds; offset for admin tables.

## 13. Add indexes based on real queries

Don't add indexes everywhere. Start from the queries the app actually runs
(found in controllers/services), then index what is hot.

Covered tables: Booking, Lead, Provider, Notification, Subscription,
Review, ProviderService/ProviderServiceRequest, PermanentServiceRequest,
WalletTransaction/WalletWithdrawalRequest, Job.

Composite indexes must match the leading column of real filters:

- `providerId + status`      (Booking: already covered)
- `userId + createdAt`       (Notification, WalletTransaction, WalletWithdrawalRequest)
- `providerId + createdAt`   (Booking, SubscriptionTransaction)
- `status + createdAt`       (Booking, Lead, Review, WalletWithdrawalRequest, PermanentServiceRequest)
- `status + expiryTime`      (Lead expiry sweep)
- `type + status + availableAt` (Job claim poll)

Search already follows this principle with GIN/trigram indexes
(`search_trgm` migration). When adding a schema index, ship a migration SQL
file that matches the Prisma naming convention (`Table_col1_col2_idx`) and keep
`@@index` in `schema.prisma` in sync. Verify with `EXPLAIN` that the index is
actually used; delete indexes no query touches.

## 14. Make caching smarter

Caching is selective, never a blanket default. In-memory TTL caches with
invalidation are the established pattern (`adminConfigService` 30s,
`providerLevelService` 60s) — reuse it.

DO cache — read-heavy, rarely changing data:

- Services / categories catalog
- Subscription plans
- Level rules (already done: 60s)
- Admin config (already done: 30s)

DO NOT cache — data that needs freshness:

- Current booking status
- Lead acceptance
- Payment state
- Live location / tracking

Cache rules:

- Short TTLs (seconds, not minutes/hours) unless the data is near-immutable.
- Always provide an invalidation hook on write (`invalidateConfig`,
  `invalidateLevelCache`, etc.) so admin edits apply quickly.
- Cache the result of the DB query, never the request object.
- If a cache misses and repopulates on every request under write contention,
  prefer a per-key staleness check over raw TTL.

## 15. Improve loading UX instead of simply making everything faster

Users don't only perceive actual latency — they perceive whether the app
responded. Never leave a blank screen while a request is in flight.

Prefer:

```
Skeleton → partial content → remaining content
```

over:

```
blank screen → wait → content
```

The project already has skeleton loaders (`SkeletonLoader`) and optimistic
booking UI. Extend that consistently:

- Every data-fetching screen renders a skeleton (or cached/partial data) while
  loading, and an empty state once loading finishes with no data.
- Long-running flows show inline progress (spinners, disabled buttons with
  "Processing…"), not frozen screens.
- Lists that paginate keep the previous page visible while the next loads.

## 16. Optimistic UI should be used carefully

Optimistic updates are for harmless, reversible, low-risk actions — show the
result immediately, then reconcile when the API confirms.

OK to optimise (reversible, non-monetary):

- Save provider as favourite (`❤️ Saved` then API confirms)
- Toggle a non-critical profile flag

NEVER optimistic for dangerous or irreversible operations. These must wait for
server confirmation:

- Payment / subscription purchase
- Booking cancellation
- Booking completion / start-work
- Provider suspension / account status changes
- Withdrawal requests

Pattern for dangerous ops: disable the button + show "Processing…" while the
request is in flight, then update state from the server response; on failure
revert to the previous UI and surface the error.

## 17. Improve booking state consistency

The booking system spans Booking, Lead, Provider, Performance, Notification,
Invoice, Subscription, Payment — that is where production bugs live.

Maintain ONE authoritative state-transition layer:

```
PENDING → CONFIRMED → ONGOING → COMPLETED
                 ↘ CANCELLED
```

and explicitly control:

- who may transition (role check)
- from which state (the transition must fail when the current state is not the
  expected source state)
- to which state (only legal transitions)

Rules:

- Controllers must NEVER manipulate `booking.status` directly. All transitions
  go through the workflow layer (`utils/workflow.js`) and the service functions
  that enforce it (`leadService.acceptLeadForBooking`, `completeBooking`, ...).
- Every transition is guarded by the current DB state (compare-and-swap style
  `where: { id, status: <expected> }` or an interactive transaction that
  re-reads before writing), so a stale client can't double-transition.
- Booking events record who/what/why for auditability.

## 18. Make operations idempotent

Double clicks, retries and webhook replays must not duplicate side effects.

A user clicking "Complete Booking" twice must NOT produce:

- 2 invoices
- 2 performance records
- 2 lead consumptions
- 2 notifications

The queue already has `dedupeKey` support and invoices use idempotent upsert
behaviour. Extend that thinking to every critical business operation:

- State transitions are idempotent by construction (transition only succeeds
  from the expected current state; a second identical call is a no-op or a
  clear 409, never a duplicate write).
- Write-then-notify flows use the queue's `dedupeKey` so retries don't fan out
  duplicate notifications.
- Mutations that create a derived row (invoice, wallet ledger entry,
  performance record, subscription transaction) use a natural unique key or a
  `findFirst`-guard before create.
- Gateway/webhook handlers verify a transitioned state before applying an
  event twice.

## 19. Improve error UX

Never show a bare "Something went wrong". Errors must tell the user what
happened and what to do next:

```
Unable to accept this lead.
This lead was already accepted by another provider.
[Refresh leads]
```

The backend returns machine-readable codes; the frontend maps them to
friendly, actionable messages:

```json
{
  "code": "LEAD_ALREADY_ACCEPTED",
  "message": "This lead is no longer available."
}
```

Rules:

- Every endpoint returns a stable, documented `code` (see `LEAD_*`,
  `BOOKING_*`, `PAYMENT_*` families) with a human `message` — never a bare 500
  or a raw stack trace.
- Services throw typed errors (`serviceError(code, message)`); controllers map
  them to HTTP status + `{ code, message }` via `sendApiError`.
- The frontend keeps a code → copy map (per domain: leads, bookings, wallet,
  payment) and renders the friendly message plus a recovery action
  ("Refresh leads", "View booking") where one exists.
- Unhandled/generic failures still get a useful message ("Could not reach the
  server. Check your connection and try again."), never a raw error string.

## 20. Don't make the user wait for emails

Email, invoice generation, analytics and other side effects already live in
the durable queue. Keep it that way — never move them back onto the request
path.

- The HTTP response commits the core state change and returns immediately;
  the queue worker drains the side effects in the background.
- Never `await` an email send (or any slow side effect) in a controller or
  critical service path. If a side effect must influence the response, compute
  the response from committed DB state, not from the side effect's result.
- Use `fireAndForget`/`enqueueJob` with `dedupeKey` (rule 18) so background
  jobs are at-least-once but never duplicated.
- When adding a new notification/email/invoice path, add it to the queue — do
  not call the email/notification service synchronously from a controller.

## 23. Realtime connection recovery

Socket.IO is tied to authentication and user rooms. It is a fast path for
fresh events, NOT the source of truth — never assume the socket alone keeps UI
in sync.

Handle the full cycle:

```
Wi-Fi drops → socket disconnects → internet returns → socket reconnects
→ client synchronizes missed state
```

Rules:

- Surface connection state to the user (subtle "Reconnecting…" indicator);
  don't silently drop events or show stale data as fresh.
- On `connect` (or a manual reconnect refresh), resync missed state from the
  server — e.g. `GET /notifications?after=<lastSeenId>` and
  `GET /bookings?updatedAfter=<timestamp>` — and merge, replacing any
  placeholder/stale rows. Socket events applied while offline must not be lost
  silently.
- Persist a `lastSeen` watermark (per user) for at-least-once resync; use
  ids/timestamps from the server, never local clocks alone.
- While disconnected, mark realtime-dependent UI as stale (e.g. a banner) and
  keep full refetch as the recovery path.
