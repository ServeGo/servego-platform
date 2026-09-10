-- Business display numbers for bookings and services (SG24-0001, ...).
-- Columns are nullable + unique so existing rows need no dummy value; numbers
-- are only minted for new rows via BusinessSequenceCounter inside the same
-- transaction that creates the entity.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "bookingNumber" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "serviceNumber" TEXT;

-- CreateTable
CREATE TABLE "BusinessSequenceCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSequenceCounter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Service_serviceNumber_key" ON "Service"("serviceNumber");