-- Drop dead columns (verified zero-readers in application code as of 2026-09-14).
-- Each DROP was audited against backend + frontend usage first.

-- User.verificationCode: random 4-digit code minted at signup and returned once;
-- no endpoint ever reads it (the admin booking-status override ignores the
-- client-sent field). Dead.
ALTER TABLE "User" DROP COLUMN "verificationCode";

-- Customer.preferences: always written as [] and never read anywhere. Dead.
ALTER TABLE "Customer" DROP COLUMN "preferences";

-- Provider.serviceInterested: written only by the seed script; no app code or UI
-- reads it (service approval is tracked via ProviderServiceRequest).
ALTER TABLE "Provider" DROP COLUMN "serviceInterested";

-- Provider.availableDays / Provider.timeSlots (JSON): never rendered by any UI;
-- the functional equivalent is the normalized AvailabilitySlot table, which the
-- availability endpoints actually use.
ALTER TABLE "Provider" DROP COLUMN "availableDays";
ALTER TABLE "Provider" DROP COLUMN "timeSlots";

-- Review.date: a duplicate of createdAt (both defaulted to now(), and date was
-- never written with a distinct value). createdAt remains the authoritative
-- timestamp; the review serializer now exposes createdAt instead.
ALTER TABLE "Review" DROP COLUMN "date";