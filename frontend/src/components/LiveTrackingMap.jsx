import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Clock, Radio, Truck, UserCheck, Navigation } from 'lucide-react';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (Number(deg) * Math.PI) / 180;

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const fmtKm = (v) => (v == null ? '—' : `${Number(v).toFixed(1)} km`);

// Free (zero-cost) services: OSM raster tiles + public OSRM driving router.
const OSM_TILES_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSRM_SERVICE_URL = 'https://router.project-osrm.org/route/v1';

// The customer destination pin opens a Google Maps turn-by-turn popup; origin
// is left unspecified so Maps starts from the viewer's current GPS position.
const googleMapsDirections = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Live-tracking map backed by the provider's real GPS fix (`location:update`
 * socket payload or the booking's last persisted position) and the booking
 * destination. Free stack — Leaflet + OpenStreetMap tiles + OSRM routing:
 *  - provider pin (live position, pulse)
 *  - destination pin — click opens Google Maps turn-by-turn navigation
 *  - live driving route polyline re-computed as the provider moves
 *  - dispatch phase banner: null → ON_THE_WAY → ARRIVED
 */
export const LiveTrackingMap = ({ booking, liveLocation }) => {
  const [now, setNow] = useState(Date.now());
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const providerRef = useRef(null);
  const destRef = useRef(null);
  const routingRef = useRef(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Latest fix: prefer the real-time socket payload; fall back to the last
  // persisted position that the backend returned with the booking.
  const live = useMemo(() => {
    if (liveLocation && Number.isFinite(liveLocation.latitude) && Number.isFinite(liveLocation.longitude)) {
      return liveLocation;
    }
    if (Number.isFinite(booking.providerLatitude) && Number.isFinite(booking.providerLongitude)) {
      return {
        latitude: booking.providerLatitude,
        longitude: booking.providerLongitude,
        timestamp: booking.providerLocationUpdatedAt || null,
        etaMinutes: booking.etaMinutes ?? null,
        distanceKm: booking.distanceKm ?? null,
        destination: booking.endLocation || null
      };
    }
    return null;
  }, [liveLocation, booking]);

  const destination =
    live?.destination ||
    booking.endLocation ||
    (Number.isFinite(Number(booking.serviceLatitude)) && Number.isFinite(Number(booking.serviceLongitude))
      ? { latitude: Number(booking.serviceLatitude), longitude: Number(booking.serviceLongitude) }
      : null) ||
    null;
  const hasDestination =
    destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);
  const hasLocation = live !== null;

  const phase = String(live?.providerPhase ?? booking.providerPhase ?? '').toUpperCase();

  // Build the destination marker popup (Google Maps turn-by-turn navigation).
  const destPopupHtml = useMemo(() => {
    if (!hasDestination) return '';
    const address = [booking.locationAddress, booking.city].filter(Boolean).join(', ') || 'Customer location';
    return (
      `<div style="min-width:190px;text-align:left;">` +
      `<div style="font-weight:800;font-size:12px;color:#0f172a;">Customer Address</div>` +
      `<div style="font-size:11px;color:#475569;margin:4px 0 8px;line-height:1.45;">${escapeHtml(address)}</div>` +
      `<a href="${googleMapsDirections(destination.latitude, destination.longitude)}" ` +
      `target="_blank" rel="noopener noreferrer" ` +
      `style="display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:#fff;padding:7px 11px;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;"` +
      `>📍 Open Google Maps Directions</a>` +
      `</div>`
    );
  }, [booking.locationAddress, booking.city, destination, hasDestination]);

  // Create the map when its container exists (the container only renders once
  // the provider has a GPS fix). Leaflet + OSM tiles + free OSRM routing.
  useEffect(() => {
    const container = containerRef.current;
    const L = window.L;
    if (!container || !L || mapRef.current) return undefined;

    const map = L.map(container, {
      scrollWheelZoom: false,
      attributionControl: true
    });

    L.tileLayer(OSM_TILES_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Provider pin (pulsing truck, same marker styles as before).
    const providerIcon = L.divIcon({
      className: 'live-map-provider-div',
      html: '<div class="live-map-provider-marker"><div class="live-map-marker-pulse"></div><div class="live-map-marker-truck">🚚</div></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    providerRef.current = L.marker([0, 0], { icon: providerIcon, zIndexOffset: 1000 }).addTo(map);

    // Destination pin (indigo dot).
    const destIcon = L.divIcon({
      className: 'live-map-dest-div',
      html: '<div class="live-map-dest-marker"><div class="live-map-dest-dot"></div></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    destRef.current = L.marker([0, 0], { icon: destIcon, zIndexOffset: 900 }).addTo(map);

    // Free driving route via public OSRM. show:false renders only the road
    // polyline — the textual itinerary overlay stays hidden.
    routingRef.current = L.Routing.control({
      waypoints: [L.latLng(0, 0), L.latLng(0, 0)],
      router: L.Routing.osrmv1({ serviceUrl: OSRM_SERVICE_URL }),
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      lineOptions: { styles: [{ color: '#2563eb', weight: 5, opacity: 0.9 }] }
    }).addTo(map);

    map.setView([17.4483, 78.3915], 14);

    mapRef.current = map;
    setMapReady(true);
    const t = setTimeout(() => map.invalidateSize(), 0);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      providerRef.current = null;
      destRef.current = null;
      routingRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Sync positions, route and view whenever the fix/destination moves.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (hasLocation && providerRef.current) {
      providerRef.current.setLatLng([Number(live.latitude), Number(live.longitude)]);
    }
    if (hasDestination && destRef.current) {
      destRef.current.setLatLng([Number(destination.latitude), Number(destination.longitude)]);
      destRef.current.bindPopup(destPopupHtml, { maxWidth: 260 });
    }

    if (hasLocation && hasDestination && routingRef.current) {
      routingRef.current.setWaypoints([
        L.latLng(Number(live.latitude), Number(live.longitude)),
        L.latLng(Number(destination.latitude), Number(destination.longitude))
      ]);
    }

    if (mapReady) {
      if (hasLocation && hasDestination) {
        const bounds = L.latLngBounds([
          [Number(live.latitude), Number(live.longitude)],
          [Number(destination.latitude), Number(destination.longitude)]
        ]);
        if (bounds.getNorthWest().equals(bounds.getSouthEast())) {
          map.setView([Number(live.latitude), Number(live.longitude)], 15);
        } else {
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true });
        }
      } else if (hasLocation) {
        map.setView([Number(live.latitude), Number(live.longitude)], 14, { animate: true });
      } else if (hasDestination) {
        map.setView([Number(destination.latitude), Number(destination.longitude)], 14, { animate: true });
      }
    }
  }, [live, destination, hasLocation, hasDestination, destPopupHtml, mapReady]);

  const distanceKm =
    live?.distanceKm ??
    (hasLocation && hasDestination
      ? haversineKm(live.latitude, live.longitude, destination.latitude, destination.longitude)
      : null);
  const etaMinutes = live?.etaMinutes ?? null;

  const status = String(booking.status || '').toLowerCase();
  const isOnSite = status === 'ongoing' || status === 'in_progress' || status === 'en_route' || phase === 'ARRIVED';
  const lastUpdateAt = live?.timestamp ? new Date(live.timestamp).getTime() : 0;
  const isStale = lastUpdateAt > 0 && now - lastUpdateAt > 90000; // no fix for 90s
  const lastUpdateLabel = lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString() : null;

  // Live-tracking map shared by customers and providers — identical look: header,
  // dispatch phase banner, map with provider + destination pins and the driving
  // route, plus the distance/ETA telemetry panel.
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isStale ? 'bg-amber-500' : hasLocation ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            Free Live Routes
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-bold">
          Updated {lastUpdateLabel || '—'}
        </span>
      </div>

      {/* Dispatch phase banner */}
      {phase && (
        <div className={`px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-2 border-b ${
          phase === 'ARRIVED'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
        }`}>
          <UserCheck className="w-3.5 h-3.5" />
          {phase === 'ON_THE_WAY' ? 'Provider is on the way' : 'Provider has arrived at your location'}
        </div>
      )}

      {!hasLocation ? (
        <div className="h-56 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Truck className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Waiting for provider location</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              {booking.providerName || 'The provider'} will appear here once they share their GPS position on the way.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Free tile map (Leaflet + OpenStreetMap + OSRM route) */}
          <div className="relative isolate h-56 border-b border-slate-800 overflow-hidden">
            <div ref={containerRef} className="sg-live-leaflet absolute inset-0 z-0 w-full h-full" />

            <div className="absolute right-3 top-2 z-10 bg-slate-900/90 border border-slate-700 rounded px-2 py-0.5 text-[9px] text-slate-300 font-bold flex items-center gap-1 pointer-events-none">
              {booking.providerAvatar ? (
                <img src={booking.providerAvatar} className="w-4 h-4 rounded-full object-cover border border-slate-600" alt={booking.providerName || 'Provider avatar'} referrerPolicy="no-referrer" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center">
                  <Truck className="w-2.5 h-2.5 text-indigo-300" />
                </span>
              )}
              <Truck className="w-3 h-3 text-amber-400" />
              <span>{booking.providerName || 'Provider'}</span>
            </div>

            {hasDestination && (
              <a
                href={googleMapsDirections(destination.latitude, destination.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute left-3 bottom-2 z-10 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg transition-colors"
              >
                <Navigation className="w-3 h-3" />
                Navigate
              </a>
            )}
          </div>

          {/* Telemetry */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-2 gap-4 bg-slate-950/60 font-semibold text-xs border-t border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Distance Away
              </span>
              <div className="text-sm font-extrabold text-slate-100 font-mono">
                {isOnSite ? 'On Site' : fmtKm(distanceKm)}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                ETA
              </span>
              <div className="text-sm font-extrabold text-indigo-400">
                {isOnSite
                  ? 'Started Work'
                  : etaMinutes != null
                    ? `${etaMinutes} min`
                    : hasLocation
                      ? 'Arriving'
                      : '—'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};