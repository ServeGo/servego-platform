import React from 'react';
import { Search, MapPin, RadioTower, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Search & Pick a Service',
    desc: 'Browse the home-services catalog or search directly — electrician, plumber, AC repair, home cleaning and more.',
  },
  {
    icon: MapPin,
    title: 'Share Your Job Details',
    desc: 'Mark your location on the map and add instructions. No prepayment — you settle charges with the specialist after the job.',
  },
  {
    icon: RadioTower,
    title: 'We Broadcast Your Request',
    desc: 'Your job is offered to every eligible specialist in your area at once. The first specialist to accept gets the booking.',
  },
  {
    icon: CheckCircle2,
    title: 'Track & Complete',
    desc: 'Follow the specialist live on the map, chat on the booking thread, and complete the job with a 4-digit verification code.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto rounded-[32px] border border-slate-200 bg-white/90 p-6 sm:p-8 lg:p-10 shadow-[0_25px_80px_-25px_rgba(15,23,42,0.2)]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-teal-700 font-bold uppercase tracking-[0.25em] text-[11px]">Simple Booking Flow</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">From request to completion in four steps</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-semibold">
            Pick a service, share the details, and ServeGo broadcasts your job to every eligible specialist in your area.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          <div className="hidden lg:block absolute top-[52px] left-[14%] right-[14%] h-px bg-gradient-to-r from-teal-200 via-slate-300 to-teal-200" />
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
    <div className="relative z-10 flex flex-col items-center text-center bg-slate-50/80 p-6 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-500/10">
          <Icon className="w-6 h-6" />
        </div>
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-700 text-white text-[10px] font-extrabold flex items-center justify-center">
          {number}
        </span>
      </div>
      <h4 className="text-sm font-bold text-slate-900 mt-4">{title}</h4>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-semibold">{desc}</p>
    </div>
  );
}
