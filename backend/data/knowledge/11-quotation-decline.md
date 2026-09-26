# Quotation Decline & Rebooking

## What happens when I decline a quotation?

Declining a quotation you have already seen is **different from cancelling before a quotation**.

**When you decline a quotation:**
1. A fixed **cancellation fee** applies (default ₹249, admin-configurable)
2. Platform **commission (10% default)** on that fee is debited from the **provider's wallet**
3. Provider **keeps the fee** as compensation for their trip (recorded as lifetime earnings)
4. Your account shows a **display-only** "Cancellation Fee" record — **not a real charge**
5. No money is taken from you; it never affects your wallet

## Why is there a fee for declining but not for cancelling early?

- **Before quotation**: Provider hasn't travelled yet → no cost incurred
- **After quotation**: Provider has already spent time/travel to assess or complete work
- The fee compensates the provider for that trip, not a platform charge

## Can the provider send a new quotation after I decline?

**No.** Once a quotation is declined:
- The booking is marked **Cancelled**
- That specific booking cannot be revived
- Provider cannot send another quotation for the same booking

## What if I want the work done but at a different price?

1. **Decline the current quotation** (fee applies)
2. **Create a new booking** for the same service
3. The new booking goes through normal matching — may get the same or different provider
4. Provider sends a new quotation

## What happens to the lead after I decline?

The booking is **Cancelled** and the lead is **Expired**.

**If other providers still have open offers** (they didn't accept yet):
- Their offers remain open for the cancelled booking
- But since booking is cancelled, those offers are now invalid
- They will be cleaned up automatically

## Does declining affect my future bookings?

**No.** Declining a quotation:
- Does not affect your customer rating
- Does not limit future bookings
- Only shows a display-only "Cancellation Fee" on that specific booking

## Can I negotiate the quotation instead of declining?

**Yes.** Before the 24-hour window expires:
1. Raise a **support ticket** with "Quotation dispute"
2. Admin can ask provider to revise the quotation
3. Provider sends updated quotation
4. You review and confirm/decline the revised version

## What if the provider made an error in the quotation?

Raise a support ticket immediately. Admin can:
- Ask provider to send corrected quotation
- If provider refuses, cancel booking without fee to you
- Provider's cancellation recorded on their profile

## How does the 24-hour quotation window work?

- Provider sends quotation → **24-hour countdown starts**
- You can **confirm** (completes booking) or **decline** (cancels with fee)
- If **no action in 24 hours** → quotation **expires automatically**
  - Booking status reverts to **Pending**
  - Lead reopens → broadcast to eligible providers again (including same provider)
  - 24-hour reminder notification sent

## What is the reopen broadcast?

When a quotation expires (24 hours with no response):
1. Lead status: **NEW** again
2. Booking status: **PENDING** again
3. System calls `reopenLeadBroadcast()` — offers to all **currently eligible** providers
4. Providers who already had open offer keep it
5. New eligible providers (came online, got verified, cleared wallet) get fresh offer

This gives the request another chance without customer action.

## Can I extend the 24-hour window?

**No.** The 24-hour window is fixed. If you need more time:
- Confirm the quotation if satisfied
- Decline and rebook if not
- Or raise support ticket for admin assistance

## What if I accidentally declined?

Raise a support ticket immediately. Admin can:
- If provider hasn't been notified yet, may be able to reverse
- Otherwise, you'll need to create a new booking
- Cancellation fee display-only record remains on original booking

---

### See also
- [Booking](./04-booking.md) — Quotation flow and statuses
- [Cancellation & Support](./07-cancellation-support.md) — Fee details
- [Services](./02-services.md) — How to rebook
- [Payments & Pricing](./06-payments-pricing.md) — Payment flow