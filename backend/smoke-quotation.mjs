import prisma from './prisma/client.js';
import bcrypt from 'bcryptjs';

const API = 'http://localhost:4000/api/v1';
const RUN_K = Date.now().toString(36);
const CUST_EMAIL = `qtest.cust.${RUN_K}@servego.test`;
const PROV_EMAIL = `qtest.prov.${RUN_K}@servego.test`;
const PASSWORD = 'testpass123';

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${extra ? ' :: ' + extra : ''}`); }
}

async function api(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function seed() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  const cust = await prisma.user.create({
    data: {
      name: 'QTest Customer', email: CUST_EMAIL, phone: '9100000001', role: 'customer',
      password: hash, status: 'ACTIVE', verificationCode: '1234', latitude: 28.6139, longitude: 77.209
    }
  });
  await prisma.customer.create({ data: { userId: cust.id, address: 'Test St', pincode: '110001', preferences: [] } });

  const prov = await prisma.user.create({
    data: {
      name: 'QTest Provider', email: PROV_EMAIL, phone: '9100000002', role: 'provider',
      password: hash, status: 'ACTIVE'
    }
  });
  const provProfile = await prisma.provider.create({
    data: {
      userId: prov.id,
      category: 'Electrician',
      isVerified: true,
      accountStatus: 'ACTIVE',
      isOnline: true,
      acceptingBookings: true,
      latitude: 28.6139,
      longitude: 77.209,
      maxRadiusKm: 50,
      experienceYears: 5
    }
  });
  return { cust, prov, provProfile };
}

async function login(email) {
  const r = await api('POST', '/auth/login', null, { email, password: PASSWORD });
  return r.json?.data?.accessToken || null;
}

async function createBooking(custToken) {
  const r = await api('POST', '/bookings', custToken, {
    serviceCategory: 'Electrician',
    locationAddress: 'Sector 62, Noida',
    city: 'Noida',
    instructions: 'Smoke test booking',
    serviceLatitude: 28.6289,
    serviceLongitude: 77.3621
  });
  return r;
}

async function acceptLead(provToken, bookingId) {
  const leads = await api('GET', '/leads', provToken);
  const lead = (leads.json?.data?.leads || []).find((l) => l.bookingId === bookingId);
  if (!lead) return null;
  let acc = await api('PATCH', `/leads/${lead.id}/accept`, provToken, {});
  if (acc.json?.code === 'REQUEST_TIMEOUT') {
    await new Promise((res) => setTimeout(res, 3000));
    acc = await api('PATCH', `/leads/${lead.id}/accept`, provToken, {});
  }
  return acc;
}

async function completeBooking(provToken, bookingId) {
  let r = await api('PATCH', `/bookings/${bookingId}/complete`, provToken, {});
  // Interactive-transaction timeouts roll back atomically — the booking stays
  // ONGOING, so a bounded retry is safe and never double-applies money.
  if (r.json?.code === 'REQUEST_TIMEOUT' || r.json?.code === 'P2028') {
    await new Promise((res) => setTimeout(res, 3000));
    r = await api('PATCH', `/bookings/${bookingId}/complete`, provToken, {});
  }
  return r;
}

const seeded = await seed();
const custTok = await login(CUST_EMAIL);
const provTok = await login(PROV_EMAIL);
check('customer login', Boolean(custTok));
check('provider login', Boolean(provTok));

const adminLogin = await api('POST', '/auth/login', null, { email: 'servego@gmail.com', password: 'servego@123' });
const adminTok = adminLogin.json?.data?.accessToken;
check('admin login', Boolean(adminTok));

// ---- Booking 1: full quotation → confirm → complete with commission ----
let r = await createBooking(custTok);
check('create booking -> PENDING', r.status === 201 && r.json?.data?.booking?.status === 'PENDING', JSON.stringify(r.json));
const b1 = r.json.data.booking;

let acc = await acceptLead(provTok, b1.id);
check('provider accepts lead', acc?.status === 200 && acc.json?.data?.status === 'CONFIRMED', JSON.stringify(acc?.json)?.slice(0, 200));

r = await api('POST', `/bookings/${b1.id}/quotation`, provTok, {
  items: [
    { purpose: 'Component replacement', amount: 500 },
    { purpose: 'Diagnostic charge', amount: 200 }
  ]
});
check('quote submit 200 total 899', r.status === 200 && r.json?.data?.quotation?.totalAmount === 899 && r.json?.data?.quotation?.serviceFee === 199, JSON.stringify(r.json));
const q1 = r.json.data.quotation;

r = await api('POST', `/bookings/${b1.id}/quotation`, provTok, {
  items: [
    { purpose: 'Component replacement', amount: 500 },
    { purpose: 'Diagnostic charge', amount: 200 },
    { purpose: 'Revision extra', amount: 300 }
  ]
});
check('quote re-submit idempotent same id', r.status === 200 && r.json?.data?.quotation?.id === q1.id && r.json?.data?.quotation?.totalAmount === 1199, JSON.stringify(r.json));

r = await api('GET', `/bookings/${b1.id}/quotation`, custTok);
check('customer reads quotation', r.status === 200 && r.json?.data?.quotation?.status === 'SUBMITTED');

r = await api('POST', `/bookings/${b1.id}/quotation/confirm`, custTok, {});
check('customer confirms -> ONGOING', r.status === 200 && r.json?.data?.booking?.status === 'ONGOING' && r.json?.data?.quotation?.status === 'ACCEPTED', JSON.stringify(r.json));
check('booking amount = quotation total', r.json?.data?.booking?.amount === 1199, JSON.stringify(r.json?.data?.booking));

r = await api('POST', `/bookings/${b1.id}/quotation/confirm`, custTok, {});
check('duplicate confirm is handled no-op', r.status === 200 && r.json?.data?.handled === true);

r = await api('POST', `/bookings/${b1.id}/quotation/cancel`, custTok, {});
check('cancel on accepted quotation -> handled no-op', r.status === 200 && r.json?.data?.handled === true, JSON.stringify(r.json));

r = await completeBooking(provTok, b1.id);
check('provider completes booking', r.status === 200 && r.json?.data?.status === 'COMPLETED', JSON.stringify(r.json));

const b1row = await prisma.booking.findUnique({ where: { id: b1.id } });
check('commission 15% applied (1199 -> 179.85)', b1row.providerPlatformCharge === 179.85 && b1row.providerPayout === 1019.15, JSON.stringify(b1row));
const provWallet = await prisma.wallet.findUnique({ where: { userId: seeded.prov.id } });
// Customer pays the provider DIRECTLY — ServeGo is not part of that exchange.
// The platform's 15% cut is a wallet DEBIT → the provider's wallet goes
// NEGATIVE. The customer likewise gets a display-only spend entry (showcase).
check('provider wallet debited commission -179.85 (goes negative)', Number(provWallet?.balance || 0) === -179.85, JSON.stringify(provWallet));
const provCommission = await prisma.walletTransaction.count({ where: { userId: seeded.prov.id, category: 'COMMISSION', type: 'DEBIT' } });
check('provider COMMISSION debit ledger row', provCommission === 1, `provCommission=${provCommission}`);
const custWalletB1 = await prisma.wallet.findUnique({ where: { userId: seeded.cust.id } });
check('customer spend showcase: completed booking records -1199 (display-only)', Number(custWalletB1?.balance || 0) === -1199, JSON.stringify(custWalletB1));
const custPayment = await prisma.walletTransaction.findFirst({ where: { userId: seeded.cust.id, category: 'BOOKING_PAYMENT', type: 'DEBIT' }, orderBy: { createdAt: 'desc' } });
check('customer BOOKING_PAYMENT ledger row (1199) with booking reference', custPayment?.amount === 1199 && custPayment?.referenceType === 'BOOKING', JSON.stringify(custPayment));
const provLead = await prisma.lead.findUnique({ where: { bookingId: b1.id } });
check('lead COMPLETED', provLead?.status === 'COMPLETED', JSON.stringify(provLead));

// ---- Blocked-provider behaviour: negative wallet = no new leads ----
r = await createBooking(custTok);
const blockedB = r.json.data.booking;
const blockedAcc = await acceptLead(provTok, blockedB.id);
check('provider with NEGATIVE wallet gets NO new lead', blockedAcc === null, JSON.stringify(blockedAcc));
const blockedRow = await prisma.booking.findUnique({ where: { id: blockedB.id } });
check('blocked booking stays PENDING (no assignment)', blockedRow?.status === 'PENDING', JSON.stringify(blockedRow));

// Clear the platform dues → wallet exactly 0 → the provider is eligible again.
r = await api('POST', '/admin/wallet/credit', adminTok, { userId: seeded.prov.id, amount: 179.85, category: 'ADJUSTMENT', description: 'smoke: clear commission dues' });
check('admin clears provider dues (balance -> 0)', r.status === 200 || r.status === 201, JSON.stringify(r.json));
const clearedWallet = await prisma.wallet.findUnique({ where: { userId: seeded.prov.id } });
check('provider wallet exactly 0 after clearing', Number(clearedWallet?.balance || 0) === 0, JSON.stringify(clearedWallet));

// The blocked booking is still PENDING — the customer must cancel it manually
// (the "one booking at a time" rule) so the decline scenarios can proceed.
r = await api('PATCH', `/bookings/${blockedB.id}/cancel`, custTok, { note: 'No longer needed (smoke blocked-lead cleanup).' });
check('customer cancels the stalled PENDING booking', r.status === 200 && r.json?.data?.status === 'CANCELLED', JSON.stringify(r.json?.data));

// ---- Booking 2: decline quotation -> billed fee, provider compensated ----
r = await createBooking(custTok);
const b2 = r.json.data.booking;
acc = await acceptLead(provTok, b2.id);
check('b2 accepted CONFIRMED', acc?.status === 200 && acc.json?.data?.status === 'CONFIRMED');
await api('POST', `/bookings/${b2.id}/quotation`, provTok, { items: [] });

let custWallet = await prisma.wallet.findUnique({ where: { userId: seeded.cust.id } });
r = await api('POST', `/bookings/${b2.id}/quotation/cancel`, custTok, { anotherProvider: false });
check('b2 decline succeeds (no INSUFFICIENT_BALANCE gate)', r.status === 200 && r.json?.data?.cancelled === true && r.json?.data?.feeDebited === true, JSON.stringify(r.json?.data));
const b2row = await prisma.booking.findUnique({ where: { id: b2.id } });
check('b2 booking CANCELLED', b2row?.status === 'CANCELLED');
custWallet = await prisma.wallet.findUnique({ where: { userId: seeded.cust.id } });
check('b2 customer billed fee -199 (-1199 -199 = -1398)', Number(custWallet?.balance || 0) === -1398, JSON.stringify(custWallet));
let feeEntries = await prisma.walletTransaction.count({ where: { userId: seeded.cust.id, category: 'SERVICE_FEE' } });
check('b2 exactly one SERVICE_FEE bill row', feeEntries === 1, `feeEntries=${feeEntries}`);
const provWallet2 = await prisma.wallet.findUnique({ where: { userId: seeded.prov.id } });
check('b2 provider credited fee 199 (0+199)', Number(provWallet2?.balance || 0) === 199, JSON.stringify(provWallet2));
const provFeeCredits = await prisma.walletTransaction.count({ where: { userId: seeded.prov.id, category: 'SERVICE_FEE', type: 'CREDIT' } });
check('b2 provider SERVICE_FEE credit row', provFeeCredits === 1, `provFeeCredits=${provFeeCredits}`);

r = await api('POST', `/bookings/${b2.id}/quotation/cancel`, custTok, { anotherProvider: false });
check('duplicate cancel handled, no second fee', r.status === 200 && r.json?.data?.handled === true);
const feeEntries2 = await prisma.walletTransaction.count({ where: { userId: seeded.cust.id, category: 'SERVICE_FEE' } });
check('b2 still exactly one SERVICE_FEE row', feeEntries2 === 1);

// ---- Booking 3: decline -> another provider - must give a reason ----
r = await createBooking(custTok);
const b3 = r.json.data.booking;
acc = await acceptLead(provTok, b3.id);
check('b3 accepted CONFIRMED', acc?.status === 200 && acc.json?.data?.status === 'CONFIRMED');
await api('POST', `/bookings/${b3.id}/quotation`, provTok, { items: [] });

r = await api('POST', `/bookings/${b3.id}/quotation/cancel`, custTok, { anotherProvider: true });
check('b3 find-other without reason -> REASON_REQUIRED', r.status === 409 && r.json?.code === 'REASON_REQUIRED', JSON.stringify(r.json));

r = await api('POST', `/bookings/${b3.id}/quotation/cancel`, custTok, { anotherProvider: true, note: 'Provider arrived late — I want a different specialist.' });
check('b3 decline-other (with reason) -> settled CANCELLED', r.status === 200 && r.json?.data?.cancelled === true, JSON.stringify(r.json?.data));
const b3row = await prisma.booking.findUnique({ where: { id: b3.id } });
const b3lead = await prisma.lead.findUnique({ where: { bookingId: b3.id } });
check('b3 booking CANCELLED + lead EXPIRED', b3row?.status === 'CANCELLED' && b3lead?.status === 'EXPIRED', JSON.stringify({ b3row, b3lead }));
const feeEntries3 = await prisma.walletTransaction.count({ where: { userId: seeded.cust.id, category: 'SERVICE_FEE' } });
check('b3 billed once (total 2 fees)', feeEntries3 === 2, `feeEntries=${feeEntries3}`);
custWallet = await prisma.wallet.findUnique({ where: { userId: seeded.cust.id } });
check('b3 customer billed -199 (balance -1597)', Number(custWallet?.balance || 0) === -1597, JSON.stringify(custWallet));
const provWallet3 = await prisma.wallet.findUnique({ where: { userId: seeded.prov.id } });
check('b3 provider credited fee 199 (199+199=398)', Number(provWallet3?.balance || 0) === 398, JSON.stringify(provWallet3));

// ---- cleanup (best-effort; chained test data may keep rows) ----
await Promise.allSettled([
  prisma.provider.deleteMany({ where: { userId: seeded.prov.id } }),
  prisma.customer.deleteMany({ where: { userId: seeded.cust.id } }),
  prisma.user.deleteMany({ where: { id: { in: [seeded.cust.id, seeded.prov.id] } } }),
]);

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
