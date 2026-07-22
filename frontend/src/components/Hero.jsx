import React from 'react';
import { MapPin, Search, ArrowRight, ShieldCheck, Clock, Star, UserCheck } from 'lucide-react';
import { HYDERABAD_NEIGHBORHOODS } from '../data';

export default function Hero({ onSearch, selectedArea, setArea, inputQuery, setInputQuery, onQuickSearch }) {
  return (
    <section className="relative bg-slate-900 text-white min-h-[100vh] py-10 lg:py-16 px-4 overflow-hidden border-b border-slate-800 flex items-center">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size,80px_80px] opacity-25" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10 h-full">
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-teal-500/20 mb-6 animate-fade-in">
          <ShieldCheck className="w-4 h-4" />
          <span>Hyderabad’s Trusted Home Services</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-none">
          Reliable Home Services, <span className="text-teal-400">At Your Doorstep</span>
        </h1>
        
        <p className="mt-5 text-slate-400 text-sm sm:text-base max-w-xl font-medium">
          Book certified electricians, plumbers, painters, cleaners and more. Verified local experts ready to serve you.
        </p>

        {/* Search Console */}
        <div className="mt-8 bg-white p-2 sm:p-2.5 rounded-xl shadow-xl w-full max-w-3xl border border-slate-200">
          <form onSubmit={onSearch} className="flex flex-col md:flex-row gap-2">
            {/* Location selector */}
            <div className="relative flex items-center bg-slate-100 rounded-xl px-3 py-2 md:w-1/3 text-slate-800">
              <MapPin className="w-4 h-4 text-teal-700 mr-2 shrink-0 animate-pulse" />
              <div className="text-left w-full">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none">Your Location</label>
                <select 
                  value={selectedArea}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold outline-none border-none mt-1 text-slate-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                >
                  <option value="">All Hyderabad Area</option>
                  {HYDERABAD_NEIGHBORHOODS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input service term */}
            <div className="relative flex-1 flex items-center bg-slate-100 rounded-xl px-3 py-2 text-slate-800">
              <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none">Find a Service</label>
                <input 
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Washing machine repair, deep cleaning..."
                  className="w-full bg-transparent text-xs font-semibold outline-none border-none mt-1 text-slate-800 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>
            </div>

            {/* Submit button */}
            <button 
              type="submit" 
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs px-6 py-3.5 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <span>Search Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          

        </div>

        {/* Core Trust Indicators */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl text-left text-xs">
          <TrustIndicator icon={<ShieldCheck className="w-4 h-4" />} title="100% Verified Pros" desc="Background Checked" />
          <TrustIndicator icon={<Clock className="w-4 h-4" />} title="60 Minutes Arrival" desc="Fast & On-Time" />
          <TrustIndicator icon={<Star className="w-4 h-4" />} title="4.8+ Rated Experts" desc="Highly Professional" colorClass="text-emerald-400" bgColorClass="bg-emerald-500/20" />
          <TrustIndicator icon={<UserCheck className="w-4 h-4" />} title="Insurance Covered" desc="Up to ₹10k Protection" colorClass="text-rose-400" bgColorClass="bg-rose-500/20" />
        </div>
      </div>
    </section>
  );
}

function TrustIndicator({ icon, title, desc, colorClass = "text-teal-400", bgColorClass = "bg-teal-500/20" }) {
  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-2.5">
      <div className={`p-2 rounded-lg ${bgColorClass} ${colorClass}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{desc}</p>
      </div>
    </div>
  );
}
