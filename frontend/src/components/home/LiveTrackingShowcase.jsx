import React from 'react';
import { MapPin, Navigation, Clock, Smartphone } from 'lucide-react';
import { TRACKING_MAP } from './homeImages';

export default function LiveTrackingShowcase() {
  return (
    <section className="bg-slate-950 text-white py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 sm:mb-14">
          <span className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[11px]">
            Live GPS Tracking
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Watch Your Technician{' '}
            <span className="text-emerald-400">Arrive in Real Time</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left — Features */}
          <div className="space-y-6">
            <TrackingFeature
              icon={Navigation}
              title="Real-Time Location"
              desc="Track your technician's exact location on a live map from the moment they start heading to you."
            />
            <TrackingFeature
              icon={Clock}
              title="Accurate ETA"
              desc="Get real-time arrival estimates so you know exactly when to expect your specialist."
            />
            <TrackingFeature
              icon={Smartphone}
              title="Instant Notifications"
              desc="Receive updates when your technician is on the way, nearby, and has arrived."
            />
            <TrackingFeature
              icon={MapPin}
              title="Route Visibility"
              desc="See the route your technician is taking — full transparency from booking to arrival."
            />
          </div>

          {/* Right — Map visual */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/40">
              <img
                src={TRACKING_MAP}
                alt="Live tracking map"
                className="w-full h-[300px] sm:h-[400px] object-cover"
                loading="lazy"
              />
              {/* Overlay pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/30 animate-ping absolute inset-0" />
                  <div className="w-12 h-12 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center relative z-10 shadow-lg">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
            {/* Floating ETA card */}
            <div className="absolute -bottom-4 left-4 right-4 sm:left-8 sm:right-8 bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Technician arriving</p>
                <p className="text-[11px] text-slate-400 font-medium">ETA: 8 minutes • 2.3 km away</p>
              </div>
              <span className="ml-auto text-emerald-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackingFeature({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}