# HTTP API Reference (Grouped)

Source: `backend/routes/api.js` — **127 routes**.

Access legend: `auth` = any logged-in user, `customer` / `provider` / `admin` = role, `provider|admin` = either, `optional` = works logged-in or anonymously, `public` = no token required.

## AdminDashboardController — Admin Dashboard

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/analytics | admin |
| GET | /admin/audit-logs | admin |
| GET | /admin/dashboard | admin |
| GET | /admin/providers | admin |

## AdminBusinessController — Admin: Business Model & Leads

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/analytics/cancellations | admin |
| GET | /admin/analytics/promotions | admin |
| GET | /admin/configs | admin |
| GET | /admin/leads | admin |
| GET | /admin/leads/:id | admin |
| GET | /admin/level-rules | admin |
| GET | /admin/providers/performance | admin |
| PUT | /admin/configs/:key | admin |
| PATCH | /admin/configs/:key | admin |
| PATCH | /admin/level-rules/:id | admin |

## AdminProviderStatusController — Admin: Provider Account Status

| Method | Endpoint | Access |
|------|----------|--------|
| PATCH | /admin/providers/:id/status | admin |

## AdminProviderServiceItemsController — Admin: Provider Service Items

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/provider-service-items | admin |

## AdminProviderServiceController — Admin: Provider Service Requests

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/provider-service-requests | admin |
| GET | /provider-services | admin |
| POST | /admin/providers/reputation/refresh | admin |
| PATCH | /admin/provider-service-requests/:id/approve | admin |
| PATCH | /admin/provider-service-requests/:id/deny | admin |

## UserController — Authentication & Users

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /auth/me | auth |
| GET | /users | admin |
| POST | /auth/forgot-password<br> v(forgotPasswordValidation) | public |
| POST | /auth/login<br> v(loginValidation) | public |
| POST | /auth/refresh | public |
| POST | /auth/register<br> v(registerValidation) | public |
| POST | /auth/reset-password<br> v(resetPasswordValidation) | public |
| PATCH | /users/:id/profile<br> v(updateUserProfileValidation) | auth |

## BookingController — Bookings

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/bookings | admin |
| GET | /bookings | auth |
| GET | /bookings/:id | auth |
| GET | /bookings/:id/messages | auth |
| GET | /bookings/:id/timeline | admin |
| GET | /bookings/:id/track-history | auth |
| GET | /bookings/:id/tracking | auth |
| POST | /bookings<br> v(createBookingValidation) | auth |
| POST | /bookings/:id/arrived | provider |
| POST | /bookings/:id/messages | auth |
| POST | /bookings/:id/on-the-way | provider |
| PATCH | /bookings/:id/accept | provider |
| PATCH | /bookings/:id/cancel | auth |
| PATCH | /bookings/:id/complete | provider |
| PATCH | /bookings/:id/decline | provider |
| PATCH | /bookings/:id/location<br> v(updateBookingLocationValidation) | provider |
| PATCH | /bookings/:id/status | auth |

## FeatureFlagController — Feature Flags

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /feature-flags | admin |
| GET | /feature-flags/public | public |
| PUT | /feature-flags/:key | admin |

## ImageController — Image Upload

| Method | Endpoint | Access |
|------|----------|--------|
| POST | /images/upload | optional |

## QueueController — Job Queue (Admin)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/queue/stats | admin |
| POST | /admin/queue/requeue | admin |

## LeadController — Leads (ServeGo business model)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /leads | auth |
| GET | /leads/:id | auth |
| PATCH | /leads/:id/accept | provider |
| PATCH | /leads/:id/reject | provider |
| PATCH | /leads/:id/view | provider |

## NotificationController — Notifications

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /notifications | auth |
| POST | /notifications | auth |
| PATCH | /notifications/:id/read | auth |
| PATCH | /notifications/read-all | auth |
| DELETE | /notifications | auth |

