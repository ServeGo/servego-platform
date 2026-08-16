import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, LocateFixed, Search, Loader2, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';

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
const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

const isFiniteCoord = (v) => v != null && Number.isFinite(Number(v));
const isPin = (value) => isFiniteCoord(value?.latitude) && isFiniteCoord(value?.longitude);

/** Google Maps short links (Share → Copy link) cannot be expanded in a browser. */
const isGoogleShortLink = (text) =>
  /(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(String(text || ''));

/**
 * Extract a { lat, lng } pair from a Google Maps URL or a raw "lat, lng" string.
 * Understands every common Maps URL shape:
 *   - "17.385, 78.486" (raw coordinates)
 *   - /place/Name/@17.385,78.486,15z/ (place / search / dir views)
 *   - ?query=17.385,78.486 / ?q= / ?ll= / ?center= (search URLs)
 *   - !3d17.385!4d78.486 (share-link data hash)
 * Returns null when nothing usable is found.
 */
function parseCoordsFromText(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;

  const toCoord = (latStr, lngStr) => {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : null;
  };

  const rawCoord = s.match(/^([-+]?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (rawCoord) {
    const c = toCoord(rawCoord[1], rawCoord[2]);
    if (c) return c;
  }

  const atMatch = s.match(/@([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
  if (atMatch) {
    const c = toCoord(atMatch[1], atMatch[2]);
    if (c) return c;
  }

  const qMatch =
    s.match(/[?&](?:query|q|ll|center)=([-+]?\d{1,3}(?:\.\d+)?)%2C([-+]?\d{1,3}(?:\.\d+)?)/) ||
    s.match(/[?&](?:query|q|ll|center)=([-+]?\d{1,3}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
  if (qMatch) {
    const c = toCoord(qMatch[1], qMatch[2]);
    if (c) return c;
  }

  const dMatch = s.match(/!3d([-+]?\d{1,3}(?:\.\d+)?)!4d([-+]?\d{1,3}(?:\.\d+)?)/);
  if (dMatch) {
    const c = toCoord(dMatch[1], dMatch[2]);
    if (c) return c;
  }

  return null;
}

/**
 * Mandatory map location picker backed by MapLibre GL + OpenStreetMap.
 *  - click anywhere on the map to drop the pin
 *  - search box (Nominatim) to jump to an address
 *  - "use my location" to center on the device GPS fix
 *  - the address text is reverse-geocoded from the pin but stays editable
 *
 * Emits `onChange({ latitude, longitude, address })`. A location is only
 * "chosen" once both coordinates exist — callers should gate submit on that.
 */
export default function LocationPicker({ value, onChange, error, height = 'h-56' }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const geocodeSeqRef = useRef(0);
  const searchTimerRef = useRef(null);

  const [address, setAddress] = useState(value?.address || '');
  const addressRef = useRef(value?.address || '');
  useEffect(() => { addressRef.current = address; }, [address]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  // "Choose on Maps" → Google Maps in a new tab, then paste the shared link back.
  const [mapsPasteOpen, setMapsPasteOpen] = useState(false);
  const [mapsLink, setMapsLink] = useState('');
  const [linkStatus, setLinkStatus] = useState(null);
  const linkStatusTimerRef = useRef(null);

  const pinned = isPin(value);

  // Reverse-geocode a coordinate into a display address.
  const reverseGeocode = useCallback(async (lat, lng) => {
    const seq = ++geocodeSeqRef.current;
    setGeocoding(true);
    let resolved = '';
    try {
      const res = await fetch(`${NOMINATIM_REVERSE}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`);
      if (!res.ok) throw new Error('geocode failed');
      const data = await res.json();
      if (seq !== geocodeSeqRef.current) return;
      resolved = data?.display_name || '';
    } catch {
      if (seq !== geocodeSeqRef.current) return;
    } finally {
      if (seq === geocodeSeqRef.current) setGeocoding(false);
    }
    if (resolved) {
      setAddress(resolved);
      if (onChange) onChange({ latitude: lat, longitude: lng, address: resolved });
    } else if (onChange) {
      onChange({ latitude: lat, longitude: lng, address: addressRef.current });
    }
  }, [onChange]);

  // Drop the pin at lat/lng and recentre the view.
  const placePin = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([Number(lng), Number(lat)]);
    map.easeTo({ center: [Number(lng), Number(lat)], zoom: Math.max(map.getZoom(), 15), duration: 700 });
    void reverseGeocode(Number(lat), Number(lng));
  }, [reverseGeocode]);

  const handleMapClick = useCallback((e) => {
    placePin(e.lngLat.lat, e.lngLat.lng);
  }, [placePin]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setAddress((prev) => prev);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placePin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setSuggestions([]);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [placePin]);

  // Open Google Maps in a new tab centred on the current pin / address so the
  // user can fine-tune the exact spot. The chosen location comes back through
  // the paste field below (see applyMapsLink).
  const openInGoogleMaps = useCallback(() => {
    let query = 'Hyderabad';
    if (isPin(value)) {
      query = `${value.latitude},${value.longitude}`;
    } else if (addressRef.current.trim()) {
      query = addressRef.current.trim();
    }
    // Capacitor native app → system browser/Google Maps app; web → new tab.
    const target = window.Capacitor?.isNativePlatform?.() ? '_system' : '_blank';
    window.open(`${GOOGLE_MAPS_SEARCH}${encodeURIComponent(query)}`, target);
    setMapsPasteOpen(true);
    setLinkStatus({
      tone: 'info',
      text: 'Pick the exact spot in Google Maps, then tap Share → Copy link and paste it here.'
    });
  }, [value]);

  const applyMapsLink = useCallback(
    (raw) => {
      const text = String(raw || '').trim();
      if (linkStatusTimerRef.current) window.clearTimeout(linkStatusTimerRef.current);

      if (!text) {
        setLinkStatus(null);
        return;
      }

      if (isGoogleShortLink(text)) {
        setLinkStatus({
          tone: 'amber',
          text: 'That is a short link. Open it in the browser and copy the full link from the address bar — or paste the coordinates directly (e.g. 17.385, 78.486).'
        });
        return;
      }

      const coords = parseCoordsFromText(text);
      if (!coords) {
        const looksLikeUrl = /https?:\/\/|maps\.google|goo\.gl|www\./i.test(text) || text.length > 40;
        if (looksLikeUrl) {
          setLinkStatus({
            tone: 'rose',
            text: 'Could not read that. Make sure it is a Google Maps link that already has a location pinned.'
          });
        } else {
          setLinkStatus(null);
        }
        return;
      }

      setMapsLink('');
      setMapsPasteOpen(false);
      setLinkStatus({
        tone: 'emerald',
        text: `Location applied — ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
      });
      placePin(coords.lat, coords.lng);

      linkStatusTimerRef.current = window.setTimeout(() => setLinkStatus(null), 6000);
    },
    [placePin]
  );

  // Search with debounce (Nominatim asks for max ~1 req/s).
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

  const pickSuggestion = (s) => {
    setQuery(s.display_name || '');
    setShowSuggestions(false);
    placePin(Number(s.lat), Number(s.lon));
  };

  const handleAddressEdit = (e) => {
    const next = e.target.value;
    setAddress(next);
    if (onChange) {
      onChange({
        latitude: isFiniteCoord(value?.latitude) ? Number(value.latitude) : null,
        longitude: isFiniteCoord(value?.longitude) ? Number(value.longitude) : null,
        address: next
      });
    }
  };

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const lat = isFiniteCoord(value?.latitude) ? Number(value.latitude) : DEFAULT_CENTER[1];
    const lng = isFiniteCoord(value?.longitude) ? Number(value.longitude) : DEFAULT_CENTER[0];

    const map = new MapLibreMap({
      container,
      style: OSM_STYLE,
      center: [lng, lat],
      zoom: pinned ? 15 : 11,
      attributionControl: true
    });
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');
    map.on('click', handleMapClick);

    const el = document.createElement('div');
    el.innerHTML =
      '<svg width="34" height="42" viewBox="0 0 34 42" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))">' +
      '<path d="M17 0C7.6 0 0 7.6 0 17c0 12.2 15.6 24.6 16.4 25.2.4.3.8.3 1.2 0C18.4 41.6 34 29.2 34 17 34 7.6 26.4 0 17 0z" fill="#4f46e5"/>' +
      '<circle cx="17" cy="17" r="7" fill="#fff"/></svg>';
    markerRef.current = new Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync when the parent restores a saved location.
  useEffect(() => {
    if (!isPin(value)) return;
    const map = mapRef.current;
    const lat = Number(value.latitude);
    const lng = Number(value.longitude);
    markerRef.current?.setLngLat([lng, lat]);
    if (map) map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.latitude, value?.longitude]);

  const borderClass = error
    ? 'border-rose-400 ring-2 ring-rose-100'
    : pinned
      ? 'border-emerald-300 ring-2 ring-emerald-100'
      : 'border-slate-300';

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search for an address or area..."
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

      <div className="flex items-center justify-between gap-2 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2">
        <p className="text-[10px] font-semibold text-slate-500 leading-tight">
          {pinned
            ? 'Prefer the exact spot? Fine-tune it on Google Maps.'
            : "Can't find the exact spot? Choose it on Google Maps."}
        </p>
        <button
          type="button"
          onClick={openInGoogleMaps}
          className="cursor-pointer shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold px-3 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Choose on Maps
        </button>
      </div>

      {mapsPasteOpen && (
        <div className="space-y-1.5">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={mapsLink}
              onChange={(e) => {
                setMapsLink(e.target.value);
                applyMapsLink(e.target.value);
              }}
              placeholder="Paste Google Maps link or coordinates (e.g. 17.385, 78.486)"
              autoFocus
              className="w-full bg-white border border-indigo-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {linkStatus && (
            <p className={`text-[10px] font-bold px-1 ${
              linkStatus.tone === 'emerald'
                ? 'text-emerald-600'
                : linkStatus.tone === 'amber'
                  ? 'text-amber-600'
                  : linkStatus.tone === 'rose'
                    ? 'text-rose-600'
                    : 'text-indigo-500'
            }`}>
              {linkStatus.text}
            </p>
          )}
        </div>
      )}

      <div className={`relative w-full ${height} rounded-2xl overflow-hidden border-2 ${borderClass} transition-colors`}>
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="cursor-pointer absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <LocateFixed className="w-3.5 h-3.5 text-indigo-500" />}
          Use my location
        </button>

        {!pinned && (
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center pointer-events-none">
            <span className="bg-slate-900/85 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-700">
              <MapPin className="w-3 h-3 text-indigo-300" />
              Click the map to pin your exact location
            </span>
          </div>
        )}

        {pinned && geocoding && (
          <div className="absolute left-3 bottom-3 z-10 bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
            Getting address...
          </div>
        )}

        {pinned && !geocoding && (
          <div className="absolute left-3 bottom-3 z-10 bg-emerald-50/95 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 shadow-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Location pinned
          </div>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
          Address <span className="text-rose-500">*</span>
        </label>
        <textarea
          placeholder="Flat No, Apartment, Street name, Landmark, Pin"
          value={address}
          onChange={handleAddressEdit}
          rows={2}
          required
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <p className="text-[9px] text-slate-400 font-medium mt-1">
          Auto-filled from the pin — refine it if needed (flat number, landmark).
        </p>
      </div>
    </div>
  );
}
