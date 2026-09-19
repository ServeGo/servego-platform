-- Remove two dead tables:
--  * "RankingMetrics" — never read/written by application code (superseded by
--    ProviderPerformance / providerLevelService).
--  * "_ProviderServiceToProviderServiceRequest" — implicit m2m join table;
--    ProviderService.providerServiceRequestId (scalar) is the real link and is
--    still used by the admin service-approval flow.
-- Both were empty.

-- DropForeignKey
ALTER TABLE "RankingMetrics" DROP CONSTRAINT "RankingMetrics_providerId_fkey";

-- DropForeignKey
ALTER TABLE "_ProviderServiceToProviderServiceRequest" DROP CONSTRAINT "_ProviderServiceToProviderServiceRequest_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProviderServiceToProviderServiceRequest" DROP CONSTRAINT "_ProviderServiceToProviderServiceRequest_B_fkey";

-- DropTable
DROP TABLE "RankingMetrics";

-- DropTable
DROP TABLE "_ProviderServiceToProviderServiceRequest";
