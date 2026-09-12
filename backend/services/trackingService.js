import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';
import { getDrivingInfo, getRouteGeoJson } from './mapsService.js';
import { notifyProviderOnTheWay, notifyProviderArrived } from './notificationService.js';
import { appendStatusHistory } from '../utils/statusHistory.js';
import { socketMetrics } from './socketMetrics.js';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (Number(deg) * Math.PI) / 180;

// In-memory live-tracking registry, keyed by booking id. The socket path is a
// fast broadcast channel: latest coords live here so the room can be fed from
// memory between persistence ticks, and PostgreSQL only touches a booking when
// the configured minimum interval has elapsed (bounded writes regardless of
// client cadence — the audit's "1,000 providers × 1 update/sec = 1,000
// events/sec" case). Capped + pruned so it never grows without bound.
const liveFixes = new Map(); // bookingId -> { lat, lng, at, persistedAt, dest, destAddress }
const routeCache = new Map(); // bookingId -> { distanceKm, etaMinutes, routePolyline, at }
const MAPS_CACHE_TTL_MS = 15_000;
const LIVE_FIX_IDLE_MS = 30 * 60_000;
const MAX_LIVE_FIXES = 5000;

function pruneLiveFixes(now = Date.now()) {
  if (liveFixes.size < MAX_LIVE_FIXES) return;
  for (const [id, fix] of liveFixes) {
    if (now - fix.at > LIVE_FIX_IDLE_MS) liveFixes.delete(id);
  }
}

function dropLiveFix(bookingId) {
  liveFixes.delete(bookingId);
  routeCache.delete(bookingId);
}

