import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, LocateFixed, Search, Loader2, CheckCircle2 } from 'lucide-react';

// OpenStreetMap raster tiles (free, keyless) — same style as LiveTrackingMap.
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

const DEFAULT_CENTER = [78.4867, 17.385]; // Hyderabad
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

const isFiniteCoord = (v) => v != null && Number.isFinite(Number(v));
const isPin = (value) => isFiniteCoord(value?.latitude) && isFiniteCoord(value?.longitude);

/**
 * Uber/Rapido-style map location picker backed by MapLibre GL + OpenStreetMap.
 *
 *  - a FIXED pin at the centre of the map — the map moves, the pin stays
 *  - drag the map to set the exact spot; the address is reverse-geocoded
 *    live from the centre as you drag
 *  - a pulsing blue dot shows the live device position (watchPosition)
 *  - "Use my location" snaps to the GPS fix, search (Nominatim) jumps to a place
 *  - "Confirm location" commits { latitude, longitude, address } to the parent
 *
 * Emits `onChange({ latitude, longitude, address })`. A location is only
 * "chosen" once confirmed — callers should gate submit on that.
 */
export default function LocationPicker({ value = {}, onChange, error, height = 'h-64 sm:h-80' }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const userDotRef = useRef(null);
  const geocodeSeqRef = useRef(0);
  const geocodeTimerRef = useRef(null);
  const searchTimerRef = useRef(null);
  const centerRef = useRef(isPin(value) ? { lat: Number(value.latitude), lng: Number(value.longitude) } : null);
  // When re-opening a saved location, don't clobber the user's stored address
  // (flat/landmark) with the generic street name until they interact with the map.
  const preserveAddressRef = useRef(isPin(value));

  const [address, setAddress] = useState(value?.address || '');
  const [confirmed, setConfirmed] = useState(isPin(value));
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [findingYou, setFindingYou] = useState(!isPin(value));
  const [geoNotice, setGeoNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const emitChange = useCallback((lat, lng, addr) => {
    centerRef.current = { lat, lng };
    setConfirmed(true);
    if (onChange) onChange({ latitude: lat, longitude: lng, address: addr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single reverse-geocode call with stale-response guarding.
  const reverseGeocodeOnce = useCallback(async (lat, lng) => {
    const seq = ++geocodeSeqRef.current;
    setGeocoding(true);
    try {
      const res = await fetch(`${NOMINATIM_REVERSE}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`);
      const data = res.ok ? await res.json() : null;
      if (seq !== geocodeSeqRef.current) return null;
      return data?.display_name || '';
    } catch {
      return null;
    } finally {
      if (seq === geocodeSeqRef.current) setGeocoding(false);
    }
  }, []);

  // Debounced reverse-geocode of the current map centre that only updates the
  // on-screen address preview (never emits) — quick drags can't spam Nominatim.
  const refreshAddressPreview = useCallback(() => {
    const c = centerRef.current || mapRef.current?.getCenter();
    if (!c) return;
    const seq = ++geocodeSeqRef.current;
    setGeocoding(true);
    window.clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`${NOMINATIM_REVERSE}?format=jsonv2&lat=${c.lat}&lon=${c.lng}&accept-language=en`);
        const data = res.ok ? await res.json() : null;
        if (seq !== geocodeSeqRef.current) return;
        if (!preserveAddressRef.current && data?.display_name) setAddress(data.display_name);
      } catch {
        // keep the previous address; geocoding is best-effort
      } finally {
        if (seq === geocodeSeqRef.current) setGeocoding(false);
      }
    }, 450);
  }, []);

  const flyToCenter = useCallback((lat, lng, zoom = 15) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), zoom), duration: 900, essential: true });
  }, []);

  // Snap to the GPS fix, reverse-geocode it, then commit (Rapido/Uber flow).
  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoNotice('Location is not available on this device. Search for your area instead.');
      return;
    }
    setGeoNotice('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        preserveAddressRef.current = false;
        const addr = (await reverseGeocodeOnce(latitude, longitude)) || '';
        setLocating(false);
        centerRef.current = { lat: latitude, lng: longitude };
        setAddress(addr);
        flyToCenter(latitude, longitude);
        emitChange(latitude, longitude, addr);
      },
      () => {
        setLocating(false);
        setGeoNotice('Could not access your location. Allow location access or search for your area on the map.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }, [emitChange, flyToCenter, reverseGeocodeOnce]);

  // Pick a search suggestion: snap the map there and commit immediately.
  const pickSuggestion = useCallback(
    (s) => {
      preserveAddressRef.current = false;
      setQuery(s.display_name || '');
      setShowSuggestions(false);
      const lat = Number(s.lat);
      const lng = Number(s.lon);
      centerRef.current = { lat, lng };
      const addr = s.display_name || '';
      setAddress(addr);
      flyToCenter(lat, lng);
      emitChange(lat, lng, addr);
    },
    [emitChange, flyToCenter]
  );

  const runSearch = useCallback((q) => {
    setSearching(true);
    fetch(`${NOMINATIM_SEARCH}?format=jsonv2&limit=6&q=${encodeURIComponent(q)}&accept-language=en`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        setSuggestions(Array.isArray(list) ? list : []);
        setShowSuggestions(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSearching(false));
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimerRef.current = window.setTimeout(() => runSearch(q.trim()), 450);
  };

  const handleAddressEdit = (e) => {
    const next = e.target.value;
    setAddress(next);
    const c = centerRef.current;
    if (c && onChange) onChange({ latitude: c.lat, longitude: c.lng, address: next });
  };

  // Create the map once; centre on the saved spot, otherwise zoom out and ask
  // the browser where the user is (real-time feel = start at THEIR location).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const saved = isPin(value);
    const map = new MapLibreMap({
      container,
      style: OSM_STYLE,
      center: saved ? [Number(value.longitude), Number(value.latitude)] : DEFAULT_CENTER,
      zoom: saved ? 15 : 11,
      attributionControl: true
    });
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    map.on('dragstart', () => {
      preserveAddressRef.current = false;
      setIsDragging(true);
    });
    map.on('dragend', () => setIsDragging(false));
    map.on('moveend', () => {
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lng: c.lng };
      refreshAddressPreview();
    });

    // "You are here" blue dot, refreshed live via watchPosition.
    const dotEl = document.createElement('div');
    dotEl.className =
      'w-4 h-4 rounded-full bg-indigo-600 border-[3px] border-white shadow-[0_0_0_6px_rgba(79,70,229,0.25)]';
    const dot = new Marker({ element: dotEl }).setLngLat(DEFAULT_CENTER).addTo(map);
    userDotRef.current = dot;

    mapRef.current = map;

    let watcher = null;
    let locateFallbackTimer = null;
    if (saved) {
      setFindingYou(false);
    } else if (navigator.geolocation) {
      // Never let the "Finding your location..." overlay block the picker
      // forever — if the browser permission prompt stalls, degrade gracefully.
      locateFallbackTimer = window.setTimeout(() => {
        setFindingYou(false);
        setGeoNotice('Still finding your location — drag the map or search to set your spot.');
      }, 9000);
      navigateToGps();
    } else {
      setFindingYou(false);
      setGeoNotice('Location is not available on this device. Search for your area instead.');
    }

    async function navigateToGps() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          window.clearTimeout(locateFallbackTimer);
          setFindingYou(false);
          preserveAddressRef.current = false;
          dot.setLngLat([longitude, latitude]);
          map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1100, essential: true });
          const addr = (await reverseGeocodeOnce(latitude, longitude)) || '';
          setAddress(addr);
          emitChange(latitude, longitude, addr);
        },
        () => {
          window.clearTimeout(locateFallbackTimer);
          setFindingYou(false);
          setGeoNotice('Could not access your location. Drag the map or search to set your spot.');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
      watcher = navigator.geolocation.watchPosition(
        (pos) => dot.setLngLat([pos.coords.longitude, pos.coords.latitude]),
        () => {}
      );
    }

    return () => {
      if (watcher != null) navigator.geolocation.clearWatch(watcher);
      window.clearTimeout(locateFallbackTimer);
      if (geocodeTimerRef.current) window.clearTimeout(geocodeTimerRef.current);
      map.remove();
      mapRef.current = null;
      userDotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const borderClass = error
    ? 'border-rose-400 ring-2 ring-rose-100'
    : confirmed
      ? 'border-emerald-300 ring-2 ring-emerald-100'
      : 'border-slate-300';

  return (
    <div className="space-y-2">
      {/* "Where to?" search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search for your area or landmark..."
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query.trim().length >= 3 && setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 180)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />}
        {!searching && query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 hover:text-slate-600"
          >
            CLEAR
          </button>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, idx) => (
              <button
                key={`${s.place_id || idx}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className="cursor-pointer w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-b-0"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {geoNotice && (
        <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {geoNotice}
        </p>
      )}

      {/* Map with fixed centre pin and live GPS dot */}
      <div className={`relative w-full ${height} rounded-2xl overflow-hidden border-2 ${borderClass} transition-colors`}>
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Fixed centre pin (Rapido/Uber style) — the map moves under it.
            NOTE: Tailwind v4's translate-* sets the CSS `translate` property, which
            stacks with inline `style.transform`. Keep centering in the inline
            transform ONLY so the pin actually sits dead-centre. */}
        <div
          className="absolute left-1/2 top-1/2 z-10 pointer-events-none transition-transform duration-150"
          style={{ translate: 'none', transform: `translate(-50%, -100%) translateY(${isDragging ? 18 : 0}px)` }}
        >
          <svg width="36" height="46" viewBox="0 0 36 46" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.35))', display: 'block' }}>
            <path d="M18 0C8.1 0 0 8.1 0 18c0 13 16.6 26.3 17.3 26.9.4.3.9.3 1.3 0C19.4 44.3 36 31 36 18 36 8.1 27.9 0 18 0z" fill="#4f46e5" />
            <circle cx="18" cy="18" r="7.5" fill="#fff" />
          </svg>
        </div>

        {findingYou ? (
          <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-300" />
            <p className="text-xs font-bold">Finding your location...</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              aria-label="Use my current location"
              className="cursor-pointer absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <LocateFixed className="w-3.5 h-3.5 text-indigo-500" />}
              Use my location
            </button>

            {!confirmed && !isDragging && (
              <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center pointer-events-none">
                <span className="bg-slate-900/85 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-700">
                  <MapPin className="w-3 h-3 text-indigo-300" />
                  Drag the map, then confirm the pin below
                </span>
              </div>
            )}
            {isDragging && (
              <div className="absolute inset-x-0 top-2 z-10 flex justify-center px-16 pointer-events-none">
                <span className="bg-indigo-600/95 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  Release to set the location
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live address + confirm (single editable field — no duplicate text) */}
      <div
        className={`rounded-2xl border p-3 transition-colors ${
          confirmed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${confirmed ? 'text-emerald-600' : 'text-indigo-500'}`} />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {confirmed ? 'Service location' : 'Picked location'}
              </p>
              {geocoding && (
                <p className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 italic font-medium mt-0.5">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Getting the address...
                </p>
              )}
            </div>
          </div>
          {confirmed ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Set
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const c = centerRef.current;
                if (c) emitChange(c.lat, c.lng, address);
              }}
              className="cursor-pointer shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-colors"
            >
              Confirm location
            </button>
          )}
        </div>

        {confirmed ? (
          <p className="mt-2 text-sm font-semibold text-slate-800 leading-snug break-words">
            {address || 'Service location set.'}
          </p>
        ) : (
          <>
            <textarea
              placeholder="Move the map to choose your exact spot."
              value={address}
              onChange={handleAddressEdit}
              rows={2}
              className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
            <p className="text-[9px] text-slate-400 font-medium mt-1">
              Auto-filled from the map — refine it before confirming.
            </p>
          </>
        )}
      </div>
    </div>
  );
}