-- Permanent / contract service requests. Customers submit details and the admin
-- reviews, approves/rejects and assigns a provider (no direct customer-provider interaction).

-- CreateEnum
CREATE TYPE "PermanentEngagementType" AS ENUM ('PERMANENT', 'CONTRACT');

-- CreateEnum
CREATE TYPE "PermanentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PermanentServiceRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "engagementType" "PermanentEngagementType" NOT NULL DEFAULT 'CONTRACT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "contractDurationYears" INTEGER,
    "contractDurationDays" INTEGER,
    "monthlyBudget" DOUBLE PRECISION NOT NULL,
    "additionalInfo" TEXT,
    "status" "PermanentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "assignedProviderId" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanentServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermanentServiceRequest_customerId_idx" ON "PermanentServiceRequest"("customerId");

-- CreateIndex
CREATE INDEX "PermanentServiceRequest_status_idx" ON "PermanentServiceRequest"("status");

-- CreateIndex
CREATE INDEX "PermanentServiceRequest_serviceCategory_idx" ON "PermanentServiceRequest"("serviceCategory");

-- AddForeignKey
ALTER TABLE "PermanentServiceRequest" ADD CONSTRAINT "PermanentServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanentServiceRequest" ADD CONSTRAINT "PermanentServiceRequest_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
