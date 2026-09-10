import React from 'react';
import { Instagram, Twitter, Linkedin } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const socials = [
    { icon: Instagram, label: 'Instagram' },
    { icon: Twitter, label: 'Twitter' },
    { icon: Linkedin, label: 'LinkedIn' },
  ];

  return (
    <footer id="reusable-footer-comp" className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-5 py-10 text-xs text-slate-400 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center border-b border-slate-800 pb-8 text-center">
          <div className="flex max-w-md flex-col items-center">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8 rounded-lg" />
              <p className="text-sm font-extrabold tracking-tight text-white">servego24</p>
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
        </div>

        <div className="text-center text-slate-500">
          <span>© 2026 servego24. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}