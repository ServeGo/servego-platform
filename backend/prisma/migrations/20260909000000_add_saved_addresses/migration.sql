-- Saved shortcuts used for faster booking (Home/Work/Office/etc.). A customer
-- can keep several named locations and reuse them when placing a booking.
CREATE TABLE "SavedAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Home',
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedAddress_pkey" PRIMARY KEY ("id")
);

-- Indexes follow the real queries: list-by-user (all addresses for a customer,
-- newest first) and the per-user label lookups.
CREATE INDEX "SavedAddress_userId_label_idx" ON "SavedAddress"("userId", "label");
CREATE INDEX "SavedAddress_userId_createdAt_idx" ON "SavedAddress"("userId", "createdAt");

-- A saved address always belongs to an existing user.
ALTER TABLE "SavedAddress" ADD CONSTRAINT "SavedAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
