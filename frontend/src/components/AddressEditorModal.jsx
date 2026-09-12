import React, { useState, Suspense, lazy } from 'react';
import { Home, Briefcase, MoreHorizontal, MapPin, X, Check, Loader2 } from 'lucide-react';
import MapLoadingFallback from './MapLoadingFallback';

// maplibre is heavy; load it only when the address editor modal opens.
const LocationPicker = lazy(() => import('./LocationPicker'));

const LABELS = [
  { id: 'HOME', label: 'Home', icon: Home, active: 'bg-teal-50 border-teal-500 text-teal-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
  { id: 'OFFICE', label: 'Office', icon: Briefcase, active: 'bg-indigo-50 border-indigo-500 text-indigo-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
  { id: 'OTHER', label: 'Other', icon: MoreHorizontal, active: 'bg-amber-50 border-amber-500 text-amber-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
];

/**
 * Blinkit-style "Add address" modal — pick a label tile (Home / Office / Other),
 * drop the exact pin on the map (auto reverse-geocoded), optionally add a
 * flat/landmark line and mark it default. Submits via `onSave`.
 */
export default function AddressEditorModal({
  initial = null,
  usedLabels = [],
  onClose,
  onSave,
  saving = false,
  submitLabel = 'Save Address',
}) {
  const existing = initial?.id ? initial : null;
  // When creating a new address (not editing), any label that already has a
  // saved entry is a fixed slot that can't be duplicated — tapping it just
  // jumps to that existing address instead. While editing, the address's own
  // label stays available.
  const usedLabelIds = !existing ? new Set((usedLabels || []).map((l) => String(l).toUpperCase())) : new Set();
  const firstFreeLabel = LABELS.find(({ id }) => !usedLabelIds.has(id))?.id || 'OTHER';
  const [label, setLabel] = useState(existing?.label || firstFreeLabel);
  const [address, setAddress] = useState(existing?.address || '');
  const [latitude, setLatitude] = useState(existing?.latitude ?? null);
  const [longitude, setLongitude] = useState(existing?.longitude ?? null);
  const [landmark, setLandmark] = useState(existing?.landmark || '');
  const [isDefault, setIsDefault] = useState(Boolean(existing?.isDefault));
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please pick a location on the map — the address is auto-filled.');
      return;
    }
    setError('');
    onSave({
      label,
      address: address.trim(),
      latitude,
      longitude,
      landmark: landmark.trim() || null,
      isDefault,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg relative shadow-2xl animate-fade-in my-6 text-left max-h-[calc(100vh-3rem)] overflow-y-auto hide-scrollbar">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {existing ? 'Edit Address' : 'Add New Address'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Drop the pin on the map to set your exact spot.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Label tiles */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Save as</span>
            <div className="grid grid-cols-3 gap-2">
              {LABELS.map(({ id, label: lbl, icon: Icon, active, inactive }) => {
                const taken = usedLabelIds.has(id);
                return (
                  <div
                    key={id}
                    className={`relative rounded-xl border-2 transition-all ${
                      label === id
                        ? active
                        : taken
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          : inactive
                    }`}
                  >
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => !taken && setLabel(id)}
                      className={`cursor-pointer w-full flex flex-col items-center gap-1.5 px-3 py-2.5 text-[11px] font-extrabold transition-all ${taken ? 'opacity-60' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      {lbl}
                    </button>
                    {taken && (
                      <span className="absolute top-1 right-1.5 text-[8px] font-black uppercase tracking-wide bg-slate-200 text-slate-500 rounded-full px-1.5 py-0.5">
                        Saved
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {usedLabelIds.size > 0 && (
              <p className="text-[10px] font-semibold text-slate-400 mt-1.5">
                You already have {Array.from(usedLabelIds).map((l) => LABELS.find((x) => x.id === l)?.label || l).join('/')} saved — edit it from your Saved Addresses instead.
              </p>
            )}
          </div>

          {/* Map picker */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Pick location <span className="text-rose-500">*</span>
            </span>
            <Suspense fallback={<MapLoadingFallback />}>
              <LocationPicker
                value={{ latitude, longitude, address }}
                onChange={({ latitude: lat, longitude: lng, address: addr }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setAddress(addr || '');
                }}
                error={!!error && !latitude}
              />
            </Suspense>
          </div>

          {/* Landmark / flat detail */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Flat / building / landmark <span className="text-slate-300 normal-case font-semibold">(optional)</span>
            </span>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. 3rd Floor, Reliance Arcade, near clock tower"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Default toggle */}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" />
              Set as my default address
            </span>
            <span
              role="switch"
              aria-checked={isDefault}
              onClick={() => setIsDefault(v => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${isDefault ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDefault ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </span>
          </label>

          {error && (
            <p className="inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-md px-2 py-1">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}