/** Fresh cached Maps result for a booking, or undefined to recompute. */
function cachedMaps(bookingId, now = Date.now()) {
  const hit = routeCache.get(bookingId);
  if (hit && now - hit.at < MAPS_CACHE_TTL_MS) return hit;
  return undefined;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoord(value) {
  return value != null && Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * ETA (minutes) from straight-line distance at the configured average speed.
 * Returns null when inputs are missing/invalid.
 */
export async function computeEtaMinutes(distanceKm) {
  if (distanceKm == null || !Number.isFinite(Number(distanceKm))) return null;
  const speedKph = Number(await getConfig('etaBaseSpeedKph', 30)) || 30;
  const etaHours = Math.max(0, Number(distanceKm)) / Math.max(1, speedKph);
  return Math.max(1, Math.round(etaHours * 60));
}

/** Resolve the destination coordinates for a booking (endLocation > customer coords). */
export async function resolveBookingDestination(booking, client = prisma) {
  const end = booking.endLocation && typeof booking.endLocation === 'object' ? booking.endLocation : null;
  if (end && isValidCoord(end.latitude) && isValidCoord(end.longitude)) {
    return { latitude: Number(end.latitude), longitude: Number(end.longitude), address: end.address || null };
  }
  if (booking.customerId) {
    const customer = await client.user.findUnique({
      where: { id: booking.customerId },
      select: { latitude: true, longitude: true, address: true }
    });
    if (customer && isValidCoord(customer.latitude) && isValidCoord(customer.longitude)) {
      return { latitude: Number(customer.latitude), longitude: Number(customer.longitude), address: customer.address || null };
    }
  }
  return null;
}

/**
 * Persist a provider location ping for an active booking and push a real-time
 * `location:update` event to the customer's socket room.
 *
 * Called from the socket.io handler (primary path, high frequency — the audit's
 * "1,000 providers × 1 update/sec = 1,000 events/sec" case) and the REST
 * fallback. Safe to call without `io` (REST path still returns the computed
 * payload).
 *
 * Write discipline: the latest fix is kept in the in-memory registry and
 * broadcast to rooms on EVERY ping (cheap, keeps the marker moving), while
 * PostgreSQL only receives the `booking.update` + history insert when the
 * configured minimum interval has elapsed. That bounds DB writes per booking to
 * ~1/(interval) regardless of how fast the client pushes. The same cadence
 * bounds external Maps calls via a per-booking TTL cache, so a noisy client
 * cannot burn DB writes or Google Maps credits on near-identical fixes.
 *
 * Returns { ok, payload } where payload is the tracking snapshot, or throws a
 * tagged error for the REST path to translate.
 */
export async function updateProviderLocation({ bookingId, providerUserId, latitude, longitude, io = null, client = prisma }) {
  if (!bookingId) throw trackingError('MISSING_BOOKING', 'Booking ID is required.');
  if (!isValidCoord(latitude) || !isValidCoord(longitude)) {
    throw trackingError('INVALID_COORDINATES', 'Valid latitude and longitude are required.');
  }
  const lat = clamp(Number(latitude), -90, 90);
  const lng = clamp(Number(longitude), -180, 180);

  const trackingEnabled = await getConfig('locationTrackingEnabled', true);
  if (trackingEnabled === false) {
    throw trackingError('TRACKING_DISABLED', 'Live location tracking is currently disabled.');
  }

  const provider = await client.provider.findUnique({
    where: { userId: providerUserId },
    select: { id: true, userId: true, user: { select: { name: true, avatar: true } } }
  });
  if (!provider) throw trackingError('PROVIDER_NOT_FOUND', 'Provider profile not found.');

  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      customerId: true,
      providerId: true,
      endLocation: true,
      startLocation: true,
      providerPhase: true,
      providerLocationUpdatedAt: true
    }
  });
  if (!booking) throw trackingError('BOOKING_NOT_FOUND', 'Booking not found.');
  if (booking.providerId !== provider.id) {
    throw trackingError('NOT_ASSIGNED', 'You are not assigned to this booking.');
  }
  if (!['CONFIRMED', 'ONGOING'].includes(booking.status)) {
    if (client === prisma) dropLiveFix(booking.id);
    throw trackingError('BOOKING_NOT_TRACKABLE', 'Location can only be shared while a booking is confirmed or in progress.');
  }

  const now = Date.now();
  const inMemory = client === prisma ? (liveFixes.get(booking.id) || null) : null;

  // Broadcast the LATEST fix on every ping (the newest ping always wins), so
  // the customer's marker stays smooth at any client cadence. The registry only
  // carries the throttle watermark + cached destination — never the position.
  const liveLat = lat;
  const liveLng = lng;

  // Server-side throttle: only touch PostgreSQL when the configured minimum
  // interval has elapsed since the last persisted fix. Memory-first so a
  // restart (no registry entry yet) falls back to the DB timestamp.
  const minIntervalSec = Math.max(1, Number(await getConfig('locationUpdateMinIntervalSeconds', 3)) || 3);
  const lastPersistedAt = Math.max(
    inMemory?.persistedAt ?? 0,
    booking.providerLocationUpdatedAt ? new Date(booking.providerLocationUpdatedAt).getTime() : 0
  );
  const persisted = now - lastPersistedAt >= minIntervalSec * 1000;

  if (client === prisma) {
    if (persisted) {
      const updateData = {
        providerLatitude: liveLat,
        providerLongitude: liveLng,
        providerLocationUpdatedAt: new Date()
      };

      // First persisted fix during a CONFIRMED booking captures the start point.
      if (!booking.startLocation && booking.status === 'CONFIRMED') {
        updateData.startLocation = { latitude: liveLat, longitude: liveLng, capturedAt: new Date().toISOString() };
      }

      await client.booking.update({ where: { id: booking.id }, data: updateData });
      socketMetrics.recordDbWrite();
      await client.bookingLocationUpdate.create({
        data: { bookingId: booking.id, providerId: provider.id, latitude: liveLat, longitude: liveLng }
      });
      socketMetrics.recordDbWrite();

      liveFixes.set(booking.id, {
        lat: liveLat,
        lng: liveLng,
        at: now,
        persistedAt: now,
        ...(getDestFrom(inMemory) !== undefined ? { dest: getDestFrom(inMemory), destAddress: inMemory.destAddress || null } : {})
      });
    } else {
      // Sub-cadence ping: keep the registry current in memory only (no DB I/O).
      liveFixes.set(booking.id, {
        lat: liveLat,
        lng: liveLng,
        at: now,
        persistedAt: inMemory?.persistedAt ?? (booking.providerLocationUpdatedAt ? new Date(booking.providerLocationUpdatedAt).getTime() : 0),
        ...(getDestFrom(inMemory) !== undefined ? { dest: getDestFrom(inMemory), destAddress: inMemory.destAddress || null } : {})
      });
    }
    pruneLiveFixes(now);
  }

  const destination = await resolveTrackingDestination(booking, client, inMemory);

  let distanceKm = null;
  let etaMinutes = null;
  let routePolyline = null;
  let maps = cachedMaps(booking.id);
  if (destination) {
    if (!maps) {
      socketMetrics.recordMapsCall();
      const driving = await getDrivingInfo({ latitude: liveLat, longitude: liveLng }, destination);
      distanceKm = driving.distanceKm;
      etaMinutes = driving.durationMin ?? (await computeEtaMinutes(driving.distanceKm));
      socketMetrics.recordMapsCall();
      routePolyline = await getRouteGeoJson({ latitude: liveLat, longitude: liveLng }, destination);
      maps = { distanceKm, etaMinutes, routePolyline, at: now };
      routeCache.set(booking.id, maps);
    } else {
      distanceKm = maps.distanceKm;
      etaMinutes = maps.etaMinutes;
      routePolyline = maps.routePolyline;
    }
  }

  const payload = {
    bookingId: booking.id,
    status: booking.status,
    providerPhase: booking.providerPhase || null,
    latitude: liveLat,
    longitude: liveLng,
    timestamp: new Date(now).toISOString(),
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(2)) : null,
    etaMinutes,
    routePolyline,
    destination: destination ? { latitude: destination.latitude, longitude: destination.longitude, address: destination.address } : null,
    provider: { name: provider.user?.name, avatar: provider.user?.avatar }
  };

  if (io) {
    const size = JSON.stringify(payload).length;
    io.to(`user:${booking.customerId}`).emit('location:update', payload);
    socketMetrics.recordMessage(size);
    if (provider.userId) io.to(`user:${provider.userId}`).emit('location:update', payload);
    socketMetrics.recordMessage(size);
  }

  return { ok: true, payload };
}

