-- Firebase Cloud Messaging registration token. Nullable; set when the user
-- enables push notifications from the dashboard, cleared if they opt out.
-- AlterTable
ALTER TABLE "User" ADD COLUMN "fcmToken" TEXT;