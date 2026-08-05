-- Provider Level vs Subscription Level (independent systems)
-- Subscription object: complete snapshot fields, lifecycle status, payment state.
-- Booking: start/completion timestamps for performance tracking.
-- ProviderPerformance: job completion time, late arrival %, penalty score.
-- Provider: custom service radius, online + accepting-booking toggles.

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable Provider
ALTER TABLE "Provider" ADD COLUMN     "maxRadiusKm" DOUBLE PRECISION,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "acceptingBookings" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable ProviderSubscription
ALTER TABLE "ProviderSubscription"
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "leadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "invoiceNumber" TEXT;

-- Migrate legacy boolean `active` into `status` + payment state then drop it.
-- Previously-active subscriptions are treated as PAID (their free lead / last
-- purchase was already granted).
UPDATE "ProviderSubscription" SET
  "status" = CASE WHEN "active" THEN 'ACTIVE'::"SubscriptionStatus" ELSE 'INACTIVE'::"SubscriptionStatus" END,
  "paymentStatus" = CASE WHEN "active" THEN 'PAID'::"SubscriptionPaymentStatus" ELSE 'PENDING'::"SubscriptionPaymentStatus" END;
ALTER TABLE "ProviderSubscription" DROP COLUMN "active";

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable SubscriptionTransaction
ALTER TABLE "SubscriptionTransaction" ALTER COLUMN "paymentStatus" DROP DEFAULT;
UPDATE "SubscriptionTransaction" SET "paymentStatus" = 'PENDING' WHERE "paymentStatus" NOT IN ('PAID', 'FAILED', 'PENDING');
ALTER TABLE "SubscriptionTransaction" ALTER COLUMN "paymentStatus" SET DATA TYPE "SubscriptionPaymentStatus" USING "paymentStatus"::"SubscriptionPaymentStatus";
ALTER TABLE "SubscriptionTransaction" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
ALTER TABLE "SubscriptionTransaction" ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "errorDetail" TEXT;

-- AlterTable ProviderPerformance
ALTER TABLE "ProviderPerformance" ADD COLUMN     "jobsStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "averageJobCompletionTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lateArrivalCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateArrivalRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "penaltyScore" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing subscription leadCount snapshot from their plan (when known).
UPDATE "ProviderSubscription" AS s
SET "leadCount" = COALESCE(p."leadCount", 0)
FROM "SubscriptionPlan" AS p
WHERE s."planId" = p."id";

-- Backfill performance counters so existing providers are ranked consistently:
-- jobs started approximates completed jobs; late-arrival stats start at zero.
UPDATE "ProviderPerformance" SET "jobsStarted" = "completedJobs";
