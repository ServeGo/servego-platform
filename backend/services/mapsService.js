/**
 * Maps & routing service with a Google-Maps-first, haversine-fallback design.
 *
 * Every call is key-gated on `GOOGLE_MAPS_API_KEY`. When the key is absent
 * (dev / no billing) the service transparently falls back to great-circle
 * (haversine) math so the rest of the platform keeps working. When a
 * billing-enabled key with the Geocoding, Directions and Distance Matrix APIs
 * enabled is added later, the same call sites silently upgrade to real road
 * routing, reverse geocoding and travel-time ETA — no code changes needed.
 *
 * All network calls fail closed: any Maps API error/timeout degrades to the
 * haversine fallback rather than throwing into the request path.
 */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (Number(deg) * Math.PI) / 180;

/** Great-circle distance in km between two coordinates. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isMapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

function mapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY || '';
}

/** Valid latitude/longitude pair, else null. */
function normalizePoint(point) {
  const lat = Number(point?.latitude ?? point?.lat);
  const lng = Number(point?.longitude ?? point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function pointToString({ latitude, longitude }) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

async function googleFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Maps API HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error(`Maps API status ${json.status}`);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Travel information between two points.
 * - With Maps: road distance (km) + driving duration (minutes) via Distance Matrix.
 * - Without Maps: haversine distance (km), duration null.
 */
export async function getDrivingInfo(origin, destination) {
  const o = normalizePoint(origin);
  const d = normalizePoint(destination);
  if (!o || !d) return { distanceKm: null, durationMin: null };

  if (isMapsConfigured()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pointToString(o)}&destinations=${pointToString(d)}&mode=driving&units=metric&key=${mapsKey()}`;
      const json = await googleFetch(url);
      const element = json.rows?.[0]?.elements?.[0];
      if (element?.distance && element?.duration) {
        return {
          distanceKm: element.distance.value / 1000,
          durationMin: Math.round(element.duration.value / 60)
        };
      }
    } catch {
      /* fail closed to haversine */
    }
  }

  return { distanceKm: haversineKm(o.latitude, o.longitude, d.latitude, d.longitude), durationMin: null };
}

/**
 * Route geometry as a GeoJSON LineString coordinate array (`[lng, lat]` pairs).
 * - With Maps: the road route's encoded overview polyline, decoded.
 * - Without Maps: a straight line between origin and destination.
 */
export async function getRouteGeoJson(origin, destination) {
  const o = normalizePoint(origin);
  const d = normalizePoint(destination);
  if (!o || !d) return null;

  if (isMapsConfigured()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pointToString(o)}&destination=${pointToString(d)}&mode=driving&key=${mapsKey()}`;
      const json = await googleFetch(url);
      const polyline = json.routes?.[0]?.overview_polyline?.points;
      if (polyline) {
        const coords = decodePolyline(polyline).map(({ latitude, longitude }) => [longitude, latitude]);
        if (coords.length >= 2) return coords;
      }
    } catch {
      /* fail closed to straight line */
    }
  }

  return [
    [o.longitude, o.latitude],
    [d.longitude, d.latitude]
  ];
}

/**
 * Reverse geocode a coordinate into a human-readable address.
 * - With Maps: Google Geocoding `formatted_address`.
 * - Without Maps: null (caller falls back to the stored/typed address).
 */
export async function reverseGeocode(point) {
  const p = normalizePoint(point);
  if (!p || !isMapsConfigured()) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pointToString(p)}&key=${mapsKey()}`;
    const json = await googleFetch(url);
    return json.results?.[0]?.formatted_address || null;
  } catch {
    return null;
  }
}

/**
 * Sort a list of stops by distance from an origin.
 * - With Maps: one batched Distance Matrix call (road distance).
 * - Without Maps: haversine.
 * Returns the input stops (with `distanceKm` and `etaMinutes` attached, the
 * latter only when a road duration is available).
 */
export async function sortByRoadDistance(origin, stops, { top = null } = {}) {
  const o = normalizePoint(origin);
  if (!o || !Array.isArray(stops) || !stops.length) return [];

  let ranked;
  if (isMapsConfigured()) {
    try {
      const dests = stops.map((s) => normalizePoint(s.coordinates || s)).filter(Boolean);
      if (dests.length === stops.length) {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pointToString(o)}&destinations=${dests.map(pointToString).join('|')}&mode=driving&units=metric&key=${mapsKey()}`;
        const json = await googleFetch(url);
        const elements = json.rows?.[0]?.elements || [];
        ranked = stops.map((stop, i) => {
          const element = elements[i] || {};
          const distanceKm = element.distance ? element.distance.value / 1000 : haversineKm(o.latitude, o.longitude, normalizePoint(stop.coordinates || stop).latitude, normalizePoint(stop.coordinates || stop).longitude);
          const etaMinutes = element.duration ? Math.round(element.duration.value / 60) : null;
          return { stop, distanceKm, etaMinutes };
        });
      }
    } catch {
      /* fall through to haversine */
    }
  }

  if (!ranked) {
    ranked = stops.map((stop) => {
      const p = normalizePoint(stop.coordinates || stop);
      const distanceKm = p ? haversineKm(o.latitude, o.longitude, p.latitude, p.longitude) : null;
      return { stop, distanceKm, etaMinutes: null };
    });
  }

  ranked.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  return top ? ranked.slice(0, top) : ranked;
}

