import React from 'react';
import { MapPin, Clock, Zap } from 'lucide-react';
import { COVERAGE_IMAGE } from './homeImages';

export default function CoverageArea() {
  return (
    <section className="relative overflow-hidden bg-teal-700 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left — Text content */}
          <div className="px-6 sm:px-10 lg:px-14 py-14 sm:py-20 flex flex-col justify-center">
            <span className="text-emerald-200 font-bold uppercase tracking-[0.2em] text-[11px]">
              Fast Coverage
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Serving Every Corner of Hyderabad in Under{' '}
              <span className="text-emerald-300">30 Mins</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-md">
              From Gachibowli to Secunderabad, our network of verified specialists
              ensures fast coverage across every major neighbourhood.
            </p>

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap gap-6">
              <StatBubble icon={MapPin} value="50+" label="Areas Covered" />
              <StatBubble icon={Clock} value="28 min" label="Avg. Arrival" />
              <StatBubble icon={Zap} value="1,240+" label="Active Specialists" />
            </div>
          </div>

          {/* Right — Image */}
          <div className="relative min-h-[300px] lg:min-h-0">
            <img
              src={COVERAGE_IMAGE}
              alt="Service coverage across Hyderabad"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {/* Soft blend into the green panel on desktop */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-700 via-transparent to-transparent hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBubble({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-emerald-200" />
      </div>
      <div>
        <p className="text-lg font-extrabold leading-tight">{value}</p>
        <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
