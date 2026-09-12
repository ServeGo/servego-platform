-- Leads no longer expire (no time-based sweep, no "top provider" rerank), so
-- the dead `expiredLeads` counter is dropped. It had no readers or writers
-- left after the auto-cancel sweep was removed.

-- AlterTable
ALTER TABLE "ProviderPerformance" DROP COLUMN "expiredLeads";