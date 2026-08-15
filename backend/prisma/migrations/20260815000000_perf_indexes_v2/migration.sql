-- Performance indexes v2 (Production rule 13)
-- Composite indexes derived from the queries the app actually runs
-- (worker claim poll, notification feeds, admin lists, provider analytics,
-- lead expiry sweep, payout queues). All are non-blocking ADD INDEX operations
-- on Neon (they build concurrently under the hood).

-- Job: worker claim poll filters type + status + availableAt together
CREATE INDEX "Job_type_status_availableAt_idx" ON "Job" ("type", "status", "availableAt");

-- Notification: per-user feed sorted newest-first (keyset + plain)
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");

-- Booking: auto-cancel cron + admin dashboard aggregates (status + createdAt)
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking" ("status", "createdAt");

-- Booking: provider analytics range queries + provider feed ordering
CREATE INDEX "Booking_providerId_createdAt_idx" ON "Booking" ("providerId", "createdAt");

-- Lead: admin lead list (status + newest-first), customer feed, expiry sweep
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead" ("status", "createdAt");
CREATE INDEX "Lead_customerId_createdAt_idx" ON "Lead" ("customerId", "createdAt");
CREATE INDEX "Lead_status_expiryTime_idx" ON "Lead" ("status", "expiryTime");

-- Review: unfiltered admin review list / createdAt range analytics
CREATE INDEX "Review_createdAt_idx" ON "Review" ("createdAt");

-- ProviderServiceRequest: provider's own pending/denied list (providerId first)
CREATE INDEX "ProviderServiceRequest_providerId_status_idx" ON "ProviderServiceRequest" ("providerId", "status");

-- WalletWithdrawalRequest: provider payout history + admin payout queue
CREATE INDEX "WalletWithdrawalRequest_userId_createdAt_idx" ON "WalletWithdrawalRequest" ("userId", "createdAt");
CREATE INDEX "WalletWithdrawalRequest_status_createdAt_idx" ON "WalletWithdrawalRequest" ("status", "createdAt");

-- SubscriptionTransaction: provider subscription history newest-first
CREATE INDEX "SubscriptionTransaction_providerId_purchasedAt_idx" ON "SubscriptionTransaction" ("providerId", "purchasedAt");

-- PermanentServiceRequest: admin list filtered by status, newest first
CREATE INDEX "PermanentServiceRequest_status_createdAt_idx" ON "PermanentServiceRequest" ("status", "createdAt");

-- Provider: public discovery + lead matching filter (accountStatus + isVerified)
CREATE INDEX "Provider_accountStatus_isVerified_idx" ON "Provider" ("accountStatus", "isVerified");
