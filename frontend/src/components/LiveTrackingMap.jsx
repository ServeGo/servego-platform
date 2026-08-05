import React, { useState, useEffect, useMemo } from 'react';
import { Compass, MapPin, Clock, Radio, Truck } from 'lucide-react';

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

/**
 * Production live-tracking panel. Driven entirely by the provider's real GPS
 * fix (pushed over the socket via `location:update`, with a REST fallback) and
 * the booking's recorded destination. No simulated motion — every value comes
 * from the backend.
 */
export const LiveTrackingMap = ({ booking, liveLocation }) => {
  const [now, setNow] = useState(Date.now());

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
        etaMinutes: null,
        distanceKm: null,
        destination: booking.endLocation || null
      };
    }
    return null;
  }, [liveLocation, booking]);

  const hasLocation = live !== null;

  const destination = live?.destination || booking.endLocation || null;
  const hasDestination =
    destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);

  const distanceKm =
    live?.distanceKm ??
    (hasLocation && hasDestination
      ? haversineKm(live.latitude, live.longitude, destination.latitude, destination.longitude)
      : null);
  const etaMinutes = live?.etaMinutes ?? null;

  const status = String(booking.status || '').toLowerCase();
  const isOnSite = status === 'ongoing' || status === 'in_progress' || status === 'en_route';
  const lastUpdateAt = live?.timestamp ? new Date(live.timestamp).getTime() : 0;
  const isStale = lastUpdateAt > 0 && now - lastUpdateAt > 90000; // no fix for 90s
  const lastUpdateLabel = lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString() : null;

  // Map marker position along a stylized route based on real progress.
  const progress = useMemo(() => {
    if (!hasLocation || !hasDestination) return 0;
    const origin = booking.startLocation || null;
    if (origin && Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)) {
      const total = haversineKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      if (total > 0.05) return Math.min(0.98, Math.max(0.02, 1 - distanceKm / total));
    }
    return 0.5; // origin unknown — center marker
  }, [hasLocation, hasDestination, booking.startLocation, destination, distanceKm]);

  const markerPoint = getPointOnPath(progress);

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
          {/* Map canvas */}
          <div className="relative h-56 border-b border-slate-800 bg-teal-950/20 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 600 240">
              <defs>
                <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="600" height="240" fill="url(#gridPattern)" />
              <path
                d="M 40 200 Q 90 180 140 165 T 260 120 T 380 130 T 470 80 T 560 70"
                fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
              />
              <path
                d="M 40 200 Q 90 180 140 165 T 260 120 T 380 130 T 470 80 T 560 70"
                fill="none" stroke="#1e1e38" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              />
              <path
                d="M 40 200 Q 90 180 140 165 T 260 120 T 380 130 T 470 80 T 560 70"
                fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="720"
                strokeDashoffset={720 * (1 - progress)}
                className="transition-all duration-700 ease-out opacity-90"
              />
              <circle cx="40" cy="200" r="12" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <circle cx="560" cy="70" r="16" fill="rgba(99, 102, 241, 0.25)" className="animate-pulse" />
              <circle cx="560" cy="70" r="11" fill="#4338ca" stroke="#818cf8" strokeWidth="2.5" />
              <circle cx={markerPoint.x} cy={markerPoint.y} r="16" fill="rgba(245, 158, 11, 0.25)" className="animate-ping" />
            </svg>

            <div className="absolute left-3 bottom-2 bg-slate-900/90 border border-slate-700 rounded px-2 py-0.5 text-[9px] text-slate-300 font-bold">
              <MapPin className="w-2.5 h-2.5 inline-block mr-1 text-teal-400" />
              {booking.locationAddress || 'Customer location'}
            </div>

            <div
              className="absolute -translate-x-1/2 bg-amber-500 text-slate-950 font-extrabold px-2.5 py-1 rounded-xl text-[9px] shadow-lg flex items-center gap-1.5 leading-none"
              style={{ left: `${markerPoint.x / 6}%`, top: `${Math.max(12, markerPoint.y - 42)}px` }}
            >
              <img src={booking.providerAvatar} className="w-4 h-4 rounded-full object-cover border border-slate-950" alt={booking.providerName || 'Provider avatar'} referrerPolicy="no-referrer" />
              <Truck className="w-3.5 h-3.5 shrink-0" />
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

const PATH = [
  { x: 40, y: 200 },
  { x: 90, y: 180 },
  { x: 140, y: 165 },
  { x: 260, y: 120 },
  { x: 380, y: 130 },
  { x: 470, y: 80 },
  { x: 560, y: 70 }
];

function getPointOnPath(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const segments = PATH.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const fraction = scaled - index;
  const p1 = PATH[index];
  const p2 = PATH[index + 1];
  return {
    x: p1.x + (p2.x - p1.x) * fraction,
    y: p1.y + (p2.y - p1.y) * fraction
  };
}
