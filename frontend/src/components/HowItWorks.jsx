import React from 'react';
import { Search, RadioTower, Navigation, FileText, CheckCircle2, Star } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Book Your Service',
    desc: 'Pick the service you need, pin your location and add your contact number. No prepayment — you settle charges directly with the specialist.',
  },
  {
    icon: RadioTower,
    title: 'We Broadcast Your Request',
    desc: 'Your job is offered to every eligible specialist in your area at once. The first specialist to accept confirms your booking.',
  },
  {
    icon: Navigation,
    title: 'Specialist on the Way',
    desc: 'The confirmed specialist heads to your address with live GPS tracking, so you can follow their location and ETA in real time.',
  },
  {
    icon: FileText,
    title: 'Quotation & Start Work',
    desc: 'The specialist shares an itemised quotation with just the job charges. Confirm it to start work — no service fee on a confirmed booking.',
  },
  {
    icon: CheckCircle2,
    title: 'Work Gets Done',
    desc: 'The job runs at your location and the specialist marks the booking complete when the work is finished.',
  },
  {
    icon: Star,
    title: 'Pay & Review',
    desc: 'Settle the charges directly with the specialist, rate the work you received, and keep your service receipt.',
  },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-teal-700 font-bold uppercase tracking-[0.25em] text-[11px]">Simple Booking Flow</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">From request to completion in six steps</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-semibold">
            Pick a service, share your details, and servego24 broadcasts your job to every eligible specialist in your area.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, idx) => (
            <Step key={step.title} number={idx + 1} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ number, icon: Icon, title, desc }) {
  return (
    <div className="relative group flex flex-col items-center text-center bg-white p-7 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/[0.04] hover:shadow-xl hover:-translate-y-1.5 hover:border-teal-200 transition-all duration-300 overflow-hidden">
      {/* Soft teal glow on hover */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-teal-100/50 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center ring-4 ring-white">
          {number}
        </span>
      </div>

      <h4 className="text-sm font-extrabold text-slate-900 mt-5 tracking-tight">{title}</h4>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">{desc}</p>

      <div className="mt-4 h-1 w-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 group-hover:w-12" />
    </div>
  );
}