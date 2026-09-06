-- Plan B / arrival audit: record how the provider signalled arrival.
-- 'gps'   = auto-detected within the arrival radius (client-side check)
-- 'manual'= GPS unavailable — provider confirmed arrival manually in-app

ALTER TABLE "Booking" ADD COLUMN "arrivedSource" TEXT;