import React from 'react';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import Logo from './Logo';

const quickLinks = [
  { label: 'Home', page: 'home' },
  { label: 'Services', page: 'services' },
  { label: 'How it Works', page: 'home', target: 'how-it-works' },
];

const userLinks = [
  { label: 'Bookings', page: 'dashboard-customer' },
  { label: 'Help & Support', page: 'contact' },
  { label: 'FAQs', page: 'faq' },
  { label: 'Contact Us', page: 'contact' },
];

const providerLinks = [
  { label: 'Provider Login', page: 'login' },
  { label: 'Join as Provider', page: 'signup' },
  { label: 'Terms & Conditions', page: 'signup' },
  { label: 'Privacy Policy', page: 'faq' },
];

const socials = [
  { icon: Facebook, label: 'Facebook', className: 'bg-[#1f9cf0]', href: 'https://facebook.com' },
  { icon: Instagram, label: 'Instagram', className: 'bg-[#e93e88]', href: 'https://instagram.com' },
  { icon: Twitter, label: 'Twitter', className: 'bg-[#1da1f2]', href: 'https://x.com' },
  { icon: Linkedin, label: 'LinkedIn', className: 'bg-[#0a66c2]', href: 'https://linkedin.com' },
];

export default function Footer({ onNavigate = () => {} }) {
  const handleNav = (page, targetId = null) => {
    onNavigate(page);
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  };

  return (
    <footer className="border-t border-slate-200 bg-[#f5f7f6] px-4 py-8 text-slate-600 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-[250px]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
                <Logo className="h-10 w-10 rounded-lg" />
              </div>
              <div>
                <div className="text-[1.7rem] font-black tracking-[-0.06em] text-slate-900">ServeGo24</div>
                <div className="text-xs font-medium text-slate-500">Your Home. Our Experts.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">Quick Links</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {quickLinks.map(({ label, page, target }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => handleNav(page, target)}
                      className="text-left transition-colors hover:text-teal-700"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">For Users</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {userLinks.map(({ label, page }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => handleNav(page)}
                      className="text-left transition-colors hover:text-teal-700"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">For Providers</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {providerLinks.map(({ label, page }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => handleNav(page)}
                      className="text-left transition-colors hover:text-teal-700"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">Socials</h3>
              <div className="flex items-center gap-2.5">
                {socials.map(({ icon: Icon, label, className, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 ${className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500 sm:text-left">
          © 2024 ServeGo24. All rights reserved.
        </div>
      </div>
    </footer>
  );
}