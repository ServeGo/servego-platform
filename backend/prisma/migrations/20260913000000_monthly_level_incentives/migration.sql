-- Monthly provider level incentives (levels reset each calendar month).
-- `discountPercent` was defined but never applied to pricing; it is now the %
-- of the platform commission credited back to the provider wallet on level-up.

ALTER TABLE "ProviderLevelRule" RENAME COLUMN "discountPercent" TO "incentivePercent";

-- Wallet transaction category for the level incentive credit.
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'LEVEL_INCENTIVE';

-- Track the monthly incentive on each promotion: month cycle (YYYY-MM), the
-- commission base it was computed from, and the wallet amount actually paid.
-- (providerId, monthKey, toLevel) is unique so a level-up is credited once.
ALTER TABLE "PromotionHistory" ADD COLUMN "monthKey" VARCHAR(7);
ALTER TABLE "PromotionHistory" ADD COLUMN "commissionBase" DOUBLE PRECISION;
ALTER TABLE "PromotionHistory" ADD COLUMN "incentiveAmount" DOUBLE PRECISION;
CREATE UNIQUE INDEX "PromotionHistory_providerId_monthKey_toLevel_key" ON "PromotionHistory" ("providerId", "monthKey", "toLevel");