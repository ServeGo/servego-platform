import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm,
  decodePolyline,
  getDrivingInfo,
  getRouteGeoJson,
  reverseGeocode,
  sortByRoadDistance,
  optimizeRoute
} from '../services/mapsService.js';

// These tests exercise the keyless (haversine) code path deterministically.
// Save/restore so a developer-local GOOGLE_MAPS_API_KEY cannot leak in.
const SAVED_KEY = process.env.GOOGLE_MAPS_API_KEY;
test.before(() => { delete process.env.GOOGLE_MAPS_API_KEY; });
test.after(() => {
  if (SAVED_KEY) process.env.GOOGLE_MAPS_API_KEY = SAVED_KEY;
});

test('haversineKm matches the known Paris–London great-circle distance', () => {
  const d = haversineKm(48.8566, 2.3522, 51.5074, -0.1278);
  assert.ok(d > 330 && d < 360, `expected ~343km, got ${d}km`);
});

test('decodePolyline decodes a known encoded polyline', () => {
  const coords = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.deepEqual(coords, [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 }
  ]);
});

test('getDrivingInfo without a Maps key falls back to haversine with no duration', async () => {
  const info = await getDrivingInfo({ latitude: 48.8566, longitude: 2.3522 }, { latitude: 51.5074, longitude: -0.1278 });
  assert.equal(info.durationMin, null);
  assert.ok(info.distanceKm > 330 && info.distanceKm < 360, `unexpected distance ${info.distanceKm}`);
});

test('getDrivingInfo returns nulls for invalid coordinates', async () => {
  const info = await getDrivingInfo({ latitude: 'bad', longitude: 2 }, { latitude: 51, longitude: 0 });
  assert.deepEqual(info, { distanceKm: null, durationMin: null });
});

test('getRouteGeoJson without a Maps key returns a straight-line GeoJSON', async () => {
  const line = await getRouteGeoJson({ latitude: 10, longitude: 20 }, { latitude: 30, longitude: 40 });
  assert.deepEqual(line, [[20, 10], [40, 30]]);
});

test('reverseGeocode returns null without a Maps key', async () => {
  assert.equal(await reverseGeocode({ latitude: 10, longitude: 20 }), null);
});

test('sortByRoadDistance orders stops nearest-first (haversine fallback)', async () => {
  const origin = { latitude: 0, longitude: 0 };
  const stops = [
    { id: 'far', coordinates: { latitude: 10, longitude: 10 } },
    { id: 'near', coordinates: { latitude: 1, longitude: 1 } }
  ];
  const ranked = await sortByRoadDistance(origin, stops);
  assert.equal(ranked[0].stop.id, 'near');
  assert.equal(ranked[1].stop.id, 'far');
  assert.ok(ranked[0].distanceKm < ranked[1].distanceKm);
});

test('optimizeRoute builds a sensible nearest-neighbour visit order', async () => {
  const origin = { latitude: 0, longitude: 0 };
  const stops = [
    { id: 'b', coordinates: { latitude: 5, longitude: 0 } },
    { id: 'a', coordinates: { latitude: 1, longitude: 0 } },
    { id: 'c', coordinates: { latitude: 9, longitude: 0 } }
  ];
  const route = await optimizeRoute(origin, stops);
  assert.deepEqual(route.map((r) => r.stop.id), ['a', 'b', 'c']);
  assert.equal(route[0].visitOrder, 1);
  assert.ok(route[1].distanceKm > 0);
});

test('optimizeRoute handles a single stop', async () => {
  const route = await optimizeRoute({ latitude: 0, longitude: 0 }, [{ id: 'only', coordinates: { latitude: 3, longitude: 0 } }]);
  assert.equal(route.length, 1);
  assert.equal(route[0].stop.id, 'only');
});
