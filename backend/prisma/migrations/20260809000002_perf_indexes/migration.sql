-- Performance indexes (Feature 25)
-- Hot list/detail query paths that were previously served by sequential scans
-- or by loading full child rows. All are non-blocking ADD INDEX operations on
-- Neon (they build concurrently under the hood).

-- Notification: unread badge counts per user (userId, isRead) and per-user feed
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification" ("userId", "isRead");

-- Review: provider review listings ordered newest-first
CREATE INDEX "Review_providerId_createdAt_idx" ON "Review" ("providerId", "createdAt");
CREATE INDEX "Review_reviewerId_idx" ON "Review" ("reviewerId");

-- Provider: public discovery filter by account status
CREATE INDEX "Provider_accountStatus_idx" ON "Provider" ("accountStatus");

-- ProviderService: reverse lookups by service / provider
CREATE INDEX "ProviderService_providerId_idx" ON "ProviderService" ("providerId");
CREATE INDEX "ProviderService_serviceId_idx" ON "ProviderService" ("serviceId");

-- ProviderServiceRequest: admin moderation lists by status, newest first
CREATE INDEX "ProviderServiceRequest_status_createdAt_idx" ON "ProviderServiceRequest" ("status", "createdAt");

-- WalletTransaction: per-user ledger ordering (cursor + offset feeds)
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction" ("userId", "createdAt");
