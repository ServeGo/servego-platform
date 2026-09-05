-- DropTables (FK-safe order: payments reference the account, so payments first)
DROP TABLE IF EXISTS "PlatformFeePayment";
DROP TABLE IF EXISTS "PlatformFeeAccount";

-- DropEnums
DROP TYPE IF EXISTS "PlatformFeePaymentStatus";
DROP TYPE IF EXISTS "PlatformFeeRole";
DROP TYPE IF EXISTS "PlatformFeeStatus";