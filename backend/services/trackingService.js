import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (Number(deg) * Math.PI) / 180;

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
 * Called from the socket.io handler (primary path) and the REST fallback. Safe
 * to call without `io` (REST path still returns the computed payload).
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
      providerLocationUpdatedAt: true
    }
  });
  if (!booking) throw trackingError('BOOKING_NOT_FOUND', 'Booking not found.');
  if (booking.providerId !== provider.id) {
    throw trackingError('NOT_ASSIGNED', 'You are not assigned to this booking.');
  }
  if (!['CONFIRMED', 'ONGOING'].includes(booking.status)) {
    throw trackingError('BOOKING_NOT_TRACKABLE', 'Location can only be shared while a booking is confirmed or in progress.');
  }

  // Server-side throttle: only persist when the configured minimum interval has
  // elapsed since the last accepted ping (keeps DB writes bounded regardless of
  // client cadence). The live position is still updated so the latest fix wins.
  const minIntervalSec = Math.max(1, Number(await getConfig('locationUpdateMinIntervalSeconds', 3)) || 3);
  const lastAt = booking.providerLocationUpdatedAt ? new Date(booking.providerLocationUpdatedAt).getTime() : 0;
  const persisted = Date.now() - lastAt >= minIntervalSec * 1000;

  const now = new Date();
  const updateData = {
    providerLatitude: lat,
    providerLongitude: lng,
    providerLocationUpdatedAt: now
  };

  if (!booking.startLocation && booking.status === 'CONFIRMED') {
    updateData.startLocation = { latitude: lat, longitude: lng, capturedAt: now.toISOString() };
  }

  await client.booking.update({ where: { id: booking.id }, data: updateData });

  if (persisted) {
    await client.bookingLocationUpdate.create({
      data: { bookingId: booking.id, providerId: provider.id, latitude: lat, longitude: lng }
    });
  }

  const destination = await resolveBookingDestination(booking, client);
  let distanceKm = null;
  if (destination) {
    distanceKm = haversineKm(lat, lng, destination.latitude, destination.longitude);
  }
  const etaMinutes = await computeEtaMinutes(distanceKm);

  const payload = {
    bookingId: booking.id,
    status: booking.status,
    latitude: lat,
    longitude: lng,
    timestamp: now.toISOString(),
    distanceKm,
    etaMinutes,
    destination: destination ? { latitude: destination.latitude, longitude: destination.longitude, address: destination.address } : null,
    provider: { name: provider.user?.name, avatar: provider.user?.avatar }
  };

  if (io) {
    io.to(`user:${booking.customerId}`).emit('location:update', payload);
    if (provider.userId) io.to(`user:${provider.userId}`).emit('location:update', payload);
  }

  return { ok: true, payload };
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
  if (hasLiveFix && destination) {
    distanceKm = haversineKm(Number(booking.providerLatitude), Number(booking.providerLongitude), destination.latitude, destination.longitude);
  }
  const etaMinutes = hasLiveFix ? await computeEtaMinutes(distanceKm) : null;

  return {
    bookingId: booking.id,
    status: booking.status,
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
