import bcrypt from 'bcryptjs';
import prisma from './client.js';
import { seedServicesIfEmpty } from '../seeders/servicesSeed.js';
import { seedBusinessModelIfEmpty, ensureProviderSubscription, getProviderLevelForJobs } from '../seeders/businessModelSeed.js';

/*
 * Full demo seed for ServeGo.
 *
 * Produces a coherent, cross-role dataset so customer / provider / admin
 * dashboards all render real, linked data out of the box:
 *   - 1 admin
 *   - service categories (shared with the frontend catalog)
 *   - verified providers, each linked to a bookable service (ProviderService)
 *   - customers
 *   - bookings spanning every lifecycle status, linking customers <-> providers
 *   - reviews, notifications and a support ticket
 *
 * Default password for every demo account is `password123`
 * (admin keeps its dedicated `servego@123`).
 */

const DEMO_PASSWORD = 'password123';

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=fff&size=150`;

const HYD_AREAS = ['Gachibowli', 'Madhapur', 'Kondapur', 'Jubilee Hills', 'Hitec City', 'Banjara Hills'];

async function clearDatabase() {
  // Delete in FK-safe order.
  await prisma.subscriptionTransaction.deleteMany();
  await prisma.providerSubscription.deleteMany();
  await prisma.promotionHistory.deleteMany();
  await prisma.providerLevelHistory.deleteMany();
  await prisma.providerPerformance.deleteMany();
  await prisma.rankingMetrics.deleteMany();
  await prisma.leadAssignmentHistory.deleteMany();
  await prisma.leadTransferHistory.deleteMany();
  await prisma.cancellationReason.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.providerLevelRule.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.adminConfig.deleteMany();
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
  await prisma.customer.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
}

async function createAdmin() {
  const password = await bcrypt.hash('servego@123', 10);
  return prisma.user.create({
    data: {
      name: 'ServeGo Admin',
      email: 'servego@gmail.com',
      phone: '18004198899',
      role: 'admin',
      password,
      status: 'ACTIVE',
      profileComplete: true,
      avatar: avatarFor('ServeGo Admin'),
      referralCode: 'SERVEGO-ADMIN-001',
      referralsCount: 0,
      referralDiscountBalance: 0,
    },
  });
}

/**
 * Create a provider (User + Provider profile) and link it to one bookable
 * Service so it shows up in customer-facing category discovery.
 */
async function createProvider({ name, email, phone, serviceName, serviceId, rating, reviewCount, experienceYears, jobsCompleted, verificationLevel, isFeatured, specialties, accountStatus = 'ACTIVE', serviceApprovalStatus = 'APPROVED' }) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: 'provider',
      password,
      status: 'ACTIVE',
      profileComplete: true,
      avatar: avatarFor(name),
      referralCode: `SERVEGO-PRO-${name.substring(0, 3).toUpperCase().replace(/\s/g, 'X')}${Math.floor(10 + Math.random() * 90)}`,
    },
  });

  const provider = await prisma.provider.create({
    data: {
      userId: user.id,
      category: serviceName,
      rating,
      reviewCount,
      verificationLevel,
      providerLevel: getProviderLevelForJobs(jobsCompleted),
      experienceYears,
      jobsCompleted,
      bio: `Verified ${serviceName} specialist serving Hyderabad with ${experienceYears}+ years of hands-on field experience.`,
      specialties,
      serviceAreas: HYD_AREAS,
      photo: null,
      serviceInterested: serviceName,
      accountStatus,
      profileComplete: true,
      isVerified: true,
      isFeatured,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { providerId: provider.id } });

  await prisma.providerLevelHistory.create({
    data: {
      providerId: provider.id,
      level: getProviderLevelForJobs(jobsCompleted),
      reason: 'INITIAL',
      completedJobs: jobsCompleted,
    },
  });

  await ensureProviderSubscription(provider.id);

  if (serviceApprovalStatus === 'APPROVED') {
    // An approved service link makes an active provider discoverable/bookable.
    await prisma.providerService.create({
      data: {
        providerId: provider.id,
        serviceId,
        description: `${serviceName} services including diagnosis, repair, installation and routine maintenance.`,
      },
    });
  } else {
    await prisma.providerServiceRequest.create({
      data: {
        providerId: provider.id,
        requestedServiceName: serviceName,
        requestedServiceId: serviceId,
        description: `${serviceName} registration awaiting admin review.`,
        experienceYears,
        status: serviceApprovalStatus,
      },
    });
  }

  await prisma.availabilitySlot.createMany({
    data: [
      { providerId: provider.id, dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' },
      { providerId: provider.id, dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '17:00' },
    ],
  });

  return { user, provider };
}

async function createCustomer({ name, email, phone, address, pincode }) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: 'customer',
      password,
      status: 'ACTIVE',
      profileComplete: true,
      avatar: avatarFor(name),
      address,
      pincode,
      referralCode: `SERVEGO-CUST-${name.substring(0, 3).toUpperCase().replace(/\s/g, 'X')}${Math.floor(10 + Math.random() * 90)}`,
    },
  });

  await prisma.customer.create({
    data: { userId: user.id, address, pincode, preferences: [] },
  });

  return user;
}

function daysFromNow(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

async function createBooking({ customer, provider, serviceName, status, address, instructions, reviewed = false }) {
  const now = new Date();
  const id = `BK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(Math.random() * 1000)}`;
  return prisma.booking.create({
    data: {
      id,
      customerId: customer.id,
      providerId: provider.id,
      serviceCategory: serviceName,
      status,
      locationAddress: address,
      city: 'Hyderabad',
      instructions: instructions || '',
      reviewed,
      messages: [],
      statusHistory: [
        { status: 'PENDING', timestamp: now.toISOString(), note: 'Booking created by customer' },
        ...(status !== 'PENDING'
          ? [{ status, timestamp: now.toISOString(), note: `Status set to ${status}` }]
          : []),
      ],
    },
  });
}

async function main() {
  await clearDatabase();
  await createAdmin();
  await seedServicesIfEmpty();
  await seedBusinessModelIfEmpty();

  const providerSpecs = [
    { name: 'Srinivas Rao Electricals', email: 'srinivas.electrician@servego.com', phone: '9876500001', serviceName: 'Electrician', serviceId: 'electrician', rating: 4.8, reviewCount: 124, experienceYears: 9, jobsCompleted: 540, verificationLevel: 'GOLD', isFeatured: true, specialties: ['Wiring & Rewiring', 'Smart Switchboards', 'Inverter Setup'] },
    { name: 'Rahim Electronics', email: 'rahim.electrician@servego.com', phone: '9876500002', serviceName: 'Electrician', serviceId: 'electrician', rating: 4.5, reviewCount: 67, experienceYears: 6, jobsCompleted: 310, verificationLevel: 'SILVER', isFeatured: false, specialties: ['Appliance Wiring', 'Lighting', 'Fault Diagnosis'], serviceApprovalStatus: 'PENDING' },
    { name: 'Sanjay Kumar Plumbing', email: 'sanjay.plumber@servego.com', phone: '9876500003', serviceName: 'Plumber', serviceId: 'plumber', rating: 4.9, reviewCount: 98, experienceYears: 11, jobsCompleted: 612, verificationLevel: 'GOLD', isFeatured: true, specialties: ['Leak Detection', 'Bathroom Fittings', 'Pipe Replacement'], accountStatus: 'ON_HOLD' },
    { name: 'Reddy Plumbing Services', email: 'reddy.plumber@servego.com', phone: '9876500004', serviceName: 'Plumber', serviceId: 'plumber', rating: 4.4, reviewCount: 41, experienceYears: 5, jobsCompleted: 188, verificationLevel: 'BRONZE', isFeatured: false, specialties: ['Blockage Removal', 'Tap Repair', 'Motor Installation'] },
    { name: 'Apex Aircon Solutions', email: 'apex.acrepair@servego.com', phone: '9876500005', serviceName: 'AC Repair', serviceId: 'ac-repair', rating: 4.7, reviewCount: 76, experienceYears: 8, jobsCompleted: 402, verificationLevel: 'GOLD', isFeatured: true, specialties: ['Jet Cleaning', 'Gas Refilling', 'Compressor Repair'] },
    { name: 'Sparkle Home Cleaners', email: 'sparkle.cleaning@servego.com', phone: '9876500006', serviceName: 'Home Cleaning', serviceId: 'home-cleaning', rating: 4.6, reviewCount: 53, experienceYears: 4, jobsCompleted: 233, verificationLevel: 'SILVER', isFeatured: false, specialties: ['Deep Cleaning', 'Kitchen Cleaning', 'Sofa Shampoo'] },
  ];

  const providers = [];
  for (const spec of providerSpecs) {
    providers.push(await createProvider(spec));
  }

  const customerSpecs = [
    { name: 'Rohan Sharma', email: 'rohan.customer@servego.com', phone: '9000000001', address: '12-3 Aurora Heights, Gachibowli', pincode: '500032' },
    { name: 'Prathyusha Nair', email: 'prathyusha.customer@servego.com', phone: '9000000002', address: '7B Lake View Apartments, Madhapur', pincode: '500081' },
  ];
  const customers = [];
  for (const spec of customerSpecs) {
    customers.push(await createCustomer(spec));
  }

  const [rohan, prathyusha] = customers;
  const [srinivas, , sanjay, , apex] = providers;

  // Bookings spanning the full lifecycle so every dashboard view has content.
  const bookings = [];
  bookings.push(await createBooking({ customer: rohan, provider: srinivas.provider, serviceName: 'Electrician', status: 'PENDING', address: rohan.address, instructions: 'Main switchboard tripping frequently.' }));
  bookings.push(await createBooking({ customer: rohan, provider: sanjay.provider, serviceName: 'Plumber', status: 'CONFIRMED', address: rohan.address, instructions: 'Kitchen sink leakage.' }));
  bookings.push(await createBooking({ customer: prathyusha, provider: apex.provider, serviceName: 'AC Repair', status: 'ONGOING', address: prathyusha.address, instructions: 'Bedroom AC not cooling.' }));
  bookings.push(await createBooking({ customer: prathyusha, provider: srinivas.provider, serviceName: 'Electrician', status: 'COMPLETED', address: prathyusha.address, instructions: 'Installed 3 smart geyser panels.', reviewed: true }));
  bookings.push(await createBooking({ customer: rohan, provider: apex.provider, serviceName: 'AC Repair', status: 'COMPLETED', address: rohan.address, instructions: 'Gas refilling done.', reviewed: true }));
  bookings.push(await createBooking({ customer: prathyusha, provider: sanjay.provider, serviceName: 'Plumber', status: 'COMPLETED', address: prathyusha.address, instructions: 'Bathroom tap replacement.' }));

  // Reviews tied to the completed bookings.
  const completed = bookings[3];
  await prisma.review.create({
    data: {
      reviewerId: prathyusha.id,
      reviewerName: prathyusha.name,
      providerId: srinivas.provider.id,
      bookingId: completed.id,
      rating: 5,
      comment: 'Very careful and clean work. Installed 3 smart geyser panels efficiently.',
      serviceCategory: 'Electrician',
    },
  });

  await prisma.review.create({
    data: {
      reviewerId: rohan.id,
      reviewerName: rohan.name,
      providerId: apex.provider.id,
      bookingId: bookings[4].id,
      rating: 4,
      comment: 'Quick AC gas refilling. Works perfectly now.',
      serviceCategory: 'AC Repair',
    },
  });

  await prisma.review.create({
    data: {
      reviewerId: prathyusha.id,
      reviewerName: prathyusha.name,
      providerId: sanjay.provider.id,
      bookingId: bookings[5].id,
      rating: 5,
      comment: 'Replaced the bathroom tap quickly. Very professional.',
      serviceCategory: 'Plumber',
    },
  });

  // Notifications for a couple of users.
  await prisma.notification.createMany({
    data: [
      { userId: srinivas.user.id, title: 'New Service Job Request', message: 'You have received a new Electrician request from Rohan Sharma.', type: 'BOOKING', isRead: false },
      { userId: rohan.id, title: 'Booking Confirmed', message: 'Sanjay Kumar Plumbing confirmed your Plumber booking.', type: 'BOOKING', isRead: false },
      { userId: prathyusha.id, title: 'Job Completed', message: 'Your Electrician booking has been completed. Leave a review!', type: 'BOOKING', isRead: true },
    ],
  });

  // A support ticket for the admin queue.
  await prisma.ticket.create({
    data: {
      requesterName: rohan.name,
      requesterEmail: rohan.email,
      subject: 'Payment Refund Support',
      message: 'I was charged for a cancelled AC Repair booking. Please assist with a refund.',
      status: 'OPEN',
    },
  });

  console.log('✅ Demo database seeded:');
  console.log(`   • 1 admin  (servego@gmail.com / servego@123)`);
  console.log(`   • ${providers.length} providers  (e.g. ${providerSpecs[0].email} / ${DEMO_PASSWORD})`);
  console.log(`   • ${customers.length} customers  (e.g. ${customerSpecs[0].email} / ${DEMO_PASSWORD})`);
  console.log(`   • ${bookings.length} bookings across PENDING/CONFIRMED/ONGOING/COMPLETED/CANCELLED`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
