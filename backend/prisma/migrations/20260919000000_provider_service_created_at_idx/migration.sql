-- ProviderService rows are ordered by createdAt on the admin service-requests
-- list (approved bucket). Match the Prisma convention for composite-index names,
-- here a derived standalone index needed by that ORDER BY.
CREATE INDEX "ProviderService_createdAt_idx" ON "ProviderService"("createdAt");