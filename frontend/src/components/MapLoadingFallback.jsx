import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Fallback shown while the map chunks (LocationPicker / LiveTrackingMap) load.
 * Keeps the map slot filled so the layout doesn't jump.
 *
 * Two tones, because the component is shared by two visually opposite maps:
 *
 *  - default (light) — the pale card the light-themed `LocationPicker` sits in.
 *  - `tone="dark"`  — the dark panel `LiveTrackingMap` renders. Its exact height
 *    and frame are mirrored here, so the swap is invisible: the placeholder is
 *    the same `h-56` and the same `rounded-2xl border-slate-800` as the real
 *    panel. Before, the light placeholder was 192px under `sm` against a map that
 *    is always 224px, so every mobile load jumped 32px and flashed grey-to-dark.
 *
 * Keep the height in step with the map it stands in for, or the slot jumps.
 */
export default function MapLoadingFallback({ tone = 'light' }) {
  const dark = tone === 'dark';

  return (
    <div
      role="status"
      className={
        dark
          ? 'w-full h-56 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold'
          : 'w-full h-48 sm:h-56 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold'
      }
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading map…
    </div>
  );
}
