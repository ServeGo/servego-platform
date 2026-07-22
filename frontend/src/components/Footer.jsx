import React from 'react';
import { MapPin } from 'lucide-react';

export default function Footer({ onNavigate }) {
  const handleLinkClick = (page, categoryId = null) => {
    onNavigate(page, categoryId);
  };

  return (
    <footer id="reusable-footer-comp" className="bg-slate-900 border-t border-slate-800 py-12 px-4 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 text-left">
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-extrabold text-sm">S⚙</div>
            <span className="font-bold text-white text-base">ServeGo</span>
          </div>
          <p className="text-slate-400 leading-relaxed max-w-xs font-semibold">
            Verified local experts at your doorstep within 60 minutes. Trusted, vetted, and safe home cleaning and repair services.
          </p>
        </div>
        
        <div className="md:col-span-4 space-y-3 font-semibold">
          <h5 className="font-bold text-white uppercase text-[10px] tracking-wider text-teal-600">Active categories</h5>
          <div className="flex flex-col gap-2">
            <button onClick={() => handleLinkClick('service-details', 'electrician')} className="hover:text-slate-200 text-left cursor-pointer">Electrician</button>
            <button onClick={() => handleLinkClick('service-details', 'plumber')} className="hover:text-slate-200 text-left cursor-pointer">Plumber</button>
            <button onClick={() => handleLinkClick('service-details', 'ac-repair')} className="hover:text-slate-200 text-left cursor-pointer">AC Service & Repair</button>
            <button onClick={() => handleLinkClick('service-details', 'home-cleaning')} className="hover:text-slate-200 text-left cursor-pointer">Deep Cleaning</button>
          </div>
        </div>
        
        <div className="md:col-span-4 space-y-3 font-semibold text-slate-400">
          <h5 className="font-bold text-white uppercase text-[10px] tracking-wider text-teal-600 font-sans">Launch Territories</h5>
          <div><MapPin className="w-3.5 h-3.5 inline-block mr-1" /> Hyderabad Operations (Active)</div>
          <div><MapPin className="w-3.5 h-3.5 inline-block mr-1" /> Bengaluru operations (Pending)</div>
          <div><MapPin className="w-3.5 h-3.5 inline-block mr-1" /> Chennai operations (Pending)</div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 font-semibold text-slate-500">
        <span>© 2026 ServeGo. All rights reserved.</span>
        <div className="flex gap-4">
          <button className="hover:text-white">Safety Guarantee</button>
          <button className="hover:text-white">Insurance Terms</button>
        </div>
      </div>
    </footer>
  );
}
