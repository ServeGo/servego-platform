-- pg_trgm powers the typo-tolerant catalog search in services/searchService.js.
-- The original 20260808000003_search_trgm migration is recorded as applied in
-- some environments where the extension is actually missing (e.g. a database
-- provisioned via `prisma db push` or restored without extensions), which makes
-- `resolveServiceForQuery` fail with "operator does not exist: text % text" and
-- turns discovery endpoints into 500s. This idempotent ensure re-creates the
-- extension and the GIN indexes so fuzzy search can never 500 again.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Service_name_trgm_idx" ON "Service" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Service_description_trgm_idx" ON "Service" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Service_nameNormalized_trgm_idx" ON "Service" USING GIN ("nameNormalized" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_category_trgm_idx" ON "Provider" USING GIN ("category" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_bio_trgm_idx" ON "Provider" USING GIN ("bio" gin_trgm_ops);
