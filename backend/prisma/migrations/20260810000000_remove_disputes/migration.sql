-- Dispute module removed (no real-money/refund flow; support tickets cover escalations)

-- DropForeignKey
ALTER TABLE "DisputeMessage" DROP CONSTRAINT "DisputeMessage_disputeId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_providerId_fkey";

-- DropTable
DROP TABLE "DisputeMessage";

-- DropTable
DROP TABLE "Dispute";

-- DropEnum
DROP TYPE "DisputeResolution";

-- DropEnum
DROP TYPE "DisputeActor";

-- DropEnum
DROP TYPE "DisputeStatus";

-- DropEnum
DROP TYPE "DisputeReason";
