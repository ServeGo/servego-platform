import React from 'react';
import { MapPin, Search, ArrowRight, ShieldCheck, RadioTower, Star, LifeBuoy } from 'lucide-react';
import { HYDERABAD_NEIGHBORHOODS } from '../data';

export default function Hero({ onSearch, selectedArea, setArea, inputQuery, setInputQuery, onQuickSearch }) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white min-h-[100vh] py-12 lg:py-20 px-4 border-b border-slate-800 flex items-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(129,140,248,0.18),_transparent_25%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size,80px_80px] opacity-20" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10 h-full w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-300 text-xs font-bold uppercase tracking-[0.25em] rounded-full border border-teal-500/20 mb-6 shadow-lg shadow-teal-500/10">
          <ShieldCheck className="w-4 h-4" />
          <span>Verified Home Services for Hyderabad</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-[0.95]">
          Book Trusted Home Experts <span className="text-teal-400">in Minutes</span>
        </h1>
        
        <p className="mt-5 text-slate-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
          Search the catalog and share your location — ServeGo broadcasts your request to every eligible
          specialist in your area, and the first to accept gets the job. Verified providers, live tracking,
          and admin-backed support.
        </p>

        <div className="mt-8 w-full max-w-3xl rounded-[24px] border border-slate-200/80 bg-white/95 p-2.5 shadow-2xl shadow-slate-950/20 backdrop-blur">
          <form onSubmit={onSearch} className="flex flex-col md:flex-row gap-2">
            <div className="relative flex items-center bg-slate-100 rounded-2xl px-3 py-2 md:w-1/3 text-slate-800">
              <MapPin className="w-4 h-4 text-teal-700 mr-2 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">Your Location</label>
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

            <div className="relative flex-1 flex items-center bg-slate-100 rounded-2xl px-3 py-2 text-slate-800">
              <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">Find a Service</label>
                <input 
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Electrician, plumber, painter, cleaner..."
                  className="w-full bg-transparent text-xs font-semibold outline-none border-none mt-1 text-slate-800 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs px-6 py-3.5 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <span>Search Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl text-left text-xs">
          <TrustIndicator icon={<ShieldCheck className="w-4 h-4" />} title="Verified Providers" desc="Profile-approved experts" />
          <TrustIndicator icon={<RadioTower className="w-4 h-4" />} title="Broadcast Booking" desc="Offered to every eligible specialist" />
          <TrustIndicator icon={<Star className="w-4 h-4" />} title="Rated Professionals" desc="Reviews after every completed job" colorClass="text-emerald-400" bgColorClass="bg-emerald-500/20" />
          <TrustIndicator icon={<LifeBuoy className="w-4 h-4" />} title="Admin Support" desc="Tickets & platform oversight" colorClass="text-rose-400" bgColorClass="bg-rose-500/20" />
        </div>
      </div>
    </section>
  );
}

function TrustIndicator({ icon, title, desc, colorClass = "text-teal-400", bgColorClass = "bg-teal-500/20" }) {
  return (
    <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform">
      <div className={`p-2 rounded-xl ${bgColorClass} ${colorClass}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{desc}</p>
      </div>
    </div>
  );
}
