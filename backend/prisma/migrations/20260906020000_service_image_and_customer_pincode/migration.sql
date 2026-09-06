-- Service photo (mandatory on create, optional on edit) stored via Cloudinary.
ALTER TABLE "Service" ADD COLUMN "image" TEXT;

-- Customer signup now asks for a map-picked location instead of requiring a
-- pincode; keep the column for existing rows, make it optional going forward.
ALTER TABLE "Customer" ALTER COLUMN "pincode" DROP NOT NULL;