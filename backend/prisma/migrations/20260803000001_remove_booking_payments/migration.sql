-- Booking-level payments were removed. Money flows now exist only at the
-- provider subscription level (Razorpay) and the admin-configurable platform
-- charge applied to every booking (separate customer/provider rates, stored as
-- Booking.customerPlatformCharge / providerPlatformCharge / totalAmount / providerPayout).

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Payment_bookingId_key";

-- DropTable
DROP TABLE "Payment";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "paymentStatus";

-- DropEnum
DROP TYPE "PaymentStatus";
