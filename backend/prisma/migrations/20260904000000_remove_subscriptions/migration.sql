-- DropTables (FK-safe order: transactions first, then subscriptions, then plans)
DROP TABLE IF EXISTS "SubscriptionTransaction";
DROP TABLE IF EXISTS "ProviderSubscription";
DROP TABLE IF EXISTS "SubscriptionPlan";

-- DropEnums
DROP TYPE IF EXISTS "SubscriptionPaymentStatus";
DROP TYPE IF EXISTS "SubscriptionStatus";