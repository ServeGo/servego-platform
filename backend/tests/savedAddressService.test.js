import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSavedAddress,
  listSavedAddresses,
  updateSavedAddress,
  deleteSavedAddress
} from '../services/savedAddressService.js';

// Pure unit tests (no DB): every savedAddressService function accepts a
// `client`, so a mock pins down the semantics without a database. Core
// contract under test: every operation is scoped to the owning user — a
// customer can never read, edit or delete another user's address, and deletes
// are idempotent (a second attempt is a miss, never an error).

let seq = 1;
const nextId = () => `addr_${seq++}`;

function makeClient(initial = []) {
  const store = { rows: [...initial], count: () => store.rows.length };
  store.savedAddress = {
    findMany: async ({ where, orderBy }) => {
      const filter = (r) => {
        if (where?.userId !== undefined && r.userId !== where.userId) return false;
        return true;
      };
      let list = store.rows.filter(filter);
      if (orderBy?.createdAt === 'desc') {
        list = [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      }
      return list;
    },
    count: async ({ where }) => store.rows.filter((r) => r.userId === where.userId).length,
    create: async ({ data }) => {
      const row = { id: nextId(), ...data, createdAt: data.createdAt ?? '2026-09-09T10:00:00.000Z' };
      store.rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }) => {
      const matches = store.rows.filter((r) => {
        if (where?.id !== undefined && r.id !== where.id) return false;
        if (where?.userId !== undefined && r.userId !== where.userId) return false;
        return true;
      });
      matches.forEach((r) => Object.assign(r, data));
      return { count: matches.length };
    },
    findUnique: async ({ where }) => store.rows.find((r) => r.id === where.id) || null,
    deleteMany: async ({ where }) => {
      const matches = store.rows.filter((r) => {
        if (where?.id !== undefined && r.id !== where.id) return false;
        if (where?.userId !== undefined && r.userId !== where.userId) return false;
        return true;
      });
      const ids = new Set(matches.map((r) => r.id));
      store.rows = store.rows.filter((r) => !ids.has(r.id));
      return { count: matches.length };
    }
  };
  return store;
}

test('createSavedAddress inserts a row owned by the user', async () => {
  const client = makeClient();
  const created = await createSavedAddress({
    userId: 'u1',
    label: 'Home',
    address: 'Lingampally, Hyderabad',
    latitude: 17.4,
    longitude: 78.5,
    client
  });
  assert.equal(created.userId, 'u1');
  assert.equal(created.label, 'Home');
  assert.equal(created.address, 'Lingampally, Hyderabad');
  assert.equal(client.rows.length, 1);
});

test('createSavedAddress defaults the label to Home and trims the address', async () => {
  const client = makeClient();
  const created = await createSavedAddress({ userId: 'u1', address: '  Madhapur  ', client });
  assert.equal(created.label, 'Home');
  assert.equal(created.address, 'Madhapur');
});

test('createSavedAddress enforces the per-user limit', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    id: `a${i}`, userId: 'u1', label: 'Home', address: `addr ${i}`
  }));
  const client = makeClient(rows);
  await assert.rejects(
    createSavedAddress({ userId: 'u1', label: 'Home', address: 'one too many', client }),
    (err) => err.code === 'SAVED_ADDRESS_LIMIT' && /20/.test(err.message)
  );
});

test('listSavedAddresses returns only this user\'s addresses, newest first', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1', createdAt: '2026-09-09T08:00:00.000Z' },
    { id: 'a2', userId: 'u1', createdAt: '2026-09-09T09:00:00.000Z' },
    { id: 'a3', userId: 'u2', createdAt: '2026-09-09T09:30:00.000Z' }
  ]);
  const addresses = await listSavedAddresses('u1', { client });
  assert.deepEqual(addresses.map((a) => a.id), ['a2', 'a1']);
});

test('updateSavedAddress edits only the user\'s own row and returns the fresh row', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1', label: 'Home', address: 'Old', latitude: 1, longitude: 2 },
    { id: 'a2', userId: 'u2', label: 'Home', address: 'Other user' }
  ]);
  const updated = await updateSavedAddress({
    userId: 'u1', addressId: 'a1', label: 'Work', address: 'New', client
  });
  assert.equal(updated.label, 'Work');
  assert.equal(updated.address, 'New');
  assert.equal(updated.latitude, 1, 'keeps unchanged coordinates');
  assert.equal(client.rows.find((r) => r.id === 'a2').address, 'Other user', 'never touches another user');
});

test('updateSavedAddress is a miss when the row belongs to another user', async () => {
  const client = makeClient([{ id: 'a2', userId: 'u2', label: 'Home', address: 'Other' }]);
  const result = await updateSavedAddress({ userId: 'u1', addressId: 'a2', address: 'Hijack', client });
  assert.equal(result, null);
  assert.equal(client.rows[0].address, 'Other');
});

test('deleteSavedAddress removes exactly the user\'s own address', async () => {
  const client = makeClient([
    { id: 'a1', userId: 'u1' },
    { id: 'a2', userId: 'u2' }
  ]);
  assert.equal(await deleteSavedAddress({ userId: 'u1', addressId: 'a1', client }), true);
  assert.deepEqual(client.rows.map((r) => r.id), ['a2']);
});

test('deleteSavedAddress is idempotent: deleting an already-deleted row is a miss', async () => {
  const client = makeClient([{ id: 'a1', userId: 'u1' }]);
  await deleteSavedAddress({ userId: 'u1', addressId: 'a1', client });
  assert.equal(await deleteSavedAddress({ userId: 'u1', addressId: 'a1', client }), false);
});

test('deleteSavedAddress never removes another user\'s address', async () => {
  const client = makeClient([{ id: 'a2', userId: 'u2' }]);
  assert.equal(await deleteSavedAddress({ userId: 'u1', addressId: 'a2', client }), false);
  assert.equal(client.rows.length, 1);
});