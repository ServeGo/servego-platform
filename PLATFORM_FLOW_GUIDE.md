# ServeGo24 — How It Works (Plain English)

---

## What is ServeGo24?

ServeGo24 is a home services marketplace. Think of it like Swiggy or Urban Company — but for home services like AC repair, plumbing, electricians, cleaning, etc.

There are **3 types of people** on the platform:

| Who | What they do |
|-----|-------------|
| **Customer** | Books a service (AC repair, plumbing, etc.) |
| **Provider** | A skilled technician who comes and does the work |
| **Admin** | The ServeGo24 team — manages everything behind the scenes |

---

## CUSTOMER — Full Journey

### 1. Sign Up
- Customer creates an account with name, email, phone, and **home address + location on map**
- The address is important — it's used to find nearby providers
- After signup, customer gets a unique ID like `CID-0001`

### 2. Browse Services
- Customer sees a list of services (AC Repair, Plumbing, Electrician, Cleaning, etc.)
- Each service shows the name, icon, and price starting from ₹249

### 3. Book a Service
- Customer clicks "Book Now" on any service
- Fills in: what's the problem, preferred date/time, address
- Submits the booking
- Customer gets a booking number like `SG24-0001`
- **Customer does NOT pick a specific provider** — the system finds the best one automatically

### 4. What Happens After Booking
- The system immediately searches for available providers nearby
- A notification is sent to eligible providers (explained in detail below)
- Customer waits for a provider to accept

### 5. Provider Accepts
- Once a provider accepts, customer gets notified
- Customer can see the provider's name, rating, and experience
- Customer can track the provider live on a map as they travel

### 6. Service Happens
- Provider marks "On the Way" → customer gets notified
- Provider marks "Arrived" → customer gets notified
  - If the provider's live location enters the arrival zone (radius set by admins, default 150 m), "Arrived" happens **automatically**
- Work is done

### 7. Payment & Completion
- After the work, the provider sends a **quotation** (their price with line items)
- Customer reviews and **confirms** the quotation → work is recorded as complete
- **No service fee is charged when you confirm a quotation** — you pay the provider's price directly. ServeGo only records the payment; actual money changes hands off-platform (cash/UPI)
- If the customer **cancels after seeing the quotation**, a fixed Cancellation Fee (default ₹249) shows in their wallet as record only, and the provider is compensated (see Money Flow below)
- Customer can leave a **review and rating**

### 8. Other Customer Features
- **Saved Addresses** — save up to 3 addresses (Home, Office, Other)
- **Booking History** — see all past and current bookings
- **No-Provider Requests** — if no provider is available for a service, submit a manual request and admin assigns one (see below)
- **Support Tickets** — raise a complaint if something goes wrong
- **Forgot Password** — reset via email link
- **Permanent/Contract Requests** — for recurring services (e.g. monthly AC maintenance)

---

## PROVIDER — Full Journey

### 1. Sign Up
- Provider creates an account selecting role as "Provider"
- Fills in name, email, phone
- After signup, gets a unique ID like `PID-0001`
- A **wallet** is automatically created for them (for earnings)
- Provider starts at **BRONZE level**

