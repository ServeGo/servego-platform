import React from 'react';
import { AlertCircle, Crown } from 'lucide-react';

export default function BookingModal({
  provider,
  onClose,
  errorText,

  address, setAddress,
  instructions, setInstructions,
  loyaltyTier,
  onSubmit
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl animate-fade-in mt-6 mb-6 text-left max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Temporary Service Booking</h3>
            <p className="text-slate-500 text-xs font-medium">Secure booking with {provider.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
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


        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Form area */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Service Location <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Flat No, Apartment, Street name, Landmark, Pin"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Optional Access Instructions</label>
              <input 
                type="text"
                placeholder="e.g. Ring secondary bell, gate PIN is 4455"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Booking Summary */}
          <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 self-start shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-3">Booking Summary</span>
            <div className="space-y-2 pb-3 border-b border-slate-100 text-xs font-bold">
              <BillRow label="Specialist" value={provider.name} />
              <BillRow label="Type" value="Temporary Service" />
            </div>

            {loyaltyTier?.tier && (
              <div className="my-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-bold text-amber-700 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>{loyaltyTier.tier} member perks applied</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 font-medium leading-relaxed my-3">
              Your request is sent to the specialist, who has a limited time to accept. Final charges are agreed directly with your specialist.
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none mt-6"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillRow({ label, value }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
