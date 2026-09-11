# HTTP API Reference (Grouped)

Source: `backend/routes/api.js` — **135 routes**, all under `/api/v1`.

Access legend: `auth` = any logged-in user, `customer` / `provider` / `admin` = role, `provider|admin` = either, `optional` = works logged-in or anonymously, `public` = no token required.

`v(...)` marks the express-validator rule bundle applied via `validate()`.

Route-order gotcha in `api.js`: `/providers/me/summary` and `/providers/by-approved-service` are declared **before** `/providers/:id` so Express does not match `me`/`by-approved-service` as an id.

## Authentication & Users

| Method | Endpoint | Access |
|------|----------|--------|
| POST | /auth/register<br> v(registerValidation) | public |
| POST | /auth/login<br> v(loginValidation) | public |
| POST | /auth/forgot-password<br> v(forgotPasswordValidation) | public |
| POST | /auth/reset-password<br> v(resetPasswordValidation) | public |
| POST | /auth/refresh | public |
| GET | /auth/me | auth |
| GET | /users | admin |
| PATCH | /users/:id/profile<br> v(updateUserProfileValidation) | auth |

Rate-limited: `login`, `forgot-password`, `reset-password` (auth limiter).

## Service Providers (Partners)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /providers | optional |
| GET | /providers/by-approved-service | public |
| GET | /providers/me/summary | provider |
| GET | /providers/:id | optional |
| GET | /providers/:id/services | optional |
| PUT | /providers/me/availability<br> v(updateAvailabilityValidation) | provider |
| PATCH | /providers/me/location | provider |
| PATCH | /providers/me/availability-status | provider |
| GET | /providers/me/route-plan | provider |
| POST | /providers/:id/services/register<br> v(registerProviderServiceValidation) | auth |
| PATCH | /providers/:id/profile<br> v(updateProviderProfileValidation) | auth |
| PATCH | /providers/:id/availability<br> v(updateAvailabilityValidation) | auth |
| PUT | /providers/:id/availability<br> v(updateAvailabilityValidation) | auth |
| PATCH | /providers/:id/verify | admin |
| POST | /provider-services<br> v(registerProviderServiceValidation) | provider |
| GET | /provider-services/mine | provider |
| GET | /provider-services | admin |

## Bookings

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /bookings | auth |
| GET | /bookings/:id | auth |
| GET | /bookings/:id/timeline | admin |
| GET | /bookings/:id/tracking | auth |
| GET | /bookings/:id/track-history | auth |
| POST | /bookings<br> v(createBookingValidation) | auth |
| PATCH | /bookings/:id/status | auth |
| PATCH | /bookings/:id/accept | provider |
| PATCH | /bookings/:id/decline | provider |
| PATCH | /bookings/:id/cancel | auth |
| PATCH | /bookings/:id/complete | provider |
| PATCH | /bookings/:id/location<br> v(updateBookingLocationValidation) | provider |
| POST | /bookings/:id/on-the-way | provider |
| POST | /bookings/:id/arrived | provider |
| GET | /bookings/:id/messages | auth |
| POST | /bookings/:id/messages | auth |

Rate-limited: `POST /bookings` (booking limiter).

## Quotations (nested under Bookings)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /bookings/:id/quotation | auth |
| POST | /bookings/:id/quotation | provider |
| POST | /bookings/:id/quotation/confirm | customer |
| POST | /bookings/:id/quotation/cancel | customer |

## Notifications

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /notifications | auth |
| POST | /notifications | auth |
| PATCH | /notifications/read-all | auth |
| PATCH | /notifications/:id/read | auth |
| DELETE | /notifications | auth |

`GET /notifications` supports `?after=<lastSeenId>` for socket-reconnect resync (rule 23).

## Alerts (temporary, deleted once reviewed)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /alerts | auth |
| DELETE | /alerts/:id | auth |
| DELETE | /alerts | auth |

## Support Tickets

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /tickets | auth |
| POST | /tickets<br> v(createAuthenticatedTicketValidation) | auth |
| PATCH | /tickets/:id/resolve | admin |
| PATCH | /admin/tickets/:id/resolve | admin |
| POST | /support-tickets<br> v(createTicketValidation) | optional |
| PATCH | /support-tickets/:id/status | admin |

Rate-limited: `POST /support-tickets` (support-ticket limiter).

## Reviews

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /reviews | admin |
| POST | /reviews<br> v(createReviewValidation) | auth |
| GET | /providers/:id/reviews | public |
| DELETE | /reviews/:id | admin |

Rate-limited: `POST /reviews` (review limiter).

