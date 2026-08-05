-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "customerPlatformCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerPayout" DOUBLE PRECISION,
ADD COLUMN     "providerPlatformCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SubscriptionTransaction" ADD COLUMN     "gatewayOrderId" TEXT,
ADD COLUMN     "gatewayPaymentId" TEXT;

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_gatewayOrderId_idx" ON "SubscriptionTransaction"("gatewayOrderId");
