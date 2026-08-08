-- Production search: enable pg_trgm and index the searchable text columns so
-- the ranked, typo-tolerant queries in services/searchService.js stay fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Service_name_trgm_idx" ON "Service" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Service_description_trgm_idx" ON "Service" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Service_nameNormalized_trgm_idx" ON "Service" USING GIN ("nameNormalized" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_category_trgm_idx" ON "Provider" USING GIN ("category" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_bio_trgm_idx" ON "Provider" USING GIN ("bio" gin_trgm_ops);