## PermanentServiceRequestController — Permanent / Contract Service Requests

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /permanent-service-requests | admin |
| GET | /permanent-service-requests/:id | auth |
| GET | /permanent-service-requests/mine | customer |
| POST | /permanent-service-requests<br> v(createPermanentServiceRequestValidation) | customer |
| POST | /permanent-service-requests/:id/cancel | customer |
| PATCH | /permanent-service-requests/:id<br> v(updatePermanentServiceRequestValidation) | admin |

## ProviderAnalyticsController — Provider Analytics

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /providers/:id/analytics | provider|admin |

## ProviderServiceDiscoveryController — Provider Discovery by Service

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /categories/:slug/providers | public |
| GET | /providers/by-approved-service | public |

## ProviderBusinessController — Provider Levels, Performance & Promotions

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /level-rules | provider |
| GET | /promotions/me | provider |
| GET | /provider-level-history/me | provider |
| GET | /provider-performance/me | provider |
| POST | /promotions/:id/acknowledge | provider |

## QuotationController — Quotations

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /bookings/:id/quotation | auth |
| POST | /bookings/:id/quotation | provider |
| POST | /bookings/:id/quotation/cancel | customer |
| POST | /bookings/:id/quotation/confirm | customer |

## ReferralsController — Referrals & Ambassador

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /referrals/me | auth |
| POST | /referrals/apply | auth |
| POST | /referrals/claim | auth |
| POST | /referrals/generate | auth |

## ReviewController — Reviews

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /providers/:id/reviews | public |
| GET | /reviews | admin |
| POST | /reviews<br> v(createReviewValidation) | auth |
| DELETE | /reviews/:id | admin |

## ProviderController — Service Providers (Partners)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /provider-services/mine | provider |
| GET | /providers | optional |
| GET | /providers/:id | optional |
| GET | /providers/:id/services | optional |
| GET | /providers/me/route-plan | provider |
| GET | /providers/me/summary | provider |
| POST | /provider-services<br> v(registerProviderServiceValidation) | provider |
| POST | /providers/:id/services/register<br> v(registerProviderServiceValidation) | auth |
| PUT | /providers/:id/availability<br> v(updateAvailabilityValidation) | auth |
| PUT | /providers/me/availability<br> v(updateAvailabilityValidation) | provider |
| PATCH | /providers/:id/availability<br> v(updateAvailabilityValidation) | auth |
| PATCH | /providers/:id/profile<br> v(updateProviderProfileValidation) | auth |
| PATCH | /providers/:id/verify | admin |
| PATCH | /providers/me/availability-status | provider |
| PATCH | /providers/me/location | provider |

## ServiceController — Services (Categories)

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /categories/:id/active-count | public |
| GET | /categories/:slug | public |
| GET | /services | public |
| GET | /services/search | public |
| POST | /services<br> v(createServiceValidation) | admin |
| PATCH | /services/:id<br> v(updateServiceValidation) | admin |
| PATCH | /services/:id/hide | admin |
| DELETE | /services/:id | admin |

## TicketController — Support Tickets

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /tickets | auth |
| POST | /support-tickets<br> v(createTicketValidation) | optional |
| POST | /tickets<br> v(createAuthenticatedTicketValidation) | auth |
| PATCH | /admin/tickets/:id/resolve | admin |
| PATCH | /support-tickets/:id/status | admin |
| PATCH | /tickets/:id/resolve | admin |

## WalletController — Wallet (Credits) & Withdrawals

| Method | Endpoint | Access |
|------|----------|--------|
| GET | /admin/wallet | admin |
| GET | /admin/wallet/ledger | admin |
| GET | /admin/wallet/withdrawals | admin |
| GET | /wallet | auth |
| GET | /wallet/ledger | auth |
| GET | /wallet/withdrawal/config | provider |
| GET | /wallet/withdrawals | provider |
| POST | /admin/wallet/credit<br> v(adminCreditWalletValidation) | admin |
| POST | /wallet/withdrawals<br> v(requestWithdrawalValidation) | provider |
| PATCH | /admin/wallet/withdrawals/:id/process<br> v(processWithdrawalValidation) | admin |
