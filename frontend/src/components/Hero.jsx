import React from 'react';
import { MapPin, Search, ArrowRight } from 'lucide-react';
import { HYDERABAD_NEIGHBORHOODS } from '../data';

const HERO_IMAGE = 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329501/servego/public/j47zqpnzglwwelwn9ugf.jpg';

export default function Hero({ onSearch, selectedArea, setArea, inputQuery, setInputQuery, onQuickSearch }) {
  return (
    <section className="relative isolate w-full overflow-hidden bg-slate-950 text-white md:flex md:min-h-[calc(100vh-72px)] md:flex-col md:justify-center">
      <div className="relative block h-[46vw] min-h-40 max-h-60 overflow-hidden md:hidden">
        <img src={HERO_IMAGE} alt="Happy family using Servego home services" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
      </div>
      {/* Background image */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src={HERO_IMAGE}
          alt="Happy family using Servego home services"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081a2d]/95 via-[#0b2940]/65 to-[#0b2940]/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl bg-slate-950 px-4 py-6 sm:px-6 md:bg-transparent md:py-20 lg:px-8">
        <div className="max-w-2xl">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/20 mb-5">
            15-Min Dispatch in Hyderabad
          </span>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] drop-shadow-lg">
            Home Services.
            <br className="hidden sm:block" />
            <span className="text-emerald-300">Done Right.</span>
          </h1>

          <p className="mt-3 text-sm md:mt-4 md:text-lg text-white/80 font-medium max-w-lg leading-relaxed">
            Verified professionals at your doorstep. Book trusted electricians,
            plumbers, cleaners & more — in minutes, not hours.
          </p>

          {/* Search bar */}
          <div className="mt-5 w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-2 shadow-2xl md:mt-8">
            <form onSubmit={onSearch} className="flex flex-col md:flex-row gap-2">
              {/* Location */}
              <div className="relative flex items-center bg-white/15 rounded-xl px-3 py-2.5 md:w-[38%] text-white">
                <MapPin className="w-4 h-4 text-emerald-300 mr-2 shrink-0" />
                <div className="text-left w-full">
                  <label className="block text-[9px] font-bold text-white/60 uppercase tracking-[0.2em] leading-none">Your Location</label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold outline-none border-none mt-0.5 text-white cursor-pointer"
                  >
                    <option value="" className="text-slate-900">All Hyderabad Area</option>
                    {HYDERABAD_NEIGHBORHOODS.map(area => <option key={area} value={area} className="text-slate-900">{area}</option>)}
                  </select>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative flex-1 flex items-center bg-white/15 rounded-xl px-3 py-2.5 text-white">
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
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-5 py-3 text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                Search
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick stats */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-white/80 font-medium md:mt-6 md:text-xs">
            <span>Popular:</span>
            {['AC Repair', 'Cleaning', 'Plumbing', 'Electrician', 'Chef', 'Carpentry'].map((item) => (
              <button type="button" key={item} onClick={() => onQuickSearch?.(item)} className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 hover:bg-white/25">{item}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
