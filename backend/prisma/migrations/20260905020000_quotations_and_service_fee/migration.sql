-- Provider-submitted quotation shown to the customer while the booking is
-- CONFIRMED. Exactly one SUBMITTED quotation is live per booking+provider;
-- ACCEPTED/REJECTED rows are immutable history. Customer cancellation of a
-- live quotation debits the fixed service fee (SERVICE_FEE category) from the
-- customer's wallet.

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'SERVICE_FEE';

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quotation_bookingId_createdAt_idx" ON "Quotation"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_providerId_createdAt_idx" ON "Quotation"("providerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;