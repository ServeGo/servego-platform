-- Extend PermanentServiceRequest to also cover CUSTOM service requests (a
-- service not in the catalog, requested by name + description only). The
-- permanent/contract fields become optional and are only set for requestType
-- PERMANENT; CUSTOM requests store the name/description instead.
CREATE TYPE "ServiceRequestType" AS ENUM ('PERMANENT', 'CUSTOM');

ALTER TABLE "PermanentServiceRequest"
  ADD COLUMN "requestType" "ServiceRequestType" NOT NULL DEFAULT 'PERMANENT',
  ADD COLUMN "customServiceName" TEXT,
  ADD COLUMN "customDescription" TEXT,
  ALTER COLUMN "serviceCategory" DROP NOT NULL,
  ALTER COLUMN "engagementType" DROP NOT NULL,
  ALTER COLUMN "startDate" DROP NOT NULL,
  ALTER COLUMN "monthlyBudget" DROP NOT NULL;