import React from 'react';
import { Search, MapPin, RadioTower, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Search',
    desc: 'Choose your service and location.',
  },
  {
    icon: MapPin,
    title: 'Tell Us the Problem',
    desc: 'Share details with photos or video.',
  },
  {
    icon: RadioTower,
    title: 'Expert Accepts',
    desc: 'Verified specialists near you respond.',
  },
  {
    icon: CheckCircle2,
    title: 'Job Completed',
    desc: 'Get the work done and rate your experience.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 pt-0 pb-10 sm:pb-14">
      <div>
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">How ServeGo24 Works?</h2>
        </div>

        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
          <div className="hidden lg:block absolute top-[44px] left-[15%] right-[15%] h-px border-t border-dashed border-slate-300" />
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
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#dff7fb] text-[#0f172a] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(15,23,42,0.03)]">
          <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <span className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[#0f172a] text-white text-base font-black flex items-center justify-center shadow-lg">
          {String(number).padStart(2, '0')}
        </span>
      </div>
      <h4 className="mt-4 text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">{title}</h4>
      <p className="mt-1.5 max-w-[220px] text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
