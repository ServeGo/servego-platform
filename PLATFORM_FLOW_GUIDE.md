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
- Work is done

### 7. Payment & Completion
- Provider marks the job as "Completed"
- If the final price is different from the estimate, provider sends a **quotation**
- Customer reviews and confirms the quotation
- Payment is processed
- Customer can leave a **review and rating**

### 8. Other Customer Features
- **Saved Addresses** — save up to 3 addresses (Home, Office, Other)
- **Booking History** — see all past and current bookings
- **Support Tickets** — raise a complaint if something goes wrong
- **Referral Code** — share with friends, earn discount credits
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
- Provider marks "On the Way" when leaving
- Provider marks "Arrived" when at customer's location
- Does the work
- If price changes, sends a **quotation** to customer for approval
- Marks job as "Completed"

### 7. Earnings
- Earnings are credited to provider's **wallet** after job completion
- Platform takes a **10% commission** from each job
- Provider can request **withdrawal** of their wallet balance
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
- Common reasons a provider might not show up in the list:
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
Customer pays ₹1000 for AC Repair
        ↓
Platform takes 10% = ₹100 (commission)
        ↓
Provider earns ₹900 → credited to wallet
        ↓
Provider requests withdrawal
        ↓
Admin approves → money transferred to provider's bank
```

---

## REFERRAL SYSTEM

- Every customer gets a unique referral code (e.g. `SERVEGO-CUST-RAM45`)
- Share with a friend → friend signs up using the code
- Both get discount credits on their next booking
- Customer can see their referral count and total bonus earned

---

## PERMANENT / CONTRACT SERVICE REQUESTS

For customers who need **recurring services** (e.g. monthly AC maintenance, weekly cleaning):
- Customer submits a "Permanent Service Request"
- Admin reviews and assigns a dedicated provider
- Provider handles the customer on a contract basis
- Admin manages the entire contract lifecycle

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
