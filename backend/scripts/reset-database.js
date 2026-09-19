import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const aid = (await p.user.findUnique({ where: { email: 'servego@gmail.com' }, select: { id: true } })).id;
console.log('Admin:', aid);

const uid = (await p.$queryRawUnsafe(`SELECT id FROM "User" WHERE id <> $1`, aid)).map(r => r.id);
console.log('Non-admin users:', uid.length);

if (uid.length === 0) { console.log('Already clean.'); await p.$disconnect(); process.exit(0); }

const del = async (sql, params = []) => {
  const r = await p.$executeRawUnsafe(sql, ...params);
  if (r > 0) console.log(`  ${sql.match(/DELETE FROM "(\w+)"/)?.[1]}: ${r}`);
  return r;
};

let t = 0;

// Tier 3
t += await del(`DELETE FROM "LeadTransferHistory" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "LeadAssignmentHistory" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "CancellationReason" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "Quotation" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "BookingEvent" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "BookingLocationUpdate" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "Review" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "BookingInvoice" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "customerId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "WalletWithdrawalRequest" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "Lead" WHERE "customerId" = ANY($1)`, [uid]);

// Tier 2
t += await del(`DELETE FROM "Booking" WHERE "customerId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "WalletTransaction" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "PermanentServiceRequest" WHERE "customerId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "ProviderPerformance" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);

// Tier 1
t += await del(`DELETE FROM "ProviderServiceRequest" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "ProviderService" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "ProviderBadge" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "AvailabilitySlot" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "PromotionHistory" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "ProviderLevelHistory" WHERE "providerId" IN (SELECT id FROM "Provider" WHERE "userId" = ANY($1))`, [uid]);
t += await del(`DELETE FROM "Wallet" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "Notification" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "Alert" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "AuthEvent" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "CustomerAddress" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "Customer" WHERE "userId" = ANY($1)`, [uid]);
t += await del(`DELETE FROM "Provider" WHERE "userId" = ANY($1)`, [uid]);

// Tier 0
for (const tbl of ['Ticket','AuditLog','ProviderLevelRule','AdminConfig','Job','PlatformDailyStat','BusinessSequenceCounter','Service']) {
  t += await del(`DELETE FROM "${tbl}"`);
}

// Users last
t += await del(`DELETE FROM "User" WHERE id = ANY($1)`, [uid]);

const [{ count }] = await p.$queryRaw`SELECT COUNT(*)::int AS count FROM "User"`;
console.log(`\nTotal deleted: ${t} | Users remaining: ${count} (admin only)`);
await p.$disconnect();
