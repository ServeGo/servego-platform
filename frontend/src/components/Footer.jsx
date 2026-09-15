import React from 'react';
import { Instagram, Linkedin, Youtube } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const socials = [
    { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/servego_24/' },
    { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/company/servego24' },
    { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com/@servego24' },
  ];

  return (
    <footer
      id="reusable-footer-comp"
      className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-5 py-10 text-xs text-slate-400 sm:px-6 sm:py-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
      <div className="relative mx-auto max-w-6xl flex flex-col items-center gap-10 text-center">

        {/* Brand */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Logo className="h-8 w-8 rounded-lg" />
            <p className="text-sm font-extrabold tracking-tight text-white">servego24</p>
          </div>
          <p className="leading-relaxed text-slate-500 text-[11px] max-w-md">
            On-demand home services marketplace connecting customers with verified local professionals in Hyderabad.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {socials.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:border-teal-500/40 hover:text-teal-400"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="w-full border-t border-slate-800 pt-6 flex flex-col items-center justify-center gap-3 text-[10px] text-slate-600 sm:flex-row">
          <span>© {new Date().getFullYear()} ServeGo24. All rights reserved.</span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="text-slate-700">Hyderabad, Telangana, India</span>
        </div>
      </div>
    </footer>
  );
}