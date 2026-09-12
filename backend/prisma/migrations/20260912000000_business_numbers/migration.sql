-- Business display identifiers: CID-0001 (customers), PID-0001 (providers).
-- Existing rows are backfilled in signup order so current accounts keep a
-- stable, sequential number (never re-used by future signups).

-- 1. Columns
ALTER TABLE "User" ADD COLUMN "customerNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "providerNumber" TEXT;

-- 2. Backfill customers in signup order
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "User"
  WHERE "role" = 'customer'
)
UPDATE "User" u
SET "customerNumber" = 'CID-' || LPAD(ranked.rn::TEXT, 4, '0')
FROM ranked
WHERE u."id" = ranked."id";

-- 3. Backfill providers in signup order
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "User"
  WHERE "role" = 'provider'
)
UPDATE "User" u
SET "providerNumber" = 'PID-' || LPAD(ranked.rn::TEXT, 4, '0')
FROM ranked
WHERE u."id" = ranked."id";

-- 4. Seed the business-number counters so the next signup continues after the
-- backfilled sequence instead of restarting at 0001.
INSERT INTO "BusinessSequenceCounter" ("key", "value", "updatedAt")
SELECT 'CUSTOMER', COUNT(*), NOW() FROM "User" WHERE "role" = 'customer'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "BusinessSequenceCounter" ("key", "value", "updatedAt")
SELECT 'PROVIDER', COUNT(*), NOW() FROM "User" WHERE "role" = 'provider'
ON CONFLICT ("key") DO NOTHING;

-- 5. Unique constraints
CREATE UNIQUE INDEX "User_customerNumber_key" ON "User"("customerNumber");
CREATE UNIQUE INDEX "User_providerNumber_key" ON "User"("providerNumber");