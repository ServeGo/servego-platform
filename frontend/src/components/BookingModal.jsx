import React from 'react';
import { Calendar, CreditCard, DollarSign, AlertCircle, Crown } from 'lucide-react';

export default function BookingModal({ 
  provider, 
  onClose, 
  errorText, 
  availabilityBusyError,

  bookingDate, setBookingDate, 
  bookingTimeSlot, setBookingTimeSlot,
  availableSlots, availabilityLoading,
  bookingType, setBookingType,
  bookingEndDate, setBookingEndDate,
  contractYears, setContractYears,
  contractDays, setContractDays,
  contractHours, setContractHours,
  address, setAddress, 
  instructions, setInstructions, 
  paymentMethod, setPaymentMethod,
  billMetrics,
  loyaltyTier,
  onSubmit
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl animate-fade-in mt-6 mb-6 text-left max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Configure Your Service</h3>
            <p className="text-slate-500 text-xs font-medium">Secure booking with {provider.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {availabilityBusyError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{availabilityBusyError}</span>
          </div>
        )}

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
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Service Duration</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('contract');
                    setBookingEndDate('');
                    setContractDays('1');
                    setContractHours('0');
                  }}
                  className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                    bookingType === 'contract'
                      ? 'bg-indigo-600 border-indigo-650 text-white shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Contract
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('permanent');
                    setBookingEndDate('');
                  }}
                  className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                    bookingType === 'permanent'
                      ? 'bg-indigo-600 border-indigo-650 text-white shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Permanent
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                    required
                  />
                </div>
              </div>

              <div className={bookingType === 'contract' ? 'sm:col-span-2' : 'hidden'}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Contract Length <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <DurationSelect label="Years" value={contractYears} onChange={setContractYears} options={[0, 1, 2, 3, 4, 5]} />
                  <DurationSelect label="Days" value={contractDays} onChange={setContractDays} options={[0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30]} />
                  <DurationSelect label="Hours" value={contractHours} onChange={setContractHours} options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24]} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Choose the contract duration that fits your service requirement. At least one of years, days, or hours must be selected.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Appointment Window <span className="text-rose-500">*</span>
              </label>
              <select
                value={bookingTimeSlot}
                onChange={(e) => setBookingTimeSlot(e.target.value)}
                disabled={availabilityLoading || !availableSlots.length}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none disabled:opacity-60"
              >
                <option value="">{availabilityLoading ? 'Loading availability…' : 'Select an available window'}</option>
                {availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
              {!availabilityLoading && bookingDate && !availableSlots.length ? <p className="text-[11px] text-rose-600 mt-1">No appointment windows are available for this date.</p> : null}
            </div>

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

            {bookingType === 'contract' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 font-sans">Payment Method <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <PaymentButton active={paymentMethod === 'UPI'} onClick={() => setPaymentMethod('UPI')} icon={<CreditCard className="w-4 h-4" />} label="UPI Apps" />
                  <PaymentButton active={paymentMethod === 'Card'} onClick={() => setPaymentMethod('Card')} icon={<CreditCard className="w-4 h-4" />} label="Cards" />
                  <PaymentButton active={paymentMethod === 'Cash'} onClick={() => setPaymentMethod('Cash')} icon={<DollarSign className="w-4 h-4" />} label="Cash After Job" />
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 self-start shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-3">Booking Summary</span>
            <div className="space-y-2 pb-3 border-b border-slate-100 text-xs font-bold">
              <BillRow label="Specialist" value={provider.name} />
              <BillRow label="Plan" value={bookingType === 'contract' ? 'Contract' : 'Permanent'} />
              <BillRow label="Duration" value={billMetrics.durationLabel} />
              {bookingType === 'contract' && <BillRow label="Payment" value={paymentMethod} />}
            </div>

            {loyaltyTier?.tier && (
              <div className="my-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-bold text-amber-700 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>{loyaltyTier.tier} member perks applied</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 font-medium leading-relaxed my-3">
              {bookingType === 'contract'
                ? 'Final charges are agreed directly with your specialist after the job is assessed.'
                : 'We’ll route this request to the provider and confirm details once they verify availability.'}
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none mt-6"
            >
              {bookingType === 'contract' ? 'Confirm Booking' : 'Request Permanent Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer p-2.5 rounded-xl border flex items-center gap-2 justify-center transition-all ${
        active ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 text-xs hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DurationSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-800 outline-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
