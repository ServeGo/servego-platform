# Wallet & Earnings

## How does the provider wallet work?

Every provider has a **wallet** that tracks:
- **Lifetime earnings** — total quotation amounts from completed bookings (never decreases)
- **Commission paid** — platform commission debited per booking
- **Level incentives** — credits earned when levelling up
- **Withdrawals** — amounts paid out to your bank
- **Current balance** = Lifetime earnings − Commission paid + Level incentives − Withdrawals

The wallet balance can go **negative** (you owe commission). While negative, you **stop receiving new requests** until the balance is zero or positive.

## What is the platform commission?

- **Default rate: 10%** of the quotation total
- **Admin-configurable tiers** — different rates for different amount bands (e.g., 8% for ₹0–500, 10% for ₹500–2000, 12% for ₹2000+)
- **Always debited from provider's wallet** — never charged to the customer
- **Debited at booking completion** (when customer confirms quotation)

## How do provider levels work?

Providers level up by completing jobs. Levels unlock monthly incentives:

| Level | Monthly Jobs Required | Incentive (% of commission paid) |
|-------|----------------------|----------------------------------|
| Bronze | 0 (starting) | 0% |
| Silver | 5 | 5% |
| Gold | 15 | 10% |
| Platinum | 30 | 15% |
| Diamond | 50 | 20% |

- **Incentive calculation**: At month-end, you earn `commission_paid_this_month × incentive_percentage`
- Credited to your wallet automatically
- Your level **does not affect** which requests you receive — all eligible providers get the same broadcast

## How do withdrawals work?

- **Request from provider dashboard** → Admin reviews → Approves/Rejects → Bank transfer
- **Minimum**: ₹100 (admin-configurable)
- **Maximum**: No limit by default (admin-configurable)
- **Processing time**: Typically 1–3 business days after admin approval
- You can only withdraw when wallet balance is **positive**

## What happens if my wallet goes negative?

- Commission is debited at completion; if earnings < commission, balance goes negative
- **While negative**: You stop receiving new broadcast offers
- **To clear**: Complete more bookings (earnings > commission) or wait for level incentives
- **No penalty** beyond not receiving new requests — no interest, no account suspension

## Can I see my earnings history?

Yes. Your provider dashboard shows:
- **Earnings ledger** — every booking with quotation amount, commission, net
- **Monthly summary** — jobs completed, earnings, commission, incentives
- **Invoice download** — per completed booking (PDF)

## What are level incentives?

When you reach a new level, you get a **one-time welcome bonus** (admin-configurable).
Monthly, you earn a **percentage of the commission you paid** as a credit:

```
Monthly Incentive = Commission_Paid_This_Month × Level_Incentive_Percentage
```

Example: Gold provider (10% incentive) paid ₹2,000 commission this month → ₹200 credited to wallet.

---

### See also
- [Provider](./05-provider.md) — Provider signup and tools
- [Payments & Pricing](./06-payments-pricing.md) — Commission and withdrawals
- [Cancellation & Support](./07-cancellation-support.md) — Cancellation fee impact on wallet