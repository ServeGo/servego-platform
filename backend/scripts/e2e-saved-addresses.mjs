import { spawn } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = 4010;
const BASE = `http://localhost:${PORT}/api/v1`;

const child = spawn('node', ['server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});
child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
child.stderr.on('data', (d) => process.stdout.write(`[server-err] ${d}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`, { timeout: 3000 });
      if (r.ok) return true;
    } catch {}
    await sleep(1000);
  }
  throw new Error('server did not become healthy in time');
}

async function apiReq(path, { method = 'GET', token, body } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    timeout: 10000
  });
  const json = await r.json();
  return { status: r.status, json };
}

let exitCode = 1;
try {
  await waitForHealth();
  console.log('\n[test] server healthy on 4010');

  const user = await prisma.user.findFirst({ where: { role: 'customer' } });
  if (!user) throw new Error('no customer found');
  const JWT_SECRET = process.env.JWT_SECRET || 'servego-dev-secret';
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '15m' });

  // --- Saved addresses CRUD over HTTP ---
  const list0 = await apiReq('/saved-addresses', { token });
  console.log('[test] GET /saved-addresses ->', list0.status, 'count=', (list0.json.data?.savedAddresses || []).length);

  const created = await apiReq('/saved-addresses', {
    method: 'POST',
    token,
    body: { label: 'Home', address: 'Lingampally, Barkatpura, Hyderabad', latitude: 17.4, longitude: 78.48 }
  });
  console.log('[test] POST /saved-addresses ->', created.status, 'id=', created.json.data?.id, 'label=', created.json.data?.label);
  if (created.status !== 201) throw new Error('create failed');

  const patch = await apiReq(`/saved-addresses/${created.json.data.id}`, {
    method: 'PATCH',
    token,
    body: { label: 'Work', address: 'IT Park, Madhapur' }
  });
  console.log('[test] PATCH /saved-addresses/:id ->', patch.status, 'label=', patch.json.data?.label);

  const list1 = await apiReq('/saved-addresses', { token });
  console.log('[test] GET after create ->', list1.status, 'count=', (list1.json.data?.savedAddresses || []).length);

  const del = await apiReq(`/saved-addresses/${created.json.data.id}`, { method: 'DELETE', token });
  console.log('[test] DELETE /saved-addresses/:id ->', del.status, 'deleted=', del.json.data?.deleted);

  const list2 = await apiReq('/saved-addresses', { token });
  console.log('[test] GET after delete ->', list2.status, 'count=', (list2.json.data?.savedAddresses || []).length);

  // --- Custom service request over HTTP ---
  const psr = await apiReq('/permanent-service-requests', {
    method: 'POST',
    token,
    body: {
      requestType: 'CUSTOM',
      customServiceName: 'Smart Door Lock Installation',
      customDescription: 'Install a smart lock and configure the app',
      locationAddress: 'Madhapur, Hyderabad',
      serviceLatitude: 17.4483,
      serviceLongitude: 78.3915
    }
  });
  console.log('[test] POST /permanent-service-requests (CUSTOM) ->', psr.status, 'type=', psr.json.data?.requestType);
  if (psr.status === 201 && psr.json.data?.id) {
    await prisma.permanentServiceRequest.delete({ where: { id: psr.json.data.id } });
    console.log('[test] cleaned up custom request');
  }

  exitCode = 0;
} catch (err) {
  console.error('[test] FAILED:', err.message);
  exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await sleep(1500);
  if (!child.killed) child.kill('SIGKILL');
  await prisma.$disconnect();
  process.exit(exitCode);
}