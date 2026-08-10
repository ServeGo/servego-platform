-- Customer's exact service location picked on the map at booking time.
-- Authoritative for provider radius matching and tracking.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "serviceLatitude" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "serviceLongitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PermanentServiceRequest" ADD COLUMN "locationAddress" TEXT;
ALTER TABLE "PermanentServiceRequest" ADD COLUMN "serviceLatitude" DOUBLE PRECISION;
ALTER TABLE "PermanentServiceRequest" ADD COLUMN "serviceLongitude" DOUBLE PRECISION;
