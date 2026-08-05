-- CreateEnum
CREATE TYPE "ProviderLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "ProviderSector" AS ENUM ('GENERAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'TRANSFERRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CancellationActor" AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "promotionDate" TIMESTAMP(3),
ADD COLUMN     "providerLevel" "ProviderLevel" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "sector" "ProviderSector" NOT NULL DEFAULT 'GENERAL',
ALTER COLUMN "isVerified" SET DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProviderLevelRule" (
    "id" TEXT NOT NULL,
    "level" "ProviderLevel" NOT NULL,
    "minJobs" INTEGER NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderLevelRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadCount" INTEGER NOT NULL DEFAULT 3,
    "sector" "ProviderSector" NOT NULL DEFAULT 'GENERAL',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSubscription" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "remainingLeads" INTEGER NOT NULL DEFAULT 1,
    "completedJobsCurrentSubscription" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sector" "ProviderSector" NOT NULL DEFAULT 'GENERAL',
    "planId" TEXT,
    "freeLeadUsed" BOOLEAN NOT NULL DEFAULT false,
    "lastPurchaseAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTransaction" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planId" TEXT,
    "levelPurchased" INTEGER NOT NULL,
    "planName" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "invoiceNumber" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT,
    "serviceId" TEXT,
    "serviceCategory" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "distanceKm" DOUBLE PRECISION,
    "notes" TEXT,
    "expiryTime" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "lastRejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignmentHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTransferHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromProviderId" TEXT,
    "toProviderId" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'REJECTED',
    "details" JSONB,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionHistory" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "fromLevel" "ProviderLevel" NOT NULL,
    "toLevel" "ProviderLevel" NOT NULL,
    "completedJobsAtPromotion" INTEGER NOT NULL,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "PromotionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderLevelHistory" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "level" "ProviderLevel" NOT NULL,
    "previousLevel" "ProviderLevel",
    "reason" TEXT NOT NULL DEFAULT 'INITIAL',
    "completedJobs" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderLevelHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPerformance" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "acceptedLeads" INTEGER NOT NULL DEFAULT 0,
    "rejectedLeads" INTEGER NOT NULL DEFAULT 0,
    "ignoredLeads" INTEGER NOT NULL DEFAULT 0,
    "expiredLeads" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "cancelledJobs" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageResponseTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "cooldownCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingMetrics" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "providerLevel" "ProviderLevel" NOT NULL DEFAULT 'BRONZE',
    "sector" "ProviderSector" NOT NULL DEFAULT 'GENERAL',
    "lastComputedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationReason" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "leadId" TEXT,
    "actor" "CancellationActor" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderLevelRule_level_key" ON "ProviderLevelRule"("level");

-- CreateIndex
CREATE INDEX "ProviderLevelRule_minJobs_idx" ON "ProviderLevelRule"("minJobs");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_level_key" ON "SubscriptionPlan"("level");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_active_idx" ON "SubscriptionPlan"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSubscription_providerId_key" ON "ProviderSubscription"("providerId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_providerId_idx" ON "SubscriptionTransaction"("providerId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_purchasedAt_idx" ON "SubscriptionTransaction"("purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_bookingId_key" ON "Lead"("bookingId");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");

-- CreateIndex
CREATE INDEX "Lead_providerId_idx" ON "Lead"("providerId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_expiryTime_idx" ON "Lead"("expiryTime");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_leadId_idx" ON "LeadAssignmentHistory"("leadId");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_providerId_idx" ON "LeadAssignmentHistory"("providerId");

-- CreateIndex
CREATE INDEX "LeadTransferHistory_leadId_idx" ON "LeadTransferHistory"("leadId");

-- CreateIndex
CREATE INDEX "PromotionHistory_providerId_idx" ON "PromotionHistory"("providerId");

-- CreateIndex
CREATE INDEX "PromotionHistory_promotedAt_idx" ON "PromotionHistory"("promotedAt");

-- CreateIndex
CREATE INDEX "ProviderLevelHistory_providerId_idx" ON "ProviderLevelHistory"("providerId");

-- CreateIndex
CREATE INDEX "ProviderLevelHistory_changedAt_idx" ON "ProviderLevelHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPerformance_providerId_key" ON "ProviderPerformance"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingMetrics_providerId_key" ON "RankingMetrics"("providerId");

-- CreateIndex
CREATE INDEX "CancellationReason_bookingId_idx" ON "CancellationReason"("bookingId");

-- CreateIndex
CREATE INDEX "CancellationReason_leadId_idx" ON "CancellationReason"("leadId");

-- CreateIndex
CREATE INDEX "CancellationReason_actor_idx" ON "CancellationReason"("actor");

-- CreateIndex
CREATE INDEX "CancellationReason_createdAt_idx" ON "CancellationReason"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminConfig_key_key" ON "AdminConfig"("key");

-- AddForeignKey
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransaction" ADD CONSTRAINT "SubscriptionTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransaction" ADD CONSTRAINT "SubscriptionTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProviderSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransaction" ADD CONSTRAINT "SubscriptionTransaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransferHistory" ADD CONSTRAINT "LeadTransferHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransferHistory" ADD CONSTRAINT "LeadTransferHistory_fromProviderId_fkey" FOREIGN KEY ("fromProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransferHistory" ADD CONSTRAINT "LeadTransferHistory_toProviderId_fkey" FOREIGN KEY ("toProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderLevelHistory" ADD CONSTRAINT "ProviderLevelHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPerformance" ADD CONSTRAINT "ProviderPerformance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingMetrics" ADD CONSTRAINT "RankingMetrics_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationReason" ADD CONSTRAINT "CancellationReason_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationReason" ADD CONSTRAINT "CancellationReason_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

