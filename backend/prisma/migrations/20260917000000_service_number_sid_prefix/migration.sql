-- Re-point service business numbers from the booking prefix (SG24) to their own
-- SID prefix, so SG24 is used exclusively by bookings. Existing SG24-XXXX
-- service numbers are renumbered to SID-XXXX in place; booking numbers are
-- untouched.
UPDATE "Service"
SET "serviceNumber" = 'SID-' || substring("serviceNumber" from 6)
WHERE "serviceNumber" LIKE 'SG24-%';

-- Keep the SERVICE counter in step with the highest SID already minted so new
-- services never collide with the rows migrated above. BOOKING keeps its own
-- independent SG24 counter and is deliberately not touched.
INSERT INTO "BusinessSequenceCounter" ("key", "value", "updatedAt")
SELECT 'SERVICE',
       COALESCE(MAX(substring("serviceNumber" from 5)::int), 0),
       now()
FROM "Service"
WHERE "serviceNumber" LIKE 'SID-%'
ON CONFLICT ("key") DO UPDATE
  SET "value" = EXCLUDED."value",
      "updatedAt" = now();