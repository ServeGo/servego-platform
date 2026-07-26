/**
 * Wipe all data except the admin user and re-seed 20 services.
 *
 * Usage:  node scripts/cleanup-db.js
 */
import prisma from '../prisma/client.js';
import { seedServicesIfEmpty } from '../seeders/servicesSeed.js';

const ADMIN_EMAIL = 'servego@gmail.com';

async function main() {
  console.log('🗑  Deleting all data except admin user …');

  // FK-safe deletion order (children first)
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookingEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.savedPro.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.providerServiceRequest.deleteMany();
  await prisma.providerBadge.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.authEvent.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.service.deleteMany();

  // Delete all users EXCEPT admin
  await prisma.user.deleteMany({ where: { role: { not: 'admin' } } });

  console.log('✅ All non-admin data removed');

  // Ensure services table is empty so seedServicesIfEmpty always runs
  await seedServicesIfEmpty();

  const serviceCount = await prisma.service.count();
  const userCount = await prisma.user.count();
  console.log(`\n📊 Final state: ${userCount} user(s), ${serviceCount} services`);
}

main()
  .catch((e) => { console.error('❌ Cleanup failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
