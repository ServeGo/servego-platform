-- Real-time provider location tracking.
--
-- Booking gains a live provider position (providerLatitude/Longitude) plus the
-- trip origin (startLocation) and the customer's service location (endLocation)
-- used to compute ETA and progress. Provider pings are additionally archived in
-- BookingLocationUpdate for telemetry and are pruned after the configured
-- retention window once the booking is closed.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "startLocation" JSONB;
ALTER TABLE "Booking" ADD COLUMN "endLocation" JSONB;
ALTER TABLE "Booking" ADD COLUMN "providerLatitude" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "providerLongitude" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "providerLocationUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_providerLocationUpdatedAt_idx" ON "Booking"("providerLocationUpdatedAt");

-- CreateTable
CREATE TABLE "BookingLocationUpdate" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingLocationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingLocationUpdate_bookingId_idx" ON "BookingLocationUpdate"("bookingId");

-- CreateIndex
CREATE INDEX "BookingLocationUpdate_providerId_idx" ON "BookingLocationUpdate"("providerId");

-- CreateIndex
CREATE INDEX "BookingLocationUpdate_recordedAt_idx" ON "BookingLocationUpdate"("recordedAt");

-- AddForeignKey
ALTER TABLE "BookingLocationUpdate" ADD CONSTRAINT "BookingLocationUpdate_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLocationUpdate" ADD CONSTRAINT "BookingLocationUpdate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
