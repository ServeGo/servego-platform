-- Customer saved addresses (Blinkit/Zomato-style). Signup capture becomes the
-- first HOME entry; customers add more with HOME/OFFICE/OTHER labels chosen on
-- a map. Indexes keep the common "one customer's addresses" reads fast.
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'HOME',
    "address" TEXT NOT NULL,
    "pincode" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_idx" ON "CustomerAddress"("userId");

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_createdAt_idx" ON "CustomerAddress"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: for every existing customer who has an address on their
-- Customer/User row, seed it once as the default HOME address so the saved
-- address list is never empty for existing accounts.
INSERT INTO "CustomerAddress" ("id", "userId", "label", "address", "pincode", "isDefault", "createdAt", "updatedAt")
SELECT "CustomerAddressHomeSeed".id,
       "CustomerAddressHomeSeed"."userId",
       'HOME',
       "CustomerAddressHomeSeed".address,
       COALESCE("CustomerAddressHomeSeed".pincode, u."pincode"),
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (
    SELECT 'ca_' || c."userId" AS id,
           c."userId",
           COALESCE(c.address, u.address) AS address,
           c.pincode
    FROM "Customer" c
    JOIN "User" u ON u."id" = c."userId"
    WHERE COALESCE(c.address, u.address) IS NOT NULL AND COALESCE(c.address, u.address) <> ''
      AND NOT EXISTS (SELECT 1 FROM "CustomerAddress" ca WHERE ca."userId" = c."userId")
) "CustomerAddressHomeSeed"
JOIN "User" u ON u."id" = "CustomerAddressHomeSeed"."userId";