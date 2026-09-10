import React, { useState } from 'react';
import { AlertCircle, MapPin, Plus, Home, Briefcase, MoreHorizontal } from 'lucide-react';
import LocationPicker from './LocationPicker';
import AddressEditorModal from './AddressEditorModal';

const LABEL_META = {
  HOME: { label: 'Home', icon: Home },
  OFFICE: { label: 'Office', icon: Briefcase },
  OTHER: { label: 'Other', icon: MoreHorizontal },
};

export default function BookingModal({
  onClose,
  errorText,

  address, setAddress,
  latitude, longitude, setLatitude, setLongitude,
  onSubmit,

  contactPhone, setContactPhone,

  savedAddresses = [],
  onPickSaved,
  onSaveAddress,
}) {
  const [activeId, setActiveId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const handlePickSaved = (addr) => {
    setActiveId(addr.id);
    setShowMap(false);
    onPickSaved?.(addr);
  };

  const activeSaved = savedAddresses.find((a) => a.id === activeId);

  const handleAddAddressSave = async (payload) => {
    setSavingAddress(true);
    try {
      const result = await onSaveAddress?.(payload);
      if (result?.ok && result.address) {
        setShowAddAddress(false);
        handlePickSaved(result.address);
      }
      return result || { ok: false };
    } finally {
      setSavingAddress(false);
    }
  };

  const showMapPicker = showMap || !activeSaved;

  // Address chips are selectable tiles; the map underneath shows the current
  // fallback pin. Tapping a chip hides the map; picking on the map clears the
  // chip selection.
  const effectiveAddress = activeSaved?.address || address;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 max-w-2xl w-full relative shadow-2xl animate-fade-in text-left max-h-[calc(100vh-2rem)] overflow-y-auto hide-scrollbar">

        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900">Temporary Service Booking</h3>
            <p className="text-slate-500 text-xs font-medium mt-0.5 truncate">Your request goes to every eligible specialist in your area</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {errorText && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{errorText}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Form area */}
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Service Location <span className="text-rose-500">*</span>
              </span>

              {/* Saved address tiles (Blinkit-style) */}
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {savedAddresses.map((addr) => {
                    const meta = LABEL_META[addr.label] || LABEL_META.OTHER;
                    const Icon = meta.icon;
                    const isActive = activeId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handlePickSaved(addr)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[11px] font-extrabold transition-all ${
                          isActive
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                        {addr.isDefault && <span className="text-[9px] font-black text-teal-600">• Default</span>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => { setShowAddAddress(true); setShowMap(false); }}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-[11px] font-extrabold text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </button>
                </div>
              )}

              {/* Selected saved address summary */}
              {activeSaved && !showMapPicker && (
                <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/50 p-3 mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                      <p className="text-[11px] font-semibold text-slate-700 leading-relaxed break-words">
                        {activeSaved.address}
                        {activeSaved.landmark ? ` · ${activeSaved.landmark}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="mt-2 text-[10px] font-bold text-teal-700 underline hover:text-teal-800"
                  >
                    Pick / change location on map
                  </button>
                </div>
              )}

              {/* Map picker (shows when nothing is selected or user picks on map) */}
              {showMapPicker && (
                <LocationPicker
                  height="h-48 sm:h-56"
                  value={{ latitude, longitude, address: effectiveAddress }}
                  onChange={({ latitude: lat, longitude: lng, address: addr }) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setAddress(addr);
                    setActiveId(null);
                    setShowMap(false);
                  }}
                  error={errorText && !latitude}
                />
              )}

              {savedAddresses.length === 0 && (
                <button
                  type="button"
                  onClick={() => { setShowAddAddress(true); }}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save this address for next time
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Contact Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 98765 43210"
                value={contactPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9+]/g, '');
                  if (digits.length <= 15) setContactPhone(digits);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none"
                required
              />
              <p className="text-[10px] font-semibold text-slate-400 mt-1.5">The assigned specialist will call you on this number.</p>
            </div>
          </div>

            <button
              type="submit"
            className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none"
          >
            Confirm Booking
          </button>
        </form>
      </div>

      {/* Add New Address modal */}
      {showAddAddress && (
        <AddressEditorModal
          onClose={() => setShowAddAddress(false)}
          onSave={handleAddAddressSave}
          saving={savingAddress}
          submitLabel="Save & Use"
        />
      )}
    </div>
  );
}