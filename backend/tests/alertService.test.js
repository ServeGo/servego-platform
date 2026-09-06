import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAlert,
  listAlerts,
  reviewAlert,
  reviewAllAlerts,
  consumeAlertsByData
} from '../services/alertService.js';

// Pure unit tests (no DB): every alertService function accepts a `client`, so a
// mock pins down the semantics without a database. Core contract under test:
// alerts are read-once rows — reviewing DELETES them and broadcasts over the
// socket; consuming by JSON data is advisory (never throws).

const createdAt = '2026-09-06T10:00:00.000Z';

function makeClient(initial = []) {
  // NOTE: methods must reference `store` (not a bare `client`) so the mock
  // works even though the caller names its own binding `client`.
  const store = { rows: [...initial], deleted: [] };
  const dataField = (where, row) => {
    if (!where?.data?.path || where?.data?.equals === undefined) return null;
    const val = where.data.path.reduce((acc, k) => acc?.[k], row.data);
    return val === where.data.equals;
  };
  store.alert = {
    create: async ({ data }) => {
      const row = { ...data, createdAt: data.createdAt ?? createdAt };
      store.rows.push(row);
      return row;
    },
    findMany: async ({ where, orderBy, take }) => {
      let list = store.rows.filter((r) => !where || where.userId === undefined || r.userId === where.userId);
      if (where?.data?.path && where?.data?.equals !== undefined) {
        list = list.filter((r) => dataField(where, r));
      }
      const sortDescriptor = Array.isArray(orderBy) ? orderBy[0] : orderBy;
      if (sortDescriptor?.createdAt === 'desc') {
        list = [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      }
      return list.slice(0, take ?? list.length);
    },
    deleteMany: async ({ where }) => {
      const match = store.rows.filter((r) => {
        if (where?.userId !== undefined && r.userId !== where.userId) return false;
        if (where?.id !== undefined && r.id !== where.id) return false;
        if (where?.type !== undefined && r.type !== where.type) return false;
        if (where?.data?.path && where?.data?.equals !== undefined && !dataField(where, r)) return false;
        return true;
      });
      const ids = new Set(match.map((r) => r.id));
      match.forEach((r) => store.deleted.push(r.id));
      store.rows = store.rows.filter((r) => !ids.has(r.id));
      return { count: match.length };
    }
  };
  return store;
}

test('createAlert inserts a row and emits the socket event', async () => {
  const client = makeClient();
  const emitted = [];
  const io = { to: (room) => ({ emit: (event, data) => emitted.push({ room, event, data }) }) };
  const alert = await createAlert({
    userId: 'u1',
    title: 'Quotation Received',
    message: '₹1,200 quotation is ready.',
    type: 'QUOTATION',
    data: { bookingId: 'b1' },
    io,
    client
  });

  assert.ok(alert?.id, 'assigns a stable id');
  assert.match(alert.id, /^alrt_/);
  assert.equal(client.rows.length, 1);
  assert.equal(client.rows[0].userId, 'u1');
  assert.equal(client.rows[0].data.bookingId, 'b1');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].room, 'user:u1');
  assert.equal(emitted[0].event, 'alert');
  assert.equal(emitted[0].data.id, alert.id);
});

test('createAlert returns null without a user id / title (no row, no emit)', async () => {
  const client = makeClient();
  const emitted = [];
  const io = { to: () => ({ emit: (...args) => emitted.push(args) }) };
  assert.equal(await createAlert({ userId: '', title: 'x', io, client }), null);
  assert.equal(await createAlert({ userId: 'u1', title: '', io, client }), null);
  assert.equal(client.rows.length, 0);
  assert.equal(emitted.length, 0);
});

test('createAlert tolerates a DB failure (returns null, never throws)', async () => {
  const client = {
    alert: { create: async () => { throw new Error('db down'); } },
    rows: [], deleted: []
  };
  const alert = await createAlert({ userId: 'u1', title: 'T', message: 'M', client });
  assert.equal(alert, null);
});

test('listAlerts returns only this user\'s alerts, newest first, bounded', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1', createdAt: '2026-09-06T08:00:00.000Z' },
    { id: 'a2', userId: 'u1', createdAt: '2026-09-06T09:00:00.000Z' },
    { id: 'a3', userId: 'u2', createdAt: '2026-09-06T09:30:00.000Z' }
  ]);
  const alerts = await listAlerts('u1', { client });
  assert.deepEqual(alerts.map((a) => a.id), ['a2', 'a1']);
});

test('reviewAlert deletes exactly this user\'s alert and emits alert:reviewed', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1' },
    { id: 'a2', userId: 'u1' }
  ]);
  const emitted = [];
  const io = { to: (room) => ({ emit: (event, data) => emitted.push({ room, event, data }) }) };
  const result = await reviewAlert({ userId: 'u1', alertId: 'a1', io, client });

  assert.deepEqual(result, { reviewed: true, alertId: 'a1' });
  assert.deepEqual(client.rows.map((r) => r.id), ['a2']);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event, 'alert:reviewed');
  assert.equal(emitted[0].data.alertId, 'a1');
});

test('reviewAlert is idempotent: reviewing an already-deleted alert is a miss, not an error', async () => {
  const client = makeClient([{ id: 'a1', userId: 'u1' }]);
  await reviewAlert({ userId: 'u1', alertId: 'a1', client });
  const second = await reviewAlert({ userId: 'u1', alertId: 'a1', client });
  assert.deepEqual(second, { reviewed: false, alertId: 'a1' });
});

test('reviewAlert never touches another user\'s alert', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1' },
    { id: 'a2', userId: 'u2' }
  ]);
  const result = await reviewAlert({ userId: 'u1', alertId: 'a2', client });
  assert.equal(result.reviewed, false);
  assert.equal(client.rows.length, 2);
});

test('reviewAllAlerts clears only this user\'s alerts and emits alert:cleared', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1' },
    { id: 'a2', userId: 'u1' },
    { id: 'a3', userId: 'u2' }
  ]);
  const emitted = [];
  const io = { to: () => ({ emit: (event) => emitted.push(event) }) };
  const result = await reviewAllAlerts({ userId: 'u1', io, client });

  assert.deepEqual(result, { reviewed: 2 });
  assert.deepEqual(client.rows.map((r) => r.id), ['a3']);
  assert.deepEqual(emitted, ['alert:cleared']);
});

test('consumeAlertsByData removes only alerts whose JSON data field matches', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1', type: 'LEAD', data: { leadId: 'lead-1' } },
    { id: 'a2', userId: 'u1', type: 'LEAD', data: { leadId: 'lead-2' } },
    { id: 'a3', userId: 'u1', type: 'QUOTATION', data: { leadId: 'lead-1' } }
  ]);
  const count = await consumeAlertsByData({ userId: 'u1', type: 'LEAD', key: 'leadId', value: 'lead-1', client });
  assert.equal(count, 1);
  assert.deepEqual(client.rows.map((r) => r.id), ['a2', 'a3']);
});

test('consumeAlertsByData tolerates a mock that lacks an alert store', async () => {
  const mock = { rows: [] };
  const count = await consumeAlertsByData({ userId: 'u1', type: 'LEAD', key: 'leadId', value: 'x', client: mock });
  assert.equal(count, 0);
});

test('consumeAlertsByData tolerates a DB failure without throwing', async () => {
  const client = {
    alert: { deleteMany: async () => { throw new Error('db down'); } }
  };
  const count = await consumeAlertsByData({ userId: 'u1', type: 'LEAD', key: 'leadId', value: 'x', client });
  assert.equal(count, 0);
});