import React, { useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  Briefcase,
  Clock3,
  MapPin,
  PencilLine,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { api } from '../utils/apiClient';
import LocationPicker from './LocationPicker';
import { useData } from '../context/AppContext';

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
  const { savedAddresses } = useData();
  const [activeLocation, setActiveLocation] = useState('Home');

  const effectiveServiceName = (serviceName || serviceNameInput || '').trim();

  // Saved Home/Work/etc. shortcuts from the user's profile; falls back to the
  // previous default rows when nothing has been saved yet.
  const addressRows = (savedAddresses.length > 0
    ? savedAddresses.map(a => ({
        id: a.id,
        name: a.label || 'Home',
        value: a.address,
        latitude: a.latitude,
        longitude: a.longitude,
        icon: MapPin,
        saved: true,
      }))
    : [
        { id: 'fallback-home', name: 'Home', value: 'Lingampally, Barkatpura, Ward 80 Kachiguda, Greater Hyderabad Municipal Corporation, Hyderabad', latitude: null, longitude: null, icon: MapPin },
        { id: 'fallback-work', name: 'Work', value: 'IT Park, Madhapur, Hyderabad', latitude: null, longitude: null, icon: Briefcase },
      ]
  ).concat([{ id: 'add-new', name: 'Add New Address', value: 'Save for faster request', latitude: null, longitude: null, icon: MapPin }]);

  const handleAddressSelect = (item) => {
    setActiveLocation(item.name);
    if (item.id === 'add-new') return;
    if (item.address) setAddress(item.address);
    if (item.latitude != null) setLatitude(item.latitude);
    if (item.longitude != null) setLongitude(item.longitude);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!effectiveServiceName) {
      setError('Please tell us which service you need.');
      return;
    }
    const serviceCategory = effectiveServiceName;
    if (!latitude || !longitude || !address.trim()) {
      setError('Please select your service location on the map.');
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

  const engagementLabel = engagementType === 'CONTRACT' ? 'Contract Service' : 'Permanent Service';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#edf4f2]">
      <div className="mx-auto max-w-[1320px] px-3 py-3 sm:px-4 lg:px-6">
        <header className="mb-4 flex items-center justify-between rounded-[22px] border border-[#dfe9e8] bg-white/90 px-3 py-2 shadow-[0_8px_25px_-12px_rgba(15,23,42,0.30)] backdrop-blur-sm sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe9e8] bg-white text-[#1f2d3d] transition hover:bg-slate-50"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 truncate text-[18px] font-black tracking-[-0.04em] text-[#13233f] sm:text-[20px]">{effectiveServiceName || 'Permanent / Contract Request'}</div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_320px] xl:grid-cols-[minmax(0,1.7fr)_420px]">
          <form id="permanent-request-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">1</span>
                <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Service Details</h4>
              </div>

              <div className="space-y-4">
                {!serviceName && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Service Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder="e.g. Cooking, Housekeeping, Driver"
                      value={serviceNameInput}
                      onChange={(e) => setServiceNameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </div>
            </section>

            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">2</span>
                <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Service Location</h4>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d1e8e4] bg-[#ecfbf7] px-2 py-2.5 text-[11px] font-bold text-[#146c62] sm:text-xs"
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  Use current location
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#e7edf4] bg-[#f4f7fb] px-2 py-2.5 text-[11px] font-bold text-[#516682] sm:text-xs"
                >
                  Search Address
                </button>
              </div>

              <div className="space-y-2">
                {addressRows.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeLocation === item.name;
                  return (
                    <button
                      key={item.id || item.name}
                      type="button"
                      onClick={() => handleAddressSelect(item)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-[#23b19d] bg-[#eafaf7] shadow-[inset_0_0_0_1px_rgba(35,177,157,0.12)]'
                          : 'border-[#e7edf4] bg-[#f9fbfd] hover:bg-[#f2f7fa]'
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#1e5d71]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[#13233f]">{item.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#66809a]">{item.value}</span>
                      </span>
                      <span className={`h-5 w-5 rounded-full border-2 ${isActive ? 'border-[#1b9a8d] bg-[#1b9a8d] shadow-[0_0_0_3px_rgba(27,154,141,0.12)]' : 'border-[#b8c7d9] bg-white'}`} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 overflow-hidden rounded-[22px] border border-[#dfe9e8] bg-[#e6eceb]">
                <LocationPicker
                  value={{ latitude, longitude, address }}
                  onChange={({ latitude: lat, longitude: lng, address: addr }) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setAddress(addr);
                  }}
                  error={error && !latitude}
                  height="h-48 sm:h-64"
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">3</span>
                <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Additional Information</h4>
              </div>

              <textarea
                placeholder="Tell us about your requirements, work schedule, pets, preferred timings, etc."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full resize-none bg-slate-50 border border-slate-300 rounded-2xl px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5db7ad] focus:bg-white"
              />
              <div className="mt-2 flex justify-end text-[11px] font-semibold text-[#7a8ca5]">
                <span>{additionalInfo.length}/2000</span>
              </div>

              <div className="mt-4 rounded-2xl border border-[#cfe8df] bg-[#eafaf7] p-3 text-[11px] text-[#0f716a] font-medium leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Our team reviews your request and arranges a suitable specialist for you. You'll be updated here and through notifications.
                </span>
              </div>
            </section>
          </form>

          <aside className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5 xl:sticky xl:top-4 xl:h-fit">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#edf2f4] pb-3">
              <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Request Summary</h4>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dff6ee] text-[#0e8f7a]">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-black text-[#13233f]">{effectiveServiceName || 'Service'}</div>
                  <div className="text-xs text-[#6f8298]">{engagementLabel}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <CalendarClock className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Start Date</span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#13233f]">{startDate || 'Not selected'}</p>
              </div>

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <WalletCards className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Monthly Budget</span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#13233f]">{budget ? `₹${Number(budget).toLocaleString('en-IN')}` : 'Not set'}</p>
              </div>

              {engagementType === 'CONTRACT' && (
                <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                    <div className="flex items-center gap-2 text-[#425f7a]">
                      <Clock3 className="h-4 w-4 text-[#1a8a7e]" />
                      <span className="text-sm font-black text-[#13233f]">Duration</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#13233f]">
                    {contractYears ? `${contractYears} year${contractYears > 1 ? 's' : ''}` : ''}
                    {contractYears && contractDays ? ' + ' : ''}
                    {contractDays ? `${contractDays} day${contractDays > 1 ? 's' : ''}` : '' || 'Not set'}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <MapPin className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Location</span>
                  </div>
                  <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#13233f]">{address || 'Not selected'}</p>
              </div>

              {additionalInfo && (
                <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                    <div className="flex items-center gap-2 text-[#425f7a]">
                      <PencilLine className="h-4 w-4 text-[#1a8a7e]" />
                      <span className="text-sm font-black text-[#13233f]">Additional Info</span>
                    </div>
                    <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#657d98]">{additionalInfo}</p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#d5eee9] bg-[#ebf9f6] p-3 text-sm text-[#0f716a]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#dff7f2] text-[#0f8c72]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-black">No charge to request</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#2b6d66]">
                    This is a request only. Our team reviews it and arranges a suitable specialist. Charges are agreed directly with them.
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              form="permanent-request-form"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#0a9f8e] px-4 py-4 text-base font-black text-white shadow-[0_16px_25px_-16px_rgba(10,159,142,1)] transition hover:bg-[#0a8d7d] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-5 w-5 rounded-full border-t-2 border-white animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Request</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
