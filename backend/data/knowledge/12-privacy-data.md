# Privacy & Data Handling

## What personal data does ServeGo24 collect?

**Customers:**
- Name, email, phone number
- Home address (up to 3 saved: Home, Office, Other)
- Pinned map location
- Booking history (services, dates, providers, amounts)
- Reviews and ratings given
- Support tickets

**Providers:**
- Name, email, phone number
- Provider profile (bio, specialties, service areas, base location)
- Service applications (experience, years)
- Verification documents (submitted to admin)
- Wallet/earnings ledger
- Booking history (accepted, completed, cancelled)
- Reviews received
- Live location during active bookings (temporary)

## Who can see my contact details?

**Customers:**
- **Name + city** → visible to ALL providers who receive the broadcast offer
- **Full address, instructions, phone** → ONLY the provider who **accepts** the request
- If booking is **cancelled** after acceptance → phone hidden again, cannot be re-shown

**Providers:**
- **Name + city** → visible to customer after acceptance
- **Phone** → visible to customer after acceptance (for coordination)
- **Full address** → never shared with customers (only your base location city)

## How long is my data kept?

| Data Type | Retention |
|-----------|-----------|
| Account info (name, email, phone) | While account active + 30 days after deletion |
| Booking history | 7 years (financial/legal requirement) |
| Earnings/wallet ledger | 7 years |
| Live location pings | 24 hours after booking ends |
| Chat messages | 90 days |
| Support tickets | 3 years after resolution |
| Reviews | While provider account active |

## Can I delete my account?

**Yes.** From your dashboard → Settings → Delete Account.

**What happens:**
- Account marked for deletion → 30-day grace period
- During grace: can recover by logging in
- After 30 days: Personal data anonymized (name → "Deleted User")
- Booking history retained (anonymized) for financial records
- Wallet balance must be zero or positive before deletion (withdraw first)

## Is my location tracked when I'm not on a booking?

**Customers:** No. Only your saved addresses are stored.

**Providers:** Only during **active bookings** (CONFIRMED/ONGOING):
- Live location shared with customer every ~10 seconds
- Stops when booking reaches COMPLETED or CANCELLED
- Location history deleted 24 hours after booking ends
- Online/offline toggle does NOT affect location sharing

## How is my data secured?

- **Encryption in transit**: HTTPS/TLS for all API calls
- **Encryption at rest**: Database encryption for sensitive fields
- **Access control**: Role-based (customer/provider/admin) — you only see your data
- **No payment data**: ServeGo24 never stores card/bank details
- **Wallet**: Only balance and ledger entries stored

## Does ServeGo24 sell my data?

**No.** ServeGo24 does not sell personal data to third parties.

Data is used only for:
- Matching bookings to providers
- Processing bookings and payments
- Sending notifications
- Platform analytics (aggregated, anonymized)
- Legal compliance

## What about the live tracking map?

**During active booking only:**
- Customer sees provider's real-time location on map
- Provider sees customer's pinned address (static)
- Location updates stop at COMPLETED/CANCELLED
- No historical tracking stored beyond 24 hours

## Can I opt out of notifications?

**Yes.** In Settings:
- Push notifications: toggle on/off per category (booking, quotes, payments)
- Email notifications: toggle on/off
- SMS: only for critical alerts (OTP, password reset) — cannot disable

## What if I find incorrect data about me?

Raise a **support ticket** with "Data correction". Admin can:
- Fix address, phone, name
- Correct booking records
- Update provider profile details

## Does ServeGo24 comply with data protection laws?

ServeGo24 follows applicable data protection principles:
- **Data minimization** — only collect what's needed
- **Purpose limitation** — only use for stated purposes
- **Access rights** — you can request your data
- **Deletion rights** — you can request deletion (with legal exceptions)
- **Security** — reasonable safeguards in place

For specific legal requests (GDPR, DPDP Act, etc.), contact support.

---

### See also
- [Customer](./03-customer.md) — Account and privacy
- [Provider](./05-provider.md) — Provider profile data
- [Booking](./04-booking.md) — Booking data flow
- [Cancellation & Support](./07-cancellation-support.md) — Support tickets