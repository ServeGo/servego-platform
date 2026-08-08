import prisma from '../prisma/client.js';
import { optimizeRoute } from './mapsService.js';

/**
 * Provider "nearby jobs" planner. Returns the provider's active bookings
 * (confirmed/ongoing) ordered into an efficient visit sequence using road
 * distances when a Maps key is configured, and great-circle distances
 * otherwise. This is the practical Route Optimization for a single provider's
 * day — no multi-vehicle VRP.
 */
export async function getRoutePlan({ providerUserId, client = prisma }) {
  const provider = await client.provider.findUnique({
    where: { userId: providerUserId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      user: { select: { name: true, avatar: true } }
    }
  });
  if (!provider) return null;

  const bookings = await client.booking.findMany({
    where: { providerId: provider.id, status: { in: ['CONFIRMED', 'ONGOING'] } },
    select: {
      id: true,
      status: true,
      providerPhase: true,
      locationAddress: true,
      city: true,
      endLocation: true,
      startLocation: true,
      providerLatitude: true,
      providerLongitude: true,
      bookingDate: true,
      serviceCategory: true,
      amount: true,
      customer: { select: { id: true, name: true, latitude: true, longitude: true } }
    },
    orderBy: { bookingDate: 'asc' }
  });

  const stops = [];
  for (const b of bookings) {
    const coords = resolveStopCoords(b);
    if (!coords) continue; // skip jobs with no geocoded destination
    stops.push({
      bookingId: b.id,
      status: b.status,
      providerPhase: b.providerPhase || null,
      address: b.locationAddress ? `${b.locationAddress}${b.city ? `, ${b.city}` : ''}` : null,
      serviceCategory: b.serviceCategory,
      amount: b.amount,
      customerName: b.customer?.name || null,
      scheduledAt: b.bookingDate,
      coordinates: coords
    });
  }

  const origin = Number.isFinite(Number(provider.latitude)) && Number.isFinite(Number(provider.longitude))
    ? { latitude: Number(provider.latitude), longitude: Number(provider.longitude) }
    : null;

  const ordered = origin ? await optimizeRoute(origin, stops) : stops.map((stop, i) => ({ stop, visitOrder: i + 1, distanceKm: null, etaMinutes: null }));

  return {
    provider: { id: provider.id, name: provider.user?.name, avatar: provider.user?.avatar },
    origin,
    stops: ordered.map((entry) => ({
      ...entry.stop,
      visitOrder: entry.visitOrder,
      distanceFromPreviousKm: entry.distanceKm,
      etaFromPreviousMin: entry.etaMinutes
    })),
    totalStops: ordered.length
  };
}

function resolveStopCoords(booking) {
  const end = booking.endLocation && typeof booking.endLocation === 'object' ? booking.endLocation : null;
  if (end && Number.isFinite(Number(end.latitude)) && Number.isFinite(Number(end.longitude))) {
    return { latitude: Number(end.latitude), longitude: Number(end.longitude) };
  }
  const c = booking.customer;
  if (c && Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude))) {
    return { latitude: Number(c.latitude), longitude: Number(c.longitude) };
  }
  return null;
}
