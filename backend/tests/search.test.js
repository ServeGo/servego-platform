import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { rankedServiceMatches, resolveServiceForQuery } from '../services/searchService.js';
import { ProviderServiceDiscoveryController } from '../controllers/providerServiceDiscoveryController.js';

// DB-backed tests auto-skip when the database is unreachable (CI / offline).
const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

const dbTest = dbReady ? test : test.skip;

// Corpus uses names that cannot collide with real catalog data.
const PREFIX = 'searchtest';
const ROTOR_REPAIR = 'searchtest Rotor Repair & Services';
const ROTOR_INSTALL = 'searchtest Rotor Installation';
const VERMIN = 'searchtest Vermin Control';

const purge = async () => {
  if (!dbReady) return;
  await prisma.providerService.deleteMany({ where: { service: { name: { startsWith: PREFIX } } } });
  await prisma.provider.deleteMany({ where: { userId: 'searchtest-provider' } });
  await prisma.user.deleteMany({ where: { id: 'searchtest-provider' } });
  await prisma.service.deleteMany({ where: { name: { startsWith: PREFIX } } });
};
test.before(purge);
test.after(purge);

dbTest('seeds a small search corpus', async () => {
  await prisma.service.create({
    data: { name: ROTOR_REPAIR, description: 'Split, window and ducted unit repair' }
  });
  await prisma.service.create({
    data: { name: ROTOR_INSTALL, description: 'Split and window unit installation' }
  });
  await prisma.service.create({
    data: { name: VERMIN, description: 'Rodent, termite and cockroach removal' }
  });

  await prisma.user.create({
    data: {
      id: 'searchtest-provider',
      name: 'Search Test Pro',
      email: 'searchtest-provider@example.com',
      phone: '3333333333',
      role: 'provider',
      password: 'x',
      status: 'ACTIVE'
    }
  });
  const provider = await prisma.provider.create({
    data: {
      userId: 'searchtest-provider',
      category: ROTOR_REPAIR,
      isVerified: true,
      accountStatus: 'ACTIVE',
      rating: 4.9,
      reviewCount: 12,
      experienceYears: 7
    }
  });
  const repair = await prisma.service.findFirstOrThrow({ where: { name: ROTOR_REPAIR } });
  await prisma.providerService.create({ data: { providerId: provider.id, serviceId: repair.id } });
});

dbTest('empty query yields no matches', async () => {
  assert.deepEqual(await rankedServiceMatches('   '), []);
  assert.equal(await resolveServiceForQuery(''), null);
});

dbTest('exact name match ranks above prefix match', async () => {
  const ranked = await rankedServiceMatches(ROTOR_REPAIR.toLowerCase());
  const repair = await prisma.service.findFirstOrThrow({ where: { name: ROTOR_REPAIR } });
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].id, repair.id);
});

dbTest('prefix match beats fuzzy match', async () => {
  const ranked = await rankedServiceMatches('searchtest rotor rep');
  const repair = await prisma.service.findFirstOrThrow({ where: { name: ROTOR_REPAIR } });
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].id, repair.id);
});

dbTest('typos in the service name are tolerated', async () => {
  const ranked = await rankedServiceMatches('searchtest rotor reppair');
  const repair = await prisma.service.findFirstOrThrow({ where: { name: ROTOR_REPAIR } });
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].id, repair.id);
});

dbTest('description text is searchable at lower weight', async () => {
  const ranked = await rankedServiceMatches('termite');
  const vermin = await prisma.service.findFirstOrThrow({ where: { name: VERMIN } });
  assert.ok(ranked.some((r) => r.id === vermin.id));
});

dbTest('resolveServiceForQuery returns the canonical name for a typo', async () => {
  const resolved = await resolveServiceForQuery('searchtest rotor reppair');
  assert.ok(resolved);
  assert.equal(resolved.name, ROTOR_REPAIR);
});

dbTest('resolveServiceForQuery rejects garbage queries', async () => {
  assert.equal(await resolveServiceForQuery('zzzqqq qwzx nmber'), null);
});

dbTest('discovery returns providers for a fuzzy service request', async () => {
  let status = null;
  let body = null;
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; }
  };
  await ProviderServiceDiscoveryController.getApprovedProvidersByServiceName(
    { query: { serviceName: 'searchtest rotor reppair' } },
    res
  );
  assert.equal(status, 200);
  assert.ok(body.success);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].name, 'Search Test Pro');
  assert.equal(body.data[0].category, ROTOR_REPAIR);
});

dbTest('discovery 404s when the requested service is unknown', async () => {
  let status = null;
  let body = null;
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; }
  };
  await ProviderServiceDiscoveryController.getApprovedProvidersByServiceName(
    { query: { serviceName: 'zzzqqq qwzx' } },
    res
  );
  assert.equal(status, 404);
  assert.equal(body.success, false);
});