/** Cached resolved destination from a live-fix registry entry (or undefined). */
function getDestFrom(inMemory) {
  return inMemory?.dest;
}

/**
 * Resolve the booking destination once per registry entry and reuse it across
 * pings — avoids re-reading the customer row on every `location:update`.
 */
async function resolveTrackingDestination(booking, client, inMemory) {
  if (inMemory && inMemory.dest !== undefined) {
    return inMemory.dest;
  }
  const destination = await resolveBookingDestination(booking, client);
  if (client === prisma && inMemory) {
    liveFixes.set(booking.id, { ...inMemory, dest: destination, destAddress: destination?.address || null });
  }
  return destination;
}

/**
 * Tracking snapshot for a booking (customer / provider / admin).
 * Enforces ownership and computes ETA on demand from the latest stored fix.
 */
export async function getBookingTracking({ bookingId, userId, role, client = prisma }) {
  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    include: {
      provider: { include: { user: { select: { id: true, name: true, avatar: true } } } }
    }
  });
  if (!booking) throw trackingError('BOOKING_NOT_FOUND', 'Booking not found.');

  if (role === 'customer' && booking.customerId !== userId) {
    throw trackingError('FORBIDDEN', 'You can only track your own bookings.');
  }
  if (role === 'provider') {
    const provider = await client.provider.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!provider || booking.providerId !== provider.id) {
      throw trackingError('FORBIDDEN', 'You can only track your assigned bookings.');
    }
  }

  const destination = await resolveBookingDestination(booking, client);
  const hasLiveFix = isValidCoord(booking.providerLatitude) && isValidCoord(booking.providerLongitude);
  const staleMs = (Math.max(1, Number(await getConfig('locationUpdateMinIntervalSeconds', 3)) || 3) * 2 + 30) * 1000;
  const updatedAt = booking.providerLocationUpdatedAt ? new Date(booking.providerLocationUpdatedAt).getTime() : 0;
  const locationSharingActive = hasLiveFix && Date.now() - updatedAt <= staleMs;

  let distanceKm = null;
  let etaMinutes = null;
  let routePolyline = null;
  if (hasLiveFix && destination) {
    const origin = { latitude: Number(booking.providerLatitude), longitude: Number(booking.providerLongitude) };
    const driving = await getDrivingInfo(origin, destination);
    distanceKm = driving.distanceKm;
    etaMinutes = driving.durationMin ?? (await computeEtaMinutes(driving.distanceKm));
    routePolyline = await getRouteGeoJson(origin, destination);
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    providerPhase: booking.providerPhase || null,
    provider: {
      id: booking.provider.id,
      name: booking.provider.user?.name,
      avatar: booking.provider.user?.avatar
    },
    startLocation: booking.startLocation || null,
    endLocation: booking.endLocation || (destination ? { ...destination } : null),
    providerLatitude: booking.providerLatitude ?? null,
    providerLongitude: booking.providerLongitude ?? null,
    providerLocationUpdatedAt: booking.providerLocationUpdatedAt ?? null,
    locationSharingActive,
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(2)) : null,
    etaMinutes,
    routePolyline,
    historyRetainedHours: Number(await getConfig('locationHistoryClearanceHours', 24)) || 24
  };
}

