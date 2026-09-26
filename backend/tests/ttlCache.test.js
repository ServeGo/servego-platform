import test from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlight, createTtlCache } from '../utils/ttlCache.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('ttl cache serves a value inside its window and drops it after', async () => {
  const cache = createTtlCache(40);
  cache.set('k', { a: 1 });
  assert.deepEqual(cache.get('k'), { a: 1 });
  await tick(60);
  assert.equal(cache.get('k'), undefined);
});

test('getStale returns an expired value so a failed refresh can still serve it', async () => {
  const cache = createTtlCache(10);
  cache.set('k', 'last-known-good');
  await tick(30);
  assert.equal(cache.get('k'), undefined, 'must be past its TTL');
  assert.equal(cache.getStale('k'), 'last-known-good', 'stale read must still work');
});

test('single flight collapses concurrent callers into one execution', async () => {
  const flight = createSingleFlight();
  let runs = 0;
  const load = async () => {
    runs += 1;
    await tick(20);
    return `run-${runs}`;
  };

  const results = await Promise.all([
    flight.run('catalog', load),
    flight.run('catalog', load),
    flight.run('catalog', load)
  ]);

  assert.equal(runs, 1, 'three concurrent callers must share one query');
  assert.deepEqual(results, ['run-1', 'run-1', 'run-1']);
});

test('single flight releases the key so the next caller re-runs', async () => {
  const flight = createSingleFlight();
  let runs = 0;
  const load = async () => {
    runs += 1;
    return runs;
  };

  await flight.run('k', load);
  assert.equal(flight.isBusy('k'), false);
  await flight.run('k', load);
  assert.equal(runs, 2);
});

test('a rejected flight is evicted instead of poisoning later callers', async () => {
  const flight = createSingleFlight();
  await assert.rejects(
    flight.run('k', async () => {
      throw new Error('database blip');
    })
  );
  assert.equal(flight.isBusy('k'), false);

  const recovered = await flight.run('k', async () => 'recovered');
  assert.equal(recovered, 'recovered');
});

test('single flight does not collapse different keys', async () => {
  const flight = createSingleFlight();
  let runs = 0;
  const load = async () => {
    runs += 1;
    await tick(10);
    return runs;
  };
  await Promise.all([flight.run('a', load), flight.run('b', load)]);
  assert.equal(runs, 2);
});
