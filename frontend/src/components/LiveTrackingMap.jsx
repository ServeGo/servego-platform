import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, MapPin, Clock, Radio, Truck, UserCheck } from 'lucide-react';

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

const fmtCoord = (v) => (v == null ? '—' : Number(v).toFixed(6));
const fmtKm = (v) => (v == null ? '—' : `${Number(v).toFixed(1)} km`);

// OpenStreetMap raster tiles (free, keyless). Swap in Google/MapTiler tiles by
// changing this style object — the marker/route logic below is tile-agnostic.
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

/**
 * Live-tracking map backed by the provider's real GPS fix (`location:update`
 * socket payload or the booking's last persisted position) and the booking
 * destination. Renders a real tile map with:
 *  - the provider marker (live position)
 *  - the destination marker
 *  - the route line (road polyline from the backend when available, otherwise
 *    a straight great-circle line)
 *  - the dispatch phase banner: null → ON_THE_WAY → ARRIVED
 */
export const LiveTrackingMap = ({ booking, liveLocation }) => {
  const [now, setNow] = useState(Date.now());
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ provider: null, destination: null });

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
        routePolyline: booking.routePolyline ?? null,
        destination: booking.endLocation || null
      };
    }
    return null;
  }, [liveLocation, booking]);

  const destination = live?.destination || booking.endLocation || null;
  const hasDestination =
    destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);
  const hasLocation = live !== null;

  const phase = String(live?.providerPhase ?? booking.providerPhase ?? '').toUpperCase();

  const routeGeoJson = useMemo(() => {
    if (!hasLocation || !hasDestination) return null;
    if (Array.isArray(live.routePolyline) && live.routePolyline.length >= 2) {
      const pts = live.routePolyline.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (pts.length >= 2) return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } };
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [Number(live.longitude), Number(live.latitude)],
          [Number(destination.longitude), Number(destination.latitude)]
        ]
      }
    };
  }, [live, destination, hasLocation, hasDestination]);

  // Create the map when its container exists (the container only renders once
  // the provider has a GPS fix). Markers start on a valid default position so
  // maplibre never has to position an undefined lngLat; the sync effect below
  // immediately moves them to the real coordinates.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;
    const map = new MapLibreMap({
      container,
      style: OSM_STYLE,
      attributionControl: true,
      center: [72.8777, 19.076],
      zoom: 11
    });
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    const providerEl = document.createElement('div');
    providerEl.className = 'live-map-provider-marker';
    providerEl.innerHTML = '<div class="live-map-marker-pulse"></div><div class="live-map-marker-truck">🚚</div>';

    const destEl = document.createElement('div');
    destEl.className = 'live-map-dest-marker';
    destEl.innerHTML = '<div class="live-map-dest-dot"></div>';

    const defaultLngLat = [72.8777, 19.076];
    markersRef.current.provider = new Marker({ element: providerEl, anchor: 'center' })
      .setLngLat(defaultLngLat)
      .addTo(map);
    markersRef.current.destination = new Marker({ element: destEl, anchor: 'center' })
      .setLngLat(defaultLngLat)
      .addTo(map);

    map.on('load', () => setMapReady(true));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = { provider: null, destination: null };
      setMapReady(false);
    };
  }, [hasLocation, hasDestination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Provider marker.
    if (hasLocation) {
      markersRef.current.provider?.setLngLat([Number(live.longitude), Number(live.latitude)]);
    }

    // Destination marker.
    if (hasDestination) {
      markersRef.current.destination?.setLngLat([Number(destination.longitude), Number(destination.latitude)]);
    }

    // Route line.
    if (routeGeoJson && mapReady) {
      const source = map.getSource('route');
      if (source) {
        source.setData(routeGeoJson);
      } else {
        map.addSource('route', { type: 'geojson', data: routeGeoJson });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.9 }
        });
      }
    }

    // Fit the view to the provider + destination whenever the fix moves.
    if (hasLocation && hasDestination) {
      const bounds = new LngLatBounds();
      bounds.extend([Number(live.longitude), Number(live.latitude)]);
      bounds.extend([Number(destination.longitude), Number(destination.latitude)]);
      if (bounds.getWest() === bounds.getEast() && bounds.getSouth() === bounds.getNorth()) {
        map.setCenter([Number(live.longitude), Number(live.latitude)]);
      } else {
        map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 900 });
      }
    } else if (hasLocation) {
      map.setCenter([Number(live.longitude), Number(live.latitude)]);
      map.setZoom(14);
    }
  }, [live, destination, hasLocation, hasDestination, routeGeoJson, mapReady]);

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

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isStale ? 'bg-amber-500' : hasLocation ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            {isStale ? 'Signal lost — last fix' : 'Live Provider Tracking'}
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
              {booking.providerName} will appear here once they share their GPS position on the way.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Real tile map */}
          <div className="relative h-56 border-b border-slate-800 overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

            <div className="absolute left-3 bottom-2 z-10 bg-slate-900/90 border border-slate-700 rounded px-2 py-0.5 text-[9px] text-slate-300 font-bold">
              <MapPin className="w-2.5 h-2.5 inline-block mr-1 text-teal-400" />
              {booking.locationAddress || 'Customer location'}
            </div>

            <div className="absolute right-3 top-2 z-10 bg-slate-900/90 border border-slate-700 rounded px-2 py-0.5 text-[9px] text-slate-300 font-bold flex items-center gap-1">
              <img src={booking.providerAvatar} className="w-4 h-4 rounded-full object-cover border border-slate-600" alt={booking.providerName || 'Provider avatar'} referrerPolicy="no-referrer" />
              <Truck className="w-3 h-3 text-amber-400" />
              <span>{booking.providerName || 'Provider'}</span>
            </div>
          </div>

          {/* Telemetry */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 font-semibold text-xs border-t border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                Position
              </span>
              <div className="font-mono text-[11px] text-slate-200">
                {fmtCoord(live.latitude)}°<br />{fmtCoord(live.longitude)}°
              </div>
            </div>

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

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-500" />
                Feed Status
              </span>
              <div className={`text-[10px] font-bold px-2 py-1 rounded inline-block self-start border font-mono ${isStale ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                {isStale ? 'STALE FIX' : hasLocation ? 'LIVE' : 'WAITING'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
