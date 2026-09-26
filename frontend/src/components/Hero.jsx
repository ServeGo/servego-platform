import React from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { HERO_IMAGE_DESKTOP, HERO_IMAGE_MOBILE } from '../data/websiteImages';

export default function Hero({ onSearch, inputQuery, setInputQuery, onQuickSearch, topServices = [], services = [] }) {
  // The marquee reuses the catalog the app already loaded. It used to fire its
  // own `GET /services` on mount, doubling the public catalog traffic on every
  // home page view and racing the context's copy.
  const marqueeServices = React.useMemo(
    () => [...new Set((Array.isArray(services) ? services : []).map((s) => s?.name).filter(Boolean))],
    [services]
  );

  return (
    <section className="relative isolate flex min-h-[93svh] w-full flex-col overflow-hidden bg-slate-950 text-white md:min-h-[calc(100vh-72px)] md:flex-row md:justify-center">

      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE_DESKTOP}
          alt="Happy family using Servego home services"
          className="hidden md:block h-full w-full object-cover object-center"
        />
        <img
          src={HERO_IMAGE_MOBILE}
          alt="Trusted Technicians At Your Doorstep"
          className="block md:hidden h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#081a2d]/95 via-[#0b2940]/55 to-[#0b2940]/35 md:bg-gradient-to-r md:from-[#081a2d]/95 md:via-[#0b2940]/65 md:to-[#0b2940]/10" />
      </div>

      {/* Marquee strip — only when the DB has services to show */}
      {marqueeServices.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm py-2 border-b border-white/10">
          <marquee scrollamount="5" className="text-xs font-semibold text-white/90">
            {marqueeServices.map((name, i) => (
              <span key={i} className="mx-6">⚡ {name}</span>
            ))}
          </marquee>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pt-20 pb-8 sm:px-6 md:justify-center md:py-20 md:pb-20 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 bg-white/15 backdrop-blur-sm text-white text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] px-2.5 sm:px-3 py-1 rounded-full border border-white/20 mb-3 md:mb-5">
            Verified Professionals in Hyderabad
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] drop-shadow-lg">
            Home Services.
            <br className="hidden sm:block" />
            <span className="text-emerald-300">Done Right.</span>
          </h1>

          <p className="mt-2 text-[13px] sm:text-sm md:mt-4 md:text-lg text-white/80 font-medium max-w-lg leading-relaxed">
            Trusted local professionals, right at your doorstep.
            Book electricians, plumbers, cleaners & more with ServeGo24.
          </p>

          <div className="mt-4 w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-1.5 shadow-2xl md:mt-8">
            <form onSubmit={onSearch} className="flex flex-col md:flex-row gap-1.5">
              <div className="relative flex-1 flex items-center bg-white/15 rounded-xl px-3 py-2 text-white">
                <Search className="w-4 h-4 text-emerald-300 mr-2 shrink-0" />
                <div className="text-left w-full">
                  <label className="block text-[9px] font-bold text-white/60 uppercase tracking-[0.2em] leading-none">Find a Service</label>
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Search AC repair, cleaning, electrician, chef..."
                    className="w-full bg-transparent text-[11px] font-bold outline-none border-none mt-0.5 text-white placeholder-white/50"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-5 py-2.5 text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                Search
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {topServices.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] text-white/80 font-medium md:mt-6 md:text-xs">
              <span>Popular:</span>
              {topServices.slice(0, 5).map((s) => (
                <button type="button" key={s.id || s.name} onClick={() => onQuickSearch?.(s.name)} className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 hover:bg-white/25">{s.name}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
