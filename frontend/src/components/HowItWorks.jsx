import React from 'react';

export default function HowItWorks() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto rounded-[32px] border border-slate-200 bg-white/90 p-6 sm:p-8 lg:p-10 shadow-[0_25px_80px_-25px_rgba(15,23,42,0.2)]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-teal-700 font-bold uppercase tracking-[0.25em] text-[11px]">Simple Booking Flow</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">From discovery to completion in three easy steps</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-semibold">ServeGo makes it simple to find a trusted expert, confirm the job, and track progress without friction.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-8 left-1/2 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-teal-200 via-slate-300 to-teal-200" />
          <Step number="1" title="Discover a Service" desc="Search for the right category, compare available experts, and pick the best fit for your need." />
          <Step number="2" title="Confirm the Booking" desc="Choose a verified provider, share the job details, and move forward with a secure and clear booking flow." />
          <Step number="3" title="Track the Job" desc="Stay updated as the provider moves through the request and complete the experience with confidence." />
        </div>
      </div>
    </section>
  );
}

function Step({ number, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center relative z-10 bg-slate-50/80 p-6 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform">
      <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-sm mb-3">
        {number}
      </div>
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-semibold">{desc}</p>
    </div>
  );
}
