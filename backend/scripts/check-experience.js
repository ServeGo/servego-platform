import prisma from '../prisma/client.js';

const requests = await prisma.providerServiceRequest.findMany({
  select: {
    id: true,
    experienceYears: true,
    requestedServiceName: true,
    provider: {
      select: {
        experienceYears: true,
        user: { select: { name: true } }
      }
    }
  }
});
console.log('=== ProviderServiceRequests ===');
for (const r of requests) {
  console.log(`${r.provider?.user?.name} | ${r.requestedServiceName} | request.experienceYears=${r.experienceYears} | provider.experienceYears=${r.provider?.experienceYears}`);
}

const approved = await prisma.providerService.findMany({
  select: {
    id: true,
    provider: {
      select: {
        experienceYears: true,
        user: { select: { name: true } }
      }
    },
    service: { select: { name: true } }
  }
});
console.log('\n=== ProviderServices (Approved) ===');
for (const a of approved) {
  console.log(`${a.provider?.user?.name} | ${a.service?.name} | provider.experienceYears=${a.provider?.experienceYears}`);
}

await prisma.$disconnect();
