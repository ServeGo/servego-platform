-- Platform commission charged on a completed booking. The customer pays the
-- provider directly, so ServeGo's 15% share is collected as a wallet DEBIT
-- against the provider; an uncovered balance runs NEGATIVE and blocks the
-- provider from new leads until it is cleared.

-- AlterEnum
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'COMMISSION';