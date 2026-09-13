-- Allow customer bookings without an immediately eligible provider to enter
-- the admin manual-assignment workflow.
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'NO_PROVIDER';