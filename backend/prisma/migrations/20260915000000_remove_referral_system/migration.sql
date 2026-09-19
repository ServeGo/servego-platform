-- Referral system removed entirely: drop the referral columns from User.
-- Wallet REFERRAL_BONUS category is preserved (historical ledger entries).
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralCode",
  DROP COLUMN IF EXISTS "referredBy",
  DROP COLUMN IF EXISTS "referralsCount",
  DROP COLUMN IF EXISTS "referralDiscountBalance",
  DROP COLUMN IF EXISTS "referralBonusEarned";