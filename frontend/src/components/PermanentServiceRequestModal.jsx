import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AlertCircle, Briefcase, ShieldCheck, MapPin, Plus, Home, MoreHorizontal } from 'lucide-react';
import { api } from '../utils/apiClient';
import { cachedRequest, invalidateCache } from '../utils/requestCache';
import { normalizeSavedAddresses } from '../utils/normalizeCustomerData';
import MapLoadingFallback from './MapLoadingFallback';
import AddressEditorModal from './AddressEditorModal';

// maplibre is heavy; load it only when the map picker is shown.
const LocationPicker = lazy(() => import('./LocationPicker'));

const LABEL_META = {
  HOME: { label: 'Home', icon: Home },
  OFFICE: { label: 'Office', icon: Briefcase },
  OTHER: { label: 'Other', icon: MoreHorizontal },
};

export default function PermanentServiceRequestModal({ serviceName, onClose, onSuccess }) {
  const [serviceNameInput, setServiceNameInput] = useState(serviceName || '');
  const [startDate, setStartDate] = useState('');
  const [engagementType, setEngagementType] = useState('PERMANENT');
  const [contractYears, setContractYears] = useState('');
  const [contractDays, setContractDays] = useState('');
  const [budget, setBudget] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Saved-address selection (same flow as a real booking): pick a chip for an
  // existing address or drop a new pin / save it for reuse next time.
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadSavedAddresses = useCallback(async () => {
    try {
      const res = await cachedRequest('customer-addresses', () => api.get('/customer-addresses'));
      if (res.ok && Array.isArray(res.data?.addresses)) {
        const saved = normalizeSavedAddresses(res.data.addresses);
        setSavedAddresses(saved);
        const def = saved.find((a) => a.isDefault) || saved[0];
        if (def && def.latitude != null && def.longitude != null) {
          setActiveId(def.id);
          setLatitude(def.latitude);
          setLongitude(def.longitude);
          setAddress(def.address);
        }
      }
    } catch {
      // Saved addresses are a convenience — never block the request form.
    }
  }, []);

  useEffect(() => { loadSavedAddresses(); }, [loadSavedAddresses]);

  const handlePickSaved = (addr) => {
    setActiveId(addr.id);
    setShowMap(false);
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setAddress(addr.address);
  };

  const handleSaveAddress = async (payload) => {
    setSavingAddress(true);
    try {
      const res = await api.post('/customer-addresses', payload);
      if (res.ok && res.data?.address) {
        invalidateCache('customer-addresses');
        const addr = res.data.address;
        setSavedAddresses((prev) => normalizeSavedAddresses([addr, ...prev.filter((a) => a.id !== addr.id)]));
        setShowAddAddress(false);
        handlePickSaved(addr);
        return { ok: true, address: addr };
      }
      return { ok: false, error: res.data?.message || 'Could not save this address.' };
    } catch {
      return { ok: false, error: 'Could not save this address.' };
    } finally {
      setSavingAddress(false);
    }
  };

  const activeSaved = savedAddresses.find((a) => a.id === activeId);
  const showMapPicker = showMap || !activeSaved;
  const effectiveAddress = activeSaved?.address || address;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!serviceNameInput.trim()) {
      setError('Please tell us which service you need.');
      return;
    }
    const serviceCategory = serviceNameInput.trim();
    if (!latitude || !longitude || !address.trim()) {
      setError('Please select your service location from a saved address or the map.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }
    if (engagementType === 'CONTRACT' && !contractYears && !contractDays) {
      setError('For a contract, please provide a duration in years or days.');
      return;
    }
    const budgetValue = Number(budget);
    if (!budget || Number.isNaN(budgetValue) || budgetValue <= 0) {
      setError('Please enter a valid monthly budget.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/permanent-service-requests', {
        serviceCategory,
        engagementType,
        startDate,
        contractDurationYears: contractYears ? Number(contractYears) : null,
        contractDurationDays: contractDays ? Number(contractDays) : null,
        monthlyBudget: budgetValue,
        additionalInfo: additionalInfo.trim() || null,
        locationAddress: address.trim(),
        serviceLatitude: latitude,
        serviceLongitude: longitude
      });
      if (res.ok) {
        onSuccess(res.data);
      } else {
        setError(res.data?.message || res.data?.error || 'Could not submit your request. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-xl w-full relative shadow-2xl animate-fade-in mt-6 mb-6 text-left max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Permanent / Contract Request</h3>
            <p className="text-slate-500 text-xs font-medium">{serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Service Name <span className="text-rose-500">*</span>
            </label>
            {serviceName ? (
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800">
                {serviceName}
              </div>
            ) : (
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Cooking, Housekeeping, Driver"
                value={serviceNameInput}
                onChange={(e) => setServiceNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Monthly Budget (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 15000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Service Location <span className="text-rose-500">*</span>
            </span>

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

            {activeSaved && !showMapPicker && (
              <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/50 p-3 mb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                  <p className="text-[11px] font-semibold text-slate-700 leading-relaxed break-words">
                    {activeSaved.address}
                    {activeSaved.landmark ? ` · ${activeSaved.landmark}` : ''}
                  </p>
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

            {showMapPicker && (
              <Suspense fallback={<MapLoadingFallback />}>
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
                error={error && !latitude}
                />
              </Suspense>
            )}

            {savedAddresses.length === 0 && (
              <button
                type="button"
                onClick={() => setShowAddAddress(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Save this address for next time
              </button>
            )}
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Engagement Type <span className="text-rose-500">*</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEngagementType('PERMANENT')}
                className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                  engagementType === 'PERMANENT'
                    ? 'bg-teal-600 border-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setEngagementType('CONTRACT')}
                className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                  engagementType === 'CONTRACT'
                    ? 'bg-teal-600 border-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Contract
              </button>
            </div>
          </div>

          {engagementType === 'CONTRACT' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Contract Duration <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Years</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="e.g. 1"
                    value={contractYears}
                    onChange={(e) => setContractYears(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    placeholder="e.g. 90"
                    value={contractDays}
                    onChange={(e) => setContractDays(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-2">Provide either years or days.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Additional Information (Optional)</label>
            <textarea
              placeholder="Tell us about your requirements, work schedule, pets, preferred timings, etc."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-[11px] text-teal-800 font-medium leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Our team reviews your request and arranges a suitable specialist for you. You'll be updated here and through notifications.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showAddAddress && (
        <AddressEditorModal
          onClose={() => setShowAddAddress(false)}
          onSave={handleSaveAddress}
          saving={savingAddress}
          submitLabel="Save & Use"
          usedLabels={savedAddresses.map((a) => a.label)}
        />
      )}
    </div>
  );
}