/**
 * Nearest-neighbour route optimizer for a provider's upcoming jobs.
 * - With Maps: road distances via the Distance Matrix API.
 * - Without Maps: haversine (straight-line) distances.
 * Returns stops re-ordered as [firstStop, secondStop, ...] with per-stop
 * `distanceKm`/`etaMinutes` from the previous stop.
 */
export async function optimizeRoute(origin, stops) {
  const o = normalizePoint(origin);
  if (!o || !Array.isArray(stops) || stops.length === 0) return [];
  if (stops.length === 1) {
    const info = await getDrivingInfo(o, stops[0].coordinates || stops[0]);
    return [{ stop: stops[0], distanceKm: info.distanceKm, etaMinutes: info.durationMin, visitOrder: 1 }];
  }

  // Build a full distance matrix (road when configured, haversine otherwise).
  const n = stops.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const points = stops.map((s) => normalizePoint(s.coordinates || s));
  const valid = points.every((p) => p !== null);
  if (!valid) return stops.map((stop, i) => ({ stop, distanceKm: null, etaMinutes: null, visitOrder: i + 1 }));

  if (isMapsConfigured()) {
    try {
      const destString = points.map(pointToString).join('|');
      const originString = [o, ...points].map(pointToString).join('|');
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originString}&destinations=${destString}&mode=driving&units=metric&key=${mapsKey()}`;
      const json = await googleFetch(url);
      const rows = json.rows || [];
      const dist = (i, j) => rows[i + 1]?.elements?.[j]?.distance?.value ?? null;
      const dur = (i, j) => rows[i + 1]?.elements?.[j]?.duration?.value ?? null;
      const fromOrigin = (i) => dist(i, i);
      const isRoad = rows.length > 0 && rows[1]?.elements?.[0]?.distance;
      if (isRoad) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j) matrix[i][j] = dist(i, j);
          }
        }
        return nearestNeighbor(n, matrix, fromOrigin, dur, stops);
      }
    } catch {
      /* fall through to haversine matrix */
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) matrix[i][j] = haversineKm(points[i].latitude, points[i].longitude, points[j].latitude, points[j].longitude);
    }
  }
  const fromOrigin = (i) => haversineKm(o.latitude, o.longitude, points[i].latitude, points[i].longitude);
  return nearestNeighbor(n, matrix, fromOrigin, null, stops);
}

function nearestNeighbor(n, matrix, fromOrigin, durationAccessor, stops) {
  const visited = new Set();
  const order = [];
  let cursor = -1;
  let prevDistance = 0;
  let prevDuration = 0;

  for (let step = 0; step < n; step++) {
    let next = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const cost = cursor === -1 ? fromOrigin(i) : matrix[cursor][i];
      if (cost != null && cost < best) {
        best = cost;
        next = i;
      }
    }
    if (next === -1) break;
    const distanceKm = cursor === -1 ? fromOrigin(next) : matrix[cursor][next];
    const etaMinutes = cursor === -1 || !durationAccessor ? null : durationAccessor(cursor, next) != null ? Math.round(durationAccessor(cursor, next) / 60) : null;
    order.push({ stop: stops[next], distanceKm: distanceKm != null ? Number(distanceKm.toFixed(2)) : null, etaMinutes, visitOrder: step + 1 });
    prevDistance = distanceKm;
    prevDuration = etaMinutes;
    visited.add(next);
    cursor = next;
  }
  return order;
}

/**
 * Decode a Google encoded polyline into [{ latitude, longitude }, ...].
 * Standard algorithm — no external dependency.
 */
export function decodePolyline(encoded) {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}
