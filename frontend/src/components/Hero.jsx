import React from 'react';
import { ArrowRight, Download, MapPin, Search, ShieldCheck, Star, RadioTower } from 'lucide-react';
import { HYDERABAD_NEIGHBORHOODS } from '../data';

export default function Hero({ onSearch, selectedArea, setArea, inputQuery, setInputQuery }) {
  return <section className="bg-[#f4fbfb] text-slate-900">
    <div className="relative isolate overflow-hidden bg-[#042e3d]">
      <div className="absolute inset-0 bg-[url('/images/public-home-hero.png')] bg-cover bg-[position:40%_center] bg-no-repeat sm:bg-[position:68%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#032d3b_0%,rgba(3,45,59,.98)_32%,rgba(3,45,59,.72)_49%,rgba(3,45,59,.08)_75%,rgba(3,45,59,.12)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(0,214,197,.16),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-[116px] pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-[128px]">
        <div className="max-w-[650px]">
          <h1 className="mt-4 text-[2.45rem] font-black leading-[.98] tracking-[-.055em] text-white sm:text-5xl lg:text-[3.75rem]">Your Home. Our Experts. <span className="block text-[#00d4c3]">One Simple Booking.</span></h1>
          <p className="mt-4 max-w-[585px] text-sm leading-relaxed text-slate-100 sm:text-[15px]">Choose a service, share your location, and connect with a <span className="font-bold text-white">verified local expert</span>. Get a fast response, transparent service, live updates, and support from booking to completion.</p>
          <form onSubmit={onSearch} className="mt-5 flex max-w-[700px] flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_18px_35px_-17px_rgba(0,0,0,.8)] sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#f3f7fb] px-3 py-2.5 sm:max-w-[220px]"><MapPin className="h-5 w-5 shrink-0 text-[#009a92]" /><span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[.13em] text-[#7486a5]">Your location</span><select value={selectedArea} onChange={(e) => setArea(e.target.value)} className="w-full truncate bg-transparent text-xs font-bold text-[#152747] outline-none"><option value="">All Hyderabad Area</option>{HYDERABAD_NEIGHBORHOODS.map((area) => <option key={area} value={area}>{area}</option>)}</select></span></label>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#f3f7fb] px-3 py-2.5"><Search className="h-5 w-5 shrink-0 text-[#466285]" /><span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[.13em] text-[#7486a5]">Find a service</span><input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Electrician, plumber, painter, cleaner..." className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-[#8294b4]" /></span></label>
            <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#009b91] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-[#00847b]">Search Services <ArrowRight className="h-4 w-4" /></button>
          </form>
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#00bfb2] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_25px_-14px_rgba(0,232,210,.95)] transition hover:bg-[#00ab9f]"><Download className="h-4 w-4" /> Download Android App</button>
        </div>
      </div>
    </div>
  </section>;
}

function HeroStat({ icon, eyebrow, value }) {
  return <div className="flex items-center gap-3 border-b border-[#e3edf3] px-5 py-3.5 last:border-b-0 sm:[&:nth-child(2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ebfffc] text-[#009b91]">{React.cloneElement(icon, { className: 'h-5 w-5' })}</span><span><span className="block text-[9px] font-black uppercase tracking-[.14em] text-[#7d91b4]">{eyebrow}</span><span className="block text-sm font-extrabold text-[#132242]">{value}</span></span></div>;
}
