import React from 'react';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const cities = [
    { name: 'Hyderabad', status: 'Active' },
    { name: 'Bengaluru', status: 'Pending' },
    { name: 'Chennai', status: 'Pending' },
  ];

  return (
    <footer id="reusable-footer-comp" className="bg-slate-950 py-16 px-4 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-8">
        <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-[0.2em]">
          Launch Territories
        </h5>

        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((city) => (
            <div
              key={city.name}
              className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 backdrop-blur-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-500" />
              <span className="font-medium text-slate-200">{city.name}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  city.status === 'Active' ? 'bg-teal-500' : 'bg-slate-600'
                }`}
              />
              <span className="text-slate-500">{city.status}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-xs h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

        <span className="text-slate-600">© 2026 ServeGo. All rights reserved.</span>
      </div>
    </footer>
  );
}