import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Fallback shown while the maplibre-powered map chunks (LocationPicker /
 * LiveTrackingMap) load. Keeps the map slot filled so the layout doesn't jump.
 */
export default function MapLoadingFallback() {
  return (
    <div
      role="status"
      className="w-full h-48 sm:h-56 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold"
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading map…
    </div>
  );
}