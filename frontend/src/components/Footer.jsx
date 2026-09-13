import React from 'react';
import { Instagram, Linkedin, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import Logo from './Logo';

export default function Footer({ onNavigate }) {
  const socials = [
    { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/servego_24/' },
    { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/company/servego24' },
    { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com/@servego24' },
  ];

  const nav = (page) => () => onNavigate?.(page);

  return (
    <footer
      id="reusable-footer-comp"
      className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-5 py-10 text-xs text-slate-400 sm:px-6 sm:py-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
      <div className="relative mx-auto max-w-6xl flex flex-col gap-10">

        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo className="h-8 w-8 rounded-lg" />
              <p className="text-sm font-extrabold tracking-tight text-white">servego24</p>
            </div>
            <p className="leading-relaxed text-slate-500 text-[11px]">
              On-demand home services marketplace connecting customers with verified local professionals in Hyderabad.
            </p>
            <div className="mt-4 flex items-center gap-2">
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

          {/* Services */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Services in Hyderabad</h3>
            <ul className="space-y-2">
              {[
                ['Electrician Services', '/cities/hyderabad/electrician'],
                ['Plumbing Services', '/cities/hyderabad/plumber'],
                ['AC Repair & Service', '/cities/hyderabad/ac-repair'],
                ['Home Cleaning', '/cities/hyderabad/home-cleaning'],
                ['Carpentry Services', '/cities/hyderabad/carpenter'],
                ['CCTV Installation', '/cities/hyderabad/cctv-installation'],
                ['Painting Services', '/cities/hyderabad/painter'],
                ['Appliance Repair', '/cities/hyderabad/appliance-repair'],
                ['RO & Water Purifier', '/cities/hyderabad/ro-service'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      window.history.pushState({}, '', href);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="text-slate-400 hover:text-teal-400 transition-colors text-[11px] font-medium text-left"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* High-intent guides */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Helpful guides</h3>
            <ul className="space-y-2">
              {[
                ['Electrical fault help', '/help/electrical-fault'],
                ['Tap leaking', '/help/tap-leaking'],
                ['Drain blockage', '/help/drain-blockage'],
                ['AC not cooling', '/help/ac-not-cooling'],
                ['AC water leakage', '/help/ac-water-leakage'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      window.history.pushState({}, '', href);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="text-slate-400 hover:text-teal-400 transition-colors text-[11px] font-medium text-left"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Company</h3>
            <ul className="space-y-2">
              {[
                ['About ServeGo24', 'about'],
                ['Contact & Support', 'contact'],
                ['FAQ', 'faq'],
                ['Join as Provider', 'join-as-provider'],
                ['Book a Service', 'services'],
              ].map(([label, page]) => (
                <li key={label}>
                  <button
                    onClick={nav(page)}
                    className="text-slate-400 hover:text-teal-400 transition-colors text-[11px] font-medium text-left"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <a href="tel:18004102026" className="text-slate-400 hover:text-teal-400 transition-colors text-[11px] font-medium">
                  1800-410-2026
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <a href="mailto:support@servego.com" className="text-slate-400 hover:text-teal-400 transition-colors text-[11px] font-medium">
                  support@servego.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <address className="not-italic text-slate-500 text-[11px] leading-relaxed">
                  Mindspace, Hyderabad<br />Telangana – 500081
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600">
          <span>© {new Date().getFullYear()} ServeGo24. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="text-slate-700">Hyderabad, Telangana, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