/**
 * Last N recorded pings for a booking (polyline rendering / admin audit).
 */
export async function getBookingLocationHistory({ bookingId, userId, role, limit = 50, client = prisma }) {
  const booking = await client.booking.findUnique({ where: { id: bookingId }, select: { id: true, customerId: true, providerId: true } });
  if (!booking) throw trackingError('BOOKING_NOT_FOUND', 'Booking not found.');
  if (role === 'customer' && booking.customerId !== userId) throw trackingError('FORBIDDEN', 'Forbidden.');
  if (role === 'provider') {
    const provider = await client.provider.findUnique({ where: { userId }, select: { id: true } });
    if (!provider || booking.providerId !== provider.id) throw trackingError('FORBIDDEN', 'Forbidden.');
  }
  const take = Math.min(200, Math.max(1, Number(limit) || 50));
  const rows = await client.bookingLocationUpdate.findMany({
    where: { bookingId },
    orderBy: { recordedAt: 'desc' },
    take
  });
  return rows.reverse();
}

/**
 * Prune location history after the configured retention window. Called when a
 * booking is completed/cancelled to bound storage.
 */
export async function clearLocationHistory({ bookingId, client = prisma }) {
  const clearanceHours = Math.max(1, Number(await getConfig('locationHistoryClearanceHours', 24)) || 24);
  const cutoff = new Date(Date.now() - clearanceHours * 60 * 60 * 1000);
  const result = await client.bookingLocationUpdate.deleteMany({
    where: { bookingId, recordedAt: { lt: cutoff } }
  });
  return { cleared: result.count };
}

function trackingError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Shared guard for the dispatch lifecycle: the caller must be the assigned
 * provider and the booking must be in an active (CONFIRMED/ONGOING) state.
 */
async function resolveProviderBooking({ bookingId, providerUserId, client }) {
  if (!bookingId) throw trackingError('MISSING_BOOKING', 'Booking ID is required.');
  const provider = await client.provider.findUnique({
    where: { userId: providerUserId },
    select: { id: true, userId: true, user: { select: { name: true, avatar: true } } }
  });
  if (!provider) throw trackingError('PROVIDER_NOT_FOUND', 'Provider profile not found.');

  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      customerId: true,
      providerId: true,
      providerPhase: true,
      arrivedSource: true,
      endLocation: true,
      startLocation: true,
      providerLatitude: true,
      providerLongitude: true,
      serviceLatitude: true,
      serviceLongitude: true,
      statusHistory: true
    }
  });
  if (!booking) throw trackingError('BOOKING_NOT_FOUND', 'Booking not found.');
  if (booking.providerId !== provider.id) throw trackingError('NOT_ASSIGNED', 'You are not assigned to this booking.');
  if (!['CONFIRMED', 'ONGOING'].includes(booking.status)) {
    throw trackingError('BOOKING_NOT_TRACKABLE', 'This action is only valid while a booking is confirmed or in progress.');
  }
  return { provider, booking };
}

/**
 * Provider taps "On My Way" — the dispatch phase moves to ON_THE_WAY and the
 * customer is notified in real time (socket + in-app notification).
 *
 * Idempotent (rule 18): re-signalling a phase the booking already reached is a
 * no-op that returns the committed state — it never writes a duplicate
 * `statusHistory` entry or re-notifies, so a double tap or a socket+REST retry
 * cannot produce two "on the way" tracklines. Past ARRIVED a trip never
 * regresses.
 */