## Referrals / Ambassador

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /referrals/me | auth |
| POST | /referrals/apply | auth |
| POST | /referrals/generate | auth |
| POST | /referrals/claim | auth |

## Service Discovery by Category

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /categories/:slug/providers | public |
| GET | /categories/:slug | public |
| GET | /categories/:id/active-count | public |
| GET | /services/search | public |
| GET | /services | public |

## Services (Admin CRUD)

| Method | Endpoint | Access |
|------|----------|--------|
| POST | /services<br> v(createServiceValidation) | admin |
| PATCH | /services/:id<br> v(updateServiceValidation) | admin |
| PATCH | /services/:id/hide | admin |
| DELETE | /services/:id | admin |

## Provider Analytics

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /providers/:id/analytics | provider\|admin |

## Admin: Dashboard

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/dashboard | admin |
| GET | /admin/analytics | admin |
| GET | /admin/audit-logs | admin |
| GET | /admin/bookings | admin |
| GET | /admin/providers | admin |

## Admin: Provider Service Requests & Reputation

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/provider-service-requests | admin |
| PATCH | /admin/provider-service-requests/:id/approve | admin |
| PATCH | /admin/provider-service-requests/:id/deny | admin |
| GET | /admin/provider-service-items | admin |
| POST | /admin/providers/reputation/refresh | admin |

## Admin: Provider Account Status

| Method | Endpoint | Access |
|------|----------|--------|
| PATCH | /admin/providers/:id/status | admin |

## Image Upload

| Method | Endpoint | Access |
|------|----------|--------|
| POST | /images/upload | optional |

Multer single `image` → Cloudinary; optional auth so providers can upload during signup.

## Leads (ServeGo lead marketplace)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /leads | auth |
| GET | /leads/:id | auth |
| PATCH | /leads/:id/view | provider |
| PATCH | /leads/:id/accept | provider |
| PATCH | /leads/:id/reject | provider |

One request = one lead = one provider. Lead is `NEW → VIEWED → ACCEPTED/REJECTED`; rejection re-assigns the next ranked eligible provider. Open offers capped at `MAX_OPEN_LEADS = 2`.

## Permanent / Contract Service Requests

| Method | Endpoint | Access |
|------|----------|--------|
| POST | /permanent-service-requests<br> v(createPermanentServiceRequestValidation) | customer |
| GET | /permanent-service-requests/mine | customer |
| GET | /permanent-service-requests | admin |
| GET | /permanent-service-requests/:id | auth |
| PATCH | /permanent-service-requests/:id<br> v(updatePermanentServiceRequestValidation) | admin |
| POST | /permanent-service-requests/:id/cancel | customer |

## Provider Levels, Performance & Promotions

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /provider-performance/me | provider |
| GET | /level-rules | provider |
| GET | /promotions/me | provider |
| POST | /promotions/:id/acknowledge | provider |
| GET | /provider-level-history/me | provider |

## Admin: Business Model, Leads Config & Analytics

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/configs | admin |
| PUT | /admin/configs/:key | admin |
| PATCH | /admin/configs/:key | admin |
| GET | /admin/level-rules | admin |
| PATCH | /admin/level-rules/:id | admin |
| GET | /admin/leads | admin |
| GET | /admin/leads/:id | admin |
| GET | /admin/providers/performance | admin |
| GET | /admin/analytics/cancellations | admin |
| GET | /admin/analytics/promotions | admin |

## Customer Saved Addresses

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /customer-addresses | customer |
| POST | /customer-addresses | customer |
| PATCH | /customer-addresses/:id | customer |
| DELETE | /customer-addresses/:id | customer |
| POST | /customer-addresses/:id/default | customer |

## Wallet (Credits) & Withdrawals

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /wallet | auth |
| GET | /wallet/ledger | auth |
| GET | /wallet/withdrawal/config | provider |
| POST | /wallet/withdrawals<br> v(requestWithdrawalValidation) | provider |
| GET | /wallet/withdrawals | provider |

## Admin: Wallet

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/wallet | admin |
| GET | /admin/wallet/ledger | admin |
| GET | /admin/wallet/withdrawals | admin |
| PATCH | /admin/wallet/withdrawals/:id/process<br> v(processWithdrawalValidation) | admin |
| POST | /admin/wallet/credit<br> v(adminCreditWalletValidation) | admin |

## Job Queue (Async Side-Effects)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/queue/stats | admin |
| POST | /admin/queue/requeue | admin |

## Feature Flags

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /feature-flags/public | public |
| GET | /feature-flags | admin |
| PUT | /feature-flags/:key | admin |