-- Customer pays the full accepted quotation total at completion (wallet
-- debit). The customer's wallet may run negative (amount owed / outstanding
-- order) so completion never strands a provider; the balance resolves when the
-- customer adds funds.

-- AlterEnum
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'BOOKING_PAYMENT';