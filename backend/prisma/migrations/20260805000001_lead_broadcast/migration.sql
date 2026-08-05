-- Broadcast booking leads: a temporary-service booking is offered to every
-- eligible subscribed provider at once and the first accept wins. Providers
-- whose offer was auto-cancelled (another provider accepted, or the customer/
-- admin cancelled) are recorded with status CANCELLED.
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
