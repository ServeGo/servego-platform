-- Customer-supplied contact number captured at booking time. Nullable so
-- legacy rows and non-interactive creation paths keep working unchanged.
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "contactPhone" TEXT;