export async function markProviderOnTheWay({ bookingId, providerUserId, io = null, client = prisma }) {
  const { provider, booking } = await resolveProviderBooking({ bookingId, providerUserId, client });

  if (booking.providerPhase === 'ON_THE_WAY' || booking.providerPhase === 'ARRIVED') {
    return { ok: true, payload: { bookingId: booking.id, status: booking.status, providerPhase: booking.providerPhase, timestamp: new Date().toISOString() }, booking, alreadyDone: true };
  }

  const updated = await client.booking.update({
    where: { id: booking.id },
    data: {
      providerPhase: 'ON_THE_WAY',
      statusHistory: appendStatusHistory(booking.statusHistory, { status: 'ON_THE_WAY', timestamp: new Date().toISOString(), note: 'Provider is on the way' })
    }
  });

  const payload = { bookingId: booking.id, status: booking.status, providerPhase: 'ON_THE_WAY', timestamp: new Date().toISOString() };
  if (io) {
    io.to(`user:${booking.customerId}`).emit('provider:onTheWay', payload);
    if (provider.userId) io.to(`user:${provider.userId}`).emit('provider:onTheWay', payload);
  }
  await client.bookingEvent.create({
    data: { bookingId: booking.id, actorId: provider.id, actorRole: 'provider', action: 'PHASE_ON_THE_WAY', note: 'Provider is on the way' }
  });
  await notifyProviderOnTheWay(io, booking.customerId, payload);
  return { ok: true, payload, booking: updated };
}

/**
 * Provider taps "Arrived / Reached" — the dispatch phase moves to ARRIVED and
 * the customer is notified in real time. `source` records HOW arrival was
 * signalled ('gps' auto-detected vs 'manual' override) for audit/disputes.
 *
 * Idempotent (rule 18): a second ARRIVED signal (double tap, socket + REST
 * retry, GPS auto-arrive racing the manual button) returns the committed state
 * without appending a duplicate `statusHistory` entry or re-notifying — the
 * customer can never see two "arrived" tracklines for one trip.
 */
export async function markProviderArrived({ bookingId, providerUserId, io = null, source = 'gps', client = prisma }) {
  const { provider, booking } = await resolveProviderBooking({ bookingId, providerUserId, client });

  if (booking.providerPhase === 'ARRIVED') {
    return { ok: true, payload: { bookingId: booking.id, status: booking.status, providerPhase: 'ARRIVED', arrivedSource: booking.arrivedSource || null, timestamp: new Date().toISOString() }, booking, alreadyDone: true };
  }

  // GPS arrival gate: a GPS-signalled arrival only counts within 150 m of the
  // customer's service location (straight-line). The provider can't spoof a
  // fix — the coordinates come from their own live feed. Manual overrides stay
  // available for the no-GPS case and are audited via `arrivedSource`.
  const ARRIVAL_RADIUS_M = 150;
  if (
    source !== 'manual' &&
    booking.providerLatitude != null &&
    booking.providerLongitude != null &&
    booking.serviceLatitude != null &&
    booking.serviceLongitude != null
  ) {
    const distanceM = haversineKm(
      Number(booking.providerLatitude),
      Number(booking.providerLongitude),
      Number(booking.serviceLatitude),
      Number(booking.serviceLongitude)
    ) * 1000;
    if (distanceM > ARRIVAL_RADIUS_M) {
      throw trackingError(
        'ARRIVAL_TOO_FAR',
        `You are ${Math.round(distanceM)} m from the customer location. Arrival unlocks within 150 m of the address.`
      );
    }
  }

  const updated = await client.booking.update({
    where: { id: booking.id },
    data: {
      providerPhase: 'ARRIVED',
      arrivedSource: source === 'manual' ? 'manual' : 'gps',
      statusHistory: appendStatusHistory(booking.statusHistory, { status: 'ARRIVED', timestamp: new Date().toISOString(), note: 'Provider has arrived at your location' })
    }
  });

  const payload = { bookingId: booking.id, status: booking.status, providerPhase: 'ARRIVED', arrivedSource: updated.arrivedSource, timestamp: new Date().toISOString() };
  if (io) {
    io.to(`user:${booking.customerId}`).emit('provider:arrived', payload);
    if (provider.userId) io.to(`user:${provider.userId}`).emit('provider:arrived', payload);
  }
  await client.bookingEvent.create({
    data: { bookingId: booking.id, actorId: provider.id, actorRole: 'provider', action: 'PHASE_ARRIVED', note: 'Provider has arrived at your location' }
  });
  await notifyProviderArrived(io, booking.customerId, payload);
  return { ok: true, payload, booking: updated };
}

/**
 * Reset the dispatch phase when a booking is (re)confirmed or completed, so a
 * fresh trip starts clean. Called from the booking lifecycle.
 */
export async function resetProviderPhase(bookingId, client = prisma) {
  await client.booking.updateMany({
    where: { id: bookingId, providerPhase: { not: null } },
    data: { providerPhase: null }
  });
  // Drop the in-memory live fix: the trip ended, so the room must stop being
  // fed and the registry must not hold a stale location for a finished booking.
  if (client === prisma) dropLiveFix(bookingId);
}
