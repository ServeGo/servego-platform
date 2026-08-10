-- Monthly platform fee: billing accounts + payment history, and the lead admin-alert flag.

-- Enum types
CREATE TYPE "PlatformFeeRole" AS ENUM ('PROVIDER', 'CUSTOMER');
CREATE TYPE "PlatformFeeStatus" AS ENUM ('ACTIVE', 'GRACE', 'OVERDUE', 'DISABLED');
CREATE TYPE "PlatformFeePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- Lead: admin alert dedup (leads no longer auto-expire).
ALTER TABLE "Lead" ADD COLUMN "adminAlertedAt" TIMESTAMP(3);

-- PlatformFeeAccount (one billing account per user)
CREATE TABLE "PlatformFeeAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformFeeRole" NOT NULL DEFAULT 'PROVIDER',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "status" "PlatformFeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPaymentAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformFeeAccount_role_idx" ON "PlatformFeeAccount"("role");
CREATE INDEX "PlatformFeeAccount_status_idx" ON "PlatformFeeAccount"("status");
CREATE INDEX "PlatformFeeAccount_periodEnd_idx" ON "PlatformFeeAccount"("periodEnd");
CREATE INDEX "PlatformFeeAccount_userId_idx" ON "PlatformFeeAccount"("userId");

CREATE UNIQUE INDEX "PlatformFeeAccount_userId_key" ON "PlatformFeeAccount"("userId");

ALTER TABLE "PlatformFeeAccount"
    ADD CONSTRAINT "PlatformFeeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlatformFeePayment (payment history)
CREATE TABLE "PlatformFeePayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "userId" TEXT NOT NULL,
    "role" "PlatformFeeRole" NOT NULL DEFAULT 'PROVIDER',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PlatformFeePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentGateway" TEXT,
    "transactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "invoiceNumber" TEXT,
    "errorDetail" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformFeePayment_userId_idx" ON "PlatformFeePayment"("userId");
CREATE INDEX "PlatformFeePayment_accountId_idx" ON "PlatformFeePayment"("accountId");
CREATE INDEX "PlatformFeePayment_gatewayOrderId_idx" ON "PlatformFeePayment"("gatewayOrderId");
CREATE INDEX "PlatformFeePayment_paymentStatus_idx" ON "PlatformFeePayment"("paymentStatus");
CREATE INDEX "PlatformFeePayment_createdAt_idx" ON "PlatformFeePayment"("createdAt");

ALTER TABLE "PlatformFeePayment"
    ADD CONSTRAINT "PlatformFeePayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PlatformFeeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformFeePayment"
    ADD CONSTRAINT "PlatformFeePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
