# GET/POST API List (Grouped)

Source: `backend/routes/api.js`
---

## [auth]
### GET
- /auth/me

### POST
- /auth/register
- /auth/signup
- /auth/login
- /auth/forgot-password
- /auth/reset-password
- /auth/refresh

---

## [users]
### GET
- /users

---

## [providers]
### GET
- /providers
- /providers/by-approved-service
- /providers/:id
- /providers/:id/services
- /providers/:id/availability
- /providers/:id/reviews
- /providers/:id/analytics

### POST
- /providers/:id/services/register

---

## [provider-services]
### GET
- /provider-services/mine
- /provider-services

### POST
- /provider-services

---

## [bookings]
### GET
- /bookings (optional `?updatedAfter=<ISO timestamp>` → rows with newer `updatedAt`, reconnect resync)
- /bookings/mine
- /bookings/:id/timeline
- /bookings/:id
- /bookings/:id/messages

### POST
- /bookings
- /bookings/:id/messages

---

## [notifications]
### GET
- /notifications (optional `?after=<notificationId|ISO timestamp>` → rows newer than lastSeen, reconnect resync)
- /notifications/mine

### POST
- /notifications

---

## [tickets]
### GET
- /tickets

### POST
- /tickets

---

## [support-tickets]
### GET
- /support-tickets/mine
- /support-tickets

### POST
- /support-tickets

---

## [reviews]
### GET
- /reviews
- /providers/:id/reviews

### POST
- /reviews

---

## [payments]
### GET
- /payments

### POST
- /payments
- /payments/initiate
- /payments/webhook

---

## [referrals]
### GET
- /referrals/me

### POST
- /referrals/apply
- /referrals/generate
- /referrals/claim

---

## [services]
### GET
- /services/search
- /services

### POST
- /services

---

## [categories]
### GET
- /categories
- /categories/:slug
- /categories/:slug/providers
- /categories/:id/active-count

### POST
- /categories

---

## [admin]
### GET
- /admin/tickets
- /admin/dashboard
- /admin/dashboard-summary
- /admin/analytics
- /admin/provider-service-items
- /admin/provider-service-requests

### POST
- /admin/providers/reputation/refresh

---

## [saved-pros]
### GET
- /saved-pros

### POST
- /saved-pros



----provider api's 

[providers] GET:

/providers
/providers/by-approved-service
/providers/:id
/providers/:id/services
/providers/:id/availability
/providers/:id/reviews
/providers/:id/analytics
[providers] POST:

/providers/:id/services/register
[provider-services] GET:

/provider-services/mine
/provider-services
[provider-services] POST:

/provider-services

