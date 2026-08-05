-- Dispute resolution: customer/provider raises a dispute against a booking,
-- admin reviews and resolves with an optional wallet refund.

-- CreateEnum
CREATE TYPE "DisputeActor" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('QUALITY_ISSUE', 'SERVICE_NOT_PROVIDED', 'PRICING_ISSUE', 'DAMAGE', 'BEHAVIOR', 'NO_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'NO_REFUND');

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "raisedBy" "DisputeActor" NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionType" "DisputeResolution",
    "refundAmount" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "adminNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispute_bookingId_idx" ON "Dispute"("bookingId");

-- CreateIndex
CREATE INDEX "Dispute_customerId_idx" ON "Dispute"("customerId");

-- CreateIndex
CREATE INDEX "Dispute_providerId_idx" ON "Dispute"("providerId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeMessage_createdAt_idx" ON "DisputeMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