### 2. Complete Profile
- Provider must fill in:
  - Bio (about themselves)
  - Specialties (what they're good at)
  - Service areas (which areas/localities they cover)
  - Location (their base location on map)
  - Service radius (how far they're willing to travel, default 50 km)
- **Until profile is complete, provider won't receive any jobs**

### 3. Request a Service
- Provider applies to offer a specific service (e.g. "I want to do AC Repair")
- Fills in: description of experience, years of experience, common issues they handle
- This goes to Admin for **approval**
- Provider can see status: Pending / Approved / Denied

### 4. Admin Approves
- Once admin approves the service, provider is now **eligible to receive jobs**
- Admin also verifies the provider's profile (background check, etc.)
- **Both profile complete + admin verified = provider can receive leads**

### 5. Receiving a Lead (Job Offer)
- When a customer books a service that matches the provider's approved service AND the customer is within the provider's radius, the provider gets a **lead notification**
- The lead shows: service type, general area, distance — but **NOT the customer's contact details yet**
- Provider can **Accept** or **Reject** the lead
- Provider can hold maximum **2 open leads** at a time
- Once provider accepts one lead, all other open offers are automatically closed

### 6. Doing the Job
- After accepting, provider sees full customer details and address
- The Active Duty card shows the live map the whole trip (until arrival)
- Provider marks "On the Way" when leaving
- Provider is marked "Arrived" automatically when within ~150 m of the address (falls back to the manual **Arrive** button if GPS is unavailable)
- Does the work
- Sends a **quotation** with their line items for the customer to approve
- The job is completed once the customer **confirms** the quotation

### 7. Earnings
- After completion, the full quotation amount is recorded in the provider's **earnings ledger** (lifetime earnings). Customers pay the provider directly off-platform — ServeGo only records the exchange
- Platform takes a **10% commission** on the quotation total, debited from the provider's **wallet** (may run negative until cleared)
- If a customer cancels after a quotation, the commission on the fee is still debited from the provider's wallet and the provider **keeps the fixed service fee (default ₹249)** as compensation
- Providers with a negative wallet balance stop receiving new leads until it is cleared
- Provider can request a **withdrawal** of their positive wallet balance
- Admin processes the withdrawal

### 8. Provider Levels & Rewards
- Providers level up based on completed jobs: **Bronze → Silver → Gold → Platinum → Diamond**
- Higher levels = better ranking = more jobs
- Monthly incentives: platform credits back a % of commission on level-up

### 9. Other Provider Features
- **Availability Schedule** — set which days/hours they're available
- **Online/Offline Toggle** — go offline when not available
- **Route Plan** — optimized route for multiple bookings in a day
- **Analytics** — see their performance stats
- **Badges** — earned for good performance
- **Support Tickets** — raise issues with the platform

---

## HOW A BOOKING BECOMES A LEAD — Step by Step

This is the most important flow. Here's exactly what happens:

```
Customer books "AC Repair" in Hyderabad
           ↓
System looks for eligible providers
           ↓
Checks ALL providers who have:
  ✅ Approved "AC Repair" service
  ✅ Active & verified profile
  ✅ Profile complete
  ✅ Currently online & accepting bookings
  ✅ Customer's location is within their service radius
  ✅ Wallet balance is not negative
           ↓
Ranks them by:
  1. Closest distance first
  2. Highest rating
  3. Provider level (Diamond > Platinum > Gold > Silver > Bronze)
  4. Best acceptance rate
  5. Lowest cancellation rate
           ↓
Sends lead notification to ALL eligible providers simultaneously
           ↓
First provider to accept → gets the job
Other providers' offers are automatically cancelled
           ↓
If NO provider accepts within the time limit → lead is reassigned to next eligible provider
           ↓
Customer is notified once a provider accepts
```

### What if no provider is available?
- If no eligible provider is found, customer is informed
- The customer can then submit a **No-Provider request**: pick the service, enter the
  location and a short message. It lands in the admin queue (`PENDING`), and the admin
  picks a provider from every provider approved for that service (tagged with their
  status, e.g. blocked/on-hold/unverified) and **assigns** them. The booking is created
  as confirmed and the provider gets a lead/provides accepted — the admin's choice is
  applied as-is
- Common reasons a provider might not show up in the list automatically:
  - They haven't set their location on the map
  - Customer is outside their service radius
  - Their profile is incomplete or not verified
  - They are offline
  - Their wallet balance is negative

---

## ADMIN — What They Control

Admin is the ServeGo24 operations team. They have a full dashboard to manage everything.

### Provider Management
- **Verify providers** — approve or reject provider profiles
- **Approve/Deny service requests** — when a provider applies to offer a service
- **Block/Suspend providers** — if they misbehave
- **View all providers** — with their stats, ratings, level, earnings

### Service Catalog Management
- **Add new services** — e.g. add "Pest Control" as a new service category
- **Edit services** — update name, description, price
- **Hide services** — temporarily remove from customer view
- **View active provider count** per service

### Booking Management
- **View all bookings** — filter by status, date, provider, customer
- **View booking timeline** — full history of what happened in a booking
- **Resolve disputes** — if customer and provider disagree

### Financial Management
- **View all wallet transactions**
- **Process withdrawal requests** — approve/reject provider payout requests
- **Manually credit wallets** — add bonus credits to a provider's wallet
- **View platform earnings**

### Business Configuration
- **Set commission rate** (default 10%)
- **Set service fee** (default ₹249)
- **Set withdrawal limits** (minimum/maximum payout amounts)
- **Set lead radius defaults**

### Provider Level Rules
- **Configure level thresholds** — how many jobs to reach Silver, Gold, etc.
- **Set incentive percentages** — how much commission to credit back on level-up

### Analytics & Reports
- **Platform dashboard** — total bookings, revenue, active providers, customers
- **Cancellation analytics** — who's cancelling and why
- **Promotion analytics** — level-up trends
- **Audit logs** — full history of every admin action

### Feature Flags
- **Toggle features on/off** without code changes
  - e.g. Turn live tracking on/off for customers or providers
  - Show/hide announcement banners

### Support
- **View all support tickets** — from customers and providers
- **Resolve tickets** — mark as resolved with a response

---

## CUSTOMER ↔ PROVIDER INTERACTION SUMMARY

| Moment | Customer sees | Provider sees |
|--------|--------------|---------------|
| Booking created | "Finding a provider..." | Lead notification with service type + area |
| Provider accepts | Provider name, rating, photo | Customer name, full address, contact |
| Provider on the way | Live map tracking | Navigation to customer |
| Provider arrived | "Provider has arrived" | Job details |
| Job done, price same | Completion confirmation | Earnings credited |
| Job done, price different | Quotation to review & approve | Waiting for customer approval |
| Customer reviews | Rating submitted | Rating appears on profile |

---

## MONEY FLOW

```
Customer agrees the quotation of ₹1000 for AC Repair
        ↓
Customer pays the provider directly (cash / UPI — off-platform)
        ↓
Platform commission 10% = ₹100 → debited from the PROVIDER's wallet
        ↓
Provider's ledger records lifetime earnings ₹1000
        ↓
Provider requests withdrawal of their wallet balance
        ↓
Admin approves → money transferred to provider's bank
```

Two important rules:
- **Confirming a quotation charges no service fee** — the quotation's total is just the
  provider's price. The platform's 10% commission is a wallet debit against the provider,
  not a charge to the customer.
- **Cancelling after a quotation** (customer side) settles differently: the platform
  commission on the fixed fee (₹249 default) is debited from the provider's wallet, the
  provider keeps the ₹249 as compensation, and the customer wallet shows a display-only
  "Cancellation Fee" record (it is not a real charge — money never actually moves for it).

---

## PERMANENT / CONTRACT SERVICE REQUESTS

Customers can submit service requests that aren't a quick "book now" booking. Three
request types:

- **PERMANENT (recurring contract)** — for recurring services (e.g. monthly AC
  maintenance, weekly cleaning). Customer submits the contract details (engagement type,
  start date, monthly budget, etc.) and admin assigns a dedicated provider.
- **CUSTOM** — a one-off custom request with just a service name + description.
- **NO_PROVIDER** — the customer couldn't find a provider for a service. It requires only
  the service category, location and a short note; admin manually assigns a provider (see
  "What if no provider is available?" above).

Admin reviews everything in the **Permanent Service Requests** and **Manual Booking
Requests** tabs, approves/rejects with a note, and the customer gets notified once status
changes. A permanent request can also be cancelled by the customer.

---

## NOTIFICATIONS

Both customers and providers get real-time notifications for every important event:
- Booking accepted / cancelled / completed
- Provider on the way / arrived
- Quotation sent / approved / rejected
- Withdrawal processed
- New lead available (providers)
- Review received (providers)

Notifications appear instantly via live connection (no need to refresh the page).
