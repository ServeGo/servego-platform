import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock3,
  Crown,
  House,
  MapPin,
  PencilLine,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import LocationPicker from './LocationPicker';
import { useData } from '../context/AppContext';

export default function BookingModal({
  serviceName = '',
  provider,
  onClose,
  errorText,
  address, setAddress,
  latitude, longitude, setLatitude, setLongitude,
  instructions, setInstructions,
  loyaltyTier,
  onSubmit,
}) {
  const specialistLabel = provider?.name || 'Electrician';
  const { savedAddresses } = useData();
  const [activeLocation, setActiveLocation] = useState('Home');
  const [problemDetails, setProblemDetails] = useState('Lights not working in bedroom. Need to check wiring.');

  // Saved Home/Work/etc. shortcuts from the user's profile (rule: the booking
  // modal offers real saved addresses). Falls back to the previous default rows
  // when nothing has been saved yet so the flow never looks empty.
  const addressRows = (savedAddresses.length > 0
    ? savedAddresses.map(a => ({
        id: a.id,
        name: a.label || 'Home',
        value: a.address,
        latitude: a.latitude,
        longitude: a.longitude,
        icon: String(a.label || '').toLowerCase().includes('work') ? BriefcaseIcon : House,
        saved: true,
      }))
    : [
        { id: 'fallback-home', name: 'Home', value: 'Lingampally, Barkatpura, Ward 80 Kachiguda, Greater Hyderabad Municipal Corporation, Hyderabad', latitude: null, longitude: null, icon: House },
        { id: 'fallback-work', name: 'Work', value: 'IT Park, Madhapur, Hyderabad', latitude: null, longitude: null, icon: BriefcaseIcon },
      ]
  ).concat([{ id: 'add-new', name: 'Add New Address', value: 'Save for faster booking', latitude: null, longitude: null, icon: MapPin }]);

  const handleAddressSelect = (item) => {
    setActiveLocation(item.name);
    if (item.id === 'add-new') return;
    if (item.address) setAddress(item.address);
    if (item.latitude != null) setLatitude(item.latitude);
    if (item.longitude != null) setLongitude(item.longitude);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

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
            <div className="min-w-0 truncate text-[18px] font-black tracking-[-0.04em] text-[#13233f] sm:text-[20px]">{serviceName || 'Booking'}</div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_320px] xl:grid-cols-[minmax(0,1.7fr)_420px]">
          <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">1</span>
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
                  const active = activeLocation === item.name;
                  return (
                    <button
                      key={item.id || item.name}
                      type="button"
                      onClick={() => handleAddressSelect(item)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        active
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
                      <span className={`h-5 w-5 rounded-full border-2 ${active ? 'border-[#1b9a8d] bg-[#1b9a8d] shadow-[0_0_0_3px_rgba(27,154,141,0.12)]' : 'border-[#b8c7d9] bg-white'}`} />
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
                  error={errorText && !latitude}
                  height="h-48 sm:h-64"
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">2</span>
                <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Describe Your Problem</h4>
              </div>

              <textarea
                value={problemDetails}
                onChange={(e) => setProblemDetails(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#dfe9e8] bg-[#f8fbfc] px-3 py-3 text-sm text-[#1f2d3d] outline-none transition focus:border-[#5db7ad] focus:bg-white"
              />
              <div className="mt-2 flex justify-end text-[11px] font-semibold text-[#7a8ca5]">
                <span>{problemDetails.length}/300</span>
              </div>
            </section>

            <section className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff6ee] text-sm font-black text-[#0f8c72]">4</span>
                <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Additional Instructions</h4>
              </div>

              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. Ring the bell, call before coming, parking info, etc."
                className="w-full resize-none rounded-2xl border border-[#dfe9e8] bg-[#f8fbfc] px-3 py-3 text-sm text-[#1f2d3d] outline-none transition focus:border-[#5db7ad] focus:bg-white"
              />
              <div className="mt-2 flex justify-end text-[11px] font-semibold text-[#7a8ca5]">
                <span>{(instructions || '').length}/200</span>
              </div>
            </section>
          </form>

          <aside className="rounded-[26px] border border-[#dfe9e8] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.45)] sm:p-5 xl:sticky xl:top-4 xl:h-fit">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#edf2f4] pb-3">
              <h4 className="text-[18px] font-black tracking-[-0.04em] text-[#13233f]">Booking Summary</h4>
              <button type="button" className="rounded-xl border border-[#cfe8df] bg-[#eafaf7] px-2.5 py-1.5 text-[11px] font-black text-[#0e8f7a]">
                Change
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f9e7b6] text-[#d38a19]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-black text-[#13233f]">{specialistLabel}</div>
                    <div className="text-xs text-[#6f8298]">Temporary Service</div>
                  </div>
                </div>
                <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
              </div>

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <MapPin className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Location</span>
                  </div>
                  <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
                </div>
                <div className="mt-2 text-sm font-semibold text-[#13233f]">{activeLocation}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#657d98]">{address || 'Lingampally, Barkatpura, Ward 80 Kachiguda, Greater Hyderabad Municipal Corporation, Hyderabad'}</p>
              </div>

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <PencilLine className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Problem Details</span>
                  </div>
                  <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#657d98]">{problemDetails}</p>
              </div>

              <div className="rounded-2xl border border-[#edf2f4] bg-[#f8fbfc] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf2f4] pb-2">
                  <div className="flex items-center gap-2 text-[#425f7a]">
                    <PencilLine className="h-4 w-4 text-[#1a8a7e]" />
                    <span className="text-sm font-black text-[#13233f]">Additional Instructions</span>
                  </div>
                  <button type="button" className="text-[11px] font-black text-[#1a8a7e]">Edit</button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#657d98]">{instructions || 'None'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-[#d5efe9] bg-[#edfdf8] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c7f0e4] text-[#0e8f7a]">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-[#13233f]">Booking Fee</div>
                  <div className="text-[22px] font-black tracking-[-0.05em] text-[#0e8f7a]">₹199</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#d5eee9] bg-[#ebf9f6] p-3 text-sm text-[#0f716a]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#dff7f2] text-[#0f8c72]">
                  <InfoIcon />
                </div>
                <div>
                  <div className="font-black">Final service charges confirmed by the specialist.</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#2b6d66]">
                    The ₹199 is a booking fee only. The specialist will share the final cost after assessing the issue at your location.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#f0d8a8] bg-[#fff4d8] p-3">
              <div className="flex items-center gap-3 text-[#8a6409]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe6a8]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-sm font-black">100% Secure Payments</div>
              </div>
              <p className="mt-1 text-xs text-[#8a6409]">Your payment is safe with us.</p>
            </div>

            {loyaltyTier?.tier && (
              <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-[#f2df99] bg-[#fff8db] p-3 text-xs font-bold text-[#8d6900]">
                <Crown className="h-4 w-4 text-[#dca221]" />
                <span>{loyaltyTier.tier} member perks applied</span>
              </div>
            )}

            {errorText && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <button
              type="submit"
              form="booking-form"
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#0a9f8e] px-4 py-4 text-base font-black text-white shadow-[0_16px_25px_-16px_rgba(10,159,142,1)] transition hover:bg-[#0a8d7d]"
            >
              <span>Confirm &amp; Place Order</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm font-black">₹199</span>
              <ArrowRight className="h-4 w-4" />
            </button>

          </aside>
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M9 7V5.7A1.7 1.7 0 0 1 10.7 4h2.6A1.7 1.7 0 0 1 15 5.7V7" /><rect x="3.5" y="7" width="17" height="12.5" rx="2.5" /><path d="M3.5 11h17" /></svg>;
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}
