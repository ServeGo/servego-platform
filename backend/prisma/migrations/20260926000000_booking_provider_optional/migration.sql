-- A booking is created as an OPEN broadcast offer to every eligible provider,
-- so at PENDING time no provider owns it. `providerId` was NOT NULL, which
-- forced `createBookingWithLead` to write a placeholder provider (the first
-- eligible entry). That placeholder was user-visible ("Pending" bookings showed
-- a provider the customer never chose) and it also locked that provider out of
-- every subsequent lead, because the phantom PENDING booking failed the
-- "not busy with an active job" eligibility gate.
--
-- `acceptLeadForBooking` already writes `providerId` inside the
-- PENDING -> CONFIRMED compare-and-swap, so the column is populated the moment
-- a real provider takes the job.
ALTER TABLE "Booking" ALTER COLUMN "providerId" DROP NOT NULL;

-- Backfill: any legacy PENDING booking whose providerId points at a provider that
-- never actually accepted is a placeholder. Clear it so pending rows stop
-- displaying/occupying a provider. Rows in CONFIRMED/ONGOING/COMPLETED keep
-- their real owner.
UPDATE "Booking" b
SET "providerId" = NULL
WHERE b."status" = 'PENDING'
  AND EXISTS (
    SELECT 1
    FROM "Lead" l
    WHERE l."bookingId" = b."id"
      AND l."providerId" IS NOT DISTINCT FROM b."providerId"
      AND l."status" <> 'ACCEPTED'
  );
