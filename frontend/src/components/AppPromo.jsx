import React from 'react';
import { Lock } from 'lucide-react';

export default function AppPromo() {
  return (
    <section className="py-12 bg-slate-900 text-white border-y border-slate-800 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
        <div>
          <span className="text-teal-400 text-xs font-bold uppercase tracking-widest block">On-the-go convenience</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">Download the ServeGo App</h3>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-md font-medium leading-relaxed">
            Book certified specialists, see technician progress, download insurance certificates, and chat instantly with support. Available across all Android and iOS devices.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <AppStoreButton type="ios" />
            <AppStoreButton type="android" />
          </div>
        </div>

        <div className="flex justify-center items-center">
          <div className="w-56 h-40 bg-slate-900 rounded-2xl border-4 border-slate-800 relative z-10 flex flex-col justify-between p-4 shadow-2xl shrink-0 overflow-hidden text-left text-white">
            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-2" />
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-850">
              <span className="text-[8px] bg-teal-500/30 text-teal-200 px-1 py-0.2 rounded font-extrabold uppercase">Arriving in 24 Mins</span>
              <span className="font-extrabold text-[10px] text-white block mt-1">Technician Dispatched</span>
              <span className="text-[8px] text-slate-400 block font-mono">Order #SVG-5847</span>
            </div>
            <div className="grow" />
            <div className="text-[9px] text-slate-500 font-mono text-center"><Lock className="w-3 h-3 inline-block mr-0.5" /> Secure Booking Link</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppStoreButton({ type }) {
  const isIos = type === 'ios';
  return (
    <a href={`#download-${type}`} className="flex items-center gap-3 bg-black hover:bg-slate-900 text-white rounded-xl px-4 py-2 border border-slate-800 transition-all shadow-md">
      {isIos ? (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.72-1.16 1.87-1.02 2.98 1.11.09 2.25-.6 2.95-1.41z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M3 5.25v13.5a1.5 1.5 0 0 0 2.465 1.16l9.637-8.1a1.5 1.5 0 0 0 0-2.32l-9.637-8.1A1.5 1.5 0 0 0 3 5.25z" />
        </svg>
      )}
      <div className="text-left">
        <p className="text-[9px] uppercase text-slate-400 font-bold leading-none">{isIos ? 'Download on the' : 'Get it on'}</p>
        <p className="text-xs font-bold leading-tight mt-0.5">{isIos ? 'App Store' : 'Google Play'}</p>
      </div>
    </a>
  );
}
