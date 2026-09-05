import React from 'react';
import { CheckCircle2, MapPin, Instagram, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  const cities = [
    { name: 'Hyderabad', status: 'Active' },
    { name: 'Bengaluru', status: 'Pending' },
    { name: 'Chennai', status: 'Pending' },
  ];

  const socials = [
    { icon: Instagram, label: 'Instagram' },
    { icon: Twitter, label: 'Twitter' },
    { icon: Linkedin, label: 'LinkedIn' },
  ];

  return (
    <footer id="reusable-footer-comp" className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-5 py-10 text-xs text-slate-400 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center gap-10 border-b border-slate-800 pb-8 text-center lg:flex-row lg:items-start lg:justify-between lg:gap-16 lg:text-left">
          <div className="flex max-w-md flex-col items-center lg:items-start">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-inset ring-teal-400/20">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="text-sm font-extrabold tracking-tight text-white">ServeGo</p>
            </div>
            <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-white">Reliable help, right where you live.</h2>
            <p className="mt-3 leading-relaxed text-slate-500">A verified local marketplace for getting everyday home services done.</p>

            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:border-teal-500/40 hover:text-teal-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center lg:w-[340px] lg:shrink-0 lg:items-start">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-400">Growing locally</p>
            <h3 className="mt-2 text-base font-bold text-slate-200">Launch territories</h3>
            <p className="mt-1 text-slate-500">Expanding access to trusted home specialists, one city at a time.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              {cities.map((city) => (
                <div
                  key={city.name}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 backdrop-blur-sm"
                >
                  <MapPin className="h-3.5 w-3.5 text-teal-500" />
                  <span className="font-medium text-slate-200">{city.name}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      city.status === 'Active' ? 'bg-teal-500' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-slate-400">{city.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© 2026 ServeGo. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href="#" className="transition-colors hover:text-teal-400">Privacy policy</a>
            <a href="#" className="transition-colors hover:text-teal-400">Terms of service</a>
            <span className="text-slate-500">Verified specialists</span>
          </div>
        </div>
      </div>
    </footer>
  );
}