import React from 'react';
import { Navigation, Clock, Smartphone, MapPin, Home, CheckCircle2 } from 'lucide-react';
import { TRACKING_MAP } from '../../data/websiteImages';

const STEPS = ['Booking confirmed', 'Specialist on the way', 'Work starts'];

const FEATURES = [
  {
    icon: Navigation,
    title: 'Real-Time Location',
    desc: "Track your technician's exact location on a live map from the moment they start heading to you.",
  },
  {
    icon: Clock,
    title: 'Accurate ETA',
    desc: "Arrival estimates that update live as the specialist moves, so you always know what to expect.",
  },
  {
    icon: Smartphone,
    title: 'Instant Notifications',
    desc: "Get noticed the moment your specialist is on the way, nearby, and at your door.",
  },
  {
    icon: MapPin,
    title: 'Route Visibility',
    desc: "See the route your technician is taking — full transparency from booking to arrival.",
  },
];

export default function LiveTrackingShowcase() {
  return (
    <section className="bg-slate-950 text-white py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 sm:mb-16 max-w-2xl">
          <span className="text-emerald-400 font-bold uppercase tracking-[0.22em] text-[11px]">
            Live GPS Tracking
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Watch Your Technician{' '}
            <span className="text-emerald-400">Arrive in Real Time</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Location, ETA and arrival alerts update live on the map until your specialist reaches you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          {/* Left — Features */}
          <div className="space-y-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4 items-start">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white">{feature.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — Map visual */}
          <div className="relative pb-2">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/40">
              <img
                src={TRACKING_MAP}
                alt="Live tracking map with your specialist en route"
                className="w-full h-[300px] sm:h-[400px] object-cover"
                loading="lazy"
              />

              {/* Live badge */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live</span>
              </div>

              {/* Animated route between the two pins */}
              <style>{`@keyframes sgRouteDash{to{stroke-dashoffset:-24}}`}</style>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none" fill="none" aria-hidden="true">
                <path d="M40 258 C 130 236, 155 175, 250 150 S 330 110, 358 64" stroke="rgba(52,211,153,0.3)" strokeWidth="7" strokeLinecap="round" />
                <path d="M40 258 C 130 236, 155 175, 250 150 S 330 110, 358 64" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 6" style={{ animation: 'sgRouteDash 1.2s linear infinite' }} />
                <path d="M40 258 L 8 258" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
                <path d="M358 64 L 392 64" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
              </svg>

              {/* Your home pin */}
              <div className="absolute bottom-16 left-6 sm:left-8 flex flex-col items-center">
                <span className="mb-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[9px] font-bold text-white">Your home</span>
                <div className="w-7 h-7 rounded-full bg-white text-teal-700 shadow-lg flex items-center justify-center border-2 border-white">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <div className="mt-0.5 w-px h-3 bg-white/40" />
              </div>

              {/* Specialist pin */}
              <div className="absolute top-[18%] right-[20%] sm:right-[22%] flex flex-col items-center">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                  <div className="relative w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="mt-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[9px] font-bold text-white">Your specialist</span>
              </div>
            </div>

            {/* Status card — one step, no invented numbers */}
            <div className="relative z-10 -mt-10 mx-3 sm:mx-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">Specialist on the way</p>
                    <p className="text-[10px] text-slate-400 font-medium">Live location &amp; ETA update until arrival</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[9px] font-black uppercase tracking-widest px-2 py-1">
                  Live
                </span>
              </div>

              {/* Journey steps */}
              <div className="mt-4 flex items-center gap-2 pb-1">
                {STEPS.map((step, idx) => {
                  const done = idx < 1;
                  const active = idx === 1;
                  return (
                    <React.Fragment key={step}>
                      {idx > 0 && <span className={`h-px flex-1 ${idx <= 1 ? 'bg-emerald-400/50' : 'bg-slate-700'}`} />}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          done ? 'bg-emerald-500/20 text-emerald-400' : active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[9px] font-black">{idx + 1}</span>}
                        </span>
                        <span className={`text-[9px] font-bold text-center max-w-16 ${
                          active ? 'text-white' : done ? 'text-emerald-300' : 'text-slate-500'
                        }`}>{step}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}