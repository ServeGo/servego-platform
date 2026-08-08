-- Provider dispatch lifecycle phase for live tracking (null → ON_THE_WAY → ARRIVED).
-- Kept separate from BookingStatus so tracking UX can evolve without touching the
-- booking state machine.
ALTER TABLE "Booking" ADD COLUMN "providerPhase" TEXT;
