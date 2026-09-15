import bcrypt from 'bcryptjs';
import prisma from './client.js';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'servego@gmail.com' } });
  if (existing) {
    console.log('✅ Admin already exists — skipping.');
    return;
  }

  const password = await bcrypt.hash('servego@123', 10);
  await prisma.user.create({
    data: {
      name: 'ServeGo Admin',
      email: 'servego@gmail.com',
      phone: '18004198899',
      role: 'admin',
      password,
      status: 'ACTIVE',
      profileComplete: true,
      referralCode: 'SERVEGO-ADMIN-001',
      referralsCount: 0,
      referralDiscountBalance: 0,
    },
  });

  console.log('✅ Admin created: servego@gmail.com / servego@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
