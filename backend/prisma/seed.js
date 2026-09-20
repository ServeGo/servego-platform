import bcrypt from 'bcryptjs';
import prisma from './client.js';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'servego24@gmail.com' } });
  if (existing) {
    console.log('✅ Admin already exists — skipping.');
    return;
  }

  const password = await bcrypt.hash('servego24@123', 10);
  await prisma.user.create({
    data: {
      name: 'ServeGo Admin',
      email: 'servego24@gmail.com',
      phone: '18004198899',
      role: 'admin',
      password,
      status: 'ACTIVE',
      profileComplete: true
    },
  });

  console.log('✅ Admin created: servego24@gmail.com / servego24@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
